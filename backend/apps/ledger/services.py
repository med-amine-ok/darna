"""
Ledger services: the only code allowed to move money.

Public functions:
- :func:`wallet_balance_minor` and :func:`wallet_state` : read a host's deposit;
- :func:`lock_wallet` : row lock taken first by every booking write (review R7);
- :func:`create_topup`, :func:`approve_topup`, :func:`reject_topup` : admin top-ups,
  four eyes on the host's 24-hour total (BR-PAY-07, review R6);
- :func:`create_adjustment`, :func:`approve_adjustment`, :func:`reject_adjustment` :
  manual corrections, always two admins (review R6);
- :func:`post_commission` : take the commission when a booking is confirmed;
- :func:`reverse_commission` : give back the share that follows the refund (DEC-018 revised);
- :func:`record_refund_due`, :func:`record_refund_settled` : memo lines of a refund a
  host owes a guest (review R8);
- :func:`reconcile_balances` : nightly check of every stored balance (review R11);
- :func:`can_accept_bookings` : credit floor check (BR-PAY-10);
- :func:`start_guest_payment`, :func:`receive_gateway_event`, :func:`process_gateway_event` :
  online payment, dormant while switched off (DEC-019, BR-PAY-08, BR-PAY-11, BR-SYS-02);
- :func:`request_payout`, :func:`approve_payout`, :func:`reject_payout`, :func:`mark_payout_sent` :
  payouts, dormant (model M4, BR-PAY-09, BR-PAY-11);
- :func:`issue_monthly_invoices` : commission invoices with gap-free numbers (R2, BR-PAY-12).

Lock order (review R7): the host wallet balance row is always locked before
any listing or stock row, so two writers never wait for each other in a
circle. No platform-wide row is updated on the booking path: commission
revenue is the sum of its ledger lines.
"""

import json
from datetime import date, timedelta

from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone

from apps.audit import services as audit
from apps.config import services as config
from apps.core import outbox
from apps.core.errors import ConflictError, DomainError, ForbiddenError, NotFoundError

from . import gateways, selectors
from .models import (
    AccountBalance,
    AccountKind,
    AdjustmentStatus,
    GatewayEvent,
    Invoice,
    LedgerAccount,
    LedgerEntry,
    LedgerTransaction,
    Payment,
    PaymentStatus,
    Payout,
    PayoutStatus,
    TopupMethod,
    TopupStatus,
    TransactionKind,
    WalletAdjustment,
    WalletTopup,
)

# Accounts whose balance is kept in AccountBalance (friendly sign: minus the sum of lines).
BALANCED_KINDS = (AccountKind.HOST_WALLET,)

# Methods an admin may use for a manual top-up (BR-PAY-07). ``gateway`` is reserved (BR-PAY-08).
MANUAL_TOPUP_METHODS = (TopupMethod.CCP_TRANSFER, TopupMethod.BANK_TRANSFER, TopupMethod.BARIDIMOB, TopupMethod.CASH_OFFICE)


# ---------------------------------------------------------------------------
# Accounts
# ---------------------------------------------------------------------------
def wallet_account(host_account) -> LedgerAccount:
    """Return the deposit wallet of a host account, creating it on first use."""
    account, _ = LedgerAccount.objects.get_or_create(
        host_account=host_account,
        kind=AccountKind.HOST_WALLET,
        defaults={"code": f"host_wallet:{host_account.id}"},
    )
    return account


def platform_account(kind: str, suffix: str = "") -> LedgerAccount:
    """Return a platform account such as ``platform_cash:ccp_transfer`` or ``commission_revenue``."""
    code = f"{kind}:{suffix}" if suffix else kind
    account, _ = LedgerAccount.objects.get_or_create(code=code, defaults={"kind": kind})
    return account


def lock_wallet(host_account) -> AccountBalance:
    """
    Lock the host's deposit balance row for the rest of the transaction (review R7).

    Booking creation and acceptance call this first, before reading the
    floor and before touching any stock, so two bookings of the same host
    are checked one after the other and cannot both pass the credit floor.
    Must run inside ``transaction.atomic``.
    """
    account = wallet_account(host_account)
    AccountBalance.objects.get_or_create(account=account)
    return AccountBalance.objects.select_for_update().get(account=account)


def commission_revenue_minor() -> int:
    """BLADUS commission kept so far, computed from the ledger lines, never from a shared row (review R7)."""
    account = platform_account(AccountKind.COMMISSION_REVENUE)
    total = LedgerEntry.objects.filter(account=account).aggregate(total=Sum("amount_minor"))["total"] or 0
    return -total


def wallet_balance_minor(host_account) -> int:
    """Deposit of a host in centimes (negative when the host owes commission)."""
    balance = AccountBalance.objects.filter(account__host_account=host_account, account__kind=AccountKind.HOST_WALLET).first()
    return balance.balance_minor if balance else 0


