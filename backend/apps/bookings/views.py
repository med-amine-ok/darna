"""
HTTP endpoints of the bookings app (thin layer: rules live in ``services.py``).

- Guest: ``/me/bookings`` (create with an ``Idempotency-Key``, list, detail,
  cancellation preview, cancel, dispute, online payment (dormant));
- Host: ``/host/bookings`` scoped to the active workspace (list, detail,
  accept, decline, cancellation preview, cancel, dispute) and ``/host/earnings``;
  another host's booking answers 404;
- Admin: ``/admin/bookings`` (list, detail, cancel, refunds, dispute
  resolution), ``IsAdmin`` only.
Booking paths take the booking UUID only (DEC-031).
"""

import json

from django.core.serializers.json import DjangoJSONEncoder
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsPhoneVerified
from apps.catalog.api import query_date
from apps.core import idempotency
from apps.core.errors import DomainError, ForbiddenError
from apps.core.timeutils import business_today
from apps.hosts.context import IsHost, get_host_context
from apps.ledger import services as ledger
from apps.ledger.idempotent import run_once
from apps.ledger.serializers import PaymentSerializer

from . import selectors, services
from .models import UNPAID_REFUND_STATUSES, Booking, RefundObligation
from .serializers import (
    AdminBookingSerializer,
    AdminCancelSerializer,
    BookingCreateSerializer,
    CancellationPreviewSerializer,
    DisputeCreateSerializer,
    DisputeResolveSerializer,
    DisputeSerializer,
    EarningsSerializer,
    GuestBookingSerializer,
    HostBookingSerializer,
    ReasonSerializer,
    RefundCreateSerializer,
    RefundDeclareSerializer,
    RefundNoteSerializer,
    RefundObligationSerializer,
    StayCodeSerializer,
)

# Logical name of booking creation in the idempotency table (BR-SYS-01).
CREATE_ENDPOINT = "bookings.create"


# ---------------------------------------------------------------------------
# Guest
# ---------------------------------------------------------------------------
class GuestBookingListCreateView(generics.ListAPIView):
    """
    ``GET /me/bookings`` (filter ``status``, paginated) and ``POST /me/bookings``.

    Creating needs a verified phone (DEC-012) and should carry an
    ``Idempotency-Key`` header: a retry with the same key returns the first
    answer and never books twice (BR-SYS-01).
    """

    serializer_class = GuestBookingSerializer
    throttle_scope = "booking"

    def get_permissions(self):
        """Any signed-in user may list; creating also needs a verified phone (DEC-012)."""
        if self.request.method == "POST":
            return [IsAuthenticated(), IsPhoneVerified()]
        return [IsAuthenticated()]

    def permission_denied(self, request, message=None, code=None):
        """Answer ``phone_not_verified`` (instead of a generic 403) when only the phone check failed."""
        if request.user and request.user.is_authenticated and not request.user.phone_ok:
            raise ForbiddenError("Verify your phone number first.", code="phone_not_verified")
        super().permission_denied(request, message=message, code=code)

    def get_queryset(self):
        """Only the caller's own bookings."""
        if getattr(self, "swagger_fake_view", False):  # schema generation runs without a user
            return Booking.objects.none()
        return selectors.guest_bookings(self.request.user, status=self.request.query_params.get("status"))

    def post(self, request):
        """Create a booking from a quote, once per ``Idempotency-Key``."""
        data = BookingCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        key = request.headers.get("Idempotency-Key")
        payload = {"quote_id": str(data.validated_data["quote_id"])}
        stored = idempotency.lookup(request.user, CREATE_ENDPOINT, key, payload)
        if stored:
            return Response(stored.response_body, status=stored.response_code)
        booking = services.create_booking(guest=request.user, quote_id=data.validated_data["quote_id"])
        # Plain JSON types (UUIDs, dates as text) so the answer can be stored for retries.
        body = json.loads(json.dumps(GuestBookingSerializer(booking).data, cls=DjangoJSONEncoder))
        idempotency.remember(request.user, CREATE_ENDPOINT, key, payload, status.HTTP_201_CREATED, body)
        return Response(body, status=status.HTTP_201_CREATED)


class GuestBookingDetailView(APIView):
    """``GET /me/bookings/{booking_id}``: one of the caller's bookings (address only once confirmed, BR-SRC-03)."""

    serializer_class = GuestBookingSerializer  # response shape, for the OpenAPI schema

    def get(self, request, booking_id):
        """Return the booking, or 404 when it is not the caller's."""
        return Response(GuestBookingSerializer(selectors.get_guest_booking(request.user, booking_id)).data)


