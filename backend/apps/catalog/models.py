"""
Database models of the catalog app: what hosts publish.

- Reference lists (taxonomy): ``Category``, ``PropertyType``, ``Amenity``,
  ``CancellationPolicy``. They are rows, not free text (BR-LST-04).
- ``Listing``: one home, hotel, hostel, experience or vehicle (BR-LST-01).
  Trips are a separate entity in ``apps.trips`` (DEC-006).
- Parts of a listing: ``VehicleDetail``, ``ExperienceDetail``, ``RoomType``,
  ``ListingPhoto``, ``ListingAmenity``, ``PropertyService`` (DEC-017).

Design source: ``docs/backend/schema.dbml`` groups TAXONOMY and CATALOGUE.
Adapted to SQLite: latitude/longitude decimals instead of PostGIS points,
JSON lists instead of PostgreSQL arrays.
"""

from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.models import SoftDeleteModel, TimeStampedModel, UUIDModel
from apps.hosts.models import ApprovalMode

from .states import ListingStatus
from .types import ExperienceType


class Vertical(models.TextChoices):
    """The five kinds of listing (BR-LST-01). ``hotel`` is its own search vertical (BR-SRC-04)."""

    HOME = "home", "Home"
    HOTEL = "hotel", "Hotel"
    HOSTEL = "hostel", "Hostel"
    EXPERIENCE = "experience", "Experience"
    VEHICLE = "vehicle", "Vehicle"


class InventoryKind(models.TextChoices):
    """How availability is counted for a listing. Derived from the vertical, never typed by the host."""

    SINGLE = "single", "Single unit (home, vehicle)"
    ROOM_POOL = "room_pool", "Pool of rooms or beds (hotel, hostel)"
    SLOT = "slot", "Dated slots with seats (experience)"


class BookingUnit(models.TextChoices):
    """What one unit of a room type is: a whole room, or one bed of a dorm (BR-AVL-03)."""

    ROOM = "room", "Room"
    BED = "bed", "Bed"


# The inventory kind of each vertical. Also enforced by a database check.
INVENTORY_KIND_BY_VERTICAL: dict[str, str] = {
    Vertical.HOME: InventoryKind.SINGLE,
    Vertical.VEHICLE: InventoryKind.SINGLE,
    Vertical.HOTEL: InventoryKind.ROOM_POOL,
    Vertical.HOSTEL: InventoryKind.ROOM_POOL,
    Vertical.EXPERIENCE: InventoryKind.SLOT,
}

# What the base price of a listing is counted per (shown on cards).
PRICE_UNIT_BY_VERTICAL: dict[str, str] = {
    Vertical.HOME: "night",
    Vertical.HOTEL: "night",
    Vertical.HOSTEL: "night",
    Vertical.VEHICLE: "day",
    Vertical.EXPERIENCE: "person",
}

# Refund windows of the three policy templates (BR-CAN-01, DEC-011).
# Each window reads: "if the guest cancels at least ``min_days_before`` days
# before check-in, refund ``refund_bp`` basis points of the subtotal".
# Windows are ordered from the most to the least generous.
POLICY_WINDOWS: dict[str, list[dict]] = {
    "flexible": [{"min_days_before": 1, "refund_bp": 10000}, {"min_days_before": 0, "refund_bp": 5000}],
    "moderate": [
        {"min_days_before": 5, "refund_bp": 10000},
        {"min_days_before": 1, "refund_bp": 5000},
        {"min_days_before": 0, "refund_bp": 0},
    ],
    "strict": [
        {"min_days_before": 14, "refund_bp": 10000},
        {"min_days_before": 7, "refund_bp": 5000},
        {"min_days_before": 0, "refund_bp": 0},
    ],
}


