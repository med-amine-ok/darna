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

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.core.money import money_dict
from apps.ledger.serializers import (
    HostSummarySerializer,
    MoneyInputSerializer,
    MoneySerializer,
    UserRefSerializer,
    host_summary,
    user_ref,
)

from .models import Booking, BookingEvent, BookingStatus, Dispute, DisputeOutcome, RefundObligation
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

    actor = serializers.SerializerMethodField()

    class Meta:
        """History fields; the actor as a ``UserRef`` (name only, never contact details)."""

        model = BookingEvent
        fields = ["from_status", "to_status", "actor_role", "actor", "note", "created_at"]

    @extend_schema_field(UserRefSerializer(allow_null=True))
    def get_actor(self, obj: BookingEvent) -> dict | None:
        """Who made the change; ``None`` for the system."""
        return user_ref(obj.actor)


class BookingBaseSerializer(serializers.ModelSerializer):
    """
    Fields every audience sees: identity, dates, status, the frozen price
    (BR-BKG-07) and the cancellation windows the guest accepted (BR-CAN-01).
    """

    title = serializers.CharField(read_only=True)
    review_eligible = serializers.BooleanField(read_only=True)
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
            "cancel_reason", "decline_reason", "stay_confirmed_at", "stay_confirmed_via", "review_eligible",
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
    check_in_code = serializers.SerializerMethodField()

    class Meta(BookingBaseSerializer.Meta):
        """Shared fields plus the guest-only ones."""

        fields = BookingBaseSerializer.Meta.fields + [
            "host", "address_line", "location_exact", "host_phone_e164", "can_cancel", "check_in_code",
        ]

    def get_check_in_code(self, obj: Booking) -> str | None:
        """Code to show the host on arrival (review R13); only the guest sees it, once confirmed."""
        return obj.check_in_code or None if self._revealed(obj) else None

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
            return ["cancel"] if obj.stay_confirmed_at else ["cancel", "confirm_stay"]
        if obj.status == BookingStatus.COMPLETED and not obj.stay_confirmed_at:
            return ["confirm_stay"]
        return []


class AdminBookingSerializer(HostBookingSerializer):
    """Everything about a booking for BLADUS support, including the snapshot and the history."""

    events = BookingEventSerializer(many=True, read_only=True)
    commission_base = serializers.SerializerMethodField()
    host = serializers.SerializerMethodField()
    dispute = serializers.SerializerMethodField()

    class Meta(HostBookingSerializer.Meta):
        """Host fields plus host summary, snapshot, commission base, history and dispute."""

        fields = HostBookingSerializer.Meta.fields + [
            "host", "listing_snapshot", "commission_base", "quote_id", "events", "dispute",
        ]

    @extend_schema_field(MoneySerializer)
    def get_commission_base(self, obj: Booking) -> dict:
        """Base of the commission (DEC-002)."""
        return money_dict(obj.commission_base_minor, obj.currency)

    @extend_schema_field(HostSummarySerializer)
    def get_host(self, obj: Booking) -> dict:
        """Who hosts the booking."""
        return host_summary(obj.host_account)

    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_dispute(self, obj: Booking) -> dict | None:
        """The dispute of the booking, if one was opened (R2, BR-CAN-05)."""
        dispute = Dispute.objects.filter(booking=obj).first()
        return DisputeSerializer(dispute).data if dispute else None


class StayCodeSerializer(serializers.Serializer):
    """Body of ``POST /host/bookings/{key}/confirm-stay``: the guest's 6-digit check-in code (review R13)."""

    code = serializers.RegexField(r"^[0-9]{6}$")


class RefundDeclareSerializer(serializers.Serializer):
    """Body of ``POST /host/refunds/{id}/declare-paid`` (review R8)."""

    payment_reference = serializers.CharField(max_length=200)


class RefundNoteSerializer(serializers.Serializer):
    """Body of a guest dispute or an admin settlement: a short note (review R8)."""

    note = serializers.CharField(max_length=2000)