class GuestBookingCancelView(APIView):
    """``POST /me/bookings/{id}/cancel``: the guest cancels (BR-CAN-01, BR-CAN-02)."""

    serializer_class = GuestBookingSerializer  # response shape, for the OpenAPI schema

    def post(self, request, booking_id):
        """Cancel and return the booking with the refund the host owes."""
        data = ReasonSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        booking = services.cancel_by_guest(guest=request.user, booking_id=booking_id, reason=data.validated_data["reason"])
        return Response(GuestBookingSerializer(booking).data)


# ---------------------------------------------------------------------------
# Host
# ---------------------------------------------------------------------------
class HostBookingListView(generics.ListAPIView):
    """``GET /host/bookings``: bookings of the active workspace (filters ``status``, ``listing``; needs ``bookings.view``)."""

    permission_classes = [IsHost]
    serializer_class = HostBookingSerializer

    def get_queryset(self):
        """Always scoped to ``ctx.host_account`` (OWASP API1)."""
        if getattr(self, "swagger_fake_view", False):  # schema generation runs without a user
            return Booking.objects.none()
        ctx = get_host_context(self.request)
        ctx.require("bookings.view")
        params = self.request.query_params
        return selectors.host_bookings(ctx.host_account, status=params.get("status"), listing=params.get("listing"))


class HostBookingDetailView(APIView):
    """``GET /host/bookings/{id}``: one booking of the active workspace, else 404."""

    serializer_class = HostBookingSerializer  # response shape, for the OpenAPI schema
    permission_classes = [IsHost]

    def get(self, request, booking_id):
        """Return the booking as the host sees it."""
        ctx = get_host_context(request)
        ctx.require("bookings.view")
        return Response(HostBookingSerializer(selectors.get_host_booking(ctx.host_account, booking_id)).data)


class HostBookingAcceptView(APIView):
    """``POST /host/bookings/{id}/accept``: confirm a request (BR-BKG-03, BR-PAY-10)."""

    serializer_class = HostBookingSerializer  # response shape, for the OpenAPI schema
    permission_classes = [IsHost]

    def post(self, request, booking_id):
        """Accept and return the confirmed booking."""
        booking = services.accept_booking(ctx=get_host_context(request), booking_id=booking_id, actor=request.user)
        return Response(HostBookingSerializer(booking).data)


class HostBookingDeclineView(APIView):
    """``POST /host/bookings/{id}/decline`` with ``{"reason"}``: refuse a request (BR-BKG-03)."""

    serializer_class = HostBookingSerializer  # response shape, for the OpenAPI schema
    permission_classes = [IsHost]

    def post(self, request, booking_id):
        """Decline and return the booking; the dates are free again."""
        data = ReasonSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        booking = services.decline_booking(ctx=get_host_context(request), booking_id=booking_id, actor=request.user,
                                           reason=data.validated_data["reason"])
        return Response(HostBookingSerializer(booking).data)


class HostBookingCancelView(APIView):
    """``POST /host/bookings/{id}/cancel`` with ``{"reason"}``: cancel a confirmed booking (BR-CAN-03)."""

    serializer_class = HostBookingSerializer  # response shape, for the OpenAPI schema
    permission_classes = [IsHost]

    def post(self, request, booking_id):
        """Cancel; the guest is owed the full total and the commission comes back (DEC-018)."""
        data = ReasonSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        booking = services.cancel_by_host(ctx=get_host_context(request), booking_id=booking_id, actor=request.user,
                                          reason=data.validated_data["reason"])
        return Response(HostBookingSerializer(booking).data)


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------
class AdminBookingListView(generics.ListAPIView):
    """``GET /admin/bookings``: every booking (filters ``status``, ``host``, ``listing``, ``guest``, ``reference``)."""

    permission_classes = [IsAdmin]
    serializer_class = AdminBookingSerializer

    def get_queryset(self):
        """Apply the query filters."""
        params = self.request.query_params
        return selectors.admin_bookings(
            status=params.get("status"), host=params.get("host"), listing=params.get("listing"),
            guest=params.get("guest"), reference=params.get("reference"),
        ).prefetch_related("events")


