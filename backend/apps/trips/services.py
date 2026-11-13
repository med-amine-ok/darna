"""
Every write and business rule of the trips app.

- BR-TRP-01: only an APPROVED agency creates trips (:func:`check_can_offer_trips`);
- BR-LST-05: a trip has exactly one of the 8 trip types;
- BR-LST-03: same state machine as listings (``catalog.workflow``);
- BR-TRP-02 / BR-AVL-02: departure seats are reserved with one conditional
  ``UPDATE`` (:func:`departure_reserve`), the contract used by bookings.
"""

from django.db import transaction
from django.db.models import F
from django.utils.text import slugify

from apps.catalog import workflow
from apps.catalog.models import CancellationPolicy
from apps.catalog.states import HOST, ListingStatus
from apps.catalog.types import TRIP_TYPES
from apps.core.errors import ConflictError, DomainError, ForbiddenError
from apps.core.ids import human_reference, random_code

from .models import OPEN_DEPARTURE_STATUSES, DepartureStatus, Trip, TripDeparture, TripItineraryDay, TripPhoto

# Fields a host may set on a trip through the API.
EDITABLE_FIELDS = (
    "trip_type", "title", "description", "source_language", "duration_days", "group_min", "group_max",
    "price_per_person_minor", "inclusions", "exclusions", "start_commune", "meeting_point_latitude",
    "meeting_point_longitude", "meeting_point_text", "cancellation_policy", "approval_mode",
)


def check_can_offer_trips(host_account) -> None:
    """
    Only an approved agency may create trips (BR-TRP-01, DEC-014).

    Uses ``host_account.may_offer("trip")`` (agency) and ``is_approved``.
    Raises 403 ``host_offer_not_allowed`` otherwise.
    """
    if not host_account.may_offer("trip") or not host_account.is_approved:
        raise ForbiddenError("Only approved travel agencies can publish trips.", code="host_offer_not_allowed")


def check_trip_type(trip_type: str | None) -> None:
    """A trip needs exactly one of the 8 trip types (BR-LST-05). Code ``trip_type_required``."""
    if not trip_type:
        raise DomainError("Choose the type of trip.", code="trip_type_required",
                          errors={"trip_type": ["Required."]})
    if trip_type not in TRIP_TYPES:
        raise DomainError("Unknown trip type.", code="invalid", errors={"trip_type": [trip_type]})


def _check_values(trip: Trip) -> None:
    """Value rules of the dbml checks, with clear field errors instead of database errors."""
    errors = {}
    if trip.group_max < trip.group_min:
        errors["group_max"] = ["Must be at least group_min."]
    if trip.price_per_person_minor <= 0:
        errors["price_per_person_minor"] = ["Must be positive."]
    if trip.duration_days <= 0:
        errors["duration_days"] = ["Must be positive."]
    if errors:
        raise DomainError("Invalid data.", code="invalid", errors=errors)


def _unique_slug(title: str) -> str:
    """A URL name built from the title, made unique with a short random suffix when needed."""
    base = slugify(title)[:140] or "trip"
    slug = base
    while Trip.objects.filter(slug=slug).exists():
        slug = f"{base}-{random_code(4).lower()}"
    return slug


def _new_reference() -> str:
    """A trip reference ``TRP-XXXXXX`` not used yet."""
    for _ in range(10):
        ref = human_reference("TRP")
        if not Trip.objects.filter(reference=ref).exists():
            return ref
    raise RuntimeError("Could not generate a unique trip reference.")


@transaction.atomic
def create_trip(host_account, data: dict) -> Trip:
    """
    Create a draft trip for an approved agency (BR-TRP-01, BR-LST-05).

    ``data`` holds model fields (``EDITABLE_FIELDS``). The moderate policy
    is used when none is given. The slug comes from the title.
    """
    check_can_offer_trips(host_account)
    check_trip_type(data.get("trip_type"))
    values = {k: v for k, v in data.items() if k in EDITABLE_FIELDS}
    values.setdefault("cancellation_policy", CancellationPolicy.objects.filter(code="moderate", is_current=True).first())
    trip = Trip(reference=_new_reference(), slug=_unique_slug(values["title"]), host_account=host_account, **values)
    _check_values(trip)
    trip.save()
    return trip