# ---------------------------------------------------------------------------
# Taxonomy (reference rows)
# ---------------------------------------------------------------------------
class Category(UUIDModel):
    """A browsing category inside one vertical, for example "beach" for homes (BR-LST-04)."""

    vertical = models.CharField(max_length=12, choices=Vertical.choices)
    slug = models.SlugField(max_length=60)
    name_en = models.CharField(max_length=80)
    name_fr = models.CharField(max_length=80)
    name_ar = models.CharField(max_length=80)
    icon = models.CharField(max_length=40, blank=True)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True, help_text="A row in use is deactivated, never deleted (BR-LST-04).")

    class Meta:
        """Table options: ordering, indexes and database checks."""

        ordering = ["vertical", "sort_order", "slug"]
        verbose_name_plural = "categories"
        constraints = [models.UniqueConstraint(fields=["vertical", "slug"], name="category_vertical_slug_unique")]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"{self.vertical}/{self.slug}"


class PropertyType(UUIDModel):
    """The kind of place or thing inside one vertical: apartment, villa, riad, 4x4... (BR-LST-04)."""

    vertical = models.CharField(max_length=12, choices=Vertical.choices)
    slug = models.SlugField(max_length=60)
    name_en = models.CharField(max_length=80)
    name_fr = models.CharField(max_length=80)
    name_ar = models.CharField(max_length=80)
    is_active = models.BooleanField(default=True)

    class Meta:
        """Table options: ordering, indexes and database checks."""

        ordering = ["vertical", "slug"]
        constraints = [models.UniqueConstraint(fields=["vertical", "slug"], name="property_type_vertical_slug_unique")]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"{self.vertical}/{self.slug}"


class Amenity(UUIDModel):
    """
    One equipment or feature (wifi, parking, pool...).

    One vocabulary for the whole product (BR-LST-04). ``applies_to`` is the
    JSON list of verticals that may use the amenity, for example
    ``["home", "hotel", "hostel"]``.
    """

    slug = models.SlugField(max_length=60, unique=True)
    group_code = models.CharField(max_length=20, help_text="essentials, features, location or safety.")
    name_en = models.CharField(max_length=80)
    name_fr = models.CharField(max_length=80)
    name_ar = models.CharField(max_length=80)
    icon = models.CharField(max_length=40, blank=True)
    applies_to = models.JSONField(default=list, help_text="List of verticals that may use this amenity.")
    is_active = models.BooleanField(default=True)

    class Meta:
        """Table options: ordering, indexes and database checks."""

        ordering = ["group_code", "slug"]
        verbose_name_plural = "amenities"

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return self.slug