def wallet_state(host_account) -> dict:
    """
    Everything the host wallet widget needs: balance, commission rate, credit
    floor and whether new bookings can still be confirmed.
    """
    balance = wallet_balance_minor(host_account)
    limit = config.credit_limit_minor(host_account)
    return {
        "balance_minor": balance,
        "currency": "DZD",
        "commission_rate_bp": config.commission_rate_bp(host_account),
        "credit_limit_minor": limit,
        "is_negative": balance < 0,
        "can_accept_bookings": balance >= -limit,
    }


def can_accept_bookings(host_account) -> bool:
    """
    True while the deposit is above the credit floor (BR-PAY-10).

    Below the floor, instant bookings become requests and the host cannot
    accept requests until the deposit is topped up.
    """
    return wallet_balance_minor(host_account) >= -config.credit_limit_minor(host_account)


# ---------------------------------------------------------------------------
# Posting
# ---------------------------------------------------------------------------
def _post(*, kind: str, description: str, lines: list[tuple[LedgerAccount, int]], wallet_delta: dict | None = None,
          booking_id=None, topup=None, reverses=None, adjustment=None, actor=None, reference: str = "",
          refund_id=None) -> LedgerTransaction:
    """
    Write one balanced transaction (BR-PAY-02). Must run inside ``transaction.atomic``.

    ``lines`` is a list of ``(account, amount_minor)``; debits positive,
    credits negative; the sum must be zero. ``wallet_delta`` maps a wallet
    account to the change of its friendly balance (see AccountBalance).
    """
    if sum(amount for _, amount in lines) != 0:
        raise RuntimeError("Ledger transaction is not balanced.")
    tx = LedgerTransaction.objects.create(
        kind=kind, description=description, booking_id=booking_id, topup=topup, reverses=reverses,
        adjustment=adjustment, created_by=actor, booking_reference=(reference or "")[:20], refund_id=refund_id,
    )
    LedgerEntry.objects.bulk_create([LedgerEntry(transaction=tx, account=account, amount_minor=amount) for account, amount in lines])
    for account, delta in (wallet_delta or {}).items():
        # Lock the balance row so two postings cannot overwrite each other.
        balance, _ = AccountBalance.objects.select_for_update().get_or_create(account=account)
        balance.balance_minor += delta
        balance.save(update_fields=["balance_minor", "updated_at"])
    return tx


# ---------------------------------------------------------------------------
# Top-ups (BR-PAY-07)
# ---------------------------------------------------------------------------
@transaction.atomic
def create_topup(*, host_account, method: str, amount_minor: int, receipt_reference: str, note: str = "", actor) -> WalletTopup:
    """
    Record a deposit the host sent by transfer.

    Small amounts are credited at once. When the host's top-ups of the last
    24 hours plus this one go above the four-eyes threshold, it stays
    ``pending_approval`` until a different admin approves it (review R6).
    Raises ``ConflictError(code="receipt_already_used")`` for a reused receipt.
    """
    if not 100 <= amount_minor <= 1_000_000_000:
        raise DomainError("The amount must be between 1 and 10,000,000 DZD.", code="invalid_amount", status_code=422)
    if method not in MANUAL_TOPUP_METHODS:
        # BR-PAY-08: online top-ups do not exist in v1; ``gateway`` is reserved for them.
        raise DomainError("This method cannot be used for a manual top-up.", code="method_not_allowed", status_code=422)
    receipt_reference = receipt_reference.strip()
    if not receipt_reference:
        raise DomainError("The receipt reference is required.", code="receipt_required")
    # Review R6: the threshold applies to the host's rolling 24-hour total, so
    # splitting one large deposit into small ones still needs a second admin.
    # The host row is locked so two admins recording at once are counted together.
    type(host_account).objects.select_for_update().filter(pk=host_account.pk).first()
    recent = WalletTopup.objects.filter(
        host_account=host_account, created_at__gte=timezone.now() - timedelta(hours=24),
        status__in=[TopupStatus.PENDING_APPROVAL, TopupStatus.APPROVED],
    ).aggregate(total=Sum("amount_minor"))["total"] or 0
    needs_second_admin = recent + amount_minor > int(config.get_value("topup_four_eyes_minor"))
    try:
        with transaction.atomic():
            topup = WalletTopup.objects.create(
                host_account=host_account, method=method, amount_minor=amount_minor, receipt_reference=receipt_reference,
                note=note, requested_by=actor, needs_second_approval=needs_second_admin,
                status=TopupStatus.PENDING_APPROVAL if needs_second_admin else TopupStatus.APPROVED,
                approved_by=None if needs_second_admin else actor,
                approved_at=None if needs_second_admin else timezone.now(),
            )
    except IntegrityError as exc:
        raise ConflictError("This receipt was already recorded.", code="receipt_already_used") from exc

    if not needs_second_admin:
        _credit_topup(topup, actor)
    audit.record(actor=actor, action="WALLET_TOPUP_CREATE", obj=topup,
                 after={"amount_minor": amount_minor, "method": method, "status": topup.status, "host_account": str(host_account.id)})
    return topup


