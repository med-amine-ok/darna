"""
API shapes of the ledger app.

Amounts are Money dicts ``{"amount_minor", "currency"}`` (BR-PAY-01). The
small helpers :func:`host_summary` and :func:`user_ref` build the shared
``HostSummary`` and ``UserRef`` shapes of the contract; the bookings app
reuses them.
"""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.config import services as config
from apps.core.money import money_dict
from apps.hosts.models import HostAccount

from .models import (
    Invoice,
    LedgerEntry,
    LedgerTransaction,
    Payment,
    Payout,
    WalletAdjustment,
    WalletTopup,
)
from .services import MANUAL_TOPUP_METHODS


# ---------------------------------------------------------------------------
# Shared shapes
# ---------------------------------------------------------------------------
class MoneySerializer(serializers.Serializer):
    """``Money``: an amount in centimes with its currency, never a float (BR-PAY-01)."""

    amount_minor = serializers.IntegerField()
    currency = serializers.CharField()


class MoneyInputSerializer(serializers.Serializer):
    """``MoneyInput``: a positive amount in centimes sent by a client. Only DZD exists today."""

    amount_minor = serializers.IntegerField(min_value=1)
    currency = serializers.ChoiceField(choices=["DZD"])


class UserRefSerializer(serializers.Serializer):
    """``UserRef``: a person as shown to others, never with contact details."""

    id = serializers.UUIDField()
    display_name = serializers.CharField()
    avatar_url = serializers.URLField(allow_null=True)


class HostSummarySerializer(serializers.Serializer):
    """``HostSummary``: who the host is, in one line."""

    host_account_id = serializers.UUIDField()
    kind = serializers.CharField()
    host_type = serializers.CharField()
    display_name = serializers.CharField()
    avatar_url = serializers.URLField(allow_null=True)
    organization_slug = serializers.CharField(allow_null=True)
    verified = serializers.BooleanField()
    rating_avg = serializers.FloatField(allow_null=True)
    review_count = serializers.IntegerField()
    joined_year = serializers.IntegerField()


def user_ref(user) -> dict | None:
    """``UserRef`` of a user, or ``None``. Never contains email or phone."""
    if user is None:
        return None
    return {"id": str(user.id), "display_name": user.display_name, "avatar_url": None}


def host_summary(host_account: HostAccount) -> dict:
    """``HostSummary`` of a host account."""
    org = host_account.organization if host_account.organization_id else None
    return {
        "host_account_id": str(host_account.id),
        "kind": host_account.kind,
        "host_type": host_account.host_type,
        "display_name": host_account.display_name,
        "avatar_url": None,
        "organization_slug": org.slug if org else None,
        "verified": host_account.is_approved,
        "rating_avg": float(host_account.rating_avg) if host_account.rating_avg is not None else None,
        "review_count": host_account.review_count,
        "joined_year": host_account.created_at.year,
    }


# ---------------------------------------------------------------------------
# Host wallet (read by the host)
# ---------------------------------------------------------------------------
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

    @extend_schema_field(MoneySerializer)
    def get_amount(self, entry: LedgerEntry) -> dict:
        """Signed amount for the host: positive = deposit grew, negative = commission taken."""
        return money_dict(-entry.amount_minor, entry.currency)


class WalletStateSerializer(serializers.Serializer):
    """JSON description of a host deposit: balance, rate, floor, flags (``GET /host/wallet``)."""

    balance = MoneySerializer()
    commission_rate_bp = serializers.IntegerField()
    credit_limit = MoneySerializer()
    is_negative = serializers.BooleanField()
    can_accept_bookings = serializers.BooleanField()