class CancellationPolicy(UUIDModel):
    """
    A cancellation policy template: flexible, moderate or strict (BR-CAN-01, DEC-011).

    ``windows`` is the ordered JSON list ``[{"min_days_before", "refund_bp"}]``.
    A policy is never edited: a change creates a new ``version`` and moves
    ``is_current``. Bookings copy the windows when they are created, so an
    old booking keeps the rules the guest accepted.
    """

    code = models.CharField(max_length=20, help_text="flexible, moderate or strict.")
    version = models.PositiveIntegerField(default=1)
    name_en = models.CharField(max_length=60)
    name_fr = models.CharField(max_length=60)
    name_ar = models.CharField(max_length=60)
    windows = models.JSONField(help_text="Ordered [{min_days_before, refund_bp}], see BR-CAN-01.")
    is_current = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Table options: ordering, indexes and database checks."""

        ordering = ["code", "-version"]
        constraints = [
            models.UniqueConstraint(fields=["code", "version"], name="cancellation_policy_code_version_unique"),
            # Only one current version per code.
            models.UniqueConstraint(fields=["code"], condition=Q(is_current=True), name="cancellation_policy_one_current"),
        ]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"{self.code} v{self.version}"


# ---------------------------------------------------------------------------
# Listings
# ---------------------------------------------------------------------------
class Listing(UUIDModel, TimeStampedModel, SoftDeleteModel):
    """
    Something a host offers: a home, a hotel, a hostel, an experience or a vehicle.

    Rules carried by this table:
    - belongs to exactly one host account (BR-LST-01); what the host may
      publish is checked in ``services.check_host_offer`` (DEC-014, BR-HST-05);
    - ``status`` follows the state machine of ``states.TRANSITIONS`` (BR-LST-03);
    - ``inventory_kind`` always matches ``vertical`` (database check);
    - ``experience_type`` is set if and only if the vertical is experience
      (BR-LST-05, database check);
    - ``latitude``/``longitude`` and ``address_line`` are private; everyone
      else sees ``public_latitude``/``public_longitude`` (BR-SRC-03).

    Prices: ``base_price_minor`` is per night (stays), per day (vehicles) or
    per person (experiences). For a hotel or hostel it is the lowest price of
    its active room types, kept up to date by the room type services, so
    search can sort and filter every vertical on one column.
    """

    reference = models.CharField(max_length=16, unique=True, help_text="Human id, e.g. LST-7K2M9Q.")
    host_account = models.ForeignKey("hosts.HostAccount", on_delete=models.PROTECT, related_name="listings")
    vertical = models.CharField(max_length=12, choices=Vertical.choices)
    status = models.CharField(max_length=20, choices=ListingStatus.choices, default=ListingStatus.DRAFT)
    status_before_delete = models.CharField(max_length=20, choices=ListingStatus.choices, blank=True, default="")
    moderation_note = models.TextField(
        blank=True, help_text="Last reason given by an admin (reject, request changes, suspend). Shown to the host."
    )
    inventory_kind = models.CharField(max_length=12, choices=InventoryKind.choices)
    experience_type = models.CharField(max_length=20, choices=ExperienceType.choices, null=True, blank=True)

    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    source_language = models.CharField(max_length=2, default="fr", help_text="Language the host wrote in.")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    property_type = models.ForeignKey(PropertyType, on_delete=models.PROTECT, null=True, blank=True, related_name="+")

    # Location. The commune is required before submitting (BR-SRC-02).
    commune = models.ForeignKey("geo.Commune", on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    address_line = models.CharField(max_length=255, blank=True, help_text="Private until a booking is confirmed (BR-SRC-03).")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text="Exact point, private.")
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text="Exact point, private.")
    public_latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True, help_text="Exact point moved by up to about 500 m."
    )
    public_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    capacity_guests = models.PositiveSmallIntegerField(default=1)
    bedrooms = models.PositiveSmallIntegerField(null=True, blank=True)
    beds = models.PositiveSmallIntegerField(null=True, blank=True)
    bathrooms = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    surface_m2 = models.PositiveIntegerField(null=True, blank=True)

    # Money in centimes (BR-PAY-01); discounts in basis points.
    currency = models.CharField(max_length=3, default="DZD")
    base_price_minor = models.BigIntegerField(default=0, help_text="0 while the draft has no price yet.")
    cleaning_fee_minor = models.BigIntegerField(default=0)
    weekly_discount_bp = models.PositiveIntegerField(default=0, help_text="Discount for stays of 7+ nights, 0 to 9000.")
    monthly_discount_bp = models.PositiveIntegerField(default=0, help_text="Discount for stays of 28+ nights, 0 to 9000.")

    # Booking rules (BR-AVL-04, BR-AVL-05). These edits never need review.
    min_nights = models.PositiveSmallIntegerField(default=1)
    max_nights = models.PositiveSmallIntegerField(default=90)
    advance_notice_days = models.PositiveSmallIntegerField(default=0)
    available_from = models.DateField(null=True, blank=True)
    available_until = models.DateField(null=True, blank=True, help_text="Last night that can be booked.")
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    approval_mode = models.CharField(
        max_length=8, choices=ApprovalMode.choices, null=True, blank=True,
        help_text="Empty = use the host account default (BR-BKG-02).",
    )
    cancellation_policy = models.ForeignKey(
        CancellationPolicy, on_delete=models.PROTECT, null=True, blank=True, related_name="+",
        help_text="Required before submitting.",
    )
    house_rules = models.JSONField(default=list, blank=True, help_text="List of rule codes or short texts.")
    amenities = models.ManyToManyField(Amenity, through="ListingAmenity", related_name="listings", blank=True)

    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    review_count = models.PositiveIntegerField(default=0)
    submitted_at = models.DateTimeField(null=True, blank=True, help_text="Last time sent for review.")
    published_at = models.DateTimeField(null=True, blank=True, help_text="First time approved.")

    # Fields whose change on a published listing needs a new review (BR-LST-02).
    REVIEWED_FIELDS = (
        "title", "description", "commune", "address_line", "latitude", "longitude", "capacity_guests", "experience_type",
    )

    class Meta:
        """Table options: ordering, indexes and database checks."""

        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "vertical"]),
            models.Index(fields=["host_account", "status"]),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(capacity_guests__gt=0), name="listing_capacity_positive"),
            models.CheckConstraint(
                condition=Q(base_price_minor__gte=0) & Q(cleaning_fee_minor__gte=0), name="listing_prices_not_negative"
            ),
            models.CheckConstraint(condition=Q(min_nights__lte=models.F("max_nights")), name="listing_min_max_nights"),
            models.CheckConstraint(
                condition=Q(weekly_discount_bp__lte=9000) & Q(monthly_discount_bp__lte=9000),
                name="listing_discount_range",
            ),
            models.CheckConstraint(
                condition=(
                    Q(vertical__in=["home", "vehicle"], inventory_kind="single")
                    | Q(vertical__in=["hotel", "hostel"], inventory_kind="room_pool")
                    | Q(vertical="experience", inventory_kind="slot")
                ),
                name="listing_inventory_kind_matches_vertical",
            ),
            # BR-LST-05: an experience has a type, nothing else has one.
            models.CheckConstraint(
                condition=(
                    Q(vertical="experience", experience_type__isnull=False)
                    | (~Q(vertical="experience") & Q(experience_type__isnull=True))
                ),
                name="listing_experience_type_iff_experience",
            ),
        ]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"{self.reference} {self.title}"

    @property
    def is_public(self) -> bool:
        """True when guests can see and book the listing (BR-SRC-01, BR-LST-03)."""
        return (
            self.status == ListingStatus.PUBLISHED
            and self.deleted_at is None
            and self.host_account.is_approved
            and self.host_account.deleted_at is None
        )

    @property
    def effective_approval_mode(self) -> str:
        """``instant`` or ``request``: the listing's own choice, else the host account default (BR-BKG-02)."""
        return self.approval_mode or self.host_account.default_approval_mode

    @property
    def price_unit(self) -> str:
        """What the base price is counted per: ``night``, ``day`` or ``person``."""
        return PRICE_UNIT_BY_VERTICAL[self.vertical]


