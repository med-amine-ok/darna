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
    # Memo accounts for refunds a host owes a guest after a cancellation (review R8).
    # The money never passes through BLADUS (DEC-019); these lines only record the debt.
    HOST_REFUND_PAYABLE = "host_refund_payable", "Refunds a host owes guests"
    GUEST_REFUND_CLEARING = "guest_refund_clearing", "Refunds owed to guests (memo)"
    # Accounts of the dormant money models M2 to M4 (BR-PAY-11): they exist from day one
    # so switching a model on needs no migration, but nothing posts to them while it is off.
    VAT_PAYABLE = "vat_payable", "VAT owed on commission"
    GUEST_RECEIVABLE = "guest_receivable", "Guest payments on the way (M2)"
    ESCROW = "escrow", "Guest money held until the stay (M3)"
    HOST_PAYABLE = "host_payable", "Money owed to hosts (M4)"
    PAYOUT_CLEARING = "payout_clearing", "Payouts approved, not sent yet"


class LedgerAccount(UUIDModel):
    """A place where money is counted. One wallet per host account, plus the platform accounts."""

    code = models.CharField(max_length=80, unique=True, help_text="e.g. host_wallet:<host id>, platform_cash:ccp_transfer.")
    kind = models.CharField(max_length=24, choices=AccountKind.choices)
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
    REFUND_DUE = "refund_due", "Refund owed by the host to a guest (memo)"
    REFUND_SETTLED = "refund_settled", "Refund paid by the host to a guest (memo)"
    # Dormant kinds (BR-PAY-11): only posted once models M2 to M4 are switched on.
    GUEST_PAYMENT = "guest_payment", "Online guest payment (M2 to M4)"
    REFUND = "refund", "Refund paid by BLADUS through the gateway (M4)"
    PAYOUT = "payout", "Money sent to a host"