# ---------------------------------------------------------------------------
# Admin wallets (BR-PAY-03, BR-PAY-10)
# ---------------------------------------------------------------------------
class AdminWalletSerializer(serializers.Serializer):
    """
    ``AdminWallet``: one host deposit for the admin.

    Reads a host account annotated by ``selectors.wallets_queryset``.
    """

    host_account_id = serializers.UUIDField(source="id")
    balance = serializers.SerializerMethodField()
    credit_limit = serializers.SerializerMethodField()
    state = serializers.CharField(source="wallet_state")
    commission_rate_bp = serializers.SerializerMethodField()
    commission_rate_source = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()
    host = serializers.SerializerMethodField()
    total_topups = serializers.SerializerMethodField()
    total_commission = serializers.SerializerMethodField()
    last_entry_at = serializers.DateTimeField(allow_null=True)

    @extend_schema_field(MoneySerializer)
    def get_balance(self, host: HostAccount) -> dict:
        """Deposit in centimes; negative when the host owes commission."""
        return money_dict(host.balance_minor)

    @extend_schema_field(MoneySerializer)
    def get_credit_limit(self, host: HostAccount) -> dict:
        """How far below zero the wallet may go (BR-PAY-10)."""
        return money_dict(host.floor_minor)

    def get_commission_rate_bp(self, host: HostAccount) -> int:
        """Rate applied to new bookings (BR-PAY-06)."""
        return config.commission_rate_bp(host)

    def get_commission_rate_source(self, host: HostAccount) -> str:
        """``override`` when the host has its own rate, else ``default``."""
        return "override" if host.commission_rate_override_bp is not None else "default"

    def get_updated_at(self, host: HostAccount) -> str:
        """Last change of the stored balance, or the host creation time for an unused wallet."""
        return (host.wallet_updated_at or host.updated_at).isoformat()

    @extend_schema_field(HostSummarySerializer)
    def get_host(self, host: HostAccount) -> dict:
        """Who owns the wallet."""
        return host_summary(host)

    @extend_schema_field(MoneySerializer)
    def get_total_topups(self, host: HostAccount) -> dict:
        """Sum of approved top-ups."""
        return money_dict(host.total_topups_minor)

    @extend_schema_field(MoneySerializer)
    def get_total_commission(self, host: HostAccount) -> dict:
        """Commission kept so far: taken minus returned."""
        return money_dict(host.total_commission_minor)


class FinanceSummarySerializer(serializers.Serializer):
    """``FinanceSummary``: the admin finance overview (BR-PAY-03, BR-PAY-10)."""

    wallets_total = MoneySerializer()
    negative_wallets = serializers.IntegerField()
    below_floor_wallets = serializers.IntegerField()
    commission_this_month = MoneySerializer()
    commission_reversed_this_month = MoneySerializer()
    topups_this_month = MoneySerializer()
    pending_topup_approvals = serializers.IntegerField()
    refunds_owed_this_month = MoneySerializer()
    dormant = serializers.DictField(required=False, help_text="Only filled when models M2 to M4 are on.")

    @staticmethod
    def build(summary: dict) -> dict:
        """Turn :func:`apps.ledger.selectors.finance_summary` into the API shape."""
        data = {
            "wallets_total": money_dict(summary["wallets_total_minor"]),
            "negative_wallets": summary["negative_wallets"],
            "below_floor_wallets": summary["below_floor_wallets"],
            "commission_this_month": money_dict(summary["commission_this_month_minor"]),
            "commission_reversed_this_month": money_dict(summary["commission_reversed_this_month_minor"]),
            "topups_this_month": money_dict(summary["topups_this_month_minor"]),
            "pending_topup_approvals": summary["pending_topup_approvals"],
            "refunds_owed_this_month": money_dict(summary["refunds_owed_this_month_minor"]),
        }
        if summary.get("dormant"):
            data["dormant"] = {"payouts_pending": summary["dormant"]["payouts_pending"],
                               "escrow_balance": money_dict(summary["dormant"]["escrow_balance_minor"])}
        return data