class AdminBookingDetailView(APIView):
    """``GET /admin/bookings/{id}``: any booking, with its history."""

    serializer_class = AdminBookingSerializer  # response shape, for the OpenAPI schema
    permission_classes = [IsAdmin]

    def get(self, request, booking_id):
        """Return the booking as support sees it."""
        return Response(AdminBookingSerializer(selectors.get_admin_booking(booking_id)).data)


class AdminBookingCancelView(APIView):
    """``POST /admin/bookings/{id}/cancel`` with ``{"reason", "refund_due_minor"?}`` (section 8, audited)."""

    serializer_class = AdminBookingSerializer  # response shape, for the OpenAPI schema
    permission_classes = [IsAdmin]

    def post(self, request, booking_id):
        """Cancel any pending or confirmed booking."""
        data = AdminCancelSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        booking = services.cancel_by_admin(actor=request.user, booking_id=booking_id, reason=data.validated_data["reason"],
                                           refund_due_minor=data.validated_data.get("refund_due_minor"))
        return Response(AdminBookingSerializer(booking).data)


# ---------------------------------------------------------------------------
# Stay confirmation (review R13)
# ---------------------------------------------------------------------------
class GuestConfirmStayView(APIView):
    """``POST /me/bookings/{booking_id}/confirm-stay``: the guest confirms the stay took place (from check-in time)."""

    serializer_class = GuestBookingSerializer  # response shape, for the OpenAPI schema

    def post(self, request, booking_id):
        """Mark the stay as confirmed and return the booking."""
        booking = services.confirm_stay_by_guest(guest=request.user, booking_id=booking_id)
        return Response(GuestBookingSerializer(booking).data)


class HostConfirmStayView(APIView):
    """``POST /host/bookings/{booking_id}/confirm-stay``: the host enters the guest's check-in code on arrival."""

    serializer_class = StayCodeSerializer
    permission_classes = [IsHost]

    def post(self, request, booking_id):
        """Check the code and return the booking."""
        data = StayCodeSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        booking = services.confirm_stay_by_host(ctx=get_host_context(request), booking_id=booking_id,
                                                code=data.validated_data["code"])
        return Response(HostBookingSerializer(booking).data)


# ---------------------------------------------------------------------------
# Refund debts (review R8)
# ---------------------------------------------------------------------------
class GuestRefundListView(generics.ListAPIView):
    """``GET /me/refunds``: refunds hosts owe me, newest deadline last."""

    serializer_class = RefundObligationSerializer

    def get_queryset(self):
        """Only the signed-in guest's refunds."""
        if getattr(self, "swagger_fake_view", False):
            return RefundObligation.objects.none()
        return RefundObligation.objects.filter(guest=self.request.user).select_related("booking")


class GuestRefundConfirmView(APIView):
    """``POST /me/refunds/{id}/confirm-received``: the money arrived, the debt is settled."""

    serializer_class = RefundObligationSerializer

    def post(self, request, pk):
        """Settle and return the refund."""
        return Response(RefundObligationSerializer(services.confirm_refund_received(guest=request.user, refund_id=pk)).data)


class GuestRefundDisputeView(APIView):
    """``POST /me/refunds/{id}/dispute``: the host declared it paid but nothing arrived."""

    serializer_class = RefundNoteSerializer

    def post(self, request, pk):
        """Put the refund back to unpaid with the guest's note."""
        data = RefundNoteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        refund = services.dispute_refund(guest=request.user, refund_id=pk, note=data.validated_data["note"])
        return Response(RefundObligationSerializer(refund).data)


class HostRefundListView(generics.ListAPIView):
    """``GET /host/refunds``: refunds the active workspace owes guests (filter ``status``)."""

    permission_classes = [IsHost]
    serializer_class = RefundObligationSerializer

    def get_queryset(self):
        """Only the active workspace's refunds."""
        if getattr(self, "swagger_fake_view", False):
            return RefundObligation.objects.none()
        ctx = get_host_context(self.request)
        qs = RefundObligation.objects.filter(host_account=ctx.host_account).select_related("booking")
        if status_filter := self.request.query_params.get("status"):
            qs = qs.filter(status=status_filter)
        return qs


