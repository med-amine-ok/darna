"""HTTP endpoints of the ledger: host wallet (read only) and admin top-ups."""

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.core.errors import NotFoundError
from apps.core.money import money_dict
from apps.hosts.context import IsHost, get_host_context

from . import services
from .models import AccountKind, LedgerEntry, WalletTopup
from .serializers import (
    TopupCreateSerializer,
    TopupRejectSerializer,
    TopupSerializer,
    WalletEntrySerializer,
    WalletStateSerializer,
)


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
        ctx = get_host_context(self.request)
        ctx.require("wallet.view")
        return (
            LedgerEntry.objects.filter(account__host_account=ctx.host_account, account__kind=AccountKind.HOST_WALLET)
            .select_related("transaction")
            .order_by("-id")
        )


class AdminTopupListCreateView(generics.ListCreateAPIView):
    """``GET /admin/wallet-topups`` (filter ``status``, ``host_account``) and ``POST`` to record a deposit."""

    permission_classes = [IsAdmin]
    serializer_class = TopupSerializer
    filterset_fields = ["status", "host_account", "method"]
    queryset = WalletTopup.objects.select_related("host_account", "host_account__organization", "host_account__user")

    def create(self, request, *args, **kwargs):
        """Record a top-up; credited at once or left waiting for a second admin (BR-PAY-07)."""
        data = TopupCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        topup = services.create_topup(**data.validated_data, actor=request.user)
        return Response(TopupSerializer(topup).data, status=status.HTTP_201_CREATED)


class AdminTopupApproveView(APIView):
    """``POST /admin/wallet-topups/{id}/approve``: second admin approves a large top-up."""

    permission_classes = [IsAdmin]
    serializer_class = TopupSerializer

    def post(self, request, pk):
        """Approve and credit the host wallet."""
        return Response(TopupSerializer(services.approve_topup(pk, actor=request.user)).data)


class AdminTopupRejectView(APIView):
    """``POST /admin/wallet-topups/{id}/reject``: refuse a pending top-up with a reason."""

    permission_classes = [IsAdmin]
    serializer_class = TopupRejectSerializer

    def post(self, request, pk):
        """Reject; nothing is credited."""
        data = TopupRejectSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        return Response(TopupSerializer(services.reject_topup(pk, actor=request.user, reason=data.validated_data["reason"])).data)


class AdminHostWalletView(APIView):
    """``GET /admin/hosts/{id}/wallet``: deposit of any host, for the admin."""

    permission_classes = [IsAdmin]
    serializer_class = WalletStateSerializer

    def get(self, request, pk):
        """Return the same payload the host sees."""
        from apps.hosts.models import HostAccount

        host_account = HostAccount.objects.filter(pk=pk).first()
        if host_account is None:
            raise NotFoundError("Host not found.")
        return Response(wallet_payload(host_account))
