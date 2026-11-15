"""
Read queries of the trust app: reason catalogue, moderation queue, counts, dashboard attention, change requests.

Every function returns rows for the API without changing anything; the
views call :func:`apps.trust.services.sync_cases` first when the queue must
reflect what is pending in the other apps.
"""

from django.db.models import Case, Count, IntegerField, Min, Q, QuerySet, Value, When

from apps.core.errors import NotFoundError
from apps.ledger.models import AccountBalance, AccountKind, TopupStatus, WalletTopup

from .models import CaseKind, CasePriority, CaseStatus, ChangeRequestItem, ModerationCase, ReasonCode

OPEN_STATUSES = (CaseStatus.OPEN, CaseStatus.IN_PROGRESS)
# How many rows each dashboard attention group shows.
ATTENTION_TOP = 5


# ---------------------------------------------------------------------------
# Reason catalogue (MOD-03)
# ---------------------------------------------------------------------------
def reason_codes(action: str | None = None) -> QuerySet[ReasonCode]:
    """Active catalogue rows, optionally for one action, in catalogue order."""
    rows = ReasonCode.objects.filter(is_active=True)
    if action:
        rows = rows.filter(action=action)
    return rows.order_by("action", "sort_order", "code")


def checklist_labels(locale: str) -> dict[str, str]:
    """``checklist_code -> label`` of the change request checklist in ``locale`` (BR-MOD-02)."""
    return {r.code: r.label_for(locale) for r in reason_codes("change_request")}


# ---------------------------------------------------------------------------
# Queue (MOD-01)
# ---------------------------------------------------------------------------
def cases() -> QuerySet[ModerationCase]:
    """Cases with what the API shows loaded in a fixed number of queries."""
    return ModerationCase.objects.select_related("assigned_to").prefetch_related(
        "decisions__actor", "decisions__reason", "change_request_items"
    )


def get_case(case_id) -> ModerationCase:
    """One case with its history, else 404 ``case_not_found``."""
    case = cases().filter(pk=case_id).first()
    if case is None:
        raise NotFoundError("Unknown moderation case.", code="case_not_found")
    return case


def _priority_rank():
    """SQL expression: high 0, normal 1, low 2 (sort high first)."""
    return Case(
        When(priority=CasePriority.HIGH, then=Value(0)), When(priority=CasePriority.NORMAL, then=Value(1)),
        default=Value(2), output_field=IntegerField(),
    )


def queue_filters(*, kinds: list[str], statuses: list[str], priority: str | None, assigned_to: str | None,
                  user) -> dict[str, Q]:
    """
    One ``Q`` per filter, so each facet can be counted without its own filter (BR-SRC-01 practice).

    ``assigned_to`` is ``me``, ``none`` or a staff user id.
    """
    filters = {
        "kind": Q(kind__in=kinds) if kinds else Q(),
        "status": Q(status__in=statuses or OPEN_STATUSES),
        "priority": Q(priority=priority) if priority else Q(),
        "assigned_to": Q(),
    }
    if assigned_to == "me":
        filters["assigned_to"] = Q(assigned_to=user)
    elif assigned_to == "none":
        filters["assigned_to"] = Q(assigned_to__isnull=True)
    elif assigned_to:
        filters["assigned_to"] = Q(assigned_to_id=assigned_to)
    return filters


def _combine(filters: dict[str, Q], without: str | None = None) -> Q:
    """AND of every filter except ``without``."""
    combined = Q()
    for name, q in filters.items():
        if name != without:
            combined &= q
    return combined


def queue(filters: dict[str, Q], ordering: str | None) -> QuerySet[ModerationCase]:
    """
    Filtered queue. Default oldest submission first (BR-MOD-01); ``priority``
    puts high first then oldest; ``-submitted_at`` newest first.
    """
    rows = cases().filter(_combine(filters))
    if ordering == "-submitted_at":
        return rows.order_by("-submitted_at", "-id")
    if ordering == "priority":
        return rows.annotate(rank=_priority_rank()).order_by("rank", "submitted_at", "id")
    return rows.order_by("submitted_at", "id")


