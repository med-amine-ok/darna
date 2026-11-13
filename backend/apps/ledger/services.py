"""
Ledger services: the only code allowed to move money.

Public functions:
- :func:`wallet_balance_minor` and :func:`wallet_state` : read a host's deposit;
- :func:`create_topup`, :func:`approve_topup`, :func:`reject_topup` : admin top-ups;
- :func:`post_commission` : take the commission when a booking is confirmed;
- :func:`reverse_commission` : give it back in full when the booking is cancelled (DEC-018);
- :func:`can_accept_bookings` : credit floor check (BR-PAY-10).
"""

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.audit import services as audit
from apps.config import services as config
from apps.core.errors import ConflictError, DomainError, ForbiddenError

from .models import (
    AccountBalance,
    AccountKind,
    LedgerAccount,
    LedgerEntry,
    LedgerTransaction,
    TopupStatus,
    TransactionKind,
    WalletTopup,
)


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
          booking_id=None, topup=None, reverses=None, actor=None) -> LedgerTransaction:
    """
    Write one balanced transaction (BR-PAY-02). Must run inside ``transaction.atomic``.

    ``lines`` is a list of ``(account, amount_minor)``; debits positive,
    credits negative; the sum must be zero. ``wallet_delta`` maps a wallet
    account to the change of its friendly balance (see AccountBalance).
    """
    if sum(amount for _, amount in lines) != 0:
        raise RuntimeError("Ledger transaction is not balanced.")
    tx = LedgerTransaction.objects.create(
        kind=kind, description=description, booking_id=booking_id, topup=topup, reverses=reverses, created_by=actor
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

    Small amounts are credited at once. Amounts above the four-eyes threshold
    stay ``pending_approval`` until a second admin approves them.
    Raises ``ConflictError(code="receipt_already_used")`` for a reused receipt.
    """
    if not 100 <= amount_minor <= 1_000_000_000:
        raise DomainError("The amount must be between 1 and 10,000,000 DZD.", code="invalid_amount")
    receipt_reference = receipt_reference.strip()
    if not receipt_reference:
        raise DomainError("The receipt reference is required.", code="receipt_required")
    needs_second_admin = amount_minor > int(config.get_value("topup_four_eyes_minor"))
    try:
        with transaction.atomic():
            topup = WalletTopup.objects.create(
                host_account=host_account, method=method, amount_minor=amount_minor, receipt_reference=receipt_reference,
                note=note, requested_by=actor,
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
    """Post the ledger lines of an approved top-up: BLADUS cash up, host wallet up."""
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


@transaction.atomic
def approve_topup(topup_id, *, actor) -> WalletTopup:
    """Second admin approves a large top-up. The approver must not be the admin who recorded it."""
    topup = WalletTopup.objects.select_for_update().filter(pk=topup_id).first()
    if topup is None:
        raise DomainError("Top-up not found.", code="not_found", status_code=404)
    if topup.status != TopupStatus.PENDING_APPROVAL:
        raise ConflictError("This top-up is not waiting for approval.", code="topup_not_pending")
    if topup.requested_by_id == actor.id:
        raise ForbiddenError("A second admin must approve this top-up.", code="four_eyes_required")
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
        raise DomainError("Top-up not found.", code="not_found", status_code=404)
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
    )


@transaction.atomic
def reverse_commission(*, host_account, booking_id, reference: str = "") -> LedgerTransaction | None:
    """
    Give the full commission back to the host when a confirmed booking is
    cancelled, whoever cancels (DEC-018, BR-PAY-05).

    Does nothing when no commission was taken or it was already returned.
    """
    original = LedgerTransaction.objects.filter(booking_id=booking_id, kind=TransactionKind.COMMISSION).first()
    if original is None:
        return None
    already = LedgerTransaction.objects.filter(booking_id=booking_id, kind=TransactionKind.COMMISSION_REVERSAL).first()
    if already:
        return already
    wallet = wallet_account(host_account)
    revenue = platform_account(AccountKind.COMMISSION_REVENUE)
    amount = original.entries.get(account=wallet).amount_minor  # positive debit taken from the wallet
    return _post(
        kind=TransactionKind.COMMISSION_REVERSAL,
        description=f"Commission returned booking {reference}".strip(),
        lines=[(revenue, amount), (wallet, -amount)],
        wallet_delta={wallet: amount},
        booking_id=booking_id,
        reverses=original,
    )
