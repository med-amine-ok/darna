"""
Read-only queries of the ledger app (no writes here).

- :func:`wallets` : every host deposit with its balance, floor, state and
  totals, for the admin wallet table (BR-PAY-03, BR-PAY-10);
- :func:`finance_summary` : the admin finance overview; platform totals are
  sums of ledger lines, never a shared row (review R7, DEC-023);
- :func:`transactions` : ledger transactions with their lines (BR-PAY-02);
- :func:`topups`, :func:`invoices`, :func:`payouts` : filtered admin lists;
- :func:`net_commission_minor`, :func:`commission_kept_by_booking` : commission
  kept, for host earnings and invoices (BR-RPT-02, BR-PAY-12).
"""

import uuid
from datetime import date, datetime, time, timedelta

from django.db.models import (
    BigIntegerField,
    Case,
    CharField,
    Count,
    F,
    OuterRef,
    Prefetch,
    Q,
    QuerySet,
    Subquery,
    Sum,
    Value,
    When,
)
from django.db.models.functions import Coalesce

from apps.config import services as config
from apps.core.errors import DomainError
from apps.core.timeutils import business_today, business_tz
from apps.hosts.models import HostAccount

from . import gateways
from .models import (
    AccountBalance,
    AccountKind,
    Invoice,
    LedgerEntry,
    LedgerTransaction,
    Payout,
    PayoutStatus,
    TopupStatus,
    TransactionKind,
    WalletTopup,
)

WALLET_STATES = ("ok", "negative", "below_floor")
WALLET_ORDERING = {"balance": "balance_minor", "-balance": "-balance_minor",
                   "last_entry": "last_entry_at", "-last_entry": "-last_entry_at"}


def csv(value: str | None) -> list[str]:
    """Split a comma-separated query value (``style: form, explode: false``) into clean items."""
    return [item.strip() for item in (value or "").split(",") if item.strip()]


def _uuid_or_none(value):
    """A UUID, or ``None`` when the text is not one (a malformed filter matches nothing)."""
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError):
        return None


def _day_bounds(start: date | None, end: date | None) -> tuple[datetime | None, datetime | None]:
    """Aware bounds ``[start 00:00, end + 1 day 00:00)`` in Algerian time for a date filter."""
    tz = business_tz()
    lo = datetime.combine(start, time.min, tzinfo=tz) if start else None
    hi = datetime.combine(end + timedelta(days=1), time.min, tzinfo=tz) if end else None
    return lo, hi


def month_start() -> datetime:
    """Start of the current month in Algerian time."""
    today = business_today()
    return datetime.combine(today.replace(day=1), time.min, tzinfo=business_tz())


# ---------------------------------------------------------------------------
# Wallets (BR-PAY-03, BR-PAY-10)
# ---------------------------------------------------------------------------
def _wallet_lines(**extra) -> QuerySet:
    """Lines of the host wallet of the outer host account row."""
    return LedgerEntry.objects.filter(account__host_account=OuterRef("pk"), account__kind=AccountKind.HOST_WALLET, **extra)


def wallets_queryset() -> QuerySet:
    """
    Every live host account annotated with its deposit (one query per page):
    ``balance_minor``, ``wallet_updated_at``, ``floor_minor``, ``wallet_state``,
    ``total_topups_minor``, ``total_commission_minor`` and ``last_entry_at``.
    """
    balance = AccountBalance.objects.filter(account__host_account=OuterRef("pk"), account__kind=AccountKind.HOST_WALLET)
    topups = (WalletTopup.objects.filter(host_account=OuterRef("pk"), status=TopupStatus.APPROVED)
              .values("host_account").annotate(total=Sum("amount_minor")).values("total")[:1])
    commission = (_wallet_lines(transaction__kind__in=[TransactionKind.COMMISSION, TransactionKind.COMMISSION_REVERSAL])
                  .values("account").annotate(total=Sum("amount_minor")).values("total")[:1])
    last_entry = _wallet_lines().order_by("-transaction__occurred_at").values("transaction__occurred_at")[:1]
    default_floor = int(config.get_value("credit_limit_minor"))
    return (
        HostAccount.objects.alive()
        .select_related("organization", "user")
        .annotate(
            balance_minor=Coalesce(Subquery(balance.values("balance_minor")[:1]), Value(0), output_field=BigIntegerField()),
            wallet_updated_at=Subquery(balance.values("updated_at")[:1]),
            floor_minor=Coalesce(F("credit_limit_override_minor"), Value(default_floor), output_field=BigIntegerField()),
            total_topups_minor=Coalesce(Subquery(topups), Value(0), output_field=BigIntegerField()),
            total_commission_minor=Coalesce(Subquery(commission), Value(0), output_field=BigIntegerField()),
            last_entry_at=Subquery(last_entry),
        )
        .annotate(
            wallet_state=Case(
                When(balance_minor__gte=0, then=Value("ok")),
                When(balance_minor__lt=-F("floor_minor"), then=Value("below_floor")),
                default=Value("negative"),
                output_field=CharField(),
            ),
        )
    )


