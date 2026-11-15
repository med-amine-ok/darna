"""
Every write of the inventory app: reserving stock and the host calendar.

**Reservation functions are the contract used by the bookings app.**
They follow BR-AVL-02: one conditional ``UPDATE`` that only succeeds where
``held + booked + n <= total``, applied to every night (or the slot) inside
one transaction. If any night lacks room, nothing changes and
``ConflictError(code="dates_unavailable")`` (HTTP 409) is raised. The
database checks on the counters are the last line of defence.

Counters: ``kind="held"`` for a booking waiting for payment or for the
host's answer (BR-AVL-06, holds), ``kind="booked"`` for a confirmed one.
``confirm_*`` moves units from held to booked in one statement.
"""

from collections.abc import Callable
from datetime import date

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.catalog.models import InventoryKind, Listing, RoomType
from apps.core.errors import ConflictError, DomainError, NotFoundError
from apps.core.timeutils import business_today

from .models import ConflictStatus, ExperienceSlot, InventoryConflict, ListingDay, RoomTypeNight
from .selectors import booked_ranges, nights_of

# Largest calendar range a host may edit or read in one call (one year and a day).
MAX_CALENDAR_DAYS = 366
COUNTER_KINDS = ("held", "booked")


def _check_units(units: int) -> None:
    """Refuse zero or negative quantities (a programming error in the caller)."""
    if units <= 0:
        raise DomainError("Quantity must be positive.", code="invalid_quantity")


def _check_kind(kind: str) -> None:
    """``kind`` must be ``held`` or ``booked``."""
    if kind not in COUNTER_KINDS:
        raise ValueError(f"kind must be one of {COUNTER_KINDS}")


def _unavailable() -> ConflictError:
    """The single error of a failed reservation (code ``dates_unavailable``, 409)."""
    return ConflictError("These dates are no longer available.", code="dates_unavailable")


# ---------------------------------------------------------------------------
# Room pools (hotels, hostels)
# ---------------------------------------------------------------------------
def ensure_room_nights(room_type: RoomType, start: date, end: date) -> None:
    """
    Create the missing ``RoomTypeNight`` rows of ``[start, end)`` with
    ``total = room_type.unit_count``. Existing rows are never touched
    (``ignore_conflicts``), so it is safe to call before every reservation.
    """
    existing = set(
        RoomTypeNight.objects.filter(room_type=room_type, night__gte=start, night__lt=end).values_list("night", flat=True)
    )
    RoomTypeNight.objects.bulk_create(
        [RoomTypeNight(room_type=room_type, night=d, total=room_type.unit_count) for d in nights_of(start, end) if d not in existing],
        ignore_conflicts=True,
    )


@transaction.atomic
def reserve_rooms(room_type: RoomType, check_in: date, check_out: date, units: int, *, kind: str = "booked") -> None:
    """
    Take ``units`` rooms (or beds) of ``room_type`` on every night of ``[check_in, check_out)`` (BR-AVL-02).

    One statement: ``UPDATE ... SET <kind> = <kind> + units WHERE held +
    booked + units <= total`` over all the nights. If fewer rows changed than
    there are nights, the transaction is rolled back (all nights or nothing)
    and ``ConflictError("dates_unavailable")`` is raised. ``kind`` is
    ``"held"`` (waiting) or ``"booked"`` (confirmed).
    """
    _check_units(units)
    _check_kind(kind)
    if check_out <= check_in or not room_type.is_active or room_type.deleted_at is not None:
        raise _unavailable()
    ensure_room_nights(room_type, check_in, check_out)
    updated = (
        RoomTypeNight.objects.filter(room_type=room_type, night__gte=check_in, night__lt=check_out)
        .filter(total__gte=F("held") + F("booked") + units)
        .update(**{kind: F(kind) + units})
    )
    if updated != (check_out - check_in).days:
        # Raising inside the atomic block undoes the nights already updated.
        raise _unavailable()


