"""
Input and output shapes of the catalog API.

Privacy rule (BR-SRC-03): the public serializers (``ListingCardSerializer``,
``ListingDetailSerializer``) never contain ``address_line``, ``latitude`` or
``longitude``; they only expose the public point. The host and admin
serializers show everything.
"""

from rest_framework import serializers

from apps.core.money import money_dict
from apps.geo.models import Commune

from . import services
from .models import (
    Amenity,
    BookingUnit,
    CancellationPolicy,
    Category,
    Listing,
    ListingPhoto,
    PropertyService,
    PropertyType,
    RoomType,
    Vertical,
)
from .types import ExperienceType


def _locale(serializer) -> str:
    """Language of the caller (``Accept-Language``), French by default."""
    request = serializer.context.get("request")
    code = (getattr(request, "LANGUAGE_CODE", None) or "fr")[:2] if request else "fr"
    return code if code in ("en", "fr", "ar") else "fr"


def commune_ref(commune, locale: str = "fr") -> dict | None:
    """Short public description of a commune and its wilaya (BR-SRC-02)."""
    if commune is None:
        return None
    return {
        "id": commune.id, "name": commune.name_for(locale),
        "wilaya_code": commune.wilaya_id, "wilaya_name": commune.wilaya.name_for(locale),
    }


def host_public_card(host_account) -> dict:
    """What guests see about a host: name, type, rating. No contact data before a booking."""
    return {
        "id": str(host_account.id), "display_name": host_account.display_name, "host_type": host_account.host_type,
        "rating_avg": float(host_account.rating_avg) if host_account.rating_avg is not None else None,
        "review_count": host_account.review_count, "verified": host_account.is_approved,
    }


def policy_dict(policy) -> dict | None:
    """API shape of a cancellation policy, with its refund windows (BR-CAN-01)."""
    if policy is None:
        return None
    return {
        "code": policy.code, "version": policy.version, "name_en": policy.name_en, "name_fr": policy.name_fr,
        "name_ar": policy.name_ar, "windows": policy.windows,
    }


# ---------------------------------------------------------------------------
# Reference lists
# ---------------------------------------------------------------------------
class AmenitySerializer(serializers.ModelSerializer):
    """An amenity with its labels and the verticals it applies to."""

    class Meta:
        """Which model and fields this serializer uses."""

        model = Amenity
        fields = ("id", "slug", "group_code", "name_en", "name_fr", "name_ar", "icon", "applies_to")


class PropertyTypeSerializer(serializers.ModelSerializer):
    """A property type of one vertical."""

    class Meta:
        """Which model and fields this serializer uses."""

        model = PropertyType
        fields = ("id", "vertical", "slug", "name_en", "name_fr", "name_ar")


class CategorySerializer(serializers.ModelSerializer):
    """A browsing category of one vertical."""

    class Meta:
        """Which model and fields this serializer uses."""

        model = Category
        fields = ("id", "vertical", "slug", "name_en", "name_fr", "name_ar", "icon", "sort_order")


class CancellationPolicySerializer(serializers.ModelSerializer):
    """A cancellation policy template with its refund windows (BR-CAN-01)."""

    class Meta:
        """Which model and fields this serializer uses."""

        model = CancellationPolicy
        fields = ("id", "code", "version", "name_en", "name_fr", "name_ar", "windows")


# ---------------------------------------------------------------------------
# Parts of a listing
# ---------------------------------------------------------------------------
class PhotoSerializer(serializers.ModelSerializer):
    """A photo of a listing or of one of its room types."""

    class Meta:
        """Which model and fields this serializer uses."""

        model = ListingPhoto
        fields = ("id", "url", "caption", "sort_order", "is_cover", "room_type_id")