def wallets(*, host_type: str | None = None, wilaya: str | None = None, state: str | None = None,
            min_balance_minor: int | None = None, max_balance_minor: int | None = None, q: str | None = None,
            ordering: str | None = None) -> QuerySet:
    """The admin wallet table with its filters (``adminListWallets``). Comma lists for multi-value filters."""
    qs = wallets_queryset()
    if types := csv(host_type):
        cond = Q(organization__business_category__in=[t for t in types if t != "individual"])
        if "individual" in types:
            cond |= Q(kind="individual")
        qs = qs.filter(cond)
    if wilayas := csv(wilaya):
        try:
            ids = [int(w) for w in wilayas]
        except ValueError as exc:
            raise DomainError("Invalid query parameter.", code="invalid", errors={"wilaya": ["Whole numbers."]}) from exc
        qs = qs.filter(Q(organization__commune__wilaya_id__in=ids) | Q(user__home_commune__wilaya_id__in=ids))
    if states := csv(state):
        if set(states) - set(WALLET_STATES):
            raise DomainError("Invalid query parameter.", code="invalid", errors={"state": [", ".join(WALLET_STATES)]})
        qs = qs.filter(wallet_state__in=states)
    if min_balance_minor is not None:
        qs = qs.filter(balance_minor__gte=min_balance_minor)
    if max_balance_minor is not None:
        qs = qs.filter(balance_minor__lte=max_balance_minor)
    if q := (q or "").strip():
        cond = (Q(organization__display_name__icontains=q) | Q(user__first_name_latin__icontains=q)
                | Q(user__last_name_latin__icontains=q) | Q(user__full_name_ar__icontains=q))
        if host_id := _uuid_or_none(q):
            cond |= Q(pk=host_id)
        qs = qs.filter(cond)
    if ordering and ordering not in WALLET_ORDERING:
        raise DomainError("Invalid query parameter.", code="invalid", errors={"ordering": [", ".join(WALLET_ORDERING)]})
    return qs.order_by(WALLET_ORDERING.get(ordering or "balance"), "id")


def wallet(host_account_id) -> HostAccount | None:
    """One host account annotated like :func:`wallets_queryset`, or ``None``."""
    host_id = _uuid_or_none(host_account_id)
    return wallets_queryset().filter(pk=host_id).first() if host_id else None


# ---------------------------------------------------------------------------
# Finance overview
# ---------------------------------------------------------------------------
def _sum_lines(**filters) -> int:
    """Sum of ledger lines matching ``filters``."""
    return LedgerEntry.objects.filter(**filters).aggregate(total=Sum("amount_minor"))["total"] or 0


def finance_summary() -> dict:
    """
    Numbers of the admin finance page (BR-PAY-03, BR-PAY-10), all in centimes.

    Totals come from ledger lines (review R7): nothing reads a platform
    balance row. "This month" is the calendar month in Algeria.
    """
    rows = wallets_queryset().aggregate(
        total=Sum("balance_minor"),
        negative=Count("pk", filter=Q(balance_minor__lt=0)),
        below=Count("pk", filter=Q(wallet_state="below_floor")),
    )
    since = month_start()
    revenue = {"account__kind": AccountKind.COMMISSION_REVENUE, "transaction__occurred_at__gte": since}
    summary = {
        "wallets_total_minor": rows["total"] or 0,
        "negative_wallets": rows["negative"] or 0,
        "below_floor_wallets": rows["below"] or 0,
        "commission_this_month_minor": -_sum_lines(transaction__kind=TransactionKind.COMMISSION, **revenue),
        "commission_reversed_this_month_minor": _sum_lines(transaction__kind=TransactionKind.COMMISSION_REVERSAL, **revenue),
        "topups_this_month_minor": _sum_lines(account__kind=AccountKind.PLATFORM_CASH,
                                              transaction__kind=TransactionKind.WALLET_TOPUP,
                                              transaction__occurred_at__gte=since),
        "pending_topup_approvals": WalletTopup.objects.filter(status=TopupStatus.PENDING_APPROVAL).count(),
        "refunds_owed_this_month_minor": _sum_lines(account__kind=AccountKind.HOST_REFUND_PAYABLE,
                                                    transaction__kind=TransactionKind.REFUND_DUE,
                                                    transaction__occurred_at__gte=since),
        "dormant": None,
    }
    if gateways.payouts_enabled() or gateways.guest_payments_enabled():
        summary["dormant"] = {
            "payouts_pending": Payout.objects.filter(status__in=[PayoutStatus.REQUESTED, PayoutStatus.APPROVED]).count(),
            "escrow_balance_minor": -_sum_lines(account__kind=AccountKind.ESCROW),
        }
    return summary


