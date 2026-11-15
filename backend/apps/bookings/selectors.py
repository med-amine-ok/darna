"""
Read-only queries of the bookings app (no writes here).

Every guest query is scoped to the guest, every host query to the active
host account, so someone else's booking looks like a missing one (404,
OWASP API1). :func:`booked_ranges_for` is the provider the inventory app
uses to know which nights of a home are taken (BR-AVL-01).
:func:`host_earnings` feeds the host earnings dashboard (BR-RPT-02).
"""

import uuid
from collections import defaultdict
from datetime import date, datetime, time, timedelta

from django.db.models import QuerySet

from apps.core.errors import NotFoundError
from apps.core.timeutils import business_tz
from apps.ledger import selectors as ledger_selectors

from .models import BLOCKING_STATUSES, Booking, BookingStatus, InventoryKind, Refund

# Related rows every booking list shows (one query instead of one per row).
_RELATED = (
    "guest", "host_account", "host_account__user", "host_account__organization", "listing", "listing__commune",
    "room_type", "experience_slot", "trip_departure", "trip_departure__trip",
)


def _csv(value: str | None) -> list[str]:
    """Split a comma-separated query value into clean items."""
    return [item.strip() for item in (value or "").split(",") if item.strip()]


def _by_id(queryset: QuerySet, booking_id) -> Booking:
    """
    One booking of ``queryset`` by its UUID, else 404 (DEC-031).

    Booking paths take the UUID only; the ``BLD-...`` reference is for
    display and search. A malformed id looks like a missing booking.
    """
    try:
        booking = queryset.filter(id=uuid.UUID(str(booking_id))).first()
    except (TypeError, ValueError):
        booking = None
    if booking is None:
        raise NotFoundError("Booking not found.")
    return booking


def booked_ranges_for(listing_ids: list, start: date, end: date) -> dict:
    """
    Provider registered in ``inventory.selectors`` (BR-AVL-01).

    For each single-unit listing, the ``(check_in, check_out)`` of bookings
    in a blocking state (pending, confirmed, completed) that overlap the
    half-open range ``[start, end)``.
    """
    rows = Booking.objects.filter(
        listing_id__in=listing_ids, inventory_kind=InventoryKind.SINGLE, status__in=BLOCKING_STATUSES,
        check_in__lt=end, check_out__gt=start,
    ).values_list("listing_id", "check_in", "check_out")
    result: dict = defaultdict(list)
    for listing_id, check_in, check_out in rows:
        result[listing_id].append((check_in, check_out))
    return dict(result)


def guest_bookings(guest, *, status: str | None = None) -> QuerySet:
    """The guest's own bookings, newest first; ``status`` accepts a comma list."""
    qs = Booking.objects.filter(guest=guest).select_related(*_RELATED)
    if statuses := _csv(status):
        qs = qs.filter(status__in=statuses)
    return qs.order_by("-created_at")


def get_guest_booking(guest, booking_id) -> Booking:
    """One of the guest's bookings by id, else 404."""
    return _by_id(guest_bookings(guest), booking_id)


def host_bookings(host_account, *, status: str | None = None, listing: str | None = None) -> QuerySet:
    """Bookings of one host account (always scope host queries with this); filters ``status``, ``listing``."""
    qs = Booking.objects.filter(host_account=host_account).select_related(*_RELATED)
    if statuses := _csv(status):
        qs = qs.filter(status__in=statuses)
    if listing:
        try:
            qs = qs.filter(listing_id=uuid.UUID(str(listing)))
        except ValueError:
            qs = qs.none()  # a malformed id matches nothing
    return qs.order_by("-created_at")


def get_host_booking(host_account, booking_id) -> Booking:
    """One booking of this host account by id, else 404 (another host's booking looks missing)."""
    return _by_id(host_bookings(host_account), booking_id)


def admin_bookings(*, status: str | None = None, host: str | None = None, listing: str | None = None,
                   guest: str | None = None, reference: str | None = None) -> QuerySet:
    """Every booking for the admin, newest first. Filters: status (comma list), host, listing, guest ids, reference."""
    qs = Booking.objects.select_related(*_RELATED)
    if statuses := _csv(status):
        qs = qs.filter(status__in=statuses)
    for field, value in (("host_account_id", host), ("listing_id", listing), ("guest_id", guest)):
        if value:
            try:
                qs = qs.filter(**{field: uuid.UUID(str(value))})
            except ValueError:
                qs = qs.none()
    if reference:
        qs = qs.filter(reference__iexact=reference.strip())
    return qs.order_by("-created_at")


def get_admin_booking(booking_id) -> Booking:
    """Any booking by id, for an admin; else 404."""
    return _by_id(Booking.objects.select_related(*_RELATED), booking_id)


# ---------------------------------------------------------------------------
# Host earnings (BR-RPT-02, DEC-010)
# ---------------------------------------------------------------------------
def _host_net(booking: Booking, kept_commission: dict) -> int:
    """
    What a host keeps from one booking (BR-RPT-02): subtotal after discount
    plus cleaning fee, minus the commission kept and the refunds owed.
    """
    gross = booking.subtotal_minor - booking.discount_minor + booking.cleaning_fee_minor
    return gross - kept_commission.get(booking.id, 0) - booking.refund_due_minor


def host_earnings(host_account, start: date, end: date) -> dict:
    """
    Earnings dashboard of a host account between two dates included (BR-RPT-02).

    - ``upcoming``: confirmed bookings not finished yet (check-out on or after ``start``);
    - ``completed``: bookings completed in the period, counted at completion (DEC-010);
    - ``commission_paid``: commission kept in the period, from the ledger;
    - ``refunds_owed``: refunds decided in the period;
    - ``by_month``: completed earnings and commission per calendar month.
    All amounts in centimes; dates in Algerian time.
    """
    tz = business_tz()
    lo = datetime.combine(start, time.min, tzinfo=tz)
    hi = datetime.combine(end + timedelta(days=1), time.min, tzinfo=tz)
    upcoming = list(Booking.objects.filter(host_account=host_account, status=BookingStatus.CONFIRMED,
                                           check_out__gte=start))
    completed = list(Booking.objects.filter(host_account=host_account, status=BookingStatus.COMPLETED,
                                            completed_at__gte=lo, completed_at__lt=hi))
    kept = ledger_selectors.commission_kept_by_booking([b.id for b in upcoming + completed])
    refunds = Refund.objects.filter(booking__host_account=host_account, created_at__gte=lo, created_at__lt=hi)
    months = []
    cursor = start.replace(day=1)
    while cursor <= end:
        nxt = (cursor + timedelta(days=32)).replace(day=1)
        first, last = max(cursor, start), min(nxt - timedelta(days=1), end)
        in_month = [b for b in completed if first <= b.completed_at.astimezone(tz).date() <= last]
        months.append({
            "month": cursor.strftime("%Y-%m"),
            "completed_minor": sum(_host_net(b, kept) for b in in_month),
            "commission_minor": ledger_selectors.net_commission_minor(host_account, first, last),
        })
        cursor = nxt
    return {
        "from": start, "to": end,
        "upcoming_minor": sum(_host_net(b, kept) for b in upcoming),
        "completed_minor": sum(_host_net(b, kept) for b in completed),
        "commission_paid_minor": ledger_selectors.net_commission_minor(host_account, start, end),
        "refunds_owed_minor": sum(r.amount_minor for r in refunds),
        "by_month": months,
    }
