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

from datetime import date

from django.db import transaction
from django.db.models import F

from apps.catalog.models import InventoryKind, Listing, RoomType
from apps.core.errors import ConflictError, DomainError

from .models import ExperienceSlot, ListingDay, RoomTypeNight
from .selectors import nights_of

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
def set_days_blocked(listing: Listing, dates: list[date], blocked: bool) -> None:
    """
    Block or open days of a single-unit listing (BR-AVL-04). Live at once,
    no review (BR-LST-02). Opening a day does not touch bookings; blocking a
    booked day only stops new bookings.
    """
    _require_single(listing)
    for day in _check_dates(dates):
        ListingDay.objects.update_or_create(listing=listing, day=day, defaults={"is_blocked": blocked})


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
    Change a slot. ``seats_total`` cannot go below the seats already held
    or booked (409 ``seats_taken``).
    """
    slot = ExperienceSlot.objects.select_for_update().get(pk=slot.pk)
    for field, value in data.items():
        setattr(slot, field, value)
    if slot.seats_total < slot.seats_held + slot.seats_booked:
        raise ConflictError("More seats are already taken.", code="seats_taken")
    if slot.ends_at <= slot.starts_at:
        raise DomainError("End must be after start.", code="invalid", errors={"ends_at": ["Must be after starts_at."]})
    slot.save()
    return slot


def delete_slot(slot: ExperienceSlot) -> None:
    """
    Remove a slot. A slot with seats taken is only marked cancelled (its
    bookings must be cancelled and refunded by the bookings app); an empty
    one is deleted.
    """
    if slot.seats_held or slot.seats_booked:
        slot.is_cancelled = True
        slot.save(update_fields=["is_cancelled"])
    else:
        slot.delete()
