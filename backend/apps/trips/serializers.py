"""Input and output shapes of the trips API."""

from rest_framework import serializers

from apps.catalog.serializers import _locale, commune_ref, host_public_card, policy_dict
from apps.catalog.services import current_policy
from apps.catalog.types import TripType
from apps.core.money import money_dict
from apps.geo.models import Commune

from . import selectors, services
from .models import DepartureStatus, Trip, TripDeparture, TripItineraryDay, TripPhoto


class DepartureSerializer(serializers.ModelSerializer):
    """Public shape of a departure: dates, seats left, price per person."""

    seats_left = serializers.IntegerField(read_only=True)
    price_per_person = serializers.SerializerMethodField()

    class Meta:
        """Which model and fields this serializer uses."""

        model = TripDeparture
        fields = ("id", "starts_on", "ends_on", "seats_total", "seats_left", "price_per_person", "status")

    def get_price_per_person(self, obj) -> dict:
        """Departure price, or the trip price."""
        return money_dict(services.departure_price_minor(obj), obj.trip.currency)


class HostDepartureSerializer(DepartureSerializer):
    """Host shape of a departure: adds the held and booked counters."""

    class Meta(DepartureSerializer.Meta):
        """Which model and fields this serializer uses."""

        fields = DepartureSerializer.Meta.fields + ("seats_held", "seats_booked", "price_per_person_minor")


class DepartureWriteSerializer(serializers.Serializer):
    """Body to create or change a departure."""

    starts_on = serializers.DateField()
    ends_on = serializers.DateField()
    seats_total = serializers.IntegerField(min_value=1, max_value=1000)
    price_per_person_minor = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    status = serializers.ChoiceField(choices=[DepartureStatus.SCHEDULED, DepartureStatus.GUARANTEED], required=False)


class ItineraryDaySerializer(serializers.ModelSerializer):
    """One day of the programme."""

    class Meta:
        """Which model and fields this serializer uses."""

        model = TripItineraryDay
        fields = ("day_number", "title", "description", "overnight_commune")


class ItineraryWriteSerializer(serializers.Serializer):
    """Body of ``PUT /host/trips/{id}/itinerary``: the whole programme."""

    days = ItineraryDaySerializer(many=True)


class TripPhotoSerializer(serializers.ModelSerializer):
    """A trip photo."""

    class Meta:
        """Which model and fields this serializer uses."""

        model = TripPhoto
        fields = ("id", "url", "caption", "sort_order", "is_cover")


class TripCardSerializer(serializers.ModelSerializer):
    """A trip in search results."""

    price_per_person = serializers.SerializerMethodField()
    start_commune = serializers.SerializerMethodField()
    cover_photo = serializers.SerializerMethodField()
    agency = serializers.SerializerMethodField()
    next_departure = serializers.SerializerMethodField()
    rating_avg = serializers.SerializerMethodField()

    class Meta:
        """Which model and fields this serializer uses."""

        model = Trip
        fields = ("id", "reference", "slug", "trip_type", "title", "duration_days", "group_min", "group_max",
                  "price_per_person", "start_commune", "cover_photo", "agency", "next_departure", "rating_avg",
                  "review_count")

    def get_price_per_person(self, obj) -> dict:
        """Trip price per person."""
        return money_dict(obj.price_per_person_minor, obj.currency)

    def get_start_commune(self, obj) -> dict | None:
        """Where the trip starts."""
        return commune_ref(obj.start_commune, _locale(self))

    def get_cover_photo(self, obj) -> dict | None:
        """Cover photo, else the first one."""
        photos = sorted(obj.photos.all(), key=lambda p: (not p.is_cover, p.sort_order))
        return {"url": photos[0].url, "caption": photos[0].caption} if photos else None

    def get_agency(self, obj) -> dict:
        """Public card of the agency."""
        return host_public_card(obj.host_account)

    def get_next_departure(self, obj) -> dict | None:
        """The soonest open departure."""
        first = selectors.upcoming_departures(obj).first()
        return DepartureSerializer(first).data if first else None

    def get_rating_avg(self, obj) -> float | None:
        """Average rating as a number."""
        return float(obj.rating_avg) if obj.rating_avg is not None else None


