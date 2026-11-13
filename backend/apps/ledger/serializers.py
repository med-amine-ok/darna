"""API shapes of the ledger app."""

from rest_framework import serializers

from apps.core.money import money_dict
from apps.hosts.models import HostAccount

from .models import LedgerEntry, TopupMethod, WalletTopup


class WalletEntrySerializer(serializers.ModelSerializer):
    """One line of the host's deposit history, written from the host's point of view."""

    kind = serializers.CharField(source="transaction.kind")
    description = serializers.CharField(source="transaction.description")
    booking_id = serializers.UUIDField(source="transaction.booking_id")
    occurred_at = serializers.DateTimeField(source="transaction.occurred_at")
    amount = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads or writes."""
        model = LedgerEntry
        fields = ["id", "kind", "description", "booking_id", "occurred_at", "amount"]

    def get_amount(self, entry: LedgerEntry) -> dict:
        """Signed amount for the host: positive = deposit grew, negative = commission taken."""
        return money_dict(-entry.amount_minor, entry.currency)


class TopupCreateSerializer(serializers.Serializer):
    """Body of ``POST /admin/wallet-topups``."""

    host_account = serializers.PrimaryKeyRelatedField(queryset=HostAccount.objects.alive())
    method = serializers.ChoiceField(choices=TopupMethod.choices)
    amount_minor = serializers.IntegerField(min_value=100, max_value=1_000_000_000)
    receipt_reference = serializers.CharField(max_length=200)
    note = serializers.CharField(max_length=255, required=False, allow_blank=True)


class TopupRejectSerializer(serializers.Serializer):
    """Body of ``POST /admin/wallet-topups/{id}/reject``."""

    reason = serializers.CharField(min_length=10, max_length=1000)


class TopupSerializer(serializers.ModelSerializer):
    """A recorded deposit top-up."""

    amount = serializers.SerializerMethodField()
    host_name = serializers.CharField(source="host_account.display_name", read_only=True)

    class Meta:
        """Model and fields this serializer reads or writes."""
        model = WalletTopup
        fields = [
            "id", "host_account", "host_name", "method", "amount", "receipt_reference", "note", "status",
            "requested_by", "approved_by", "approved_at", "rejection_reason", "created_at",
        ]

    def get_amount(self, topup: WalletTopup) -> dict:
        """Amount as ``{"amount_minor", "currency"}``."""
        return money_dict(topup.amount_minor, topup.currency)


class WalletStateSerializer(serializers.Serializer):
    """JSON description of a host deposit: balance, rate, floor, flags."""

    balance = serializers.DictField()
    commission_rate_bp = serializers.IntegerField()
    credit_limit = serializers.DictField()
    is_negative = serializers.BooleanField()
    can_accept_bookings = serializers.BooleanField()