# ---------------------------------------------------------------------------
# Ledger transactions (BR-PAY-02)
# ---------------------------------------------------------------------------
class LedgerLineSerializer(serializers.ModelSerializer):
    """One line of a transaction: positive = debit, negative = credit."""

    account_code = serializers.CharField(source="account.code")
    account_kind = serializers.CharField(source="account.kind")
    amount = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads."""
        model = LedgerEntry
        fields = ["account_code", "account_kind", "amount"]

    @extend_schema_field(MoneySerializer)
    def get_amount(self, entry: LedgerEntry) -> dict:
        """Signed amount of the line."""
        return money_dict(entry.amount_minor, entry.currency)


class LedgerTransactionSerializer(serializers.ModelSerializer):
    """``LedgerTransaction`` with its lines, which always sum to zero (BR-PAY-02)."""

    booking_reference = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    entries = LedgerLineSerializer(many=True, read_only=True)

    class Meta:
        """Model and fields this serializer reads."""
        model = LedgerTransaction
        fields = ["id", "kind", "description", "booking_id", "booking_reference", "topup_id", "reverses_id",
                  "created_by", "occurred_at", "entries"]

    def get_booking_reference(self, tx: LedgerTransaction) -> str | None:
        """BLD reference of the booking, when the movement belongs to one."""
        return tx.booking_reference or None

    @extend_schema_field(UserRefSerializer(allow_null=True))
    def get_created_by(self, tx: LedgerTransaction) -> dict | None:
        """Who posted it; ``None`` for the system."""
        return user_ref(tx.created_by)


# ---------------------------------------------------------------------------
# Top-ups (BR-PAY-07)
# ---------------------------------------------------------------------------
class TopupCreateSerializer(serializers.Serializer):
    """Body of ``POST /admin/wallets/{host_account_id}/topups`` (``TopupCreate``)."""

    amount = MoneyInputSerializer()
    method = serializers.ChoiceField(choices=[(m.value, m.label) for m in MANUAL_TOPUP_METHODS],
                                     help_text="gateway is not allowed for manual top-ups (BR-PAY-08).")
    receipt_reference = serializers.CharField(min_length=3, max_length=200)
    note = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")

    def validate_amount(self, value: dict) -> dict:
        """1 to 10,000,000 DZD, i.e. 100 to 1,000,000,000 centimes (BR-PAY-07)."""
        if not 100 <= value["amount_minor"] <= 1_000_000_000:
            raise serializers.ValidationError("Between 100 and 1,000,000,000 centimes.")
        return value


class ReasonInputSerializer(serializers.Serializer):
    """``Reason``: body of a reject action."""

    reason_code = serializers.CharField(max_length=64, required=False, allow_null=True, allow_blank=True)
    reason = serializers.CharField(min_length=10, max_length=2000)


# Kept for the wallet adjustment endpoints (review R6).
TopupRejectSerializer = ReasonInputSerializer


class TopupSerializer(serializers.ModelSerializer):
    """``Topup``: a recorded deposit top-up and its approval state."""

    host_account_id = serializers.UUIDField()
    host = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()
    requested_by = serializers.SerializerMethodField()
    approved_by = serializers.SerializerMethodField()
    rejection_reason = serializers.SerializerMethodField()
    ledger_transaction_id = serializers.SerializerMethodField()
    wallet_balance_after = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads."""
        model = WalletTopup
        fields = [
            "id", "host_account_id", "host", "method", "amount", "receipt_reference", "note", "status",
            "requested_by", "approved_by", "approved_at", "rejection_reason", "ledger_transaction_id",
            "needs_second_approval", "wallet_balance_after", "created_at",
        ]

    @extend_schema_field(HostSummarySerializer)
    def get_host(self, topup: WalletTopup) -> dict:
        """Who the deposit is for."""
        return host_summary(topup.host_account)

    @extend_schema_field(MoneySerializer)
    def get_amount(self, topup: WalletTopup) -> dict:
        """Amount as ``{"amount_minor", "currency"}``."""
        return money_dict(topup.amount_minor, topup.currency)

    @extend_schema_field(UserRefSerializer)
    def get_requested_by(self, topup: WalletTopup) -> dict:
        """Admin who recorded it."""
        return user_ref(topup.requested_by)

    @extend_schema_field(UserRefSerializer(allow_null=True))
    def get_approved_by(self, topup: WalletTopup) -> dict | None:
        """Admin who approved it (the same one when no second approval was needed)."""
        return user_ref(topup.approved_by)

    def get_rejection_reason(self, topup: WalletTopup) -> str | None:
        """Why it was refused, or ``None``."""
        return topup.rejection_reason or None

    def get_ledger_transaction_id(self, topup: WalletTopup) -> str | None:
        """Ledger transaction posted for it, once approved."""
        tx = next(iter(topup.transactions.all()), None)
        return str(tx.id) if tx else None

    @extend_schema_field(MoneySerializer(allow_null=True))
    def get_wallet_balance_after(self, topup: WalletTopup) -> dict | None:
        """Deposit right after the posting, or ``None`` while not posted."""
        return money_dict(topup.wallet_balance_after_minor, topup.currency)


# ---------------------------------------------------------------------------
# Manual adjustments (review R6, BR-PAY-13)
# ---------------------------------------------------------------------------
class AdjustmentCreateSerializer(serializers.Serializer):
    """Body of ``POST /admin/wallet-adjustments`` (review R6). Signed amount in centimes."""

    host_account = serializers.PrimaryKeyRelatedField(queryset=HostAccount.objects.alive())
    amount_minor = serializers.IntegerField()
    reason = serializers.CharField(min_length=10, max_length=1000)


