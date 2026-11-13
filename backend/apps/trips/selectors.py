"""
Read-only queries of the trips app.

Public queries only return published, non-deleted trips of approved,
non-deleted host accounts (BR-SRC-01 applied to trips).
"""

import uuid
from datetime import date

from django.db.models import Exists, OuterRef, QuerySet

from apps.core.errors import NotFoundError
from apps.core.timeutils import business_today
from apps.catalog.states import ListingStatus
from apps.hosts.models import VerificationStatus

from .models import OPEN_DEPARTURE_STATUSES, Trip, TripDeparture


def _csv(value: str | None) -> list[str]:
    """Split a comma-separated query value."""
    return [v.strip() for v in (value or "").split(",") if v.strip()]


def public_trips() -> QuerySet:
    """Trips guests may see: published, alive, agency approved and alive."""
    return (
        Trip.objects.alive()
        .filter(
            status=ListingStatus.PUBLISHED,
            host_account__verification_status=VerificationStatus.APPROVED,
            host_account__deleted_at__isnull=True,
        )
        .select_related("host_account", "host_account__organization", "start_commune", "start_commune__wilaya",
                        "cancellation_policy")
    )


def upcoming_departures(trip: Trip) -> QuerySet:
    """Departures of a trip that start today or later and still accept bookings, soonest first."""
    return trip.departures.filter(status__in=OPEN_DEPARTURE_STATUSES, starts_on__gte=business_today()).order_by("starts_on")


def search_trips(*, trip_type: str | None = None, wilaya: int | None = None, max_price: int | None = None,
                 date_from: date | None = None, date_to: date | None = None, sort: str | None = None) -> QuerySet:
    """
    Public trip search (``GET /trips``).

    Filters: ``trip_type`` (comma list), ``wilaya`` of the start commune,
    ``max_price`` (centimes per person, on the trip price), ``from``/``to``:
    the trip must have an open future departure overlapping that period.
    Sort: ``price``, ``-price``, ``rating``, ``newest`` (default).
    """
    qs = public_trips()
    if types := _csv(trip_type):
        qs = qs.filter(trip_type__in=types)
    if wilaya:
        qs = qs.filter(start_commune__wilaya_id=wilaya)
    if max_price is not None:
        qs = qs.filter(price_per_person_minor__lte=max_price)
    if date_from or date_to:
        departures = TripDeparture.objects.filter(
            trip=OuterRef("pk"), status__in=OPEN_DEPARTURE_STATUSES, starts_on__gte=business_today()
        )
        if date_from:
            departures = departures.filter(ends_on__gte=date_from)
        if date_to:
            departures = departures.filter(starts_on__lte=date_to)
        qs = qs.filter(Exists(departures))
    order = {
        "price": ["price_per_person_minor"], "-price": ["-price_per_person_minor"],
        "rating": ["-rating_avg", "-review_count"], "newest": ["-published_at"],
    }.get(sort or "newest", ["-published_at"])
    return qs.order_by(*order, "-created_at")


def get_public_trip(key: str) -> Trip:
    """One public trip by id or slug, else 404 (the website links trips by slug)."""
    qs = public_trips()
    try:
        trip = qs.filter(id=uuid.UUID(str(key))).first()
    except ValueError:
        trip = qs.filter(slug=key).first()
    if trip is None:
        raise NotFoundError("Trip not found.")
    return trip


def host_trips(host_account) -> QuerySet:
    """Every non-deleted trip of a host account. Always scope host queries with this."""
    return Trip.objects.alive().filter(host_account=host_account).select_related("start_commune", "cancellation_policy")


def get_host_trip(host_account, trip_id) -> Trip:
    """One trip of this host account, else 404."""
    trip = host_trips(host_account).filter(id=trip_id).first()
    if trip is None:
        raise NotFoundError("Trip not found.")
    return trip


def admin_trips(*, status: str | None = None, trip_type: str | None = None, host: str | None = None,
                deleted: bool = False) -> QuerySet:
    """Trips for the admin queue, oldest submission first (BR-MOD-01)."""
    qs = Trip.objects.dead() if deleted else Trip.objects.alive()
    if statuses := _csv(status):
        qs = qs.filter(status__in=statuses)
    if types := _csv(trip_type):
        qs = qs.filter(trip_type__in=types)
    if host:
        qs = qs.filter(host_account_id=host)
    return qs.select_related("host_account", "host_account__organization").order_by("submitted_at", "created_at")


def get_admin_trip(trip_id) -> Trip:
    """Any trip, deleted or not, for an admin; 404 when unknown."""
    trip = Trip.objects.filter(id=trip_id).first()
    if trip is None:
        raise NotFoundError("Trip not found.")
    return trip
