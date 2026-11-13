"""
Read-only availability queries (BR-AVL-01 to BR-AVL-05).

**These functions are the contract used by the bookings and pricing apps.**
Dates are half-open stays ``[check_in, check_out)``: the check-out day is
not a night. Prices are integer centimes.

Layer rule: inventory must not import ``apps.bookings`` (it is listed
after inventory). Bookings know which nights of a home are taken, so they
plug a provider in with :func:`register_booked_ranges_provider`; the public
search and the availability endpoint then see booked nights too.
"""

from collections.abc import Callable, Iterable
from datetime import date, timedelta

from apps.catalog.models import InventoryKind, Listing, RoomType
from apps.core.timeutils import business_today, ranges_overlap

from .models import ExperienceSlot, ListingDay, RoomTypeNight

# Provider given by the bookings app:
#   func(listing_ids: list[uuid], start: date, end: date) -> dict[uuid, list[tuple[date, date]]]
# returns, per single-unit listing, the [check_in, check_out) ranges of bookings in a blocking state.
_booked_ranges_provider: Callable | None = None


def register_booked_ranges_provider(func: Callable | None) -> None:
    """
    Plug in the source of booked date ranges for single-unit listings (BR-AVL-01).

    The bookings app calls this once (for example in its ``AppConfig.ready``)
    with ``func(listing_ids, start, end) -> {listing_id: [(check_in, check_out), ...]}``
    listing every booking in a blocking state (pending, confirmed, completed,
    disputed) that overlaps ``[start, end)``. Pass ``None`` to unplug (tests).
    """
    global _booked_ranges_provider
    _booked_ranges_provider = func


def booked_ranges(listing_ids: list, start: date, end: date) -> dict:
    """Booked ranges per listing from the registered provider; empty when no provider is plugged in."""
    if _booked_ranges_provider is None or not listing_ids:
        return {}
    return _booked_ranges_provider(list(listing_ids), start, end) or {}


def nights_of(check_in: date, check_out: date) -> list[date]:
    """Every night of the stay ``[check_in, check_out)``."""
    return [check_in + timedelta(days=i) for i in range((check_out - check_in).days)]


def nightly_prices(listing: Listing, check_in: date, check_out: date, room_type: RoomType | None = None) -> list[tuple[date, int]]:
    """
    Price of each night of ``[check_in, check_out)``, in centimes.

    - single-unit listing (``room_type=None``): the day's
      ``ListingDay.price_override_minor`` or ``listing.base_price_minor``;
    - room type: the night's ``RoomTypeNight.price_override_minor`` or
      ``room_type.base_price_minor`` (price of ONE unit).
    Used by pricing to build a quote (discounts and fees are added there).
    """
    days = nights_of(check_in, check_out)
    if room_type is not None:
        overrides = dict(
            RoomTypeNight.objects.filter(room_type=room_type, night__gte=check_in, night__lt=check_out,
                                         price_override_minor__isnull=False)
            .values_list("night", "price_override_minor")
        )
        return [(d, overrides.get(d, room_type.base_price_minor)) for d in days]
    overrides = dict(
        ListingDay.objects.filter(listing=listing, day__gte=check_in, day__lt=check_out,
                                  price_override_minor__isnull=False)
        .values_list("day", "price_override_minor")
    )
    return [(d, overrides.get(d, listing.base_price_minor)) for d in days]


def blocked_days(listing: Listing, start: date, end: date) -> set[date]:
    """Days of ``[start, end)`` the host closed on a single-unit listing (BR-AVL-04)."""
    return set(
        ListingDay.objects.filter(listing=listing, day__gte=start, day__lt=end, is_blocked=True)
        .values_list("day", flat=True)
    )


