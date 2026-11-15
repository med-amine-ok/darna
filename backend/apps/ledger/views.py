"""
HTTP endpoints of the ledger app (thin layer: rules live in ``services.py``, reads in ``selectors.py``).

- Host: ``/host/wallet``, ``/host/wallet/entries``, ``/host/invoices``,
  ``/host/payouts`` (dormant, BR-PAY-11); scoped to the active workspace.
- Admin: ``/admin/finance/summary``, ``/admin/wallets``, ``/admin/wallets/{id}``,
  ``/admin/wallets/{id}/topups``, ``/admin/topups``, ``/admin/ledger/transactions``,
  ``/admin/wallet-adjustments``, ``/admin/invoices``, ``/admin/payouts`` (dormant);
  ``IsAdmin`` only.
- Gateway: ``/webhooks/gateway/{provider}`` (dormant, DEC-019), no session,
  trusted only through its signature (BR-SYS-02).
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.catalog.api import query_date, query_int
from apps.core.errors import NotFoundError
from apps.core.money import money_dict
from apps.hosts.context import IsHost, get_host_context
from apps.hosts.models import HostAccount

from . import selectors, services
from .idempotent import run_once
from .models import AccountKind, GatewayProvider, LedgerEntry, WalletAdjustment
from .serializers import (
    AdjustmentCreateSerializer,
    AdjustmentSerializer,
    AdminWalletSerializer,
    FinanceSummarySerializer,
    GatewayEventAckSerializer,
    InvoiceSerializer,
    LedgerTransactionSerializer,
    MarkSentSerializer,
    PayoutCreateSerializer,
    PayoutSerializer,
    ReasonInputSerializer,
    TopupCreateSerializer,
    TopupSerializer,
    WalletEntrySerializer,
    WalletStateSerializer,
)


def _param(name: str, description: str, kind=OpenApiTypes.STR) -> OpenApiParameter:
    """A query parameter for the OpenAPI schema."""
    return OpenApiParameter(name, kind, OpenApiParameter.QUERY, required=False, description=description)


def wallet_payload(host_account) -> dict:
    """JSON description of a host deposit: balance, rate, floor, flags."""
    state = services.wallet_state(host_account)
    return {
        "balance": money_dict(state["balance_minor"]),
        "commission_rate_bp": state["commission_rate_bp"],
        "credit_limit": money_dict(state["credit_limit_minor"]),
        "is_negative": state["is_negative"],
        "can_accept_bookings": state["can_accept_bookings"],
    }


# ---------------------------------------------------------------------------
# Host
# ---------------------------------------------------------------------------
class HostWalletView(APIView):
    """``GET /host/wallet``: the deposit of the active workspace (needs ``wallet.view``)."""

    permission_classes = [IsHost]
    serializer_class = WalletStateSerializer

    def get(self, request):
        """Return balance, commission rate and credit floor."""
        ctx = get_host_context(request)
        ctx.require("wallet.view")
        return Response(wallet_payload(ctx.host_account))


class HostWalletEntriesView(generics.ListAPIView):
    """``GET /host/wallet/entries``: deposit history, newest first (needs ``wallet.view``)."""

    permission_classes = [IsHost]
    serializer_class = WalletEntrySerializer

    def get_queryset(self):
        """Only the lines of the active workspace's own wallet."""
        if getattr(self, "swagger_fake_view", False):
            return LedgerEntry.objects.none()
        ctx = get_host_context(self.request)
        ctx.require("wallet.view")
        return (
            LedgerEntry.objects.filter(account__host_account=ctx.host_account, account__kind=AccountKind.HOST_WALLET)
            .select_related("transaction")
            .order_by("-id")
        )


class HostInvoiceListView(generics.ListAPIView):
    """``GET /host/invoices``: commission invoices of the active workspace (R2, BR-PAY-12; needs ``wallet.view``)."""

    permission_classes = [IsHost]
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        """Only the invoices of ``ctx.host_account``."""
        if getattr(self, "swagger_fake_view", False):
            return selectors.invoices().none()
        ctx = get_host_context(self.request)
        ctx.require("wallet.view")
        return selectors.invoices(host_account=ctx.host_account)