@transaction.atomic
def release_rooms(room_type: RoomType, check_in: date, check_out: date, units: int, *, kind: str = "booked") -> None:
    """
    Give back ``units`` taken by :func:`reserve_rooms` (cancellation, expired hold).

    Same all-or-nothing rule; refuses (409 ``inventory_mismatch``) to go
    below zero, which would mean the caller releases twice.
    """
    _check_units(units)
    _check_kind(kind)
    updated = (
        RoomTypeNight.objects.filter(room_type=room_type, night__gte=check_in, night__lt=check_out, **{f"{kind}__gte": units})
        .update(**{kind: F(kind) - units})
    )
    if updated != (check_out - check_in).days:
        raise ConflictError("Nothing to release for these nights.", code="inventory_mismatch")


@transaction.atomic
def confirm_rooms(room_type: RoomType, check_in: date, check_out: date, units: int) -> None:
    """Move ``units`` from held to booked on every night (hold accepted and paid). 409 ``inventory_mismatch`` if not held."""
    _check_units(units)
    updated = (
        RoomTypeNight.objects.filter(room_type=room_type, night__gte=check_in, night__lt=check_out, held__gte=units)
        .update(held=F("held") - units, booked=F("booked") + units)
    )
    if updated != (check_out - check_in).days:
        raise ConflictError("These rooms were not held.", code="inventory_mismatch")


# ---------------------------------------------------------------------------
# Experience slots
# ---------------------------------------------------------------------------
@transaction.atomic
def slot_reserve(slot: ExperienceSlot, seats: int, *, kind: str = "booked") -> None:
    """
    Take ``seats`` on an experience slot (BR-AVL-02): ``UPDATE ... WHERE
    seats_held + seats_booked + seats <= seats_total AND NOT is_cancelled``.
    Raises ``ConflictError("dates_unavailable")`` when not enough seats are left.
    """
    _check_units(seats)
    _check_kind(kind)
    column = f"seats_{kind}"
    updated = (
        ExperienceSlot.objects.filter(pk=slot.pk, is_cancelled=False)
        .filter(seats_total__gte=F("seats_held") + F("seats_booked") + seats)
        .update(**{column: F(column) + seats})
    )
    if updated != 1:
        raise _unavailable()
    slot.refresh_from_db()


@transaction.atomic
def slot_release(slot: ExperienceSlot, seats: int, *, kind: str = "booked") -> None:
    """Give back ``seats`` taken by :func:`slot_reserve`; 409 ``inventory_mismatch`` below zero."""
    _check_units(seats)
    _check_kind(kind)
    column = f"seats_{kind}"
    updated = ExperienceSlot.objects.filter(pk=slot.pk, **{f"{column}__gte": seats}).update(**{column: F(column) - seats})
    if updated != 1:
        raise ConflictError("Nothing to release on this slot.", code="inventory_mismatch")
    slot.refresh_from_db()


@transaction.atomic
def slot_confirm(slot: ExperienceSlot, seats: int) -> None:
    """Move ``seats`` from held to booked on a slot."""
    _check_units(seats)
    updated = ExperienceSlot.objects.filter(pk=slot.pk, seats_held__gte=seats).update(
        seats_held=F("seats_held") - seats, seats_booked=F("seats_booked") + seats
    )
    if updated != 1:
        raise ConflictError("These seats were not held.", code="inventory_mismatch")
    slot.refresh_from_db()


# ---------------------------------------------------------------------------
# Host calendar
# ---------------------------------------------------------------------------
def _check_dates(dates: list[date]) -> list[date]:
    """De-duplicate and sort the dates of a calendar edit; at most one year per call."""
    unique = sorted(set(dates))
    if not unique:
        raise DomainError("Send at least one date.", code="invalid", errors={"dates": ["Required."]})
    if len(unique) > MAX_CALENDAR_DAYS:
        raise DomainError("Too many dates in one call.", code="invalid", errors={"dates": [f"At most {MAX_CALENDAR_DAYS}."]})
    return unique