def rooms_available(room_type: RoomType, check_in: date, check_out: date) -> int:
    """
    Units of ``room_type`` free on EVERY night of ``[check_in, check_out)`` (BR-AVL-02).

    The minimum over the nights of ``total - held - booked``; a night with no
    ``RoomTypeNight`` row yet counts ``unit_count`` free units. 0 when the
    room type is inactive or deleted. A hostel bed type needs one unit per
    guest, a hotel room type one unit per room (BR-AVL-03): the caller decides.
    """
    if not room_type.is_active or room_type.deleted_at is not None or check_out <= check_in:
        return 0
    rows = RoomTypeNight.objects.filter(room_type=room_type, night__gte=check_in, night__lt=check_out)
    free = [r.free for r in rows]
    if len(free) < (check_out - check_in).days:
        free.append(room_type.unit_count)  # nights without a row are fully free
    return max(min(free), 0)


def listing_window_problem(listing: Listing, check_in: date, check_out: date, *, today: date | None = None) -> str | None:
    """
    Why the stay breaks the listing's booking window, or ``None`` when it is fine (BR-AVL-04, BR-AVL-05).

    Reasons, checked in this order: ``invalid_dates`` (check-out not after
    check-in), ``past``, ``advance_notice`` (check-in sooner than
    ``advance_notice_days`` from today in Algeria), ``outside_window``
    (before ``available_from`` or a night after ``available_until``),
    ``min_nights``, ``max_nights``. Does not look at blocks or bookings.
    """
    today = today or business_today()
    nights = (check_out - check_in).days
    if nights <= 0:
        return "invalid_dates"
    if check_in < today:
        return "past"
    if check_in < today + timedelta(days=listing.advance_notice_days):
        return "advance_notice"
    last_night = check_out - timedelta(days=1)
    if (listing.available_from and check_in < listing.available_from) or (
        listing.available_until and last_night > listing.available_until
    ):
        return "outside_window"
    if nights < listing.min_nights:
        return "min_nights"
    if nights > listing.max_nights:
        return "max_nights"
    return None


def is_listing_window_ok(listing: Listing, check_in: date, check_out: date) -> bool:
    """True when the stay respects window, advance notice and min/max nights (BR-AVL-04/05)."""
    return listing_window_problem(listing, check_in, check_out) is None


def single_unit_free(listing: Listing, check_in: date, check_out: date, booked_ranges: Iterable[tuple[date, date]]) -> bool:
    """
    True when a single-unit listing has no blocked day and no overlapping
    booking on ``[check_in, check_out)`` (BR-AVL-01, BR-AVL-04).

    ``booked_ranges`` are the ``(check_in, check_out)`` of bookings in a
    blocking state, given by the caller (the bookings app owns them).
    Back-to-back stays are allowed. The window rules are separate:
    see :func:`is_listing_window_ok`.
    """
    if blocked_days(listing, check_in, check_out):
        return False
    return not any(ranges_overlap(check_in, check_out, start, end) for start, end in booked_ranges)


def open_slots(listing: Listing, start: date, end: date):
    """Non-cancelled future slots of an experience starting on a day of ``[start, end)``, in order."""
    return ExperienceSlot.objects.filter(
        listing=listing, is_cancelled=False, starts_at__date__gte=start, starts_at__date__lt=end
    ).order_by("starts_at")


def available_listing_ids(listings: list[Listing], check_in: date, check_out: date, guests: int) -> set:
    """
    Ids of the listings that can host ``guests`` on ``[check_in, check_out)``.

    The date filter of the public search (registered in
    ``catalog.selectors`` by ``InventoryConfig.ready``):
    - single unit: window rules + no block + no booking (BR-AVL-01/04/05);
    - room pool: window rules + enough free capacity, summed over room
      types as ``free units x capacity_per_unit`` (BR-AVL-02/03);
    - experience: at least one open slot on those days with enough seats.
    """
    singles = [lst.id for lst in listings if lst.inventory_kind == InventoryKind.SINGLE]
    ranges = booked_ranges(singles, check_in, check_out)
    result = set()
    for listing in listings:
        if listing.inventory_kind == InventoryKind.SLOT:
            if any(slot.seats_left >= guests for slot in open_slots(listing, check_in, check_out)):
                result.add(listing.id)
            continue
        if not is_listing_window_ok(listing, check_in, check_out):
            continue
        if listing.inventory_kind == InventoryKind.SINGLE:
            if single_unit_free(listing, check_in, check_out, ranges.get(listing.id, [])):
                result.add(listing.id)
        else:
            rooms = RoomType.objects.alive().filter(listing=listing, is_active=True)
            capacity = sum(rooms_available(r, check_in, check_out) * r.capacity_per_unit for r in rooms)
            if capacity >= guests:
                result.add(listing.id)
    return result