# ---------------------------------------------------------------------------
# Lists
# ---------------------------------------------------------------------------
def transactions(*, host_account: str | None = None, kind: str | None = None, booking: str | None = None,
                 start: date | None = None, end: date | None = None, q: str | None = None) -> QuerySet:
    """
    Ledger transactions with their lines, newest first (``adminListLedgerTransactions``, BR-PAY-02).

    ``booking`` is a booking id or its BLD reference; ``q`` searches the
    description and the top-up receipt.
    """
    qs = LedgerTransaction.objects.select_related("created_by", "topup").prefetch_related(
        Prefetch("entries", queryset=LedgerEntry.objects.select_related("account").order_by("id")))
    if host_account:
        host_id = _uuid_or_none(host_account)
        qs = qs.filter(entries__account__host_account_id=host_id).distinct() if host_id else qs.none()
    if kinds := csv(kind):
        qs = qs.filter(kind__in=kinds)
    if booking := (booking or "").strip():
        booking_id = _uuid_or_none(booking)
        qs = qs.filter(booking_id=booking_id) if booking_id else qs.filter(booking_reference__iexact=booking)
    lo, hi = _day_bounds(start, end)
    if lo:
        qs = qs.filter(occurred_at__gte=lo)
    if hi:
        qs = qs.filter(occurred_at__lt=hi)
    if q := (q or "").strip():
        qs = qs.filter(Q(description__icontains=q) | Q(topup__receipt_reference__icontains=q))
    return qs.order_by("-occurred_at", "-id")


def topups(*, status: str | None = None, method: str | None = None, host_account: str | None = None) -> QuerySet:
    """Top-ups for the admin, newest first (``adminListTopups``, BR-PAY-07)."""
    qs = WalletTopup.objects.select_related(
        "host_account", "host_account__organization", "host_account__user", "requested_by", "approved_by",
    ).prefetch_related("transactions")
    if statuses := csv(status):
        qs = qs.filter(status__in=statuses)
    if methods := csv(method):
        qs = qs.filter(method__in=methods)
    if host_account:
        host_id = _uuid_or_none(host_account)
        qs = qs.filter(host_account_id=host_id) if host_id else qs.none()
    return qs.order_by("-created_at")


def invoices(*, host_account=None, year: int | None = None) -> QuerySet:
    """Commission invoices, newest first (BR-PAY-12). ``host_account`` is an instance or an id."""
    qs = Invoice.objects.all()
    if host_account is not None:
        host_id = getattr(host_account, "pk", None) or _uuid_or_none(host_account)
        qs = qs.filter(host_account_id=host_id) if host_id else qs.none()
    if year is not None:
        qs = qs.filter(year=year)
    return qs.order_by("-year", "-number")


def payouts(*, host_account=None, status: str | None = None) -> QuerySet:
    """Payouts, newest first (BR-PAY-11). Scoped to a host account when given."""
    qs = Payout.objects.select_related("approved_by")
    if host_account is not None:
        qs = qs.filter(host_account=host_account)
    if statuses := csv(status):
        qs = qs.filter(status__in=statuses)
    return qs.order_by("-created_at")


# ---------------------------------------------------------------------------
# Commission reads for earnings and invoices (BR-RPT-02, BR-PAY-12)
# ---------------------------------------------------------------------------
_COMMISSION_KINDS = (TransactionKind.COMMISSION, TransactionKind.COMMISSION_REVERSAL)


def net_commission_minor(host_account, start: date, end: date) -> int:
    """
    Commission kept from a host between two dates included, in Algerian time (BR-RPT-02, BR-PAY-12).

    Commission taken minus commission returned, read from the host wallet lines.
    """
    lo, hi = _day_bounds(start, end)
    return LedgerEntry.objects.filter(
        account__host_account=host_account, account__kind=AccountKind.HOST_WALLET,
        transaction__kind__in=_COMMISSION_KINDS, transaction__occurred_at__gte=lo, transaction__occurred_at__lt=hi,
    ).aggregate(total=Sum("amount_minor"))["total"] or 0


def commission_kept_by_booking(booking_ids) -> dict:
    """``{booking_id: commission kept}`` (taken minus returned) for many bookings in one query (BR-PAY-05)."""
    rows = (LedgerEntry.objects.filter(transaction__booking_id__in=list(booking_ids),
                                       transaction__kind__in=_COMMISSION_KINDS, account__kind=AccountKind.HOST_WALLET)
            .values("transaction__booking_id").annotate(total=Sum("amount_minor")))
    return {row["transaction__booking_id"]: row["total"] or 0 for row in rows}