def queue_facets(filters: dict[str, Q]) -> dict[str, list[dict]]:
    """Counts per kind, status and priority, each without its own filter."""
    facets = {}
    for name in ("kind", "status", "priority"):
        counts = dict(
            ModerationCase.objects.filter(_combine(filters, without=name)).values_list(name).annotate(n=Count("id"))
        )
        choices = {"kind": CaseKind, "status": CaseStatus, "priority": CasePriority}[name]
        facets[name] = [
            {"value": value, "label": str(label), "count": counts.get(value, 0)} for value, label in choices.choices
        ]
    return facets


def moderation_counts() -> list[dict]:
    """Per queue: unresolved cases, high priority ones and the oldest submission (MOD-01)."""
    rows = {
        r["kind"]: r
        for r in ModerationCase.objects.filter(status__in=OPEN_STATUSES).values("kind").annotate(
            open=Count("id"), high_priority=Count("id", filter=Q(priority=CasePriority.HIGH)),
            oldest_submitted_at=Min("submitted_at"),
        )
    }
    return [
        {
            "kind": kind,
            "open": rows.get(kind, {}).get("open", 0),
            "high_priority": rows.get(kind, {}).get("high_priority", 0),
            "oldest_submitted_at": rows.get(kind, {}).get("oldest_submitted_at"),
        }
        for kind in CaseKind.values
    ]


def attention_items() -> list[dict]:
    """
    Dashboard "what needs attention now" (MOD-01, PAY-07, BR-PAY-10).

    Groups with something in them: each moderation queue (oldest first),
    host wallets below zero (lowest first) and top-ups waiting for a second
    admin. Each group gives its count and the first five rows.
    """
    items = []
    open_cases = ModerationCase.objects.filter(status__in=OPEN_STATUSES)
    counts = dict(open_cases.values_list("kind").annotate(n=Count("id")))
    for kind in CaseKind.values:
        if not counts.get(kind):
            continue
        top = open_cases.filter(kind=kind).order_by("submitted_at")[:ATTENTION_TOP]
        items.append({
            "kind": f"moderation.{kind}", "count": counts[kind],
            "top": [{"id": str(c.id), "title": c.subject_title or str(c.subject_id),
                     "href": f"/approvals?case={c.id}", "since": c.submitted_at} for c in top],
        })

    negative = AccountBalance.objects.filter(account__kind=AccountKind.HOST_WALLET, balance_minor__lt=0)
    count = negative.count()
    if count:
        top = negative.select_related(
            "account__host_account__organization", "account__host_account__user"
        ).order_by("balance_minor")[:ATTENTION_TOP]
        items.append({
            "kind": "wallets.below_zero", "count": count,
            "top": [{"id": str(b.account.host_account_id), "title": b.account.host_account.display_name,
                     "href": f"/payments/wallets?host={b.account.host_account_id}", "since": None} for b in top],
        })

    topups = WalletTopup.objects.filter(status=TopupStatus.PENDING_APPROVAL)
    count = topups.count()
    if count:
        top = topups.select_related("host_account__organization", "host_account__user").order_by("created_at")[:ATTENTION_TOP]
        items.append({
            "kind": "wallets.topups_pending", "count": count,
            "top": [{"id": str(t.id), "title": f"{t.host_account.display_name}: {t.amount_minor // 100} DZD",
                     "href": f"/payments/wallets?topup={t.id}", "since": t.created_at} for t in top],
        })
    return items


# ---------------------------------------------------------------------------
# Host side (BR-MOD-02)
# ---------------------------------------------------------------------------
def host_change_requests(host_account, *, open_only: bool = True) -> QuerySet[ChangeRequestItem]:
    """Items moderators asked this host account to fix, newest first; only unresolved by default."""
    rows = ChangeRequestItem.objects.filter(case__host_account=host_account).select_related("case")
    if open_only:
        rows = rows.filter(resolved_at__isnull=True)
    return rows.order_by("-created_at", "id")