def _require_single(listing: Listing) -> None:
    """Day blocks and day prices exist only for homes and vehicles; hotels edit per room type."""
    if listing.inventory_kind != InventoryKind.SINGLE:
        raise DomainError("Edit the calendar of each room type instead.", code="calendar_not_single_unit")


@transaction.atomic
def set_days_blocked(listing: Listing, dates: list[date], blocked: bool, note: str | None = None) -> None:
    """
    Block or open days of a single-unit listing (BR-AVL-04). Live at once,
    no review (BR-LST-02). A day inside a booking that still holds the dates
    cannot be blocked (409 ``dates_booked``, review R2); on PostgreSQL a
    trigger (migration 0003) enforces the same rule in the database.
    ``note`` (optional, 120 characters) is kept on each day for the host.
    """
    _require_single(listing)
    days = _check_dates(dates)
    # Same lock as booking creation (review R2): a guest booking and a host
    # block on the same listing run one after the other, never across.
    Listing.objects.select_for_update().filter(pk=listing.pk).first()
    if blocked and days:
        start, end = min(days), date.fromordinal(max(days).toordinal() + 1)
        taken = booked_ranges([listing.id], start, end).get(listing.id, [])
        booked_days = sorted(d for d in days if any(a <= d < b for a, b in taken))
        if booked_days:
            raise ConflictError("Some of these days are already booked.", code="dates_booked",
                                errors={"dates": [d.isoformat() for d in booked_days]})
    defaults = {"is_blocked": blocked}
    if note is not None:
        defaults["note"] = note
    for day in days:
        ListingDay.objects.update_or_create(listing=listing, day=day, defaults=defaults)


@transaction.atomic
def set_day_prices(listing: Listing, dates: list[date], price_minor: int | None) -> None:
    """Set (or with ``None`` remove) a special price on days of a single-unit listing. Live at once."""
    _require_single(listing)
    if price_minor is not None and price_minor <= 0:
        raise DomainError("Price must be positive.", code="invalid", errors={"price_minor": ["Must be positive."]})
    for day in _check_dates(dates):
        ListingDay.objects.update_or_create(listing=listing, day=day, defaults={"price_override_minor": price_minor})


@transaction.atomic
def set_room_nights(room_type: RoomType, dates: list[date], *, total: int | None = None,
                    price_minor: int | None = None, set_price: bool = False) -> None:
    """
    Host edit of a room type's nights: sellable ``total`` (closing rooms)
    and/or a special price (``set_price=True`` with ``price_minor=None``
    removes it).

    ``total`` must stay between ``held + booked`` of each night (rooms
    already sold cannot disappear) and ``unit_count``: 409
    ``dates_unavailable`` on the first night that does not allow it, and
    nothing changes.
    """
    days = _check_dates(dates)
    if total is not None and not 0 <= total <= room_type.unit_count:
        raise DomainError("Total must be between 0 and the number of units.", code="invalid",
                          errors={"total": [f"Between 0 and {room_type.unit_count}."]})
    if set_price and price_minor is not None and price_minor <= 0:
        raise DomainError("Price must be positive.", code="invalid", errors={"price_minor": ["Must be positive."]})
    for day in days:
        ensure_room_nights(room_type, day, date.fromordinal(day.toordinal() + 1))
    nights = RoomTypeNight.objects.filter(room_type=room_type, night__in=days)
    if total is not None:
        updated = nights.filter(held__lte=total - F("booked")).update(total=total)
        if updated != len(days):
            raise ConflictError("Some of these nights already have more rooms sold.", code="dates_unavailable")
    if set_price:
        nights.update(price_override_minor=price_minor)


def _require_room_type_of(listing: Listing, room_type: RoomType) -> None:
    """The room type must belong to the listing (404 otherwise, so ids of other hosts reveal nothing)."""
    if room_type.listing_id != listing.id or room_type.deleted_at is not None:
        raise NotFoundError("Room type not found.")