class HostRefundDeclareView(APIView):
    """``POST /host/refunds/{id}/declare-paid``: the host says the refund was sent (needs ``bookings.cancel``)."""

    permission_classes = [IsHost]
    serializer_class = RefundDeclareSerializer

    def post(self, request, pk):
        """Record the transfer reference; the guest or an admin then settles it."""
        data = RefundDeclareSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        refund = services.declare_refund_paid(ctx=get_host_context(request), refund_id=pk, actor=request.user,
                                              payment_reference=data.validated_data["payment_reference"])
        return Response(RefundObligationSerializer(refund).data)


class AdminRefundListView(generics.ListAPIView):
    """``GET /admin/refunds`` (filters ``status``, ``host_account``, ``overdue=true``)."""

    permission_classes = [IsAdmin]
    serializer_class = RefundObligationSerializer

    def get_queryset(self):
        """Every refund debt, filtered."""
        from django.utils import timezone

        params = self.request.query_params
        qs = RefundObligation.objects.select_related("booking")
        if status_filter := params.get("status"):
            qs = qs.filter(status=status_filter)
        if host := params.get("host_account"):
            qs = qs.filter(host_account_id=host)
        if params.get("overdue") in ("1", "true"):
            qs = qs.filter(status__in=UNPAID_REFUND_STATUSES, due_at__lte=timezone.now())
        return qs


class AdminRefundSettleView(APIView):
    """``POST /admin/refunds/{id}/settle``: close a refund debt after checking the proof (audited)."""

    permission_classes = [IsAdmin]
    serializer_class = RefundNoteSerializer

    def post(self, request, pk):
        """Settle with the admin's note."""
        data = RefundNoteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        refund = services.admin_settle_refund(actor=request.user, refund_id=pk, note=data.validated_data["note"])
        return Response(RefundObligationSerializer(refund).data)


# ---------------------------------------------------------------------------
# Cancellation previews (BR-CAN-01 to BR-CAN-03)
# ---------------------------------------------------------------------------
class GuestCancellationPreviewView(APIView):
    """``GET /me/bookings/{booking_id}/cancellation-preview``: what I would get back if I cancel now."""

    serializer_class = CancellationPreviewSerializer

    def get(self, request, booking_id):
        """Same calculation as the real cancellation; nothing changes. Commission is never shown to guests."""
        booking = selectors.get_guest_booking(request.user, booking_id)
        terms = services.preview_guest_cancellation(guest=request.user, booking_id=booking_id)
        return Response(CancellationPreviewSerializer.build(terms, booking.currency, for_host=False))


class HostCancellationPreviewView(APIView):
    """``GET /host/bookings/{booking_id}/cancellation-preview``: what a host cancellation means (BR-CAN-03, BR-PAY-05)."""

    permission_classes = [IsHost]
    serializer_class = CancellationPreviewSerializer

    def get(self, request, booking_id):
        """Full refund to the guest, full commission back; nothing changes."""
        terms = services.preview_host_cancellation(ctx=get_host_context(request), booking_id=booking_id)
        return Response(CancellationPreviewSerializer.build(terms, for_host=True))


# ---------------------------------------------------------------------------
# Disputes (R2, BR-CAN-05)
# ---------------------------------------------------------------------------
class GuestDisputeView(APIView):
    """``POST /me/bookings/{booking_id}/dispute``: open a dispute, until 14 days after check-out."""

    serializer_class = DisputeSerializer

    @extend_schema(request=DisputeCreateSerializer, responses={201: DisputeSerializer})
    def post(self, request, booking_id):
        """Open the dispute (or add my statement to the host's)."""
        data = DisputeCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        dispute = services.open_dispute_as_guest(guest=request.user, booking_id=booking_id, **data.validated_data)
        return Response(DisputeSerializer(dispute).data, status=status.HTTP_201_CREATED)


class HostDisputeView(APIView):
    """``POST /host/bookings/{booking_id}/dispute``: open a dispute as host (needs ``bookings.respond``)."""

    permission_classes = [IsHost]
    serializer_class = DisputeSerializer

    @extend_schema(request=DisputeCreateSerializer, responses={201: DisputeSerializer})
    def post(self, request, booking_id):
        """Open the dispute (or add the host statement to the guest's)."""
        data = DisputeCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        dispute = services.open_dispute_as_host(ctx=get_host_context(request), booking_id=booking_id,
                                                actor=request.user, **data.validated_data)
        return Response(DisputeSerializer(dispute).data, status=status.HTTP_201_CREATED)


