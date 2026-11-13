"""API shapes of the pricing app: the quote request and the quote answer (BR-PRC-01)."""

from rest_framework import serializers

from apps.catalog.models import POLICY_WINDOWS
from apps.core.money import money_dict

from .models import Quote
from .services import effective_approval_mode


class QuoteRequestSerializer(serializers.Serializer):
    """
    Body of ``POST /quotes``.

    Exactly one target: ``listing_id`` (+ ``room_type_id`` or
    ``experience_slot_id`` when needed) or ``trip_departure_id``. Guests are
    either ``guests`` or ``guests_adults`` + ``guests_children`` (the API
    contract uses the second form). Prices are never accepted from the client.
    """

    listing_id = serializers.UUIDField(required=False, allow_null=True)
    room_type_id = serializers.UUIDField(required=False, allow_null=True)
    experience_slot_id = serializers.UUIDField(required=False, allow_null=True)
    trip_departure_id = serializers.UUIDField(required=False, allow_null=True)
    check_in = serializers.DateField(required=False, allow_null=True)
    check_out = serializers.DateField(required=False, allow_null=True)
    guests = serializers.IntegerField(required=False, min_value=1, max_value=500)
    guests_adults = serializers.IntegerField(required=False, min_value=1, max_value=500)
    guests_children = serializers.IntegerField(required=False, min_value=0, max_value=500, default=0)
    units = serializers.IntegerField(required=False, min_value=1, max_value=500, allow_null=True)

    def validate(self, attrs: dict) -> dict:
        """Resolve the guest count into one ``guests`` number and drop the split fields."""
        adults = attrs.pop("guests_adults", None)
        children = attrs.pop("guests_children", 0) or 0
        if attrs.get("guests") is None:
            if adults is None:
                raise serializers.ValidationError({"guests_adults": ["Required."]})
            attrs["guests"] = adults + children
        return attrs


def policy_payload(policy) -> dict:
    """The cancellation policy shown with a quote or a booking; moderate windows when none is set."""
    if policy is None:
        return {"code": "moderate", "version": None, "label": "Moderate", "windows": POLICY_WINDOWS["moderate"]}
    return {"code": policy.code, "version": policy.version, "label": policy.name_en, "windows": policy.windows}


class QuoteSerializer(serializers.ModelSerializer):
    """
    A quote as returned by ``POST /quotes`` and ``GET /quotes/{id}``.

    Amounts are Money dicts (``{"amount_minor", "currency"}``, BR-PAY-01).
    ``platform_fee`` is always 0 (BR-PRC-02). ``approval_mode`` is what the
    listing or trip asks for; the booking can still become a request when
    the host's deposit is below its floor (BR-BKG-01).
    """

    nights = serializers.IntegerField(read_only=True)
    inventory_kind = serializers.CharField(read_only=True)
    subtotal = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()
    cleaning_fee = serializers.SerializerMethodField()
    taxes = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    platform_fee = serializers.SerializerMethodField()
    approval_mode = serializers.SerializerMethodField()
    cancellation_policy = serializers.SerializerMethodField()

    class Meta:
        """Fields exposed to guests; the commission base stays internal."""

        model = Quote
        fields = [
            "id", "expires_at", "listing_id", "room_type_id", "experience_slot_id", "trip_departure_id",
            "inventory_kind", "check_in", "check_out", "nights", "guests", "units", "lines", "subtotal", "discount",
            "cleaning_fee", "taxes", "total", "platform_fee", "approval_mode", "cancellation_policy",
        ]

    def get_subtotal(self, obj: Quote) -> dict:
        """Nights or seats before discount."""
        return money_dict(obj.subtotal_minor, obj.currency)

    def get_discount(self, obj: Quote) -> dict:
        """Length-of-stay discount (BR-PRC-03)."""
        return money_dict(obj.discount_minor, obj.currency)

    def get_cleaning_fee(self, obj: Quote) -> dict:
        """Cleaning fee, once per stay."""
        return money_dict(obj.cleaning_fee_minor, obj.currency)

    def get_taxes(self, obj: Quote) -> dict:
        """Taxes (0 in this version)."""
        return money_dict(obj.taxes_minor, obj.currency)

    def get_total(self, obj: Quote) -> dict:
        """What the guest will pay the host."""
        return money_dict(obj.total_minor, obj.currency)

    def get_platform_fee(self, obj: Quote) -> dict:
        """Always 0: guests pay no BLADUS fee (BR-PRC-02)."""
        return money_dict(0, obj.currency)

    def _target(self, obj: Quote):
        """The listing or trip that sets the approval mode and the policy."""
        return obj.trip_departure.trip if obj.trip_departure_id else obj.listing

    def get_approval_mode(self, obj: Quote) -> str:
        """``instant`` or ``request`` (BR-BKG-02, before the wallet check of BR-BKG-01)."""
        return effective_approval_mode(self._target(obj))

    def get_cancellation_policy(self, obj: Quote) -> dict:
        """The policy the guest accepts by booking (BR-CAN-01)."""
        return policy_payload(self._target(obj).cancellation_policy)