@transaction.atomic
def set_room_nights_blocked(room_type: RoomType, dates: list[date], blocked: bool) -> None:
    """
    Close or reopen nights of one room type (BR-AVL-04: blocks may be per room type, AVL-03).

    Closing sets the sellable ``total`` of each night to 0; it is refused
    with 409 ``night_booked`` (and nothing changes) when units are already
    held or booked on one of the nights. Reopening gives back ``unit_count``.
    Live at once, no review (BR-LST-02).
    """
    days = _check_dates(dates)
    for day in days:
        ensure_room_nights(room_type, day, date.fromordinal(day.toordinal() + 1))
    nights = RoomTypeNight.objects.select_for_update().filter(room_type=room_type, night__in=days)
    if blocked:
        sold = sorted(n.night.isoformat() for n in nights if n.held + n.booked > 0)
        if sold:
            raise ConflictError("Some of these nights already have rooms sold.", code="night_booked",
                                errors={"dates": sold})
        nights.update(total=0)
    else:
        nights.update(total=room_type.unit_count)


@transaction.atomic
def resize_room_type(room_type: RoomType, new_unit_count: int) -> None:
    """
    Check and apply a new ``unit_count`` on the future nights of a room type (BR-AVL-02).

    Registered in catalog (``register_room_units_resizer``): catalog calls it
    before saving a room type with a new size, or with 0 before a soft
    delete. Refused with 409 ``inventory_in_use`` when a night from today on
    has more units held or booked than ``new_unit_count``. Otherwise every
    future night total follows the new size (closed nights, total 0, stay closed).
    """
    today = business_today()
    future = RoomTypeNight.objects.select_for_update().filter(room_type=room_type, night__gte=today)
    in_use = sorted(n.night.isoformat() for n in future if n.held + n.booked > new_unit_count)
    if in_use:
        raise ConflictError("Units are already held or booked on future nights.", code="inventory_in_use",
                            errors={"unit_count": in_use[:10]})
    if new_unit_count > 0:
        future.exclude(total=0).update(total=new_unit_count)


def _require_slots(listing: Listing) -> None:
    """Slots exist only on experiences."""
    if listing.inventory_kind != InventoryKind.SLOT:
        raise DomainError("Only experiences have slots.", code="not_an_experience")


def create_slot(listing: Listing, data: dict) -> ExperienceSlot:
    """Add a dated session to an experience. Its start must be unique for the listing (409 ``slot_exists``)."""
    _require_slots(listing)
    if data["ends_at"] <= data["starts_at"]:
        raise DomainError("End must be after start.", code="invalid", errors={"ends_at": ["Must be after starts_at."]})
    if ExperienceSlot.objects.filter(listing=listing, starts_at=data["starts_at"]).exists():
        raise ConflictError("A slot already starts at this time.", code="slot_exists")
    return ExperienceSlot.objects.create(listing=listing, **data)


@transaction.atomic
def update_slot(slot: ExperienceSlot, data: dict) -> ExperienceSlot:
    """
    Change a slot (``PATCH /host/listings/{id}/slots/{slot_id}``).

    ``seats_total`` cannot go below the seats already held or booked (409
    ``inventory_in_use``, BR-AVL-02). ``is_cancelled=true`` closes the slot
    to new bookings; its bookings must then be cancelled and refunded by the
    bookings app. A cancelled slot cannot be reopened (409 ``invalid_transition``):
    its guests were told it is cancelled; create a new slot instead.
    """
    slot = ExperienceSlot.objects.select_for_update().get(pk=slot.pk)
    if slot.is_cancelled and data.get("is_cancelled") is False:
        raise ConflictError("A cancelled slot cannot be reopened.", code="invalid_transition")
    for field, value in data.items():
        setattr(slot, field, value)
    if slot.seats_total < slot.seats_held + slot.seats_booked:
        raise ConflictError("More seats are already taken.", code="inventory_in_use")
    if slot.ends_at <= slot.starts_at:
        raise DomainError("End must be after start.", code="invalid", errors={"ends_at": ["Must be after starts_at."]})
    slot.save()
    return slot