@transaction.atomic
def update_trip(trip: Trip, data: dict) -> Trip:
    """
    Apply a host's partial update. Changing a reviewed field of a published
    or paused trip sends it back to review (BR-LST-02, first version: the
    revision mechanism is the next step). Price and policy edits stay live.
    """
    if "trip_type" in data:
        check_trip_type(data["trip_type"])
    reviewed = False
    for field, value in data.items():
        if field not in EDITABLE_FIELDS:
            continue
        if field in Trip.REVIEWED_FIELDS and getattr(trip, field) != value:
            reviewed = True
        setattr(trip, field, value)
    _check_values(trip)
    trip.save()
    if reviewed:
        send_back_to_review_if_live(trip)
    return trip


def send_back_to_review_if_live(trip: Trip) -> None:
    """First version of BR-LST-02 for trips: a reviewed change on a live trip sends it back to ``pending_review``."""
    if trip.status in (ListingStatus.PUBLISHED, ListingStatus.PAUSED):
        workflow.change_status(trip, ListingStatus.PENDING_REVIEW, actor_kind=HOST)


def submission_problems(trip: Trip) -> dict[str, list[str]]:
    """What is missing before a trip can be sent to review (empty = ready)."""
    problems: dict[str, list[str]] = {}
    if trip.start_commune_id is None:
        problems["start_commune"] = ["Required."]
    if trip.cancellation_policy_id is None:
        problems["cancellation_policy"] = ["Required."]
    if not trip.itinerary.exists():
        problems["itinerary"] = ["Describe at least one day."]
    return problems


@transaction.atomic
def submit_trip(trip: Trip) -> Trip:
    """
    Send a trip to staff review (DEC-003). The agency must still be approved
    (BR-TRP-01) and the trip complete (400 ``trip_incomplete``).
    """
    check_can_offer_trips(trip.host_account)
    problems = submission_problems(trip)
    if problems:
        raise DomainError("Complete the trip before submitting.", code="trip_incomplete", errors=problems)
    workflow.change_status(trip, ListingStatus.PENDING_REVIEW, actor_kind=HOST)
    return trip


def host_move(trip: Trip, action: str) -> Trip:
    """Host status buttons ``pause``, ``resume``, ``archive``, ``withdraw``, ``reopen`` (table 4a)."""
    targets = {
        "pause": ListingStatus.PAUSED, "resume": ListingStatus.PUBLISHED, "archive": ListingStatus.ARCHIVED,
        "withdraw": ListingStatus.DRAFT, "reopen": ListingStatus.DRAFT,
    }
    workflow.change_status(trip, targets[action], actor_kind=HOST)
    return trip


def delete_trip(trip: Trip) -> None:
    """Soft delete (table 4a); an admin can restore it."""
    workflow.soft_delete(trip)


@transaction.atomic
def replace_itinerary(trip: Trip, days: list[dict]) -> list[TripItineraryDay]:
    """
    Replace the whole programme with ``days`` (``PUT /host/trips/{id}/itinerary``).

    Day numbers must be 1, 2, 3... without gaps and not beyond
    ``duration_days`` (code ``invalid_itinerary``). A live trip goes back to
    review (BR-LST-02 first version).
    """
    numbers = sorted(d["day_number"] for d in days)
    if numbers != list(range(1, len(days) + 1)) or len(days) > trip.duration_days:
        raise DomainError("Number the days 1, 2, 3... up to the trip duration.", code="invalid_itinerary")
    trip.itinerary.all().delete()
    rows = TripItineraryDay.objects.bulk_create([TripItineraryDay(trip=trip, **d) for d in days])
    send_back_to_review_if_live(trip)
    return rows


@transaction.atomic
def add_photo(trip: Trip, *, url: str, caption: str = "", is_cover: bool = False) -> TripPhoto:
    """Add a photo at the end of the gallery; the first one (or ``is_cover``) becomes the only cover."""
    last = trip.photos.order_by("-sort_order").first()
    if is_cover or last is None:
        trip.photos.filter(is_cover=True).update(is_cover=False)
        is_cover = True
    return TripPhoto.objects.create(trip=trip, url=url, caption=caption, is_cover=is_cover,
                                    sort_order=(last.sort_order + 1) if last else 0)


# ---------------------------------------------------------------------------
# Departures
# ---------------------------------------------------------------------------
def _check_departure(trip: Trip, starts_on, ends_on, seats_total: int) -> None:
    """Dates in order, seats within the trip's group size."""
    if ends_on < starts_on:
        raise DomainError("End must not be before start.", code="invalid", errors={"ends_on": ["Before starts_on."]})
    if seats_total > trip.group_max:
        raise DomainError("More seats than the maximum group size.", code="invalid",
                          errors={"seats_total": [f"At most {trip.group_max}."]})


