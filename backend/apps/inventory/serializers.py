"""Input and output shapes of the inventory API (host calendar and slots)."""

from datetime import timedelta

from rest_framework import serializers

from apps.catalog.serializers import MoneyInputSerializer
from apps.core.money import money_dict

from apps.core.models import OutboxMessage

from .models import ExperienceSlot, InventoryConflict

# Most days one calendar edit may touch (DateSelection: "at most 366 days").
MAX_DAYS = 366
# Bounds of a special price, in centimes: 100 to 10,000,000 DZD (CalendarPrices).
MIN_PRICE_MINOR = 100 * 100
MAX_PRICE_MINOR = 10_000_000 * 100


class DateRangeSerializer(serializers.Serializer):
    """``DateSelection.range``: first and last day, both included."""

    # ``from`` is a Python keyword: declared below with its JSON name.
    to = serializers.DateField()

    def get_fields(self):
        """Add the ``from`` field under its JSON name."""
        fields = super().get_fields()
        fields["from"] = serializers.DateField()
        return fields


class DateSelectionSerializer(serializers.Serializer):
    """
    ``DateSelection``: explicit ``dates`` or an inclusive ``range``, at most
    366 days, and an optional ``room_type_id`` (hotels and hostels edit one
    room type, AVL-03). ``validated_data["days"]`` holds the chosen days.
    """

    dates = serializers.ListField(child=serializers.DateField(), required=False, max_length=MAX_DAYS)
    range = DateRangeSerializer(required=False)
    room_type_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs: dict) -> dict:
        """Exactly one of ``dates`` and ``range``; the range is turned into days (at most 366)."""
        if ("dates" in attrs) == ("range" in attrs):
            raise serializers.ValidationError({"dates": ["Send either dates or range."]})
        if "range" in attrs:
            first, last = attrs["range"]["from"], attrs["range"]["to"]
            if last < first or (last - first).days >= MAX_DAYS:
                raise serializers.ValidationError({"range": [f"to on or after from, at most {MAX_DAYS} days."]})
            attrs["days"] = [first + timedelta(days=i) for i in range((last - first).days + 1)]
        else:
            if not attrs["dates"]:
                raise serializers.ValidationError({"dates": ["At least one date."]})
            attrs["days"] = attrs["dates"]
        return attrs


class CalendarBlocksSerializer(DateSelectionSerializer):
    """``CalendarBlocks``: body of ``PUT /host/listings/{id}/calendar/blocks``, close or open days."""

    blocked = serializers.BooleanField()
    note = serializers.CharField(max_length=120, required=False, allow_blank=True)


class CalendarPricesSerializer(DateSelectionSerializer):
    """
    ``CalendarPrices``: body of ``PUT /host/listings/{id}/calendar/prices``.

    ``price_override`` (``MoneyInput``, 100 to 10,000,000 DZD) or ``null`` to
    remove the special price. ``price_minor`` is still read for older clients.
    """

    price_override = MoneyInputSerializer(allow_null=True, required=False)
    price_minor = serializers.IntegerField(allow_null=True, min_value=1, required=False)

    def validate(self, attrs: dict) -> dict:
        """Fold ``price_override`` into ``price_minor`` (one of them is required) and check the bounds."""
        attrs = super().validate(attrs)
        if "price_override" in attrs:
            money = attrs.pop("price_override")
            attrs["price_minor"] = money["amount_minor"] if money else None
        elif "price_minor" not in attrs:
            raise serializers.ValidationError({"price_override": ["Required (null removes the special price)."]})
        price = attrs["price_minor"]
        if price is not None and not MIN_PRICE_MINOR <= price <= MAX_PRICE_MINOR:
            raise serializers.ValidationError({"price_override": ["Between 100 and 10,000,000 DZD."]})
        return attrs


class SlotWriteSerializer(serializers.Serializer):
    """
    Body to create an experience slot, or (partial) to change one:
    ``PATCH`` also takes ``is_cancelled`` (closing a slot replaces the old delete).
    ``price_override`` is a ``MoneyInput``; ``price_override_minor`` is still read.
    """

    starts_at = serializers.DateTimeField()
    ends_at = serializers.DateTimeField()
    seats_total = serializers.IntegerField(min_value=1, max_value=1000)
    price_override = MoneyInputSerializer(required=False, allow_null=True)
    price_override_minor = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    is_cancelled = serializers.BooleanField(required=False)

    def validate(self, attrs: dict) -> dict:
        """Fold ``price_override`` into the ``price_override_minor`` column."""
        if "price_override" in attrs:
            money = attrs.pop("price_override")
            attrs["price_override_minor"] = money["amount_minor"] if money else None
        return attrs


class CalendarDaySerializer(serializers.Serializer):
    """``CalendarDay``: one day of one calendar row. Schema only."""

    date = serializers.DateField()
    is_blocked = serializers.BooleanField()
    price = MoneyInputSerializer()
    price_override = MoneyInputSerializer(allow_null=True)
    note = serializers.CharField(allow_null=True)
    units_total = serializers.IntegerField(allow_null=True)
    units_booked = serializers.IntegerField(allow_null=True)
    units_held = serializers.IntegerField(allow_null=True)
    booking_ids = serializers.ListField(child=serializers.UUIDField())


class CalendarRowSerializer(serializers.Serializer):
    """``CalendarRow``: the days of one listing, or of one room type. Schema only."""

    listing_id = serializers.UUIDField()
    room_type_id = serializers.UUIDField(allow_null=True)
    days = CalendarDaySerializer(many=True)


class CalendarResponseSerializer(serializers.Serializer):
    """``CalendarResponse`` of ``GET /host/calendar``. Schema only."""

    to = serializers.DateField()
    results = CalendarRowSerializer(many=True)

    def get_fields(self):
        """Add the ``from`` field under its JSON name."""
        fields = super().get_fields()
        fields["from"] = serializers.DateField()
        return fields


class HostSlotSerializer(serializers.ModelSerializer):
    """A slot as its host sees it, with the held and booked counters."""

    seats_left = serializers.IntegerField(read_only=True)
    price = serializers.SerializerMethodField()

    class Meta:
        """Which model and fields this serializer uses."""

        model = ExperienceSlot
        fields = ("id", "starts_at", "ends_at", "seats_total", "seats_held", "seats_booked", "seats_left",
                  "price", "price_override_minor", "is_cancelled")

    def get_price(self, obj) -> dict:
        """Price per person of the slot."""
        return money_dict(obj.price_minor, obj.listing.currency)


class InventoryConflictSerializer(serializers.ModelSerializer):
    """A night where a hotel system reported fewer rooms than BLADUS already sold (review R3)."""

    room_type_name = serializers.CharField(source="room_type.name", read_only=True)
    listing_id = serializers.UUIDField(source="room_type.listing_id", read_only=True)

    class Meta:
        """Model and fields this serializer reads."""

        model = InventoryConflict
        fields = ["id", "listing_id", "room_type_id", "room_type_name", "night", "external_total", "sold", "source",
                  "status", "resolution_note", "resolved_at", "created_at"]


class ConflictResolveSerializer(serializers.Serializer):
    """Body of ``POST /admin/inventory-conflicts/{id}/resolve``: what the admin did."""

    note = serializers.CharField(max_length=2000)


class OutboxMessageSerializer(serializers.ModelSerializer):
    """An outbox message, for the admin queue of failed deliveries (review R14)."""

    class Meta:
        """Model and fields this serializer reads."""

        model = OutboxMessage
        fields = ["id", "topic", "payload", "status", "attempts", "next_attempt_at", "last_error", "created_at", "sent_at"]