# ---------------------------------------------------------------------------
# Hotel system sync (DEC-017, review R3)
# ---------------------------------------------------------------------------
@transaction.atomic
def apply_external_totals(room_type: RoomType, totals: dict, *, source: str) -> list[InventoryConflict]:
    """
    Apply the sellable room counts a hotel system sent, night by night (review R3).

    ``totals`` maps a night (``date``) to the number of rooms the hotel says
    can be sold on BLADUS. Each night is read under a row lock. The total is
    never set below ``held + booked`` (rooms BLADUS already sold) nor above
    ``unit_count``; when the hotel number is lower than what is sold, the
    total is set to the sold count and an ``InventoryConflict`` is opened for
    the admin. Returns the conflicts opened by this call.
    """
    if not totals:
        return []
    nights = sorted(totals)
    ensure_room_nights(room_type, nights[0], date.fromordinal(nights[-1].toordinal() + 1))
    rows = {
        row.night: row
        for row in RoomTypeNight.objects.select_for_update().filter(room_type=room_type, night__in=nights)
    }
    conflicts = []
    for night in nights:
        row = rows[night]
        external = max(int(totals[night]), 0)
        sold = row.held + row.booked
        new_total = min(max(external, sold), room_type.unit_count)
        if external < sold:
            conflicts.append(InventoryConflict.objects.create(
                room_type=room_type, night=night, external_total=external, sold=sold, source=source[:60],
            ))
        if row.total != new_total:
            row.total = new_total
            row.save(update_fields=["total"])
    return conflicts


@transaction.atomic
def resolve_conflict(conflict_id, *, actor, note: str) -> InventoryConflict:
    """Close an inventory conflict after the admin dealt with the hotel (a note is required)."""
    note = (note or "").strip()
    if not note:
        raise DomainError("Say what was done.", code="reason_required", errors={"note": ["Required."]})
    conflict = InventoryConflict.objects.select_for_update().filter(pk=conflict_id).first()
    if conflict is None:
        raise DomainError("Conflict not found.", code="not_found", status_code=404)
    if conflict.status != ConflictStatus.OPEN:
        raise ConflictError("This conflict is already resolved.", code="conflict_resolved")
    conflict.status, conflict.resolution_note = ConflictStatus.RESOLVED, note
    conflict.resolved_by, conflict.resolved_at = actor, timezone.now()
    conflict.save(update_fields=["status", "resolution_note", "resolved_by", "resolved_at"])
    return conflict


# Adapters that send availability to one hotel system, keyed by
# ``system_name`` in lower case. The real adapters (channel managers, PMS)
# come next; until one is registered, a push for that system is delivered
# with nothing sent (see :func:`push_handler`).
_push_adapters: dict[str, Callable] = {}


def register_push_adapter(system_name: str, adapter: Callable) -> None:
    """Plug in the function that pushes ``(integration, room_type, nights)`` to one hotel system."""
    _push_adapters[system_name.lower()] = adapter


def push_handler(payload: dict) -> None:
    """
    Outbox handler of topic ``inventory.push`` (review R3).

    Sends the current free rooms of the given nights to the hotel system
    right after every BLADUS booking change, so the hotel stops selling a
    room BLADUS just sold. An adapter failure raises and the outbox retries.
    """
    from apps.hosts.models import PropertyIntegration

    integration = PropertyIntegration.objects.filter(pk=payload["integration_id"]).first()
    room_type = RoomType.objects.filter(pk=payload["room_type_id"]).first()
    if integration is None or room_type is None or integration.status != "active":
        return  # nothing to push any more
    adapter = _push_adapters.get(integration.system_name.lower())
    if adapter is None:
        return
    adapter(integration, room_type, [date.fromisoformat(n) for n in payload["nights"]])