def create_departure(trip: Trip, data: dict) -> TripDeparture:
    """Add a dated departure. One departure per start date (409 ``departure_exists``)."""
    _check_departure(trip, data["starts_on"], data["ends_on"], data["seats_total"])
    if TripDeparture.objects.filter(trip=trip, starts_on=data["starts_on"]).exists():
        raise ConflictError("A departure already starts on this date.", code="departure_exists")
    return TripDeparture.objects.create(trip=trip, **data)


@transaction.atomic
def update_departure(departure: TripDeparture, data: dict) -> TripDeparture:
    """Change a departure. ``seats_total`` cannot go below the seats taken (409 ``seats_taken``)."""
    departure = TripDeparture.objects.select_for_update().get(pk=departure.pk)
    for field, value in data.items():
        setattr(departure, field, value)
    _check_departure(departure.trip, departure.starts_on, departure.ends_on, departure.seats_total)
    if departure.seats_total < departure.seats_held + departure.seats_booked:
        raise ConflictError("More seats are already taken.", code="seats_taken")
    departure.save()
    return departure


def delete_departure(departure: TripDeparture) -> None:
    """Delete a departure without any seat taken; otherwise 409 ``departure_has_bookings`` (cancel it instead)."""
    if departure.seats_held or departure.seats_booked:
        raise ConflictError("Seats are taken: cancel the departure instead.", code="departure_has_bookings")
    departure.delete()


def cancel_departure(departure: TripDeparture) -> TripDeparture:
    """
    Mark a departure cancelled: it accepts no new booking.

    BR-TRP-03 (cancel every booking with a full refund and commission
    reversal, notify guests) belongs to the bookings app, which should call
    this and then process the bookings of the departure.
    """
    if departure.status in (DepartureStatus.CANCELLED, DepartureStatus.COMPLETED):
        raise ConflictError("This departure is already closed.", code="invalid_status_change")
    departure.status = DepartureStatus.CANCELLED
    departure.save(update_fields=["status"])
    return departure


def departure_price_minor(departure: TripDeparture) -> int:
    """Price per person of a departure, in centimes: its own price or the trip price (BR-TRP-02)."""
    if departure.price_per_person_minor is not None:
        return departure.price_per_person_minor
    return departure.trip.price_per_person_minor


def _check_kind(kind: str) -> str:
    """``held`` or ``booked`` to the matching column name."""
    if kind not in ("held", "booked"):
        raise ValueError("kind must be 'held' or 'booked'")
    return f"seats_{kind}"


@transaction.atomic
def departure_reserve(departure: TripDeparture, seats: int, *, kind: str = "booked") -> None:
    """
    Take ``seats`` on a departure (BR-TRP-02, BR-AVL-02).

    One statement: ``UPDATE ... SET seats_<kind> = seats_<kind> + n WHERE
    seats_held + seats_booked + n <= seats_total AND status IN (scheduled,
    guaranteed)``. When it changes no row, raises
    ``ConflictError("dates_unavailable")``: two guests racing for the last
    seat, only one wins.
    """
    if seats <= 0:
        raise DomainError("Quantity must be positive.", code="invalid_quantity")
    column = _check_kind(kind)
    updated = (
        TripDeparture.objects.filter(pk=departure.pk, status__in=OPEN_DEPARTURE_STATUSES)
        .filter(seats_total__gte=F("seats_held") + F("seats_booked") + seats)
        .update(**{column: F(column) + seats})
    )
    if updated != 1:
        raise ConflictError("Not enough seats left on this departure.", code="dates_unavailable")
    departure.refresh_from_db()


@transaction.atomic
def departure_release(departure: TripDeparture, seats: int, *, kind: str = "booked") -> None:
    """Give back seats taken by :func:`departure_reserve`; 409 ``inventory_mismatch`` below zero."""
    if seats <= 0:
        raise DomainError("Quantity must be positive.", code="invalid_quantity")
    column = _check_kind(kind)
    updated = TripDeparture.objects.filter(pk=departure.pk, **{f"{column}__gte": seats}).update(**{column: F(column) - seats})
    if updated != 1:
        raise ConflictError("Nothing to release on this departure.", code="inventory_mismatch")
    departure.refresh_from_db()


@transaction.atomic
def departure_confirm(departure: TripDeparture, seats: int) -> None:
    """Move ``seats`` from held to booked (hold accepted and paid)."""
    updated = TripDeparture.objects.filter(pk=departure.pk, seats_held__gte=seats).update(
        seats_held=F("seats_held") - seats, seats_booked=F("seats_booked") + seats
    )
    if updated != 1:
        raise ConflictError("These seats were not held.", code="inventory_mismatch")
    departure.refresh_from_db()