class HostPayoutListCreateView(generics.ListAPIView):
    """
    ``GET /host/payouts`` and ``POST /host/payouts``: payouts to the host (DORMANT, model M4, BR-PAY-11).

    404 while payouts are switched off. Listing needs ``wallet.view``;
    asking for one needs ``payout_details.edit`` (owner) and an ``Idempotency-Key``.
    """

    permission_classes = [IsHost]
    serializer_class = PayoutSerializer

    def get_queryset(self):
        """The workspace's payouts, newest first."""
        if getattr(self, "swagger_fake_view", False):
            return selectors.payouts().none()
        services.require_payouts()
        ctx = get_host_context(self.request)
        ctx.require("wallet.view")
        return selectors.payouts(host_account=ctx.host_account)

    @extend_schema(request=PayoutCreateSerializer, responses={201: PayoutSerializer})
    def post(self, request):
        """Ask for a payout to one of the host's accounts (BR-PAY-09: not during the 72-hour hold)."""
        services.require_payouts()
        ctx = get_host_context(request)
        ctx.require("payout_details.edit")
        data = PayoutCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        body = data.validated_data

        def work():

            """Do the change once; a retry with the same Idempotency-Key replays the stored answer (06-api-design)."""
            payout = services.request_payout(host_account=ctx.host_account, payout_account_id=body["payout_account_id"],
                                             amount_minor=body["amount"]["amount_minor"], actor=request.user)
            return PayoutSerializer(payout).data

        payload = {"host_account": str(ctx.host_account.id), **request.data}
        return run_once(request, "ledger.payout.request", payload, work)


# ---------------------------------------------------------------------------
# Admin: overview, wallets, transactions
# ---------------------------------------------------------------------------
class AdminFinanceSummaryView(APIView):
    """``GET /admin/finance/summary``: finance overview (BR-PAY-03, BR-PAY-10)."""

    permission_classes = [IsAdmin]
    serializer_class = FinanceSummarySerializer

    def get(self, request):
        """Totals of wallets, commission, top-ups and refunds owed this month."""
        return Response(FinanceSummarySerializer.build(selectors.finance_summary()))


@extend_schema(parameters=[
    _param("host_type", "Comma list: individual, agency, hotel, hostel."),
    _param("wilaya", "Comma list of wilaya codes."),
    _param("state", "Comma list: ok, negative, below_floor."),
    _param("min_balance_minor", "Lowest balance in centimes.", OpenApiTypes.INT),
    _param("max_balance_minor", "Highest balance in centimes.", OpenApiTypes.INT),
    _param("q", "Host name or id."),
    _param("ordering", "balance, -balance, last_entry, -last_entry."),
])
class AdminWalletListView(generics.ListAPIView):
    """``GET /admin/wallets``: every host deposit with filters (BR-PAY-03, BR-PAY-10)."""

    permission_classes = [IsAdmin]
    serializer_class = AdminWalletSerializer

    def get_queryset(self):
        """Apply the query filters."""
        if getattr(self, "swagger_fake_view", False):
            return HostAccount.objects.none()
        params = self.request.query_params
        return selectors.wallets(
            host_type=params.get("host_type"), wilaya=params.get("wilaya"), state=params.get("state"),
            min_balance_minor=query_int(self.request, "min_balance_minor"),
            max_balance_minor=query_int(self.request, "max_balance_minor"),
            q=params.get("q"), ordering=params.get("ordering"),
        )


class AdminWalletDetailView(APIView):
    """``GET /admin/wallets/{host_account_id}``: one host deposit (BR-PAY-03)."""

    permission_classes = [IsAdmin]
    serializer_class = AdminWalletSerializer

    def get(self, request, host_account_id):
        """Return the wallet, or 404 for an unknown host."""
        host = selectors.wallet(host_account_id)
        if host is None:
            raise NotFoundError("Host not found.")
        return Response(AdminWalletSerializer(host).data)


@extend_schema(parameters=[
    _param("host_account", "Host account id.", OpenApiTypes.UUID),
    _param("kind", "Comma list of transaction kinds."),
    _param("booking", "Booking id or reference."),
    _param("from", "First day (YYYY-MM-DD).", OpenApiTypes.DATE),
    _param("to", "Last day (YYYY-MM-DD).", OpenApiTypes.DATE),
    _param("q", "Description or receipt."),
])
class AdminLedgerTransactionListView(generics.ListAPIView):
    """``GET /admin/ledger/transactions``: transactions with their lines (BR-PAY-02)."""

    permission_classes = [IsAdmin]
    serializer_class = LedgerTransactionSerializer

    def get_queryset(self):
        """Apply the query filters."""
        params = self.request.query_params
        return selectors.transactions(
            host_account=params.get("host_account"), kind=params.get("kind"), booking=params.get("booking"),
            start=query_date(self.request, "from"), end=query_date(self.request, "to"), q=params.get("q"),
        )