class AdjustmentSerializer(serializers.ModelSerializer):
    """A manual correction of a host deposit and its approval state."""

    amount = serializers.SerializerMethodField()
    host_name = serializers.CharField(source="host_account.display_name", read_only=True)

    class Meta:
        """Model and fields this serializer reads or writes."""
        model = WalletAdjustment
        fields = [
            "id", "host_account", "host_name", "amount", "reason", "status",
            "requested_by", "approved_by", "approved_at", "rejection_reason", "created_at",
        ]

    @extend_schema_field(MoneySerializer)
    def get_amount(self, adjustment: WalletAdjustment) -> dict:
        """Signed amount as ``{"amount_minor", "currency"}``."""
        return money_dict(adjustment.amount_minor, adjustment.currency)


# ---------------------------------------------------------------------------
# Invoices (R2, BR-PAY-12)
# ---------------------------------------------------------------------------
class InvoiceSerializer(serializers.ModelSerializer):
    """``Invoice``: a monthly commission invoice."""

    number = serializers.CharField(source="display_number")
    amount_ht = serializers.SerializerMethodField()
    vat = serializers.SerializerMethodField()
    amount_ttc = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads."""
        model = Invoice
        fields = ["id", "number", "host_account_id", "period_start", "period_end", "amount_ht", "vat", "amount_ttc",
                  "status", "pdf_url", "issued_at"]

    @extend_schema_field(MoneySerializer)
    def get_amount_ht(self, invoice: Invoice) -> dict:
        """Amount before VAT."""
        return money_dict(invoice.amount_ht_minor, invoice.currency)

    @extend_schema_field(MoneySerializer)
    def get_vat(self, invoice: Invoice) -> dict:
        """VAT included in the commission."""
        return money_dict(invoice.vat_minor, invoice.currency)

    @extend_schema_field(MoneySerializer)
    def get_amount_ttc(self, invoice: Invoice) -> dict:
        """Amount including VAT: the net commission of the period."""
        return money_dict(invoice.amount_ttc_minor, invoice.currency)

    def get_pdf_url(self, invoice: Invoice) -> str | None:
        """PDF rendering is not built yet (R2): always ``None``."""
        return None


# ---------------------------------------------------------------------------
# Dormant: payouts and payments (BR-PAY-11)
# ---------------------------------------------------------------------------
class PayoutCreateSerializer(serializers.Serializer):
    """``PayoutCreate``: body of ``POST /host/payouts``."""

    amount = MoneyInputSerializer()
    payout_account_id = serializers.UUIDField()


class MarkSentSerializer(serializers.Serializer):
    """Body of ``POST /admin/payouts/{payout_id}/mark-sent``."""

    bank_reference = serializers.CharField(max_length=120)


class PayoutSerializer(serializers.ModelSerializer):
    """``Payout``: money sent to a host (dormant, model M4)."""

    amount = serializers.SerializerMethodField()
    approved_by = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads."""
        model = Payout
        fields = ["id", "host_account_id", "payout_account_id", "amount", "status", "approved_by", "approved_at",
                  "bank_reference", "rejection_reason", "created_at"]

    @extend_schema_field(MoneySerializer)
    def get_amount(self, payout: Payout) -> dict:
        """Amount of the payout."""
        return money_dict(payout.amount_minor, payout.currency)

    @extend_schema_field(UserRefSerializer(allow_null=True))
    def get_approved_by(self, payout: Payout) -> dict | None:
        """Admin who approved it."""
        return user_ref(payout.approved_by)


class PaymentSerializer(serializers.ModelSerializer):
    """``Payment``: an online guest payment (dormant, models M2 to M4)."""

    amount = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads."""
        model = Payment
        fields = ["id", "booking_id", "provider", "checkout_url", "amount", "status", "created_at"]

    @extend_schema_field(MoneySerializer)
    def get_amount(self, payment: Payment) -> dict:
        """Amount the guest pays."""
        return money_dict(payment.amount_minor, payment.currency)


class GatewayEventAckSerializer(serializers.Serializer):
    """``GatewayEventAck``: the webhook answer."""

    received = serializers.BooleanField()
    duplicate = serializers.BooleanField()