class VehicleDetail(models.Model):
    """Extra fields of a vehicle listing (one row per vehicle listing)."""

    listing = models.OneToOneField(Listing, on_delete=models.CASCADE, primary_key=True, related_name="vehicle_detail")
    make = models.CharField(max_length=40)
    model = models.CharField(max_length=60)
    year = models.PositiveSmallIntegerField()
    seats = models.PositiveSmallIntegerField()
    transmission = models.CharField(max_length=12, choices=[("manual", "Manual"), ("automatic", "Automatic")])
    fuel = models.CharField(max_length=12)
    daily_km_limit = models.PositiveIntegerField(null=True, blank=True)
    driver_min_age = models.PositiveSmallIntegerField(default=25)
    licence_min_years = models.PositiveSmallIntegerField(default=2)
    security_deposit_minor = models.BigIntegerField(null=True, blank=True)

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"{self.make} {self.model} ({self.year})"


class ExperienceDetail(models.Model):
    """Extra fields of an experience listing (one row per experience listing)."""

    listing = models.OneToOneField(Listing, on_delete=models.CASCADE, primary_key=True, related_name="experience_detail")
    duration_minutes = models.PositiveIntegerField()
    languages = models.JSONField(default=list, help_text='Languages spoken, e.g. ["fr", "ar"].')
    meeting_point_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    meeting_point_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    meeting_point_text = models.CharField(max_length=255, blank=True)
    max_group = models.PositiveSmallIntegerField()
    includes = models.JSONField(default=list, blank=True, help_text="What is included, list of short texts.")

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"Experience detail of {self.listing_id}"


