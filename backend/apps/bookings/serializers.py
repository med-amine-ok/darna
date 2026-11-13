"""
API shapes of the bookings app.

Three views of the same booking:
- ``GuestBookingSerializer``: what the guest sees; the exact address and
  the host phone only once confirmed (BR-SRC-03);
- ``HostBookingSerializer``: what the host sees, with the guest and the
  commission, plus the buttons it may press;
- ``AdminBookingSerializer``: everything, for support.
Amounts are Money dicts ``{"amount_minor", "currency"}`` (BR-PAY-01).
"""

from rest_framework import serializers

from apps.core.money import money_dict

from .models import Booking, BookingEvent, BookingStatus
from .services import check_in_at, check_out_at

# Statuses in which the guest may see the exact address and the host phone (BR-SRC-03).
REVEALED_STATUSES = (BookingStatus.CONFIRMED, BookingStatus.COMPLETED)


class BookingCreateSerializer(serializers.Serializer):
    """Body of ``POST /me/bookings``: only the quote id; prices are never taken from the client (BR-PRC-01)."""

    quote_id = serializers.UUIDField()
    guest_message = serializers.CharField(required=False, allow_blank=True, max_length=4000)


class ReasonSerializer(serializers.Serializer):
    """Body of decline and cancel actions: a reason (required for hosts and admins, optional for guests)."""

    reason = serializers.CharField(required=False, allow_blank=True, max_length=2000, default="")


class AdminCancelSerializer(ReasonSerializer):
    """Body of ``POST /admin/bookings/{id}/cancel``: reason and an optional refund owed to the guest."""

    refund_due_minor = serializers.IntegerField(required=False, allow_null=True, min_value=0)


class BookingEventSerializer(serializers.ModelSerializer):
    """One line of the booking history (BR-BKG-06)."""

    class Meta:
        """History fields; the actor is shown by role only, not by name."""

        model = BookingEvent
        fields = ["from_status", "to_status", "actor_role", "note", "created_at"]


class BookingBaseSerializer(serializers.ModelSerializer):
    """
    Fields every audience sees: identity, dates, status, the frozen price
    (BR-BKG-07) and the cancellation windows the guest accepted (BR-CAN-01).
    """

    title = serializers.CharField(read_only=True)
    vertical = serializers.SerializerMethodField()
    trip_id = serializers.SerializerMethodField()
    check_in_at = serializers.SerializerMethodField()
    check_out_at = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()
    cleaning_fee = serializers.SerializerMethodField()
    taxes = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    refund_due = serializers.SerializerMethodField()
    cancellation_policy = serializers.SerializerMethodField()

    class Meta:
        """Shared field list; subclasses add their own fields."""

        model = Booking
        fields = [
            "id", "reference", "status", "payment_status", "inventory_kind", "vertical", "listing_id", "trip_id",
            "room_type_id", "experience_slot_id", "trip_departure_id", "title", "check_in", "check_out",
            "check_in_at", "check_out_at", "guests", "units", "approval_mode_applied", "request_expires_at",
            "price_lines", "subtotal", "discount", "cleaning_fee", "taxes", "total", "refund_due",
            "cancellation_policy", "created_at", "confirmed_at", "completed_at", "cancelled_at", "cancelled_by_role",
            "cancel_reason", "decline_reason",
        ]

    def _money(self, obj: Booking, amount: int) -> dict:
        """Money dict in the booking's currency."""
        return money_dict(amount, obj.currency)

    def get_vertical(self, obj: Booking) -> str | None:
        """Vertical from the snapshot (``trip`` for trips)."""
        return obj.listing_snapshot.get("vertical")

    def get_trip_id(self, obj: Booking) -> str | None:
        """Id of the trip of a trip booking."""
        return obj.listing_snapshot.get("trip_id")

    def get_check_in_at(self, obj: Booking) -> str:
        """Arrival date and time in Algeria (ISO 8601)."""
        return check_in_at(obj).isoformat()

    def get_check_out_at(self, obj: Booking) -> str:
        """Departure date and time in Algeria (ISO 8601)."""
        return check_out_at(obj).isoformat()

    def get_subtotal(self, obj: Booking) -> dict:
        """Nights or seats before discount."""
        return self._money(obj, obj.subtotal_minor)

    def get_discount(self, obj: Booking) -> dict:
        """Length-of-stay discount (BR-PRC-03)."""
        return self._money(obj, obj.discount_minor)

    def get_cleaning_fee(self, obj: Booking) -> dict:
        """Cleaning fee."""
        return self._money(obj, obj.cleaning_fee_minor)

    def get_taxes(self, obj: Booking) -> dict:
        """Taxes (0 in this version)."""
        return self._money(obj, obj.taxes_minor)

    def get_total(self, obj: Booking) -> dict:
        """What the guest pays the host (DEC-001)."""
        return self._money(obj, obj.total_minor)

    def get_refund_due(self, obj: Booking) -> dict:
        """What the host owes the guest after a cancellation (section 8)."""
        return self._money(obj, obj.refund_due_minor)

    def get_cancellation_policy(self, obj: Booking) -> dict:
        """The policy frozen at creation (BR-BKG-07)."""
        snap = obj.listing_snapshot
        return {"code": snap.get("policy_code"), "version": snap.get("policy_version"),
                "windows": obj.cancellation_windows}