def _credit_topup(topup: WalletTopup, actor) -> None:
    """
    Post the ledger lines of an approved top-up: BLADUS cash up, host wallet up.

    Locks the wallet first (review R7) and stores the deposit right after the
    posting on the top-up, so the admin screen can show it (Topup.wallet_balance_after).
    """
    lock_wallet(topup.host_account)
    wallet = wallet_account(topup.host_account)
    cash = platform_account(AccountKind.PLATFORM_CASH, topup.method)
    _post(
        kind=TransactionKind.WALLET_TOPUP,
        description=f"Deposit top-up {topup.receipt_reference}",
        lines=[(cash, topup.amount_minor), (wallet, -topup.amount_minor)],
        wallet_delta={wallet: topup.amount_minor},
        topup=topup,
        actor=actor,
    )
    topup.wallet_balance_after_minor = wallet_balance_minor(topup.host_account)
    topup.save(update_fields=["wallet_balance_after_minor"])


@transaction.atomic
def approve_topup(topup_id, *, actor) -> WalletTopup:
    """
    Second admin approves a large top-up (BR-PAY-07).

    The approver must always differ from the admin who recorded it
    (403 ``four_eyes_same_user``); only a ``pending_approval`` top-up can be
    approved (409 ``topup_not_pending``). Posts the ledger transaction.
    """
    topup = WalletTopup.objects.select_for_update().filter(pk=topup_id).first()
    if topup is None:
        raise NotFoundError("Top-up not found.")
    if topup.requested_by_id == actor.id:
        raise ForbiddenError("A second admin must approve this top-up.", code="four_eyes_same_user")
    if topup.status != TopupStatus.PENDING_APPROVAL:
        raise ConflictError("This top-up is not waiting for approval.", code="topup_not_pending")
    topup.status, topup.approved_by, topup.approved_at = TopupStatus.APPROVED, actor, timezone.now()
    topup.save(update_fields=["status", "approved_by", "approved_at"])
    _credit_topup(topup, actor)
    audit.record(actor=actor, action="WALLET_TOPUP_APPROVE", obj=topup, after={"amount_minor": topup.amount_minor})
    return topup


@transaction.atomic
def reject_topup(topup_id, *, actor, reason: str) -> WalletTopup:
    """Refuse a pending top-up with a reason; no money moves."""
    if len(reason.strip()) < 10:
        raise DomainError("Give a reason of at least 10 characters.", code="reason_required")
    topup = WalletTopup.objects.select_for_update().filter(pk=topup_id).first()
    if topup is None:
        raise NotFoundError("Top-up not found.")
    if topup.status != TopupStatus.PENDING_APPROVAL:
        raise ConflictError("This top-up is not waiting for approval.", code="topup_not_pending")
    topup.status, topup.rejection_reason = TopupStatus.REJECTED, reason.strip()
    topup.save(update_fields=["status", "rejection_reason"])
    audit.record(actor=actor, action="WALLET_TOPUP_REJECT", obj=topup, note=reason.strip())
    return topup


# ---------------------------------------------------------------------------
# Commission (BR-PAY-04, BR-PAY-05, DEC-018)
# ---------------------------------------------------------------------------
@transaction.atomic
def post_commission(*, host_account, booking_id, amount_minor: int, reference: str = "") -> LedgerTransaction | None:
    """
    Take the commission of a confirmed booking from the host's deposit.

    Safe to call twice: the second call returns the existing transaction
    (one commission per booking, enforced by a unique constraint).
    Returns ``None`` when the commission is zero.
    """
    if amount_minor <= 0:
        return None
    existing = LedgerTransaction.objects.filter(booking_id=booking_id, kind=TransactionKind.COMMISSION).first()
    if existing:
        return existing
    wallet = wallet_account(host_account)
    revenue = platform_account(AccountKind.COMMISSION_REVENUE)
    return _post(
        kind=TransactionKind.COMMISSION,
        description=f"Commission booking {reference}".strip(),
        lines=[(wallet, amount_minor), (revenue, -amount_minor)],
        wallet_delta={wallet: -amount_minor},
        booking_id=booking_id,
        reference=reference,
    )


def commission_share_to_return(*, commission_minor: int, commission_base_minor: int, refund_of_base_minor: int) -> int:
    """
    Part of the commission given back when part of the stay is refunded (DEC-018 revised 2026-11-13).

    The commission follows the refund: if half of the accommodation subtotal
    goes back to the guest, half of the commission goes back to the host.
    ``refund_of_base_minor`` is clamped to ``[0, commission_base_minor]``.
    Rounded half up, never more than the commission.
    """
    if commission_minor <= 0 or commission_base_minor <= 0:
        return 0
    part = max(0, min(refund_of_base_minor, commission_base_minor))
    share = (commission_minor * part * 2 + commission_base_minor) // (2 * commission_base_minor)
    return min(share, commission_minor)


def commission_taken_minor(booking_id) -> int:
    """Commission taken from the host's deposit for a booking (0 when none was posted, BR-PAY-04)."""
    original = LedgerTransaction.objects.filter(booking_id=booking_id, kind=TransactionKind.COMMISSION).first()
    if original is None:
        return 0
    return original.entries.filter(account__kind=AccountKind.HOST_WALLET).aggregate(total=Sum("amount_minor"))["total"] or 0