class RoomTypeSerializer(serializers.ModelSerializer):
    """Public shape of a room type (no integration internals)."""

    base_price = serializers.SerializerMethodField()

    class Meta:
        """Which model and fields this serializer uses."""

        model = RoomType
        fields = ("id", "name", "description", "booking_unit", "unit_count", "capacity_per_unit", "base_price",
                  "beds_description", "sort_order")

    def get_base_price(self, obj) -> dict:
        """Price per night and per unit as ``{"amount_minor", "currency"}``."""
        return money_dict(obj.base_price_minor, obj.listing.currency)


class HostRoomTypeSerializer(RoomTypeSerializer):
    """Host shape of a room type: adds the active flag and the hotel system ids (DEC-017)."""

    class Meta(RoomTypeSerializer.Meta):
        """Which model and fields this serializer uses."""

        fields = RoomTypeSerializer.Meta.fields + ("base_price_minor", "is_active", "external_id", "integration_id")


class RoomTypeWriteSerializer(serializers.Serializer):
    """Body of ``POST /host/listings/{id}/room-types`` and ``PATCH /host/room-types/{id}``."""

    name = serializers.CharField(max_length=80)
    description = serializers.CharField(required=False, allow_blank=True)
    booking_unit = serializers.ChoiceField(choices=BookingUnit.choices, default=BookingUnit.ROOM)
    unit_count = serializers.IntegerField(min_value=1, max_value=10000)
    capacity_per_unit = serializers.IntegerField(min_value=1, max_value=50)
    base_price_minor = serializers.IntegerField(min_value=1)
    beds_description = serializers.CharField(required=False, allow_blank=True, max_length=120)
    sort_order = serializers.IntegerField(required=False)
    is_active = serializers.BooleanField(required=False)


class PropertyServiceSerializer(serializers.ModelSerializer):
    """A hotel or hostel service (restaurant, spa...), DEC-017."""

    price = serializers.SerializerMethodField()

    class Meta:
        """Which model and fields this serializer uses."""

        model = PropertyService
        fields = ("id", "kind", "name", "description", "opening_hours", "price", "price_minor", "source", "is_active")

    def get_price(self, obj) -> dict | None:
        """Price as money, or ``None`` when included or on request."""
        return money_dict(obj.price_minor, obj.listing.currency)


class PropertyServiceWriteSerializer(serializers.Serializer):
    """Body to create or change a manual service."""

    kind = serializers.ChoiceField(choices=PropertyService.KINDS)
    name = serializers.CharField(max_length=120)
    description = serializers.CharField(required=False, allow_blank=True)
    opening_hours = serializers.JSONField(required=False, allow_null=True)
    price_minor = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    is_active = serializers.BooleanField(required=False)


class PhotoWriteSerializer(serializers.Serializer):
    """Body of ``POST /host/listings/{id}/photos``. ``url`` until file uploads exist (BR-MED-01)."""

    url = serializers.CharField(max_length=500)
    caption = serializers.CharField(required=False, allow_blank=True, max_length=160, default="")
    is_cover = serializers.BooleanField(required=False, default=False)
    room_type_id = serializers.UUIDField(required=False, allow_null=True)


class PhotoUpdateSerializer(serializers.Serializer):
    """Body of ``PATCH /host/listings/{id}/photos/{photo_id}``."""

    caption = serializers.CharField(required=False, allow_blank=True, max_length=160)
    is_cover = serializers.BooleanField(required=False)


class PhotoOrderSerializer(serializers.Serializer):
    """Body of ``PUT /host/listings/{id}/photos/order``: every photo id, in the new order."""

    ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)


