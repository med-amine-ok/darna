"""Input and output shapes of the inventory API (host calendar and slots)."""

from rest_framework import serializers

from apps.core.money import money_dict

from .models import ExperienceSlot


class CalendarBlocksSerializer(serializers.Serializer):
    """Body of ``PUT /host/listings/{id}/calendar/blocks``: close or open days."""

    dates = serializers.ListField(child=serializers.DateField(), allow_empty=False, max_length=366)
    blocked = serializers.BooleanField()


class CalendarPricesSerializer(serializers.Serializer):
    """Body of ``PUT /host/listings/{id}/calendar/prices``: special price, or ``null`` to remove it."""

    dates = serializers.ListField(child=serializers.DateField(), allow_empty=False, max_length=366)
    price_minor = serializers.IntegerField(allow_null=True, min_value=1)


class RoomCalendarSerializer(serializers.Serializer):
    """Body of ``PUT /host/room-types/{id}/calendar``: sellable units and/or special price per night."""

    dates = serializers.ListField(child=serializers.DateField(), allow_empty=False, max_length=366)
    total = serializers.IntegerField(required=False, min_value=0)
    price_minor = serializers.IntegerField(required=False, allow_null=True, min_value=1)


class SlotWriteSerializer(serializers.Serializer):
    """Body to create or change an experience slot."""

    starts_at = serializers.DateTimeField()
    ends_at = serializers.DateTimeField()
    seats_total = serializers.IntegerField(min_value=1, max_value=1000)
    price_override_minor = serializers.IntegerField(required=False, allow_null=True, min_value=1)


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