def commission_returned_minor(booking_id) -> int:
    """Commission already given back for a booking, over every reversal posted so far (BR-PAY-05)."""
    total = LedgerEntry.objects.filter(
        transaction__booking_id=booking_id, transaction__kind=TransactionKind.COMMISSION_REVERSAL,
        account__kind=AccountKind.HOST_WALLET,
    ).aggregate(total=Sum("amount_minor"))["total"] or 0
    return -total


def commission_remaining_minor(booking_id) -> int:
    """Commission still kept by BLADUS for a booking: taken minus returned (never below 0)."""
    return max(0, commission_taken_minor(booking_id) - commission_returned_minor(booking_id))


@transaction.atomic
def reverse_commission(*, host_account, booking_id, amount_minor: int | None = None,
                       reference: str = "", refund_id=None) -> LedgerTransaction | None:
    """
    Give commission back to the host after a cancellation or a refund (DEC-018 revised, BR-PAY-05, BR-CAN-04).

    ``amount_minor`` is the share to return now; ``None`` returns everything
    still kept (host cancellation). Partial refunds post one reversal each,
    keyed by ``refund_id``; the sum of reversals never passes the commission
    taken. Idempotent: the same ``refund_id`` (or, without one, the same
    booking) returns the reversal already posted. Does nothing when no
    commission was taken or the share is zero.
    """
    original = LedgerTransaction.objects.filter(booking_id=booking_id, kind=TransactionKind.COMMISSION).first()
    if original is None:
        return None
    already = LedgerTransaction.objects.filter(booking_id=booking_id, kind=TransactionKind.COMMISSION_REVERSAL)
    already = already.filter(refund_id=refund_id) if refund_id else already.filter(refund_id__isnull=True)
    if already.exists():
        return already.first()
    wallet = wallet_account(host_account)
    revenue = platform_account(AccountKind.COMMISSION_REVENUE)
    remaining = commission_remaining_minor(booking_id)
    amount = remaining if amount_minor is None else max(0, min(int(amount_minor), remaining))
    if amount == 0:
        return None
    return _post(
        kind=TransactionKind.COMMISSION_REVERSAL,
        description=f"Commission returned booking {reference}".strip(),
        lines=[(revenue, amount), (wallet, -amount)],
        wallet_delta={wallet: amount},
        booking_id=booking_id,
        reverses=original,
        reference=reference,
        refund_id=refund_id,
    )


# ---------------------------------------------------------------------------
# Refund debts (review R8). Memo lines only: the money goes from the host to
# the guest directly (DEC-019); BLADUS records who owes what so it can act
# when a host does not pay.
# ---------------------------------------------------------------------------
def _refund_accounts(host_account) -> tuple[LedgerAccount, LedgerAccount]:
    """The host's refund-payable memo account and the platform clearing memo account."""
    payable, _ = LedgerAccount.objects.get_or_create(
        host_account=host_account, kind=AccountKind.HOST_REFUND_PAYABLE,
        defaults={"code": f"host_refund_payable:{host_account.id}"},
    )
    return payable, platform_account(AccountKind.GUEST_REFUND_CLEARING)


def _scoped(queryset, refund_id):
    """Filter postings of one refund row, or the per-booking posting made without one."""
    return queryset.filter(refund_id=refund_id) if refund_id else queryset.filter(refund_id__isnull=True)


@transaction.atomic
def record_refund_due(*, host_account, booking_id, amount_minor: int, reference: str = "",
                      refund_id=None) -> LedgerTransaction | None:
    """
    Record that the host owes ``amount_minor`` to the guest of ``booking_id`` (BR-CAN-06).

    One memo posting per refund row (``refund_id``); safe to call twice.
    """
    if amount_minor <= 0:
        return None
    existing = _scoped(LedgerTransaction.objects.filter(booking_id=booking_id, kind=TransactionKind.REFUND_DUE),
                       refund_id).first()
    if existing:
        return existing
    payable, clearing = _refund_accounts(host_account)
    return _post(
        kind=TransactionKind.REFUND_DUE, description=f"Refund owed to guest, booking {reference}".strip(),
        lines=[(payable, amount_minor), (clearing, -amount_minor)], booking_id=booking_id, reference=reference,
        refund_id=refund_id,
    )


@transaction.atomic
def record_refund_settled(*, host_account, booking_id, reference: str = "", actor=None,
                          refund_id=None) -> LedgerTransaction | None:
    """Close the refund debt of one refund row once the guest got the money. Safe to call twice."""
    due = _scoped(LedgerTransaction.objects.filter(booking_id=booking_id, kind=TransactionKind.REFUND_DUE),
                  refund_id).first()
    if due is None:
        return None
    existing = _scoped(LedgerTransaction.objects.filter(booking_id=booking_id, kind=TransactionKind.REFUND_SETTLED),
                       refund_id).first()
    if existing:
        return existing
    payable, clearing = _refund_accounts(host_account)
    amount = due.entries.get(account=payable).amount_minor
    return _post(
        kind=TransactionKind.REFUND_SETTLED, description=f"Refund paid to guest, booking {reference}".strip(),
        lines=[(clearing, amount), (payable, -amount)], booking_id=booking_id, reverses=due, actor=actor,
        reference=reference, refund_id=refund_id,
    )


