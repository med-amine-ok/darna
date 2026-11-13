"""
Database models of the trips app: multi-day trips sold by travel agencies.

A trip is separate from listings (DEC-006): it has an itinerary (one row
per day) and dated departures with a limited number of seats. Only an
approved agency may create trips (BR-TRP-01, checked in ``services.py``).
Trips share the listing state machine (BR-LST-03, ``catalog.states``).

Design source: ``docs/backend/schema.dbml``, group TRIPS (PostGIS meeting
point replaced by latitude/longitude decimals).
"""

from django.db import models
from django.db.models import F, Q
from django.utils import timezone

from apps.catalog.states import ListingStatus
from apps.catalog.types import TripType
from apps.core.models import SoftDeleteModel, TimeStampedModel, UUIDModel
from apps.hosts.models import ApprovalMode


class Trip(UUIDModel, TimeStampedModel, SoftDeleteModel):
    """
    An agency trip, for example "5 days in the Tassili".

    ``price_per_person_minor`` is the default price; a departure may
    override it. ``trip_type`` is one of the 8 fixed trip types (BR-LST-05).
    Status columns have the same names as on ``catalog.Listing`` so the
    shared ``catalog.workflow`` functions work on both.
    """

    reference = models.CharField(max_length=16, unique=True, help_text="Human id, e.g. TRP-7K2M9Q.")
    slug = models.SlugField(max_length=160, unique=True, help_text="Public URL name, e.g. 5-day-grand-tassili.")
    host_account = models.ForeignKey("hosts.HostAccount", on_delete=models.PROTECT, related_name="trips")
    status = models.CharField(max_length=20, choices=ListingStatus.choices, default=ListingStatus.DRAFT)
    status_before_delete = models.CharField(max_length=20, choices=ListingStatus.choices, blank=True, default="")
    moderation_note = models.TextField(blank=True, help_text="Last reason given by an admin, shown to the agency.")
    trip_type = models.CharField(max_length=20, choices=TripType.choices)
    title = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    source_language = models.CharField(max_length=2, default="fr")
    duration_days = models.PositiveSmallIntegerField()
    group_min = models.PositiveSmallIntegerField(default=1)
    group_max = models.PositiveSmallIntegerField()
    currency = models.CharField(max_length=3, default="DZD")
    price_per_person_minor = models.BigIntegerField()
    inclusions = models.JSONField(default=list, blank=True, help_text="What the price includes, list of short texts.")
    exclusions = models.JSONField(default=list, blank=True, help_text="What it does not include.")
    start_commune = models.ForeignKey(
        "geo.Commune", on_delete=models.PROTECT, null=True, blank=True, related_name="+",
        help_text="Required before submitting.",
    )
    meeting_point_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    meeting_point_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    meeting_point_text = models.CharField(max_length=255, blank=True)
    cancellation_policy = models.ForeignKey(
        "catalog.CancellationPolicy", on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    approval_mode = models.CharField(
        max_length=8, choices=ApprovalMode.choices, null=True, blank=True, help_text="Empty = host account default."
    )
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    review_count = models.PositiveIntegerField(default=0)
    submitted_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)

    # Fields whose change on a published trip needs a new review (BR-LST-02, first version).
    REVIEWED_FIELDS = ("title", "description", "trip_type", "duration_days", "start_commune", "inclusions", "exclusions")

    class Meta:
        """Table options: ordering, indexes and database checks."""

        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "trip_type"])]
        constraints = [
            models.CheckConstraint(condition=Q(duration_days__gt=0), name="trip_duration_positive"),
            models.CheckConstraint(condition=Q(group_min__gt=0) & Q(group_max__gte=F("group_min")), name="trip_group_range"),
            models.CheckConstraint(condition=Q(price_per_person_minor__gt=0), name="trip_price_positive"),
        ]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"{self.reference} {self.title}"

    @property
    def effective_approval_mode(self) -> str:
        """``instant`` or ``request``: the trip's own choice, else the host default (BR-BKG-02)."""
        return self.approval_mode or self.host_account.default_approval_mode


class TripItineraryDay(UUIDModel):
    """One day of a trip's programme. ``day_number`` starts at 1 and is unique per trip."""

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="itinerary")
    day_number = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    overnight_commune = models.ForeignKey("geo.Commune", on_delete=models.PROTECT, null=True, blank=True, related_name="+")

    class Meta:
        """Table options: ordering, indexes and database checks."""

        ordering = ["trip", "day_number"]
        constraints = [models.UniqueConstraint(fields=["trip", "day_number"], name="trip_itinerary_day_unique")]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"Day {self.day_number}: {self.title}"


class DepartureStatus(models.TextChoices):
    """Life of a departure. ``guaranteed`` = enough guests, it will run."""

    SCHEDULED = "scheduled", "Scheduled"
    GUARANTEED = "guaranteed", "Guaranteed"
    CANCELLED = "cancelled", "Cancelled"
    COMPLETED = "completed", "Completed"


# Departures that still accept bookings.
OPEN_DEPARTURE_STATUSES = (DepartureStatus.SCHEDULED, DepartureStatus.GUARANTEED)


class TripDeparture(UUIDModel):
    """
    One dated run of a trip with a limited number of seats (BR-TRP-02).

    ``seats_held + seats_booked <= seats_total`` is a database check, so
    seats can never be oversold even by concurrent bookings (BR-AVL-02).
    ``price_per_person_minor`` empty = the trip price.
    """

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="departures")
    starts_on = models.DateField()
    ends_on = models.DateField()
    seats_total = models.PositiveSmallIntegerField()
    seats_held = models.IntegerField(default=0)
    seats_booked = models.IntegerField(default=0)
    price_per_person_minor = models.BigIntegerField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=DepartureStatus.choices, default=DepartureStatus.SCHEDULED)
    guide_membership = models.ForeignKey(
        "hosts.Membership", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Table options: ordering, indexes and database checks."""

        ordering = ["trip", "starts_on"]
        constraints = [
            models.UniqueConstraint(fields=["trip", "starts_on"], name="trip_departure_unique_start"),
            models.CheckConstraint(condition=Q(ends_on__gte=F("starts_on")), name="trip_departure_dates"),
            # BR-TRP-02: never oversold, never negative.
            models.CheckConstraint(
                condition=Q(seats_held__gte=0) & Q(seats_booked__gte=0)
                & Q(seats_total__gte=F("seats_held") + F("seats_booked")),
                name="trip_departure_counters",
            ),
            models.CheckConstraint(
                condition=Q(price_per_person_minor__isnull=True) | Q(price_per_person_minor__gt=0),
                name="trip_departure_price_positive",
            ),
        ]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"{self.trip_id} {self.starts_on}"

    @property
    def seats_left(self) -> int:
        """Seats still free (0 when the departure no longer accepts bookings)."""
        if self.status not in OPEN_DEPARTURE_STATUSES:
            return 0
        return max(self.seats_total - self.seats_held - self.seats_booked, 0)


class TripPhoto(UUIDModel):
    """A photo of a trip. ``url`` until file storage exists (BR-MED-01)."""

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="photos")
    url = models.CharField(max_length=500)
    caption = models.CharField(max_length=160, blank=True)
    sort_order = models.IntegerField(default=0)
    is_cover = models.BooleanField(default=False)

    class Meta:
        """Table options: ordering, indexes and database checks."""

        ordering = ["sort_order", "id"]
        constraints = [models.UniqueConstraint(fields=["trip"], condition=Q(is_cover=True), name="trip_photo_one_cover")]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return self.url