class LedgerTransaction(UUIDModel):
    """One money event. Insert-only."""

    kind = models.CharField(max_length=20, choices=TransactionKind.choices)
    booking_id = models.UUIDField(null=True, blank=True, db_index=True, help_text="Booking this movement belongs to, if any.")
    booking_reference = models.CharField(max_length=20, blank=True, help_text="BLD reference, for display and search (DEC-031).")
    refund_id = models.UUIDField(
        null=True, blank=True,
        help_text="Refund row (bookings app) that caused this posting: the idempotency source of partial refunds.",
    )
    topup = models.ForeignKey("ledger.WalletTopup", on_delete=models.PROTECT, null=True, blank=True, related_name="transactions")
    reverses = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True, related_name="reversals")
    adjustment = models.ForeignKey("ledger.WalletAdjustment", on_delete=models.PROTECT, null=True, blank=True, related_name="transactions")
    description = models.CharField(max_length=255)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    occurred_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        ordering = ["-occurred_at"]
        constraints = [
            # BR-PAY-04: the commission of a booking is posted once.
            models.UniqueConstraint(fields=["booking_id"], condition=models.Q(kind="commission"), name="ledger_one_commission_per_booking"),
            # BR-PAY-05, BR-CAN-04: a commission return, a refund debt and its settlement are posted
            # once per refund row; a posting without a refund row keeps the per-booking guard.
            models.UniqueConstraint(
                fields=["booking_id"], condition=models.Q(kind="commission_reversal", refund_id__isnull=True),
                name="ledger_one_reversal_per_booking",
            ),
            models.UniqueConstraint(
                fields=["booking_id"], condition=models.Q(kind="refund_due", refund_id__isnull=True),
                name="ledger_one_refund_due_per_booking",
            ),
            models.UniqueConstraint(
                fields=["booking_id"], condition=models.Q(kind="refund_settled", refund_id__isnull=True),
                name="ledger_one_refund_settled_per_booking",
            ),
            models.UniqueConstraint(
                fields=["refund_id", "kind"], condition=models.Q(refund_id__isnull=False),
                name="ledger_one_posting_per_refund_kind",
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
    # Reserved for online top-ups, which are not in v1 (DEC-019, DEC-031, BR-PAY-08):
    # an admin can never record a manual top-up with this method.
    GATEWAY = "gateway", "Online gateway (not in v1)"


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
    note = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=TopupStatus.choices)
    needs_second_approval = models.BooleanField(
        default=False, help_text="True when the host's rolling 24-hour total passed the four-eyes threshold (BR-PAY-07).",
    )
    wallet_balance_after_minor = models.BigIntegerField(null=True, blank=True, help_text="Host deposit right after posting.")
    gateway_event = models.ForeignKey(
        "ledger.GatewayEvent", on_delete=models.PROTECT, null=True, blank=True, related_name="+",
        help_text="Online top-ups only (later, BR-PAY-08).",
    )
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


class AdjustmentStatus(models.TextChoices):
    """Life of a manual adjustment: always waits for a second admin (review R6)."""

    PENDING_APPROVAL = "pending_approval", "Waiting for a second admin"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class WalletAdjustment(UUIDModel):
    """
    A manual correction of a host deposit (review R6).

    Used to fix a mistake (wrong top-up amount, goodwill gesture). The amount
    is signed: positive adds to the deposit, negative takes from it. Every
    adjustment needs a reason and a second admin, and is capped in absolute
    value by the ``adjustment_max_minor`` setting. Nothing is posted until it
    is approved.
    """

    host_account = models.ForeignKey("hosts.HostAccount", on_delete=models.PROTECT, related_name="adjustments")
    amount_minor = models.BigIntegerField(help_text="Centimes; positive credits the deposit, negative debits it.")
    currency = models.CharField(max_length=3, default="DZD")
    reason = models.TextField()
    status = models.CharField(max_length=16, choices=AdjustmentStatus.choices, default=AdjustmentStatus.PENDING_APPROVAL)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(condition=~models.Q(amount_minor=0), name="adjustment_nonzero"),
            # The approver is never the admin who asked (four eyes, review R6).
            models.CheckConstraint(
                condition=models.Q(approved_by__isnull=True) | ~models.Q(approved_by=models.F("requested_by")),
                name="adjustment_four_eyes",
            ),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"adjustment {self.amount_minor} {self.currency} ({self.status})"


# ---------------------------------------------------------------------------
# Gateway webhooks and dormant payment models (BR-PAY-08, BR-PAY-11, BR-SYS-02)
# ---------------------------------------------------------------------------
class GatewayProvider(models.TextChoices):
    """Payment gateways BLADUS may use later (DEC-019)."""

    CHARGILY = "chargily", "Chargily"
    SLICKPAY = "slickpay", "SlickPay"


class GatewayEvent(UUIDModel):
    """
    One raw webhook call of a payment gateway (BR-SYS-02).

    The body is stored before anything else, then the signature is checked,
    then the event is processed once by a worker. ``(provider, event_id)`` is
    unique among events with a valid signature, so a replayed event is never
    applied twice and an unsigned fake cannot block the real event id.
    """

    provider = models.CharField(max_length=20, choices=GatewayProvider.choices)
    event_id = models.CharField(max_length=100, blank=True)
    signature_valid = models.BooleanField(default=False)
    payload = models.JSONField(default=dict)
    raw_body = models.TextField(blank=True, help_text="Body exactly as received, for audits and replays.")
    received_at = models.DateTimeField(default=timezone.now)
    processed_at = models.DateTimeField(null=True, blank=True)
    error = models.TextField(blank=True)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        ordering = ["-received_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "event_id"], condition=models.Q(signature_valid=True), name="gateway_event_once",
            ),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.provider}:{self.event_id}"


class PaymentStatus(models.TextChoices):
    """Life of an online guest payment (dormant, M2 to M4)."""

    PENDING = "pending", "Checkout open"
    PAID = "paid", "Paid"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class Payment(UUIDModel):
    """
    An online payment of a booking by the guest. DORMANT until money model M2 to M4 is approved (BR-PAY-11).

    ``booking_id`` is a plain UUID because ledger sits below bookings in the
    layer order (07-architecture section 2).
    """

    booking_id = models.UUIDField(null=True, blank=True, db_index=True)
    guest = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    provider = models.CharField(max_length=20, choices=GatewayProvider.choices)
    provider_checkout_id = models.CharField(max_length=100)
    checkout_url = models.URLField(max_length=500, blank=True)
    amount_minor = models.BigIntegerField()
    currency = models.CharField(max_length=3, default="DZD")
    status = models.CharField(max_length=16, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(condition=models.Q(amount_minor__gt=0), name="payment_amount_positive"),
            models.UniqueConstraint(fields=["provider", "provider_checkout_id"], name="payment_unique_checkout"),
        ]