# ---------------------------------------------------------------------------
# Admin: top-ups (BR-PAY-07)
# ---------------------------------------------------------------------------
class AdminWalletTopupCreateView(APIView):
    """
    ``POST /admin/wallets/{host_account_id}/topups``: record a manual top-up (BR-PAY-07).

    Credited at once, or left ``pending_approval`` when the host's rolling
    24-hour total passes the four-eyes threshold. Needs an ``Idempotency-Key``.
    """

    permission_classes = [IsAdmin]
    serializer_class = TopupSerializer

    @extend_schema(request=TopupCreateSerializer, responses={201: TopupSerializer})
    def post(self, request, host_account_id):
        """Record the deposit for this host."""
        host_account = HostAccount.objects.alive().filter(pk=host_account_id).first()
        if host_account is None:
            raise NotFoundError("Host not found.")
        data = TopupCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        body = data.validated_data

        def work():

            """Do the change once; a retry with the same Idempotency-Key replays the stored answer (06-api-design)."""
            topup = services.create_topup(
                host_account=host_account, method=body["method"], amount_minor=body["amount"]["amount_minor"],
                receipt_reference=body["receipt_reference"], note=body.get("note", ""), actor=request.user,
            )
            return TopupSerializer(topup).data

        return run_once(request, "ledger.topup.create", {"host_account": str(host_account.id), **request.data}, work)


@extend_schema(parameters=[
    _param("status", "Comma list: pending_approval, approved, rejected."),
    _param("method", "Comma list of methods."),
    _param("host_account", "Host account id.", OpenApiTypes.UUID),
])
class AdminTopupListView(generics.ListAPIView):
    """``GET /admin/topups``: top-ups, for example the ones waiting for a second admin (BR-PAY-07)."""

    permission_classes = [IsAdmin]
    serializer_class = TopupSerializer

    def get_queryset(self):
        """Apply the query filters."""
        params = self.request.query_params
        return selectors.topups(status=params.get("status"), method=params.get("method"),
                                host_account=params.get("host_account"))


class AdminTopupApproveView(APIView):
    """``POST /admin/topups/{topup_id}/approve``: a second admin approves a large top-up (four-eyes, BR-PAY-07)."""

    permission_classes = [IsAdmin]
    serializer_class = TopupSerializer

    @extend_schema(request=None, responses={200: TopupSerializer})
    def post(self, request, topup_id):
        """Approve and credit the host wallet; 403 ``four_eyes_same_user`` for the admin who recorded it."""
        def work():
            """Do the change once; a retry with the same Idempotency-Key replays the stored answer (06-api-design)."""
            return TopupSerializer(services.approve_topup(topup_id, actor=request.user)).data

        return run_once(request, "ledger.topup.approve", {"topup": str(topup_id)}, work, status_code=200,
                        required=False)


class AdminTopupRejectView(APIView):
    """``POST /admin/topups/{topup_id}/reject``: refuse a pending top-up with a reason."""

    permission_classes = [IsAdmin]
    serializer_class = TopupSerializer

    @extend_schema(request=ReasonInputSerializer, responses={200: TopupSerializer})
    def post(self, request, topup_id):
        """Reject; nothing is credited."""
        data = ReasonInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        topup = services.reject_topup(topup_id, actor=request.user, reason=data.validated_data["reason"])
        return Response(TopupSerializer(topup).data)


# ---------------------------------------------------------------------------
# Admin: manual adjustments (review R6, BR-PAY-13)
# ---------------------------------------------------------------------------
class AdminAdjustmentListCreateView(generics.ListCreateAPIView):
    """``GET /admin/wallet-adjustments`` (filter ``status``, ``host_account``) and ``POST`` to ask for one (review R6)."""

    permission_classes = [IsAdmin]
    serializer_class = AdjustmentSerializer
    filterset_fields = ["status", "host_account"]
    queryset = WalletAdjustment.objects.select_related("host_account", "host_account__organization", "host_account__user")

    @extend_schema(request=AdjustmentCreateSerializer, responses={201: AdjustmentSerializer})
    def create(self, request, *args, **kwargs):
        """Record the request; nothing moves until a second admin approves."""
        data = AdjustmentCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        adjustment = services.create_adjustment(**data.validated_data, actor=request.user)
        return Response(AdjustmentSerializer(adjustment).data, status=status.HTTP_201_CREATED)


class AdminAdjustmentApproveView(APIView):
    """``POST /admin/wallet-adjustments/{id}/approve``: a different admin approves and the deposit moves."""

    permission_classes = [IsAdmin]
    serializer_class = AdjustmentSerializer

    @extend_schema(request=None, responses={200: AdjustmentSerializer})
    def post(self, request, pk):
        """Approve and post the adjustment."""
        return Response(AdjustmentSerializer(services.approve_adjustment(pk, actor=request.user)).data)