# ---------------------------------------------------------------------------
# Manual adjustments (review R6): always a second admin, capped amount.
# ---------------------------------------------------------------------------
@transaction.atomic
def create_adjustment(*, host_account, amount_minor: int, reason: str, actor) -> WalletAdjustment:
    """
    Ask for a manual correction of a host deposit (review R6).

    Nothing moves until a different admin approves it. ``amount_minor`` is
    signed and non-zero, at most ``adjustment_max_minor`` in absolute value;
    the reason needs 10 characters or more.
    """
    reason = (reason or "").strip()
    if len(reason) < 10:
        raise DomainError("Give a reason of at least 10 characters.", code="reason_required")
    limit = int(config.get_value("adjustment_max_minor"))
    if amount_minor == 0 or abs(amount_minor) > limit:
        raise DomainError(f"The amount must be non-zero and at most {limit // 100} DZD.", code="invalid_amount")
    adjustment = WalletAdjustment.objects.create(
        host_account=host_account, amount_minor=amount_minor, reason=reason, requested_by=actor
    )
    audit.record(actor=actor, action="WALLET_ADJUSTMENT_CREATE", obj=adjustment,
                 after={"amount_minor": amount_minor, "host_account": str(host_account.id)}, note=reason)
    return adjustment


def _pending_adjustment(adjustment_id) -> WalletAdjustment:
    """Read a pending adjustment under a lock, or raise 404 or 409."""
    adjustment = WalletAdjustment.objects.select_for_update().filter(pk=adjustment_id).first()
    if adjustment is None:
        raise DomainError("Adjustment not found.", code="not_found", status_code=404)
    if adjustment.status != AdjustmentStatus.PENDING_APPROVAL:
        raise ConflictError("This adjustment is not waiting for approval.", code="adjustment_not_pending")
    return adjustment


@transaction.atomic
def approve_adjustment(adjustment_id, *, actor) -> WalletAdjustment:
    """A second admin approves; the deposit moves by the signed amount (review R6)."""
    adjustment = _pending_adjustment(adjustment_id)
    if adjustment.requested_by_id == actor.id:
        raise ForbiddenError("A second admin must approve this adjustment.", code="four_eyes_required")
    lock_wallet(adjustment.host_account)
    adjustment.status, adjustment.approved_by, adjustment.approved_at = AdjustmentStatus.APPROVED, actor, timezone.now()
    adjustment.save(update_fields=["status", "approved_by", "approved_at"])
    wallet = wallet_account(adjustment.host_account)
    other = platform_account(AccountKind.ADJUSTMENTS)
    amount = adjustment.amount_minor
    _post(
        kind=TransactionKind.ADJUSTMENT, description=f"Adjustment: {adjustment.reason[:200]}",
        lines=[(other, amount), (wallet, -amount)], wallet_delta={wallet: amount},
        adjustment=adjustment, actor=actor,
    )
    audit.record(actor=actor, action="WALLET_ADJUSTMENT_APPROVE", obj=adjustment, after={"amount_minor": amount})
    return adjustment


@transaction.atomic
def reject_adjustment(adjustment_id, *, actor, reason: str) -> WalletAdjustment:
    """Refuse a pending adjustment with a reason; nothing moves."""
    reason = (reason or "").strip()
    if len(reason) < 10:
        raise DomainError("Give a reason of at least 10 characters.", code="reason_required")
    adjustment = _pending_adjustment(adjustment_id)
    adjustment.status, adjustment.rejection_reason = AdjustmentStatus.REJECTED, reason
    adjustment.save(update_fields=["status", "rejection_reason"])
    audit.record(actor=actor, action="WALLET_ADJUSTMENT_REJECT", obj=adjustment, note=reason)
    return adjustment


# ---------------------------------------------------------------------------
# Reconciliation (review R11)
# ---------------------------------------------------------------------------
def reconcile_balances(*, fix: bool = False, actor=None) -> list[dict]:
    """
    Recompute every stored wallet balance from its ledger lines and return the differences.

    Each difference is ``{"account", "stored_minor", "computed_minor"}``. With
    ``fix=True`` the stored balance is rewritten to the computed value and an
    audit line is written for each fix (use it only after a human read the
    report). Run every night (command ``reconcile_balances``).
    """
    sums = {
        row["account_id"]: row["total"]
        for row in LedgerEntry.objects.filter(account__kind__in=BALANCED_KINDS)
        .values("account_id").annotate(total=Sum("amount_minor"))
    }
    differences = []
    for account in LedgerAccount.objects.filter(kind__in=BALANCED_KINDS):
        computed = -(sums.get(account.id) or 0)
        balance = AccountBalance.objects.filter(account=account).first()
        stored = balance.balance_minor if balance else 0
        if stored == computed:
            continue
        differences.append({"account": account.code, "stored_minor": stored, "computed_minor": computed})
        if fix:
            with transaction.atomic():
                row, _ = AccountBalance.objects.select_for_update().get_or_create(account=account)
                row.balance_minor = computed
                row.save(update_fields=["balance_minor", "updated_at"])
                audit.record(actor=actor, action="LEDGER_BALANCE_FIX", obj=account,
                             before={"balance_minor": stored}, after={"balance_minor": computed})
    return differences