class RoomType(UUIDModel, SoftDeleteModel):
    """
    A kind of room (or dorm bed) sold by a hotel or hostel listing.

    ``unit_count`` is how many physical rooms or beds of this type exist: it
    is the default nightly inventory (``inventory.RoomTypeNight.total``,
    BR-AVL-02). ``booking_unit`` says whether one unit is a room or a bed
    (BR-AVL-03). A hotel or hostel needs at least one active room type to be
    submitted (BR-LST-01).
    """

    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="room_types")
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    booking_unit = models.CharField(max_length=4, choices=BookingUnit.choices, default=BookingUnit.ROOM)
    unit_count = models.PositiveSmallIntegerField(help_text="Physical rooms or beds of this type.")
    capacity_per_unit = models.PositiveSmallIntegerField(help_text="Guests per room (1 for a dorm bed).")
    base_price_minor = models.BigIntegerField(help_text="Per night and per unit, in centimes.")
    beds_description = models.CharField(max_length=120, blank=True)
    external_id = models.CharField(max_length=80, blank=True, help_text="Id of this room type in the hotel system (DEC-017).")
    integration = models.ForeignKey(
        "hosts.PropertyIntegration", on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
        help_text="Set when the room type is managed by a hotel system connection (DEC-017).",
    )
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Table options: ordering, indexes and database checks."""

        ordering = ["sort_order", "created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(unit_count__gt=0) & Q(capacity_per_unit__gt=0) & Q(base_price_minor__gt=0),
                name="room_type_positive_values",
            ),
        ]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"{self.name} ({self.listing_id})"


class ListingAmenity(models.Model):
    """Link table: one amenity of one listing."""

    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="amenity_links")
    # PROTECT: an amenity in use cannot be hard-deleted, it is deactivated (BR-LST-04).
    amenity = models.ForeignKey(Amenity, on_delete=models.PROTECT, related_name="listing_links")

    class Meta:
        """Table options: ordering, indexes and database checks."""

        constraints = [models.UniqueConstraint(fields=["listing", "amenity"], name="listing_amenity_unique")]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"{self.listing_id} / {self.amenity_id}"


class ListingPhoto(UUIDModel):
    """
    A photo of a listing, or of one of its room types.

    File storage is not built yet: this version stores the address given by
    the client in ``url`` (the design uses a ``media_asset`` row, BR-MED-01).
    A room photo also carries its listing, so one query loads every photo.
    """

    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="photos")
    room_type = models.ForeignKey(RoomType, on_delete=models.CASCADE, null=True, blank=True, related_name="photos")
    url = models.CharField(max_length=500)
    sort_order = models.IntegerField(default=0)
    caption = models.CharField(max_length=160, blank=True)
    is_cover = models.BooleanField(default=False)

    class Meta:
        """Table options: ordering, indexes and database checks."""

        ordering = ["sort_order", "id"]
        constraints = [
            # At most one cover photo per listing.
            models.UniqueConstraint(fields=["listing"], condition=Q(is_cover=True), name="listing_photo_one_cover"),
        ]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return self.url


class PropertyService(UUIDModel):
    """
    A service of a hotel or hostel: restaurant, spa, parking... (DEC-017).

    Typed by the host (``source = manual``) or imported from the hotel's own
    system (``source = integration``). ``price_minor`` empty means included
    or price on request.
    """

    KINDS = [
        ("restaurant", "Restaurant"), ("cafe", "Cafe"), ("spa", "Spa"), ("pool", "Pool"), ("gym", "Gym"),
        ("parking", "Parking"), ("conference_room", "Conference room"), ("airport_transfer", "Airport transfer"),
        ("other", "Other"),
    ]

    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="services")
    kind = models.CharField(max_length=24, choices=KINDS)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    opening_hours = models.JSONField(null=True, blank=True)
    price_minor = models.BigIntegerField(null=True, blank=True)
    external_id = models.CharField(max_length=80, blank=True, help_text="Id of the service in the hotel system.")
    source = models.CharField(max_length=12, choices=[("manual", "Manual"), ("integration", "Integration")], default="manual")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Table options: ordering, indexes and database checks."""

        ordering = ["created_at"]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"{self.kind}: {self.name}"