def day_reason(listing: Listing, day: date, *, today: date, blocked: set, booked: list) -> str | None:
    """
    Why one day of a single-unit listing cannot be a night of a stay (``None`` = free).

    Reasons as in the API: ``past``, ``advance_notice``, ``outside_window``,
    ``blocked``, ``booked`` (BR-AVL-04).
    """
    if day < today:
        return "past"
    if day < today + timedelta(days=listing.advance_notice_days):
        return "advance_notice"
    if (listing.available_from and day < listing.available_from) or (listing.available_until and day > listing.available_until):
        return "outside_window"
    if day in blocked:
        return "blocked"
    if any(start <= day < end for start, end in booked):
        return "booked"
    return None


def public_availability(listing: Listing, start: date, end: date, room_type_id=None) -> dict:
    """
    Body of ``GET /listings/{id}/availability`` for ``[start, end)``.

    single: one entry per day (free or reason, price); room pool: per room
    type, units left and price per night; experience: open slots with seats
    left. Never reveals who booked.
    """
    today = business_today()
    body = {
        "listing_id": str(listing.id), "inventory_kind": listing.inventory_kind, "today": today.isoformat(),
        "from": start.isoformat(), "to": end.isoformat(), "min_nights": listing.min_nights,
        "max_nights": listing.max_nights, "advance_notice_days": listing.advance_notice_days,
    }
    currency = listing.currency
    if listing.inventory_kind == InventoryKind.SINGLE:
        blocked = blocked_days(listing, start, end)
        booked = booked_ranges([listing.id], start, end).get(listing.id, [])
        nights = []
        for day, price in nightly_prices(listing, start, end):
            reason = day_reason(listing, day, today=today, blocked=blocked, booked=booked)
            nights.append({"date": day.isoformat(), "available": reason is None, "reason": reason,
                           "price": {"amount_minor": price, "currency": currency}})
        body["nights"] = nights
    elif listing.inventory_kind == InventoryKind.ROOM_POOL:
        rooms = RoomType.objects.alive().filter(listing=listing, is_active=True)
        if room_type_id:
            rooms = rooms.filter(id=room_type_id)
        body["room_types"] = []
        for room in rooms:
            rows = {r.night: r for r in RoomTypeNight.objects.filter(room_type=room, night__gte=start, night__lt=end)}
            nights = []
            for day, price in nightly_prices(listing, start, end, room_type=room):
                left = rows[day].free if day in rows else room.unit_count
                reason = None
                if day < today:
                    reason = "past"
                elif day < today + timedelta(days=listing.advance_notice_days):
                    reason = "advance_notice"
                elif left == 0:
                    reason = "booked"
                nights.append({"date": day.isoformat(), "available": reason is None, "reason": reason,
                               "units_left": left, "price": {"amount_minor": price, "currency": currency}})
            body["room_types"].append({"room_type_id": str(room.id), "name": room.name, "nights": nights})
    else:
        body["slots"] = [
            {"id": str(s.id), "starts_at": s.starts_at.isoformat(), "ends_at": s.ends_at.isoformat(),
             "seats_total": s.seats_total, "seats_left": s.seats_left, "is_cancelled": s.is_cancelled,
             "price": {"amount_minor": s.price_minor, "currency": currency}}
            for s in open_slots(listing, max(start, today), end).select_related("listing")
        ]
    return body