# ---------------------------------------------------------------------------
# Public listing shapes
# ---------------------------------------------------------------------------
class ListingCardSerializer(serializers.ModelSerializer):
    """
    A listing in search results. Only public data: the public point, never
    the exact one or the address (BR-SRC-03).
    """

    property_type = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    commune = serializers.SerializerMethodField()
    location_public = serializers.SerializerMethodField()
    cover_photo = serializers.SerializerMethodField()
    price_from = serializers.SerializerMethodField()
    price_unit = serializers.CharField(read_only=True)
    instant_bookable = serializers.SerializerMethodField()
    host_type = serializers.SerializerMethodField()
    rating_avg = serializers.SerializerMethodField()

    class Meta:
        """Which model and fields this serializer uses."""

        model = Listing
        fields = ("id", "reference", "vertical", "experience_type", "title", "property_type", "commune",
                  "location_public", "cover_photo", "price_from", "price_unit", "rating_avg", "review_count",
                  "instant_bookable", "host_type")

    def get_commune(self, obj) -> dict | None:
        """Commune and wilaya names in the caller's language."""
        return commune_ref(obj.commune, _locale(self))

    def get_location_public(self, obj) -> dict | None:
        """The fuzzed point (BR-SRC-03)."""
        if obj.public_latitude is None:
            return None
        return {"lat": float(obj.public_latitude), "lng": float(obj.public_longitude)}

    def get_cover_photo(self, obj) -> dict | None:
        """The cover photo, or the first photo when no cover is set."""
        photos = sorted(obj.photos.all(), key=lambda p: (not p.is_cover, p.sort_order))
        return {"url": photos[0].url, "caption": photos[0].caption} if photos else None

    def get_price_from(self, obj) -> dict:
        """Base price (lowest room price for hotels and hostels)."""
        return money_dict(obj.base_price_minor, obj.currency)

    def get_instant_bookable(self, obj) -> bool:
        """True when guests book at once, without waiting for the host (BR-BKG-02)."""
        return obj.effective_approval_mode == "instant"

    def get_host_type(self, obj) -> str:
        """individual, agency, hotel or hostel."""
        return obj.host_account.host_type

    def get_rating_avg(self, obj) -> float | None:
        """Average rating as a number."""
        return float(obj.rating_avg) if obj.rating_avg is not None else None


class ListingDetailSerializer(ListingCardSerializer):
    """Public listing page: card fields plus everything a guest needs to decide. Still no private data."""

    category = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    amenities = serializers.SerializerMethodField()
    photos = serializers.SerializerMethodField()
    room_types = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField()
    cancellation_policy = serializers.SerializerMethodField()
    cleaning_fee = serializers.SerializerMethodField()
    host = serializers.SerializerMethodField()
    vehicle_detail = serializers.SerializerMethodField()
    experience_detail = serializers.SerializerMethodField()

    class Meta(ListingCardSerializer.Meta):
        """Which model and fields this serializer uses."""

        fields = ListingCardSerializer.Meta.fields + (
            "description", "source_language", "category", "capacity_guests", "bedrooms", "beds", "bathrooms",
            "surface_m2", "cleaning_fee", "weekly_discount_bp", "monthly_discount_bp", "min_nights", "max_nights",
            "advance_notice_days", "available_from", "available_until", "check_in_time", "check_out_time",
            "house_rules", "amenities", "photos", "room_types", "services", "cancellation_policy", "host",
            "vehicle_detail", "experience_detail",
        )

    def get_amenities(self, obj) -> list[dict]:
        """Amenities of the listing."""
        return AmenitySerializer([link.amenity for link in obj.amenity_links.select_related("amenity")], many=True).data

    def get_photos(self, obj) -> list[dict]:
        """Every photo, in gallery order."""
        return PhotoSerializer(obj.photos.all(), many=True).data

    def get_room_types(self, obj) -> list[dict]:
        """Active room types (hotels and hostels only)."""
        rooms = RoomType.objects.alive().filter(listing=obj, is_active=True).select_related("listing")
        return RoomTypeSerializer(rooms, many=True).data

    def get_services(self, obj) -> list[dict]:
        """Active services of a hotel or hostel (DEC-017)."""
        return PropertyServiceSerializer(obj.services.filter(is_active=True).select_related("listing"), many=True).data

    def get_cancellation_policy(self, obj) -> dict | None:
        """Policy and refund windows (BR-CAN-01)."""
        return policy_dict(obj.cancellation_policy)

    def get_cleaning_fee(self, obj) -> dict:
        """Cleaning fee as money."""
        return money_dict(obj.cleaning_fee_minor, obj.currency)

    def get_host(self, obj) -> dict:
        """Public card of the host."""
        return host_public_card(obj.host_account)

    def get_vehicle_detail(self, obj) -> dict | None:
        """Vehicle fields, for vehicles only."""
        detail = getattr(obj, "vehicle_detail", None) if obj.vertical == Vertical.VEHICLE else None
        if detail is None:
            return None
        return {
            "make": detail.make, "model": detail.model, "year": detail.year, "seats": detail.seats,
            "transmission": detail.transmission, "fuel": detail.fuel, "daily_km_limit": detail.daily_km_limit,
            "driver_min_age": detail.driver_min_age, "licence_min_years": detail.licence_min_years,
            "security_deposit": money_dict(detail.security_deposit_minor, obj.currency),
        }

    def get_experience_detail(self, obj) -> dict | None:
        """Experience fields, for experiences only. The meeting point is public by nature."""
        detail = getattr(obj, "experience_detail", None) if obj.vertical == Vertical.EXPERIENCE else None
        if detail is None:
            return None
        point = None
        if detail.meeting_point_latitude is not None:
            point = {"lat": float(detail.meeting_point_latitude), "lng": float(detail.meeting_point_longitude)}
        return {
            "duration_minutes": detail.duration_minutes, "languages": detail.languages, "meeting_point": point,
            "meeting_point_text": detail.meeting_point_text, "max_group": detail.max_group, "includes": detail.includes,
        }