# ---------------------------------------------------------------------------
# Online guest payments and gateway webhooks: DORMANT (DEC-019, BR-PAY-08, BR-PAY-11, BR-SYS-02)
# ---------------------------------------------------------------------------
def require_guest_payments() -> None:
    """Raise 404 while guest payments are switched off: the endpoints do not exist yet (BR-PAY-11)."""
    if not gateways.guest_payments_enabled():
        raise NotFoundError("Not found.")


@transaction.atomic
def start_guest_payment(*, booking_id, guest, amount_minor: int, currency: str, reference: str) -> Payment:
    """
    Open a gateway checkout for a booking the guest pays online (M2 to M4, dormant).

    The caller (bookings) has checked that the booking is the guest's and
    payable. Refuses a second open or paid payment of the same booking
    (409 ``payment_exists``). Nothing is posted to the ledger here: money
    only moves when the verified webhook says the checkout was paid.
    """
    require_guest_payments()
    if Payment.objects.select_for_update().filter(
        booking_id=booking_id, status__in=[PaymentStatus.PENDING, PaymentStatus.PAID],
    ).exists():
        raise ConflictError("This booking already has a payment.", code="payment_exists")
    provider = gateways.DEFAULT_PROVIDER
    checkout = gateways.get_backend().create_checkout(
        provider=provider, amount_minor=amount_minor, currency=currency, reference=reference,
    )
    return Payment.objects.create(
        booking_id=booking_id, guest=guest, provider=provider, provider_checkout_id=checkout.checkout_id,
        checkout_url=checkout.url, amount_minor=amount_minor, currency=currency,
    )


# Gateway event types and the payment status they lead to.
_EVENT_STATUS = {
    "checkout.paid": PaymentStatus.PAID,
    "checkout.failed": PaymentStatus.FAILED,
    "checkout.canceled": PaymentStatus.CANCELLED,
    "checkout.cancelled": PaymentStatus.CANCELLED,
}


def receive_gateway_event(*, provider: str, raw_body: bytes, signature: str) -> tuple[GatewayEvent, bool]:
    """
    Store, verify and deduplicate one webhook call (BR-SYS-02, BR-PAY-08).

    Order: the raw body is stored first (also when the signature is wrong,
    for the audit trail), then the HMAC-SHA256 signature is checked (401
    ``invalid_signature``), then the event is deduplicated by
    ``(provider, event_id)``. A new event is queued on the outbox and
    processed once by the worker. Returns ``(event, duplicate)``.
    404 while online payment is off.
    """
    require_guest_payments()
    text = raw_body.decode("utf-8", errors="replace")
    try:
        payload = json.loads(text or "{}")
    except ValueError as exc:
        raise DomainError("The body is not JSON.", code="invalid_payload") from exc
    if not isinstance(payload, dict):
        raise DomainError("The body must be a JSON object.", code="invalid_payload")
    event_id = str(payload.get("id") or "")[:100]
    valid = gateways.signature_valid(provider, raw_body, signature)
    if not valid:
        GatewayEvent.objects.create(provider=provider, event_id=event_id, payload=payload, raw_body=text,
                                    signature_valid=False, error="invalid signature")
        raise DomainError("The signature is not valid.", code="invalid_signature", status_code=401)
    if not event_id:
        GatewayEvent.objects.create(provider=provider, payload=payload, raw_body=text, signature_valid=False,
                                    error="missing event id")
        raise DomainError("The event has no id.", code="missing_event_id", status_code=422)
    with transaction.atomic():
        existing = GatewayEvent.objects.filter(provider=provider, event_id=event_id, signature_valid=True).first()
        if existing:
            return existing, True
        try:
            with transaction.atomic():
                event = GatewayEvent.objects.create(provider=provider, event_id=event_id, payload=payload,
                                                    raw_body=text, signature_valid=True)
        except IntegrityError:
            # Two deliveries of the same event at the same moment: the other one won.
            return GatewayEvent.objects.get(provider=provider, event_id=event_id, signature_valid=True), True
        outbox.enqueue(GATEWAY_EVENT_TOPIC, {"gateway_event_id": str(event.id)})
    return event, False


GATEWAY_EVENT_TOPIC = "ledger.gateway_event"