class GuestBookingSerializer(BookingBaseSerializer):
    """
    A booking as the guest sees it. ``address_line``, ``location_exact`` and
    ``host_phone_e164`` stay ``null`` until the booking is confirmed (BR-SRC-03).
    """

    host = serializers.SerializerMethodField()
    address_line = serializers.SerializerMethodField()
    location_exact = serializers.SerializerMethodField()
    host_phone_e164 = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()

    class Meta(BookingBaseSerializer.Meta):
        """Shared fields plus the guest-only ones."""

        fields = BookingBaseSerializer.Meta.fields + [
            "host", "address_line", "location_exact", "host_phone_e164", "can_cancel",
        ]

    def _revealed(self, obj: Booking) -> bool:
        """True once the guest may see private details (BR-SRC-03)."""
        return obj.status in REVEALED_STATUSES

    def get_host(self, obj: Booking) -> dict:
        """Public name of the host."""
        return {"id": str(obj.host_account_id), "display_name": obj.host_account.display_name}

    def get_address_line(self, obj: Booking) -> str | None:
        """Exact address from the snapshot, only when confirmed or completed."""
        return obj.listing_snapshot.get("address_line") if self._revealed(obj) else None

    def get_location_exact(self, obj: Booking) -> dict | None:
        """Exact point from the snapshot, only when confirmed or completed."""
        snap = obj.listing_snapshot
        if not self._revealed(obj) or snap.get("latitude") is None:
            return None
        return {"latitude": snap["latitude"], "longitude": snap.get("longitude")}

    def get_host_phone_e164(self, obj: Booking) -> str | None:
        """Phone of a solo host, only once confirmed; organisations are reached through messaging instead."""
        if not self._revealed(obj):
            return None
        user = obj.host_account.user  # None for an organisation
        return user.phone_e164 if user else None

    def get_can_cancel(self, obj: Booking) -> bool:
        """True when the cancel button should be shown (pending or confirmed)."""
        return obj.status in (BookingStatus.PENDING, BookingStatus.CONFIRMED)


class HostBookingSerializer(BookingBaseSerializer):
    """
    A booking as the host sees it: the guest, the commission frozen at
    creation (BR-BKG-07) and the actions that make sense now.
    """

    guest = serializers.SerializerMethodField()
    guest_phone_e164 = serializers.SerializerMethodField()
    commission = serializers.SerializerMethodField()
    allowed_actions = serializers.SerializerMethodField()

    class Meta(BookingBaseSerializer.Meta):
        """Shared fields plus the host-only ones."""

        fields = BookingBaseSerializer.Meta.fields + [
            "host_account_id", "guest", "guest_phone_e164", "commission_rate_bp", "commission", "allowed_actions",
        ]

    def get_guest(self, obj: Booking) -> dict:
        """Who booked (name only)."""
        return {"id": str(obj.guest_id), "display_name": obj.guest.display_name}

    def get_guest_phone_e164(self, obj: Booking) -> str | None:
        """Guest phone, only once confirmed (the host needs it to welcome the guest)."""
        return obj.guest.phone_e164 if obj.status in REVEALED_STATUSES else None

    def get_commission(self, obj: Booking) -> dict:
        """Commission of this booking (BR-PAY-04)."""
        return money_dict(obj.commission_minor, obj.currency)

    def get_allowed_actions(self, obj: Booking) -> list[str]:
        """Buttons for the host: accept/decline a request, cancel a confirmed booking."""
        if obj.status == BookingStatus.PENDING:
            return ["accept", "decline"]
        if obj.status == BookingStatus.CONFIRMED:
            return ["cancel"]
        return []


class AdminBookingSerializer(HostBookingSerializer):
    """Everything about a booking for BLADUS support, including the snapshot and the history."""

    events = BookingEventSerializer(many=True, read_only=True)
    commission_base = serializers.SerializerMethodField()

    class Meta(HostBookingSerializer.Meta):
        """Host fields plus snapshot, commission base and history."""

        fields = HostBookingSerializer.Meta.fields + ["listing_snapshot", "commission_base", "quote_id", "events"]

    def get_commission_base(self, obj: Booking) -> dict:
        """Base of the commission (DEC-002)."""
        return money_dict(obj.commission_base_minor, obj.currency)