# ---------------------------------------------------------------------------
# Host and admin shapes
# ---------------------------------------------------------------------------
class HostListingSerializer(ListingDetailSerializer):
    """
    A listing as its host sees it: public fields plus private location,
    status, moderation note and raw prices (BR-SRC-03 allows the host to see
    the exact point).
    """

    room_types = serializers.SerializerMethodField()

    class Meta(ListingDetailSerializer.Meta):
        """Which model and fields this serializer uses."""

        fields = ListingDetailSerializer.Meta.fields + (
            "status", "moderation_note", "inventory_kind", "address_line", "latitude", "longitude",
            "base_price_minor", "cleaning_fee_minor", "approval_mode", "submitted_at", "published_at",
            "created_at", "updated_at",
        )

    def get_room_types(self, obj) -> list[dict]:
        """Every non-deleted room type, active or not."""
        rooms = RoomType.objects.alive().filter(listing=obj).select_related("listing")
        return HostRoomTypeSerializer(rooms, many=True).data


class AdminListingSerializer(HostListingSerializer):
    """A listing in the admin console: host view plus deletion data."""

    class Meta(HostListingSerializer.Meta):
        """Which model and fields this serializer uses."""

        fields = HostListingSerializer.Meta.fields + ("deleted_at", "status_before_delete")


class AdminListingRowSerializer(serializers.ModelSerializer):
    """A line of the admin listing queue (light, no nested lists)."""

    host = serializers.SerializerMethodField()

    class Meta:
        """Which model and fields this serializer uses."""

        model = Listing
        fields = ("id", "reference", "vertical", "title", "status", "host", "submitted_at", "published_at",
                  "created_at", "deleted_at")

    def get_host(self, obj) -> dict:
        """Host name, type and id."""
        return host_public_card(obj.host_account)


class VehicleDetailWriteSerializer(serializers.Serializer):
    """Vehicle fields sent by the host."""

    make = serializers.CharField(max_length=40)
    model = serializers.CharField(max_length=60)
    year = serializers.IntegerField(min_value=1950, max_value=2100)
    seats = serializers.IntegerField(min_value=1, max_value=60)
    transmission = serializers.ChoiceField(choices=["manual", "automatic"])
    fuel = serializers.CharField(max_length=12)
    daily_km_limit = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    driver_min_age = serializers.IntegerField(required=False, min_value=18, max_value=99)
    licence_min_years = serializers.IntegerField(required=False, min_value=0, max_value=50)
    security_deposit_minor = serializers.IntegerField(required=False, allow_null=True, min_value=0)