@transaction.atomic
def process_gateway_event(payload: dict) -> None:
    """
    Outbox handler: apply one verified gateway event, once (BR-SYS-02).

    Idempotent: an event already processed is skipped. Today it only moves
    the matching payment to ``paid``, ``failed`` or ``cancelled``; the ledger
    postings of guest payments come with the M2 design.
    """
    event = GatewayEvent.objects.select_for_update().filter(pk=payload.get("gateway_event_id")).first()
    if event is None or event.processed_at or not event.signature_valid:
        return
    data = event.payload.get("data") if isinstance(event.payload.get("data"), dict) else {}
    checkout_id = str(data.get("id") or event.payload.get("checkout_id") or "")
    new_status = _EVENT_STATUS.get(str(event.payload.get("type") or ""))
    payment = Payment.objects.select_for_update().filter(provider=event.provider,
                                                          provider_checkout_id=checkout_id).first()
    if payment is None:
        event.error = "unknown checkout"
    elif new_status and payment.status == PaymentStatus.PENDING:
        payment.status = new_status
        payment.save(update_fields=["status"])
    event.processed_at = timezone.now()
    event.save(update_fields=["processed_at", "error"])


# ---------------------------------------------------------------------------
# Payouts: DORMANT (model M4, BR-PAY-09, BR-PAY-11)
# ---------------------------------------------------------------------------
def require_payouts() -> None:
    """Raise 404 while payouts are switched off (BR-PAY-11)."""
    if not gateways.payouts_enabled():
        raise NotFoundError("Not found.")


def _check_not_on_hold(payout_account) -> None:
    """BR-PAY-09: refuse while the account details changed less than 72 hours ago (409 ``payout_account_on_hold``)."""
    if payout_account.hold_until and payout_account.hold_until > timezone.now():
        raise ConflictError("This account changed recently; payouts to it wait 72 hours.",
                            code="payout_account_on_hold")


def available_for_payout_minor(host_account) -> int:
    """Deposit minus payouts already asked for and not yet posted (never below 0)."""
    waiting = Payout.objects.filter(host_account=host_account, status=PayoutStatus.REQUESTED).aggregate(
        total=Sum("amount_minor"))["total"] or 0
    return max(0, wallet_balance_minor(host_account) - waiting)


@transaction.atomic
def request_payout(*, host_account, payout_account_id, amount_minor: int, actor) -> Payout:
    """
    The host asks for money from the deposit (BR-PAY-11, BR-PAY-09).

    The account must belong to the host (else 404) and be out of its hold
    (409 ``payout_account_on_hold``); the amount must not pass what is free
    in the deposit (422 ``insufficient_balance``). Nothing is posted yet.
    """
    require_payouts()
    from apps.hosts.models import PayoutAccount

    lock_wallet(host_account)
    account = PayoutAccount.objects.filter(pk=payout_account_id, host_account=host_account,
                                           deleted_at__isnull=True).first()
    if account is None:
        raise NotFoundError("Payout account not found.")
    _check_not_on_hold(account)
    if amount_minor <= 0 or amount_minor > available_for_payout_minor(host_account):
        raise DomainError("The amount is more than your available deposit.", code="insufficient_balance",
                          status_code=422)
    payout = Payout.objects.create(host_account=host_account, payout_account=account, amount_minor=amount_minor,
                                   requested_by=actor)
    audit.record(actor=actor, action="PAYOUT_REQUEST", obj=payout,
                 after={"amount_minor": amount_minor, "host_account": str(host_account.id)})
    return payout


def _lock_payout(payout_id) -> Payout:
    """Read a payout under a lock, or 404."""
    payout = Payout.objects.select_for_update().filter(pk=payout_id).first()
    if payout is None:
        raise NotFoundError("Payout not found.")
    return payout


@transaction.atomic
def approve_payout(payout_id, *, actor) -> Payout:
    """
    An admin approves a requested payout (BR-PAY-11, BR-PAY-09, BR-STF-02).

    Re-checks the hold and the deposit under the wallet lock (review R7),
    then posts ``host_wallet -> payout_clearing``. The approver may not be
    the person who asked (403 ``four_eyes_same_user``).
    """
    require_payouts()
    payout = Payout.objects.filter(pk=payout_id).select_related("host_account", "payout_account").first()
    if payout is None:
        raise NotFoundError("Payout not found.")
    lock_wallet(payout.host_account)
    payout = _lock_payout(payout_id)
    if payout.status != PayoutStatus.REQUESTED:
        raise ConflictError("This payout is not waiting for approval.", code="payout_not_pending")
    if payout.requested_by_id == actor.id:
        raise ForbiddenError("Someone else must approve this payout.", code="four_eyes_same_user")
    _check_not_on_hold(payout.payout_account)
    if payout.amount_minor > wallet_balance_minor(payout.host_account):
        raise ConflictError("The deposit no longer covers this payout.", code="insufficient_balance")
    wallet = wallet_account(payout.host_account)
    clearing = platform_account(AccountKind.PAYOUT_CLEARING)
    tx = _post(kind=TransactionKind.PAYOUT, description=f"Payout {payout.id}",
               lines=[(wallet, payout.amount_minor), (clearing, -payout.amount_minor)],
               wallet_delta={wallet: -payout.amount_minor}, actor=actor)
    payout.status, payout.approved_by, payout.approved_at, payout.ledger_transaction = (
        PayoutStatus.APPROVED, actor, timezone.now(), tx)
    payout.save(update_fields=["status", "approved_by", "approved_at", "ledger_transaction"])
    audit.record(actor=actor, action="PAYOUT_APPROVE", obj=payout, before={"status": PayoutStatus.REQUESTED},
                 after={"status": payout.status, "amount_minor": payout.amount_minor})
    return payout