class RefundObligationSerializer(serializers.ModelSerializer):
    """A refund a host owes a guest after a cancellation, with its deadline (review R8)."""

    amount = serializers.SerializerMethodField()
    booking_reference = serializers.CharField(source="booking.reference", read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        """Model and fields this serializer reads."""

        model = RefundObligation
        fields = [
            "id", "booking_id", "booking_reference", "host_account_id", "guest_id", "amount", "status", "due_at",
            "is_overdue", "declared_at", "payment_reference", "settled_at", "note", "created_at",
        ]

    def get_amount(self, obj: RefundObligation) -> dict:
        """Amount owed as ``{"amount_minor", "currency"}``."""
        return money_dict(obj.amount_minor, obj.currency)


# ---------------------------------------------------------------------------
# Cancellation previews (BR-CAN-01 to BR-CAN-03, BR-PAY-05)
# ---------------------------------------------------------------------------
class CancellationPreviewSerializer(serializers.Serializer):
    """
    ``CancellationPreview``: what a cancellation would do now. Pure calculation, nothing is changed.

    Built from the same ``CancellationTerms`` the real cancellation uses.
    ``commission_returned_to_host`` is shown to hosts only (0 for guests).
    """

    policy_code = serializers.CharField()
    days_before_check_in = serializers.IntegerField()
    refund_percent_bp = serializers.IntegerField()
    refund_amount = MoneySerializer()
    kept_by_host = MoneySerializer()
    commission_returned_to_host = MoneySerializer()
    allowed = serializers.BooleanField()
    not_allowed_code = serializers.CharField(allow_null=True)

    @staticmethod
    def build(terms, booking_currency: str = "DZD", *, for_host: bool) -> dict:
        """API shape of ``services.CancellationTerms``."""
        return {
            "policy_code": terms.policy_code,
            "days_before_check_in": terms.days_before_check_in,
            "refund_percent_bp": terms.refund_percent_bp,
            "refund_amount": money_dict(terms.refund_minor, booking_currency),
            "kept_by_host": money_dict(terms.kept_by_host_minor, booking_currency),
            "commission_returned_to_host": money_dict(terms.commission_back_minor if for_host else 0, booking_currency),
            "allowed": terms.allowed,
            "not_allowed_code": terms.not_allowed_code,
        }


# ---------------------------------------------------------------------------
# Refunds and disputes (BR-CAN-04, BR-CAN-05)
# ---------------------------------------------------------------------------
class RefundCreateSerializer(serializers.Serializer):
    """``RefundCreate``: body of ``POST /admin/bookings/{booking_id}/refunds``."""

    amount = MoneyInputSerializer(help_text="1 centime up to total minus already refunded (BR-CAN-04).")
    reason = serializers.CharField(min_length=10, max_length=2000)
    reason_code = serializers.CharField(max_length=64, required=False, allow_null=True, allow_blank=True)


class DisputeCreateSerializer(serializers.Serializer):
    """``DisputeCreate``: body of ``POST /me/bookings/{id}/dispute`` and ``POST /host/bookings/{id}/dispute``."""

    reason_code = serializers.CharField(max_length=64)
    statement = serializers.CharField(min_length=20, max_length=4000)
    media_ids = serializers.ListField(child=serializers.UUIDField(), required=False, max_length=20)


class DisputeResolveSerializer(serializers.Serializer):
    """``DisputeResolve``: body of ``POST /admin/bookings/{booking_id}/dispute/resolve``."""

    outcome = serializers.ChoiceField(choices=DisputeOutcome.choices)
    refund_amount = MoneyInputSerializer(required=False, allow_null=True)
    note = serializers.CharField(min_length=10, max_length=4000)


class DisputeSerializer(serializers.ModelSerializer):
    """``Dispute``: a disagreement about a booking and how support closed it."""

    reason_code = serializers.SerializerMethodField()
    guest_statement = serializers.SerializerMethodField()
    host_statement = serializers.SerializerMethodField()
    outcome = serializers.SerializerMethodField()
    refund = serializers.SerializerMethodField()
    resolution_note = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads."""

        model = Dispute
        fields = ["id", "booking_id", "opened_by_role", "reason_code", "guest_statement", "host_statement", "outcome",
                  "refund", "resolution_note", "resolved_at", "created_at"]

    def get_reason_code(self, obj: Dispute) -> str | None:
        """Reason picked when opening."""
        return obj.reason_code or None

    def get_guest_statement(self, obj: Dispute) -> str | None:
        """What the guest wrote."""
        return obj.guest_statement or None

    def get_host_statement(self, obj: Dispute) -> str | None:
        """What the host wrote."""
        return obj.host_statement or None

    def get_outcome(self, obj: Dispute) -> str | None:
        """``refund_full``, ``refund_partial``, ``declined`` or ``None`` while open."""
        return obj.outcome or None

    @extend_schema_field(MoneySerializer(allow_null=True))
    def get_refund(self, obj: Dispute) -> dict | None:
        """Refund decided by the resolution, if any."""
        return money_dict(obj.refund_minor, obj.booking.currency) if obj.refund_minor is not None else None

    def get_resolution_note(self, obj: Dispute) -> str | None:
        """Support's note."""
        return obj.resolution_note or None


# ---------------------------------------------------------------------------
# Host earnings (BR-RPT-02)
# ---------------------------------------------------------------------------
class EarningsMonthSerializer(serializers.Serializer):
    """One month of the earnings chart."""

    month = serializers.CharField()
    completed = MoneySerializer()
    commission = MoneySerializer()


class EarningsSerializer(serializers.Serializer):
    """``Earnings``: the host earnings dashboard (BR-RPT-02, DEC-010)."""

    to = serializers.DateField()
    upcoming = MoneySerializer()
    completed = MoneySerializer()
    commission_paid = MoneySerializer()
    refunds_owed = MoneySerializer()
    by_month = EarningsMonthSerializer(many=True)

    @staticmethod
    def build(data: dict) -> dict:
        """API shape of :func:`apps.bookings.selectors.host_earnings`."""
        return {
            "from": data["from"].isoformat(), "to": data["to"].isoformat(),
            "upcoming": money_dict(data["upcoming_minor"]),
            "completed": money_dict(data["completed_minor"]),
            "commission_paid": money_dict(data["commission_paid_minor"]),
            "refunds_owed": money_dict(data["refunds_owed_minor"]),
            "by_month": [{"month": m["month"], "completed": money_dict(m["completed_minor"]),
                          "commission": money_dict(m["commission_minor"])} for m in data["by_month"]],
        }


# ``from`` is a Python keyword, so it cannot be a class attribute: add it to the declared fields.
EarningsSerializer._declared_fields["from"] = serializers.DateField()