class TripDetailSerializer(TripCardSerializer):
    """Public trip page: itinerary, upcoming departures with seats left, policy, agency card."""

    itinerary = ItineraryDaySerializer(many=True, read_only=True)
    departures = serializers.SerializerMethodField()
    photos = TripPhotoSerializer(many=True, read_only=True)
    cancellation_policy = serializers.SerializerMethodField()
    instant_bookable = serializers.SerializerMethodField()

    class Meta(TripCardSerializer.Meta):
        """Which model and fields this serializer uses."""

        fields = TripCardSerializer.Meta.fields + (
            "description", "source_language", "inclusions", "exclusions", "meeting_point_text", "itinerary",
            "departures", "photos", "cancellation_policy", "instant_bookable",
        )

    def get_departures(self, obj) -> list[dict]:
        """Upcoming open departures."""
        return DepartureSerializer(selectors.upcoming_departures(obj), many=True).data

    def get_cancellation_policy(self, obj) -> dict | None:
        """Policy and refund windows (BR-CAN-01)."""
        return policy_dict(obj.cancellation_policy)

    def get_instant_bookable(self, obj) -> bool:
        """True when bookings are confirmed without the agency's answer."""
        return obj.effective_approval_mode == "instant"


class HostTripSerializer(TripDetailSerializer):
    """A trip as its agency sees it: every departure, status and moderation note."""

    class Meta(TripDetailSerializer.Meta):
        """Which model and fields this serializer uses."""

        fields = TripDetailSerializer.Meta.fields + (
            "status", "moderation_note", "price_per_person_minor", "meeting_point_latitude", "meeting_point_longitude",
            "approval_mode", "submitted_at", "published_at", "created_at", "updated_at",
        )

    def get_departures(self, obj) -> list[dict]:
        """All departures, past and cancelled included."""
        return HostDepartureSerializer(obj.departures.all(), many=True).data


class AdminTripSerializer(HostTripSerializer):
    """A trip in the admin console, with deletion data."""

    class Meta(HostTripSerializer.Meta):
        """Which model and fields this serializer uses."""

        fields = HostTripSerializer.Meta.fields + ("deleted_at", "status_before_delete")


class TripWriteSerializer(serializers.Serializer):
    """Body of ``POST /host/trips`` and ``PATCH /host/trips/{id}``. ``cancellation_policy`` is a code."""

    trip_type = serializers.ChoiceField(choices=TripType.choices, required=False, allow_null=True)
    title = serializers.CharField(max_length=140)
    description = serializers.CharField(required=False, allow_blank=True)
    source_language = serializers.ChoiceField(choices=["en", "fr", "ar"], required=False)
    duration_days = serializers.IntegerField(min_value=1, max_value=60)
    group_min = serializers.IntegerField(required=False, min_value=1)
    group_max = serializers.IntegerField(min_value=1, max_value=1000)
    price_per_person_minor = serializers.IntegerField(min_value=1)
    inclusions = serializers.ListField(child=serializers.CharField(max_length=200), required=False)
    exclusions = serializers.ListField(child=serializers.CharField(max_length=200), required=False)
    start_commune = serializers.PrimaryKeyRelatedField(queryset=Commune.objects.all(), required=False, allow_null=True)
    meeting_point_latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    meeting_point_longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    meeting_point_text = serializers.CharField(required=False, allow_blank=True, max_length=255)
    cancellation_policy = serializers.CharField(required=False, max_length=20)
    approval_mode = serializers.ChoiceField(choices=["instant", "request"], required=False, allow_null=True)

    def validate_cancellation_policy(self, value: str):
        """Policy code to the current policy row."""
        return current_policy(value)