@transaction.atomic
def reject_payout(payout_id, *, actor, reason: str) -> Payout:
    """Refuse a requested payout with a reason (10 characters or more); nothing was posted, nothing moves."""
    require_payouts()
    reason = (reason or "").strip()
    if len(reason) < 10:
        raise DomainError("Give a reason of at least 10 characters.", code="reason_required")
    payout = _lock_payout(payout_id)
    if payout.status != PayoutStatus.REQUESTED:
        raise ConflictError("This payout is not waiting for approval.", code="payout_not_pending")
    payout.status, payout.rejection_reason = PayoutStatus.REJECTED, reason
    payout.save(update_fields=["status", "rejection_reason"])
    audit.record(actor=actor, action="PAYOUT_REJECT", obj=payout, note=reason,
                 before={"status": PayoutStatus.REQUESTED}, after={"status": payout.status})
    return payout


@transaction.atomic
def mark_payout_sent(payout_id, *, actor, bank_reference: str) -> Payout:
    """
    An admin says the transfer left BLADUS (BR-PAY-11): ``payout_clearing -> platform_cash``.

    Only an approved payout (409 ``payout_not_approved``); the bank reference is required.
    """
    require_payouts()
    bank_reference = (bank_reference or "").strip()
    if not bank_reference:
        raise DomainError("Give the bank reference.", code="reference_required",
                          errors={"bank_reference": ["Required."]})
    payout = _lock_payout(payout_id)
    if payout.status != PayoutStatus.APPROVED:
        raise ConflictError("Only an approved payout can be marked as sent.", code="payout_not_approved")
    clearing = platform_account(AccountKind.PAYOUT_CLEARING)
    cash = platform_account(AccountKind.PLATFORM_CASH, "payouts")
    _post(kind=TransactionKind.PAYOUT, description=f"Payout sent {bank_reference[:100]}",
          lines=[(clearing, payout.amount_minor), (cash, -payout.amount_minor)], actor=actor)
    payout.status, payout.bank_reference, payout.sent_at = PayoutStatus.SENT, bank_reference[:120], timezone.now()
    payout.save(update_fields=["status", "bank_reference", "sent_at"])
    audit.record(actor=actor, action="PAYOUT_MARK_SENT", obj=payout, before={"status": PayoutStatus.APPROVED},
                 after={"status": payout.status})
    return payout


# ---------------------------------------------------------------------------
# Commission invoices (R2, BR-PAY-12). VERIFY WITH A PROFESSIONAL.
# ---------------------------------------------------------------------------
# TODO(config): move to platform settings. VAT rate included in the commission, in basis points.
INVOICE_VAT_BP = 1900


def split_vat(amount_ttc_minor: int, vat_bp: int = INVOICE_VAT_BP) -> tuple[int, int]:
    """Split an amount including VAT into ``(ht, vat)``; ``ht`` rounded half up, ``vat`` is the rest."""
    ht = (amount_ttc_minor * 10_000 * 2 + (10_000 + vat_bp)) // (2 * (10_000 + vat_bp))
    return ht, amount_ttc_minor - ht


@transaction.atomic
def issue_monthly_invoices(year: int, month: int) -> list[Invoice]:
    """
    Issue the commission invoices of one month (BR-PAY-12), one per host with commission.

    Numbers follow each other per year without gaps: the last invoice row of
    the year is read under a lock before numbering. Safe to run twice: a
    host that already has its invoice for the period is skipped.
    """
    from apps.hosts.models import HostAccount

    start = date(year, month, 1)
    end = (date(year + (month == 12), month % 12 + 1, 1)) - timedelta(days=1)
    last = Invoice.objects.select_for_update().filter(year=year).order_by("-number").first()
    number = last.number if last else 0
    issued = []
    host_ids = LedgerAccount.objects.filter(kind=AccountKind.HOST_WALLET, host_account__isnull=False).values_list(
        "host_account_id", flat=True)
    for host_account in HostAccount.objects.filter(pk__in=host_ids).order_by("created_at"):
        if Invoice.objects.filter(host_account=host_account, period_start=start, period_end=end,
                                  credit_note_of__isnull=True).exists():
            continue
        ttc = selectors.net_commission_minor(host_account, start, end)
        if ttc <= 0:
            continue
        ht, vat = split_vat(ttc)
        number += 1
        issued.append(Invoice.objects.create(
            host_account=host_account, year=year, number=number, period_start=start, period_end=end,
            amount_ht_minor=ht, vat_minor=vat, amount_ttc_minor=ttc,
        ))
    for invoice in issued:
        audit.record(actor=None, action="INVOICE_ISSUE", obj=invoice,
                     after={"number": invoice.display_number, "amount_ttc_minor": invoice.amount_ttc_minor})
    return issued
