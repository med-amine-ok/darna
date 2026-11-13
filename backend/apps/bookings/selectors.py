"""
Read-only queries of the bookings app (no writes here).

Every guest query is scoped to the guest, every host query to the active
host account, so someone else's booking looks like a missing one (404,
OWASP API1). :func:`booked_ranges_for` is the provider the inventory app
uses to know which nights of a home are taken (BR-AVL-01).
"""

import uuid
from collections import defaultdict
from datetime import date

from django.db.models import QuerySet

from apps.core.errors import NotFoundError

from .models import BLOCKING_STATUSES, Booking, InventoryKind

# Related rows every booking list shows (one query instead of one per row).
_RELATED = (
    "guest", "host_account", "host_account__user", "host_account__organization", "listing", "listing__commune",
    "room_type", "experience_slot", "trip_departure", "trip_departure__trip",
)


def _csv(value: str | None) -> list[str]:
    """Split a comma-separated query value into clean items."""
    return [item.strip() for item in (value or "").split(",") if item.strip()]


def _by_key(queryset: QuerySet, key) -> Booking:
    """One booking of ``queryset`` by UUID or by reference (``BLD-2026-7K2M9Q``), else 404."""
    try:
        booking = queryset.filter(id=uuid.UUID(str(key))).first()
    except ValueError:
        booking = queryset.filter(reference__iexact=str(key)).first()
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


def get_guest_booking(guest, key) -> Booking:
    """One of the guest's bookings by id or reference, else 404."""
    return _by_key(guest_bookings(guest), key)


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


def get_host_booking(host_account, key) -> Booking:
    """One booking of this host account, else 404 (another host's booking looks missing)."""
    return _by_key(host_bookings(host_account), key)


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


def get_admin_booking(key) -> Booking:
    """Any booking by id or reference, for an admin; else 404."""
    return _by_key(Booking.objects.select_related(*_RELATED), key)