class AdminDisputeResolveView(APIView):
    """``POST /admin/bookings/{booking_id}/dispute/resolve``: close a dispute (BR-CAN-05, audited)."""

    permission_classes = [IsAdmin]
    serializer_class = AdminBookingSerializer

    @extend_schema(request=DisputeResolveSerializer, responses={200: AdminBookingSerializer})
    def post(self, request, booking_id):
        """Resolve with a full refund, a partial refund or a refusal; an Idempotency-Key is optional."""
        data = DisputeResolveSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        body = data.validated_data

        def work():

            """Do the change once; a retry with the same Idempotency-Key replays the stored answer (06-api-design)."""
            booking = services.resolve_dispute(
                actor=request.user, booking_id=booking_id, outcome=body["outcome"], note=body["note"],
                refund_amount_minor=(body.get("refund_amount") or {}).get("amount_minor"),
            )
            return AdminBookingSerializer(booking).data

        return run_once(request, "bookings.dispute.resolve", {"booking": str(booking_id), **request.data}, work,
                        status_code=200, required=False)


# ---------------------------------------------------------------------------
# Admin refunds (BR-CAN-04)
# ---------------------------------------------------------------------------
class AdminBookingRefundView(APIView):
    """
    ``POST /admin/bookings/{booking_id}/refunds``: record a full or partial refund (BR-CAN-04, BR-PAY-05).

    Partial refunds add up and never pass the total (422 ``refund_exceeds_total``).
    In M1 the host owes it; the commission follows it in the ledger. Needs an ``Idempotency-Key``.
    """

    permission_classes = [IsAdmin]
    serializer_class = AdminBookingSerializer

    @extend_schema(request=RefundCreateSerializer, responses={201: AdminBookingSerializer})
    def post(self, request, booking_id):
        """Record the refund and return the booking."""
        data = RefundCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        body = data.validated_data

        def work():

            """Do the change once; a retry with the same Idempotency-Key replays the stored answer (06-api-design)."""
            booking = services.admin_refund(actor=request.user, booking_id=booking_id,
                                            amount_minor=body["amount"]["amount_minor"], reason=body["reason"],
                                            reason_code=body.get("reason_code") or "")
            return AdminBookingSerializer(booking).data

        return run_once(request, "bookings.refund.create", {"booking": str(booking_id), **request.data}, work)


# ---------------------------------------------------------------------------
# Online payment: DORMANT (DEC-019, BR-PAY-11)
# ---------------------------------------------------------------------------
class GuestPaymentView(APIView):
    """
    ``POST /me/bookings/{booking_id}/payments``: pay a booking online.

    DORMANT: 404 while guest payments are switched off (DEC-019, BR-PAY-11).
    Needs an ``Idempotency-Key``.
    """

    serializer_class = PaymentSerializer

    @extend_schema(request=None, responses={201: PaymentSerializer})
    def post(self, request, booking_id):
        """Open a gateway checkout for the booking total."""
        ledger.require_guest_payments()

        def work():

            """Do the change once; a retry with the same Idempotency-Key replays the stored answer (06-api-design)."""
            return PaymentSerializer(services.start_payment(guest=request.user, booking_id=booking_id)).data

        return run_once(request, "bookings.payment.create", {"booking": str(booking_id)}, work)


# ---------------------------------------------------------------------------
# Host earnings (BR-RPT-02)
# ---------------------------------------------------------------------------
@extend_schema(parameters=[
    OpenApiParameter("from", OpenApiTypes.DATE, OpenApiParameter.QUERY, required=False,
                     description="Start (default first day of the year)."),
    OpenApiParameter("to", OpenApiTypes.DATE, OpenApiParameter.QUERY, required=False, description="End (default today)."),
])
class HostEarningsView(APIView):
    """``GET /host/earnings``: earnings dashboard of the active workspace (BR-RPT-02; needs ``wallet.view``)."""

    permission_classes = [IsHost]
    serializer_class = EarningsSerializer

    def get(self, request):
        """Upcoming, completed, commission and refunds between ``from`` and ``to`` (Algerian dates)."""
        ctx = get_host_context(request)
        ctx.require("wallet.view")
        today = business_today()
        start = query_date(request, "from") or today.replace(month=1, day=1)
        end = query_date(request, "to") or today
        if end < start:
            raise DomainError("Invalid query parameter.", code="invalid", errors={"to": ["Must not be before from."]})
        return Response(EarningsSerializer.build(selectors.host_earnings(ctx.host_account, start, end)))