class PayoutStatus(models.TextChoices):
    """Life of a payout (BR-PAY-11)."""

    REQUESTED = "requested", "Requested by the host"
    APPROVED = "approved", "Approved, waiting to be sent"
    SENT = "sent", "Sent by BLADUS"
    CONFIRMED = "confirmed", "Confirmed received"
    REJECTED = "rejected", "Rejected"


class Payout(UUIDModel):
    """
    Money sent from BLADUS to a host. DORMANT (model M4, BR-PAY-11).

    Also usable for deposit withdrawals in M1 if the product allows them.
    The destination account must be out of its 72-hour hold (BR-PAY-09).
    Approval posts ``host_wallet -> payout_clearing``; marking it sent posts
    ``payout_clearing -> platform_cash``.
    """

    host_account = models.ForeignKey("hosts.HostAccount", on_delete=models.PROTECT, related_name="payouts")
    payout_account = models.ForeignKey("hosts.PayoutAccount", on_delete=models.PROTECT, related_name="payouts")
    amount_minor = models.BigIntegerField()
    currency = models.CharField(max_length=3, default="DZD")
    status = models.CharField(max_length=16, choices=PayoutStatus.choices, default=PayoutStatus.REQUESTED)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    bank_reference = models.CharField(max_length=120, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    ledger_transaction = models.ForeignKey(
        LedgerTransaction, on_delete=models.PROTECT, null=True, blank=True, related_name="+",
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "created_at"])]
        constraints = [models.CheckConstraint(condition=models.Q(amount_minor__gt=0), name="payout_amount_positive")]


class InvoiceStatus(models.TextChoices):
    """An invoice is never deleted: it is cancelled by a credit note (BR-PAY-12)."""

    ISSUED = "issued", "Issued"
    CANCELLED = "cancelled", "Cancelled"


class Invoice(UUIDModel):
    """
    Monthly commission invoice of one host account (R2, BR-PAY-12). VERIFY WITH A PROFESSIONAL.

    Numbers are sequential per year without gaps (``(year, number)`` unique,
    given under a lock by ``services.issue_monthly_invoices``). Amounts come
    from the ledger: the net commission of the month is the amount including
    VAT, split into ``amount_ht`` and ``vat``.
    """

    host_account = models.ForeignKey("hosts.HostAccount", on_delete=models.PROTECT, related_name="invoices")
    year = models.PositiveSmallIntegerField()
    number = models.PositiveIntegerField()
    period_start = models.DateField()
    period_end = models.DateField()
    amount_ht_minor = models.BigIntegerField()
    vat_minor = models.BigIntegerField()
    amount_ttc_minor = models.BigIntegerField()
    currency = models.CharField(max_length=3, default="DZD")
    status = models.CharField(max_length=12, choices=InvoiceStatus.choices, default=InvoiceStatus.ISSUED)
    credit_note_of = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True, related_name="credit_notes")
    issued_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        ordering = ["-year", "-number"]
        constraints = [
            models.UniqueConstraint(fields=["year", "number"], name="invoice_number_unique"),
            # The monthly job may run twice: one invoice per host and period.
            models.UniqueConstraint(
                fields=["host_account", "period_start", "period_end"], condition=models.Q(credit_note_of__isnull=True),
                name="invoice_one_per_host_period",
            ),
            models.CheckConstraint(
                condition=models.Q(amount_ttc_minor=models.F("amount_ht_minor") + models.F("vat_minor")),
                name="invoice_ttc_is_ht_plus_vat",
            ),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return self.display_number

    @property
    def display_number(self) -> str:
        """Number shown on the invoice, e.g. ``2026-000123``."""
        return f"{self.year}-{self.number:06d}"