class ExperienceDetailWriteSerializer(serializers.Serializer):
    """Experience fields sent by the host."""

    duration_minutes = serializers.IntegerField(min_value=15)
    languages = serializers.ListField(child=serializers.CharField(max_length=2), default=list)
    meeting_point_latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    meeting_point_longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    meeting_point_text = serializers.CharField(required=False, allow_blank=True, max_length=255)
    max_group = serializers.IntegerField(min_value=1)
    includes = serializers.ListField(child=serializers.CharField(max_length=120), required=False)


class ListingWriteSerializer(serializers.Serializer):
    """
    Body of ``POST /host/listings`` (create) and ``PATCH /host/listings/{id}`` (partial).

    ``cancellation_policy`` is a code (flexible, moderate, strict); the
    current version is stored. ``amenities`` is a list of slugs. Business
    rules (host offer, experience type, taxonomy fit) run in ``services.py``.
    """

    vertical = serializers.ChoiceField(choices=Vertical.choices)
    experience_type = serializers.ChoiceField(choices=ExperienceType.choices, required=False, allow_null=True)
    title = serializers.CharField(max_length=120)
    description = serializers.CharField(required=False, allow_blank=True)
    source_language = serializers.ChoiceField(choices=["en", "fr", "ar"], required=False)
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), required=False, allow_null=True)
    property_type = serializers.PrimaryKeyRelatedField(queryset=PropertyType.objects.all(), required=False, allow_null=True)
    commune = serializers.PrimaryKeyRelatedField(queryset=Commune.objects.all(), required=False, allow_null=True)
    address_line = serializers.CharField(required=False, allow_blank=True, max_length=255)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True,
                                        min_value=-90, max_value=90)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True,
                                         min_value=-180, max_value=180)
    capacity_guests = serializers.IntegerField(required=False, min_value=1, max_value=500)
    bedrooms = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    beds = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    bathrooms = serializers.DecimalField(max_digits=3, decimal_places=1, required=False, allow_null=True, min_value=0)
    surface_m2 = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    base_price_minor = serializers.IntegerField(required=False, min_value=0)
    cleaning_fee_minor = serializers.IntegerField(required=False, min_value=0)
    weekly_discount_bp = serializers.IntegerField(required=False, min_value=0, max_value=9000)
    monthly_discount_bp = serializers.IntegerField(required=False, min_value=0, max_value=9000)
    min_nights = serializers.IntegerField(required=False, min_value=1, max_value=365)
    max_nights = serializers.IntegerField(required=False, min_value=1, max_value=365)
    advance_notice_days = serializers.IntegerField(required=False, min_value=0, max_value=365)
    available_from = serializers.DateField(required=False, allow_null=True)
    available_until = serializers.DateField(required=False, allow_null=True)
    check_in_time = serializers.TimeField(required=False, allow_null=True)
    check_out_time = serializers.TimeField(required=False, allow_null=True)
    approval_mode = serializers.ChoiceField(choices=["instant", "request"], required=False, allow_null=True)
    cancellation_policy = serializers.CharField(required=False, max_length=20)
    house_rules = serializers.ListField(child=serializers.CharField(max_length=200), required=False)
    amenities = serializers.ListField(child=serializers.SlugField(), required=False)
    vehicle_detail = VehicleDetailWriteSerializer(required=False)
    experience_detail = ExperienceDetailWriteSerializer(required=False)

    def validate_cancellation_policy(self, value: str):
        """Turn a policy code into the current policy row (400 ``invalid_policy`` when unknown)."""
        return services.current_policy(value)


class ReferenceTypeSerializer(serializers.Serializer):
    """Shape of an experience or trip type in reference lists."""

    key = serializers.CharField()
    labels = serializers.DictField()
    label = serializers.CharField()

