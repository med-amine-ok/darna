"""
Money ledger: host deposits and BLADUS commission.

There is no online payment in this version (DEC-019): the guest pays the host
directly. BLADUS only moves money between two kinds of accounts:

- the host's **deposit wallet** (money the host sent to BLADUS by transfer);
- BLADUS **cash** (what was received) and **commission revenue**.

Every movement is a ``LedgerTransaction`` made of ``LedgerEntry`` lines that
add up to zero (double entry, BR-PAY-02). Lines are never edited or deleted:
a mistake is corrected by a new transaction. A positive line is a debit, a
negative line is a credit. For the host wallet (money BLADUS owes the host)
the balance shown to people is ``-sum(lines)``; ``AccountBalance`` stores that
friendly number directly.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel


class AccountKind(models.TextChoices):
    """Kinds of ledger accounts used in this version."""

    HOST_WALLET = "host_wallet", "Host deposit wallet"
    PLATFORM_CASH = "platform_cash", "BLADUS cash received"
    COMMISSION_REVENUE = "commission_revenue", "BLADUS commission"
    ADJUSTMENTS = "adjustments", "Manual adjustments"


class LedgerAccount(UUIDModel):
    """A place where money is counted. One wallet per host account, plus the platform accounts."""

    code = models.CharField(max_length=80, unique=True, help_text="e.g. host_wallet:<host id>, platform_cash:ccp_transfer.")
    kind = models.CharField(max_length=20, choices=AccountKind.choices)
    host_account = models.ForeignKey("hosts.HostAccount", on_delete=models.PROTECT, null=True, blank=True, related_name="ledger_accounts")
    currency = models.CharField(max_length=3, default="DZD")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        constraints = [
            models.UniqueConstraint(
                fields=["host_account", "kind"], condition=models.Q(host_account__isnull=False), name="ledger_one_account_per_host_kind"
            ),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return self.code


class TransactionKind(models.TextChoices):
    """Why money moved."""

    WALLET_TOPUP = "wallet_topup", "Deposit top-up"
    COMMISSION = "commission", "Commission on a confirmed booking"
    COMMISSION_REVERSAL = "commission_reversal", "Commission returned after a cancellation"
    ADJUSTMENT = "adjustment", "Manual adjustment"


class LedgerTransaction(UUIDModel):
    """One money event. Insert-only."""

    kind = models.CharField(max_length=20, choices=TransactionKind.choices)
    booking_id = models.UUIDField(null=True, blank=True, db_index=True, help_text="Booking this movement belongs to, if any.")
    topup = models.ForeignKey("ledger.WalletTopup", on_delete=models.PROTECT, null=True, blank=True, related_name="transactions")
    reverses = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True, related_name="reversals")
    description = models.CharField(max_length=255)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    occurred_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        ordering = ["-occurred_at"]
        constraints = [
            # BR-PAY-04: the commission of a booking is posted once, and returned at most once.
            models.UniqueConstraint(fields=["booking_id"], condition=models.Q(kind="commission"), name="ledger_one_commission_per_booking"),
            models.UniqueConstraint(
                fields=["booking_id"], condition=models.Q(kind="commission_reversal"), name="ledger_one_reversal_per_booking"
            ),
        ]

    def save(self, *args, **kwargs):
        """Allow inserts only (BR-PAY-02)."""
        if not self._state.adding:
            raise RuntimeError("Ledger transactions cannot be modified.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Ledger rows are never deleted."""
        raise RuntimeError("Ledger transactions cannot be deleted.")


class LedgerEntry(models.Model):
    """One line of a transaction. Positive = debit, negative = credit. Insert-only."""

    transaction = models.ForeignKey(LedgerTransaction, on_delete=models.PROTECT, related_name="entries")
    account = models.ForeignKey(LedgerAccount, on_delete=models.PROTECT, related_name="entries")
    amount_minor = models.BigIntegerField(help_text="Centimes. Never zero.")
    currency = models.CharField(max_length=3, default="DZD")

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        constraints = [models.CheckConstraint(condition=~models.Q(amount_minor=0), name="ledger_entry_nonzero")]
        indexes = [models.Index(fields=["account", "id"])]

    def save(self, *args, **kwargs):
        """Allow inserts only (BR-PAY-02)."""
        if not self._state.adding:
            raise RuntimeError("Ledger entries cannot be modified.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Ledger rows are never deleted."""
        raise RuntimeError("Ledger entries cannot be deleted.")


class AccountBalance(models.Model):
    """
    Current balance of an account, kept in step with its lines (BR-PAY-03).

    For a host wallet ``balance_minor`` is what the host has in deposit
    (positive = money available, negative = the host owes commission).
    Updated in the same database transaction as the lines, under a row lock.
    """

    account = models.OneToOneField(LedgerAccount, on_delete=models.PROTECT, primary_key=True, related_name="balance")
    balance_minor = models.BigIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)


class TopupMethod(models.TextChoices):
    """How the host sent the deposit to BLADUS."""

    CCP_TRANSFER = "ccp_transfer", "CCP transfer"
    BANK_TRANSFER = "bank_transfer", "Bank transfer"
    BARIDIMOB = "baridimob", "BaridiMob"
    CASH_OFFICE = "cash_office", "Cash at the office"


class TopupStatus(models.TextChoices):
    """Life of a top-up."""

    PENDING_APPROVAL = "pending_approval", "Waiting for a second admin"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class WalletTopup(UUIDModel):
    """
    A host deposit recorded by an admin (BR-PAY-07).

    The receipt reference is unique per method, so the same transfer can
    never be credited twice. Amounts above the four-eyes threshold wait for
    a second admin.
    """

    host_account = models.ForeignKey("hosts.HostAccount", on_delete=models.PROTECT, related_name="topups")
    method = models.CharField(max_length=16, choices=TopupMethod.choices)
    amount_minor = models.BigIntegerField()
    currency = models.CharField(max_length=3, default="DZD")
    receipt_reference = models.CharField(max_length=200)
    note = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=16, choices=TopupStatus.choices)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["method", "receipt_reference"], name="topup_unique_receipt"),
            # 1 DZD to 10,000,000 DZD, in centimes.
            models.CheckConstraint(condition=models.Q(amount_minor__gte=100, amount_minor__lte=1_000_000_000), name="topup_amount_range"),
        ]
