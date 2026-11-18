"""
Input and output shapes of the catalog API.

Privacy rule (BR-SRC-03): the public serializers (``ListingCardSerializer``,
``ListingDetailSerializer``) never contain ``address_line``, ``latitude`` or
``longitude``; they only expose the public point. The host and admin
serializers show everything.
"""

from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers

from apps.core.money import money_dict
from apps.geo.models import Commune

from . import selectors, services, workflow
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
    """
    What guests see about a host: name, type, rating. No contact data before a booking.

    ``organization_id`` and ``organization_slug`` link an organisation host to
    its public page (``GET /organizations/{slug}``); ``user_id`` links an
    individual host to its public profile (``GET /users/{id}``). Both pages are
    public already, so these ids reveal nothing new.
    """
    org = host_account.organization if host_account.organization_id else None
    return {
        "id": str(host_account.id), "display_name": host_account.display_name, "host_type": host_account.host_type,
        "rating_avg": float(host_account.rating_avg) if host_account.rating_avg is not None else None,
        "review_count": host_account.review_count, "verified": host_account.is_approved,
        "organization_id": str(org.id) if org else None,
        "organization_slug": org.slug if org else None,
        "user_id": str(host_account.user_id) if host_account.user_id else None,
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


def labels_of(obj) -> dict:
    """The ``LocalizedText`` of a row with ``name_en``, ``name_fr``, ``name_ar`` columns."""
    return {"en": obj.name_en, "fr": obj.name_fr, "ar": obj.name_ar}


@extend_schema_serializer(component_name="TaxonomyLabels")
class LocalizedTextSerializer(serializers.Serializer):
    """``LocalizedText``: the same text in the three languages."""

    en = serializers.CharField(max_length=80)
    fr = serializers.CharField(max_length=80)
    ar = serializers.CharField(max_length=80)


@extend_schema_serializer(component_name="CatalogMoneyInput")
class MoneyInputSerializer(serializers.Serializer):
    """``MoneyInput``: a positive amount in centimes and its currency (only DZD in this version)."""

    amount_minor = serializers.IntegerField(min_value=1)
    currency = serializers.ChoiceField(choices=["DZD"])


class _LabelledSerializer(serializers.ModelSerializer):
    """Base of the taxonomy shapes: ``label`` in the caller's language and ``labels`` in all three."""

    label = serializers.SerializerMethodField()
    labels = serializers.SerializerMethodField()

    def get_label(self, obj) -> str:
        """Name in the ``Accept-Language`` of the caller (French by default)."""
        return getattr(obj, f"name_{_locale(self)}")

    def get_labels(self, obj) -> dict:
        """Names in en, fr and ar."""
        return labels_of(obj)


class CategorySerializer(_LabelledSerializer):
    """``Category`` of the API: a browsing category of one vertical (BR-LST-04)."""

    class Meta:
        """Which model and fields this serializer uses."""

        model = Category
        fields = ("id", "vertical", "slug", "label", "labels", "icon", "sort_order", "is_active")


class AdminCategorySerializer(CategorySerializer):
    """``Category`` in admin answers: adds ``listing_count``."""

    listing_count = serializers.IntegerField(read_only=True, default=0)

    class Meta(CategorySerializer.Meta):
        """Which model and fields this serializer uses."""

        fields = CategorySerializer.Meta.fields + ("listing_count",)

    def to_representation(self, instance) -> dict:
        """Turn a missing count (row never used) into 0."""
        data = super().to_representation(instance)
        data["listing_count"] = data.get("listing_count") or 0
        return data


class PropertyTypeSerializer(_LabelledSerializer):
    """``PropertyType`` of the API: the kind of place inside one vertical (BR-LST-04)."""

    class Meta:
        """Which model and fields this serializer uses."""

        model = PropertyType
        fields = ("id", "vertical", "slug", "label", "labels", "is_active")


class AdminPropertyTypeSerializer(PropertyTypeSerializer):
    """``PropertyType`` in admin answers: adds ``listing_count``."""

    listing_count = serializers.IntegerField(read_only=True, default=0)

    class Meta(PropertyTypeSerializer.Meta):
        """Which model and fields this serializer uses."""

        fields = PropertyTypeSerializer.Meta.fields + ("listing_count",)

    def to_representation(self, instance) -> dict:
        """Turn a missing count (row never used) into 0."""
        data = super().to_representation(instance)
        data["listing_count"] = data.get("listing_count") or 0
        return data


class ReferenceAmenitySerializer(_LabelledSerializer):
    """``Amenity`` of the API: one equipment or feature and the verticals it applies to (BR-LST-04)."""

    group = serializers.CharField(source="group_code")

    class Meta:
        """Which model and fields this serializer uses."""

        model = Amenity
        fields = ("id", "slug", "group", "label", "labels", "icon", "applies_to", "is_active")


class AdminAmenitySerializer(ReferenceAmenitySerializer):
    """``Amenity`` in admin answers: adds ``listing_count``."""

    listing_count = serializers.IntegerField(read_only=True, default=0)

    class Meta(ReferenceAmenitySerializer.Meta):
        """Which model and fields this serializer uses."""

        fields = ReferenceAmenitySerializer.Meta.fields + ("listing_count",)


SLUG_PATTERN = r"^[a-z0-9-]{2,60}$"
AMENITY_GROUPS = ["essentials", "features", "location", "safety"]


class CategoryWriteSerializer(serializers.Serializer):
    """``CategoryWrite``: body of ``POST`` (all required but icon, sort, active) and ``PATCH`` (any subset)."""

    vertical = serializers.ChoiceField(choices=Vertical.choices)
    slug = serializers.RegexField(SLUG_PATTERN)
    labels = LocalizedTextSerializer()
    icon = serializers.CharField(max_length=40, required=False, allow_null=True, allow_blank=True)
    sort_order = serializers.IntegerField(required=False)
    is_active = serializers.BooleanField(required=False)


class PropertyTypeWriteSerializer(serializers.Serializer):
    """``PropertyTypeWrite``: body of ``POST`` and ``PATCH /admin/property-types``."""

    vertical = serializers.ChoiceField(choices=Vertical.choices)
    slug = serializers.RegexField(SLUG_PATTERN)
    labels = LocalizedTextSerializer()
    is_active = serializers.BooleanField(required=False)


class AmenityWriteSerializer(serializers.Serializer):
    """``AmenityWrite``: body of ``POST`` and ``PATCH /admin/amenities``."""

    slug = serializers.RegexField(SLUG_PATTERN)
    group = serializers.ChoiceField(choices=AMENITY_GROUPS)
    labels = LocalizedTextSerializer()
    icon = serializers.CharField(max_length=40, required=False, allow_null=True, allow_blank=True)
    applies_to = serializers.ListField(child=serializers.ChoiceField(choices=Vertical.choices), allow_empty=False)
    is_active = serializers.BooleanField(required=False)


class CancellationPolicySerializer(serializers.ModelSerializer):
    """``CancellationPolicy`` of the API: a policy template with its refund windows (BR-CAN-01)."""

    label = serializers.SerializerMethodField()
    labels = serializers.SerializerMethodField()

    class Meta:
        """Which model and fields this serializer uses."""

        model = CancellationPolicy
        fields = ("code", "version", "label", "labels", "windows")

    def get_label(self, obj) -> str:
        """Name in the caller's language."""
        return getattr(obj, f"name_{_locale(self)}")

    def get_labels(self, obj) -> dict:
        """Names in en, fr and ar."""
        return labels_of(obj)


class LabeledValueSerializer(serializers.Serializer):
    """``LabeledValue``: an id with its label in the caller's language and in all three."""

    id = serializers.CharField()
    label = serializers.CharField()
    labels = LocalizedTextSerializer()


class ReferenceDataSerializer(serializers.Serializer):
    """``ReferenceData``: every shared list in one answer (``GET /reference``, DEC-015). Schema only."""

    version = serializers.CharField()
    verticals = LabeledValueSerializer(many=True)
    experience_types = LabeledValueSerializer(many=True)
    trip_types = LabeledValueSerializer(many=True)
    amenities = ReferenceAmenitySerializer(many=True)
    property_types = PropertyTypeSerializer(many=True)
    categories = CategorySerializer(many=True)
    cancellation_policies = CancellationPolicySerializer(many=True)
    host_offer_rules = serializers.DictField(child=serializers.ListField(child=serializers.CharField()))
    locales = serializers.ListField(child=serializers.CharField())


class HostStatusChangeSerializer(serializers.Serializer):
    """``HostStatusChange``: body of ``POST /host/listings|trips/{id}/status`` (BR-LST-03)."""

    status = serializers.ChoiceField(choices=["pending_review", "draft", "paused", "published", "archived"])
    note = serializers.CharField(max_length=2000, required=False, allow_blank=True)


class AdminStatusChangeSerializer(serializers.Serializer):
    """``AdminStatusChange``: body of ``POST /admin/listings|trips/{id}/status`` (BR-LST-03)."""

    status = serializers.ChoiceField(choices=[
        "draft", "pending_review", "changes_requested", "published", "paused", "rejected", "suspended", "archived",
        "deleted",
    ])
    reason_code = serializers.CharField(max_length=60, required=False, allow_null=True, allow_blank=True)
    reason = serializers.CharField(max_length=2000, required=False, allow_null=True, allow_blank=True)


class FeaturedUpdateSerializer(serializers.Serializer):
    """``FeaturedUpdate``: body of ``PUT /admin/listings/{id}/featured`` (LST-09)."""

    is_featured = serializers.BooleanField()
    placement = serializers.ChoiceField(choices=["home_weekend", "home_hero", "search_top"], required=False)
    position = serializers.IntegerField(required=False, min_value=0, max_value=32767)
    starts_at = serializers.DateTimeField(required=False)
    ends_at = serializers.DateTimeField(required=False, allow_null=True)


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


class PhotoRefSerializer(serializers.ModelSerializer):
    """``PhotoRef``: a photo as clients reference it, by ``media_id`` (BR-MED-01)."""

    media_id = serializers.UUIDField(source="media_ref", read_only=True)
    thumb_url = serializers.CharField(source="url", read_only=True)

    class Meta:
        """Which model and fields this serializer uses."""

        model = ListingPhoto
        fields = ("media_id", "url", "thumb_url", "caption", "is_cover", "width", "height")


class PhotosReplaceItemSerializer(serializers.Serializer):
    """One entry of ``PhotosReplace.photos``."""

    media_id = serializers.UUIDField()
    caption = serializers.CharField(max_length=160, required=False, allow_null=True, allow_blank=True)


class PhotosReplaceSerializer(serializers.Serializer):
    """``PhotosReplace``: body of ``PUT /host/listings/{id}/photos``, the gallery order and the cover."""

    photos = PhotosReplaceItemSerializer(many=True)
    cover_media_id = serializers.UUIDField()


class PhotoListSerializer(serializers.Serializer):
    """Answer of ``PUT /host/listings/{id}/photos``: ``{"results": [PhotoRef]}``. Schema only."""

    results = PhotoRefSerializer(many=True)


class HostRoomTypeSerializer(RoomTypeSerializer):
    """
    ``RoomType`` as its host sees it: adds the active flag, amenity ids,
    photos and the hotel system ids (DEC-017).
    """

    amenity_ids = serializers.SerializerMethodField()
    photos = serializers.SerializerMethodField()

    class Meta(RoomTypeSerializer.Meta):
        """Which model and fields this serializer uses."""

        fields = RoomTypeSerializer.Meta.fields + (
            "base_price_minor", "is_active", "amenity_ids", "photos", "external_id", "integration_id",
        )

    def get_amenity_ids(self, obj) -> list[str]:
        """Ids of the room amenities."""
        return [str(link.amenity_id) for link in obj.amenity_links.all()]

    def get_photos(self, obj) -> list[dict]:
        """Photos of this room type, in order."""
        return PhotoRefSerializer(obj.photos.all(), many=True).data


class RoomTypeWriteSerializer(serializers.Serializer):
    """
    ``RoomTypeWrite``: body of ``POST /host/listings/{id}/room-types`` and
    ``PATCH /host/listings/{id}/room-types/{room_type_id}`` (any subset).

    The price is ``base_price`` (``MoneyInput``); ``base_price_minor`` is
    still read for older clients. ``photo_media_ids`` waits for the media app.
    """

    name = serializers.CharField(max_length=80)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    booking_unit = serializers.ChoiceField(choices=BookingUnit.choices, default=BookingUnit.ROOM)
    unit_count = serializers.IntegerField(min_value=1, max_value=10000)
    capacity_per_unit = serializers.IntegerField(min_value=1, max_value=50)
    base_price = MoneyInputSerializer(required=False)
    base_price_minor = serializers.IntegerField(min_value=1, required=False)
    beds_description = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=120)
    sort_order = serializers.IntegerField(required=False)
    is_active = serializers.BooleanField(required=False)
    amenity_ids = serializers.ListField(child=serializers.UUIDField(), required=False)

    def validate(self, attrs: dict) -> dict:
        """Fold ``base_price`` into ``base_price_minor``; a new room type needs a price; nulls become empty text."""
        money = attrs.pop("base_price", None)
        if money is not None:
            attrs["base_price_minor"] = money["amount_minor"]
        if not self.partial and "base_price_minor" not in attrs:
            raise serializers.ValidationError({"base_price": ["Required."]})
        for field in ("description", "beds_description"):
            if field in attrs and attrs[field] is None:
                attrs[field] = ""
        return attrs


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
    # Search facts (read-only, additive): what the website's search filters count and match on.
    amenity_slugs = serializers.SerializerMethodField()
    cancellation_policy_code = serializers.SerializerMethodField()
    star_rating = serializers.SerializerMethodField()
    vehicle_summary = serializers.SerializerMethodField()
    experience_summary = serializers.SerializerMethodField()
    host_card = serializers.SerializerMethodField()

    class Meta:
        """Which model and fields this serializer uses."""

        model = Listing
        fields = ("id", "reference", "vertical", "experience_type", "title", "property_type", "commune",
                  "location_public", "cover_photo", "price_from", "price_unit", "rating_avg", "review_count",
                  "instant_bookable", "host_type", "capacity_guests", "bedrooms", "bathrooms", "amenity_slugs",
                  "cancellation_policy_code", "star_rating", "vehicle_summary", "experience_summary", "host_card")

    def get_amenity_slugs(self, obj) -> list[str]:
        """Slugs of the listing amenities (uses the prefetch of ``public_listings`` when present)."""
        return sorted(link.amenity.slug for link in obj.amenity_links.all())

    def get_cancellation_policy_code(self, obj) -> str | None:
        """flexible, moderate or strict."""
        return obj.cancellation_policy.code if obj.cancellation_policy_id else None

    def get_star_rating(self, obj) -> int | None:
        """Hotel stars of the organisation, when it has some."""
        org = obj.host_account.organization if obj.host_account.organization_id else None
        return org.star_rating if org else None

    def get_vehicle_summary(self, obj) -> dict | None:
        """Seats, transmission and fuel of a vehicle (filters), else null."""
        detail = getattr(obj, "vehicle_detail", None) if obj.vertical == Vertical.VEHICLE else None
        if detail is None:
            return None
        return {"make": detail.make, "model": detail.model, "year": detail.year, "seats": detail.seats,
                "transmission": detail.transmission, "fuel": detail.fuel}

    def get_experience_summary(self, obj) -> dict | None:
        """Length, languages and group size of an experience (filters), else null."""
        detail = getattr(obj, "experience_detail", None) if obj.vertical == Vertical.EXPERIENCE else None
        if detail is None:
            return None
        return {"duration_minutes": detail.duration_minutes, "languages": detail.languages,
                "max_group": detail.max_group}

    def get_host_card(self, obj) -> dict:
        """Public card of the host (name, type, links to its public page)."""
        return host_public_card(obj.host_account)

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
            "description", "source_language", "category", "beds", "surface_m2", "cleaning_fee", "weekly_discount_bp", "monthly_discount_bp", "min_nights", "max_nights",
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
            "base_price_minor", "cleaning_fee_minor", "approval_mode", "allowed_status_changes", "submitted_at",
            "published_at", "created_at", "updated_at",
        )

    allowed_status_changes = serializers.SerializerMethodField()

    def get_room_types(self, obj) -> list[dict]:
        """Every non-deleted room type, active or not."""
        rooms = RoomType.objects.alive().filter(listing=obj).select_related("listing")
        return HostRoomTypeSerializer(rooms, many=True).data

    def get_allowed_status_changes(self, obj) -> list[str]:
        """Statuses the host may ask for now (table 4a, BR-LST-03): what the status buttons show."""
        return workflow.host_targets(obj)


class AdminListingSerializer(HostListingSerializer):
    """A listing in the admin console: host view plus deletion data and the featured flag (LST-09)."""

    is_featured = serializers.SerializerMethodField()

    class Meta(HostListingSerializer.Meta):
        """Which model and fields this serializer uses."""

        fields = HostListingSerializer.Meta.fields + ("deleted_at", "status_before_delete", "is_featured")

    def get_is_featured(self, obj) -> bool:
        """True when a featured placement is live now."""
        return selectors.is_featured(obj)


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