class AdminAdjustmentRejectView(APIView):
    """``POST /admin/wallet-adjustments/{id}/reject``: refuse with a reason."""

    permission_classes = [IsAdmin]
    serializer_class = AdjustmentSerializer

    @extend_schema(request=ReasonInputSerializer, responses={200: AdjustmentSerializer})
    def post(self, request, pk):
        """Reject; nothing moves."""
        data = ReasonInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        adjustment = services.reject_adjustment(pk, actor=request.user, reason=data.validated_data["reason"])
        return Response(AdjustmentSerializer(adjustment).data)


# ---------------------------------------------------------------------------
# Admin: invoices (R2) and payouts (dormant)
# ---------------------------------------------------------------------------
@extend_schema(parameters=[
    _param("host_account", "Host account id.", OpenApiTypes.UUID),
    _param("year", "Invoice year.", OpenApiTypes.INT),
])
class AdminInvoiceListView(generics.ListAPIView):
    """``GET /admin/invoices``: commission invoices (R2, BR-PAY-12)."""

    permission_classes = [IsAdmin]
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        """Apply the query filters."""
        params = self.request.query_params
        return selectors.invoices(host_account=params.get("host_account") or None,
                                  year=query_int(self.request, "year", minimum=2000))


@extend_schema(parameters=[_param("status", "Comma list of payout statuses.")])
class AdminPayoutListView(generics.ListAPIView):
    """``GET /admin/payouts``: payout requests (DORMANT, model M4; 404 while switched off)."""

    permission_classes = [IsAdmin]
    serializer_class = PayoutSerializer

    def get_queryset(self):
        """Every payout, filtered by status."""
        if getattr(self, "swagger_fake_view", False):
            return selectors.payouts().none()
        services.require_payouts()
        return selectors.payouts(status=self.request.query_params.get("status"))


class AdminPayoutApproveView(APIView):
    """``POST /admin/payouts/{payout_id}/approve``: approve and post it (BR-PAY-09, BR-PAY-11)."""

    permission_classes = [IsAdmin]
    serializer_class = PayoutSerializer

    @extend_schema(request=None, responses={200: PayoutSerializer})
    def post(self, request, payout_id):
        """Approve; refused during the account's 72-hour hold."""
        return Response(PayoutSerializer(services.approve_payout(payout_id, actor=request.user)).data)


class AdminPayoutRejectView(APIView):
    """``POST /admin/payouts/{payout_id}/reject``: refuse a requested payout with a reason."""

    permission_classes = [IsAdmin]
    serializer_class = PayoutSerializer

    @extend_schema(request=ReasonInputSerializer, responses={200: PayoutSerializer})
    def post(self, request, payout_id):
        """Reject; nothing moves."""
        data = ReasonInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        payout = services.reject_payout(payout_id, actor=request.user, reason=data.validated_data["reason"])
        return Response(PayoutSerializer(payout).data)


class AdminPayoutMarkSentView(APIView):
    """``POST /admin/payouts/{payout_id}/mark-sent``: the transfer left BLADUS."""

    permission_classes = [IsAdmin]
    serializer_class = PayoutSerializer

    @extend_schema(request=MarkSentSerializer, responses={200: PayoutSerializer})
    def post(self, request, payout_id):
        """Record the bank reference and post the cash movement."""
        data = MarkSentSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        payout = services.mark_payout_sent(payout_id, actor=request.user,
                                           bank_reference=data.validated_data["bank_reference"])
        return Response(PayoutSerializer(payout).data)


# ---------------------------------------------------------------------------
# Gateway webhook (dormant, DEC-019, BR-SYS-02)
# ---------------------------------------------------------------------------
class GatewayWebhookView(APIView):
    """
    ``POST /webhooks/gateway/{provider}``: payment gateway callback (DORMANT; 404 while online payment is off).

    No session: the call is trusted only through the HMAC-SHA256 signature
    of the raw body (header ``Signature`` or ``X-Signature``). The raw body
    is stored first, duplicates answer 200 with ``duplicate: true``.
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes: list = []
    serializer_class = GatewayEventAckSerializer

    @extend_schema(request=OpenApiTypes.OBJECT, responses={200: GatewayEventAckSerializer})
    def post(self, request, provider):
        """Store, verify and queue the event."""
        if provider not in GatewayProvider.values:
            raise NotFoundError("Not found.")
        raw = request.body  # read before request.data so the exact bytes are kept
        signature = request.headers.get("Signature") or request.headers.get("X-Signature") or ""
        _, duplicate = services.receive_gateway_event(provider=provider, raw_body=raw, signature=signature)
        return Response({"received": True, "duplicate": duplicate})
