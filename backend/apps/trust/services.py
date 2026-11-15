"""
Moderation services: case sync, assignment, decisions, reason catalogue seed (BR-MOD-01, BR-MOD-02, MOD-01 to MOD-04).

Where cases come from
    Today the things waiting for review live in other apps (host accounts
    ``under_review``, listings and trips ``pending_review``, documents
    ``pending``). :func:`sync_cases` opens a case for every pending item that
    has none, refreshes the waiting clock after a resubmission, raises
    priorities (BR-MOD-01) and closes cases whose subject was decided
    elsewhere. It runs when the queue is read and from
    ``manage.py sync_moderation_cases`` (every 15 minutes, the
    ``trust.refresh_queue_priority`` job). Other apps can also call
    :func:`open_case` and :func:`close_cases_for` directly (hooks).

How decisions are applied
    :func:`decide_case` calls the owning app's public service so its state
    machine, reason rule and audit line stay in one place: hosts
    (``admin_host_action``, ``admin_review_document``), catalog and trips
    (``catalog.workflow.admin_moderate``). The case, the decision row, the
    change request items, our audit row and the host notification (outbox)
    are written in the same transaction (BR-STF-02).
"""

from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.audit import services as audit
from apps.catalog import selectors as catalog_selectors
from apps.catalog import workflow
from apps.catalog.models import Listing
from apps.catalog.states import ListingStatus
from apps.core import outbox
from apps.core.errors import ConflictError, DomainError, NotFoundError
from apps.hosts import selectors as host_selectors
from apps.hosts import services as host_services
from apps.hosts.models import DocumentStatus, HostDocument, VerificationStatus
from apps.trips import selectors as trip_selectors
from apps.trips.models import Trip

from .models import (
    CaseKind,
    CasePriority,
    CaseStatus,
    ChangeRequestItem,
    ModerationCase,
    ModerationDecision,
    ReasonCode,
    SubjectType,
)
from . import reason_data

# BR-HST-04: reasons of at least 10 characters for reject, request changes, hide.
MIN_NOTE_LENGTH = 10
NOTE_REQUIRED = {"reject", "request_changes", "hide"}
DECISIONS = ("approve", "reject", "request_changes", "dismiss", "hide", "restore", "escalate")

# BR-MOD-01: a case becomes high priority after this long waiting since the last submission.
HIGH_AFTER: dict[str, timedelta] = {
    CaseKind.HOST_VERIFICATION: timedelta(days=3),
    CaseKind.LISTING_REVIEW: timedelta(days=2),
    CaseKind.LISTING_REVISION: timedelta(days=2),
    CaseKind.TRIP_REVIEW: timedelta(days=2),
    CaseKind.DOCUMENT: timedelta(days=3),
}
# BR-MOD-01: flagged reviews and disputes are always high.
ALWAYS_HIGH = {CaseKind.REVIEW_REPORT, CaseKind.DISPUTE}
PRIORITY_RANK = {CasePriority.LOW: 0, CasePriority.NORMAL: 1, CasePriority.HIGH: 2}

# Kinds that sync_cases builds from pending items of other apps.
SYNCED_KINDS = (CaseKind.HOST_VERIFICATION, CaseKind.LISTING_REVIEW, CaseKind.TRIP_REVIEW, CaseKind.DOCUMENT)

# (kind, decision) -> reason catalogue action the reason_code must belong to.
REASON_ACTIONS: dict[tuple[str, str], str] = {
    (CaseKind.HOST_VERIFICATION, "reject"): "reject_host",
    (CaseKind.HOST_VERIFICATION, "request_changes"): "request_changes_host",
    (CaseKind.LISTING_REVIEW, "reject"): "reject_listing",
    (CaseKind.LISTING_REVIEW, "request_changes"): "request_changes_listing",
    (CaseKind.TRIP_REVIEW, "reject"): "reject_trip",
    (CaseKind.TRIP_REVIEW, "request_changes"): "request_changes_listing",
    (CaseKind.DOCUMENT, "reject"): "reject_document",
}
CHECKLIST_ACTION = "change_request"


# ---------------------------------------------------------------------------
# Reason catalogue (MOD-03)
# ---------------------------------------------------------------------------
def seed_reason_codes() -> int:
    """Create or update the seeded reason catalogue (idempotent); returns the number of seed rows."""
    return reason_data.seed(ReasonCode)


# ---------------------------------------------------------------------------
# Opening and syncing cases (BR-MOD-01)
# ---------------------------------------------------------------------------
def priority_for(kind: str, submitted_at, current: str = CasePriority.NORMAL, now=None) -> str:
    """
    Priority of a case under BR-MOD-01, never lower than ``current``.

    Reviews and disputes are always high; hosts and documents become high
    after 3 days, listings and trips after 2 days of waiting.
    """
    now = now or timezone.now()
    computed = CasePriority.NORMAL
    if kind in ALWAYS_HIGH:
        computed = CasePriority.HIGH
    elif kind in HIGH_AFTER and now - submitted_at >= HIGH_AFTER[kind]:
        computed = CasePriority.HIGH
    return computed if PRIORITY_RANK[computed] > PRIORITY_RANK.get(current, 1) else current


def _last_change_request(kind: str, subject_id) -> ModerationCase | None:
    """Latest resolved case of this subject that asked for changes (the resubmission links to it, BR-MOD-02)."""
    return (
        ModerationCase.objects.filter(kind=kind, subject_id=subject_id, status=CaseStatus.RESOLVED,
                                      outcome="request_changes")
        .order_by("-resolved_at").first()
    )


def open_case(*, kind: str, subject_type: str, subject_id, title: str = "", reference: str = "",
              host_account_id=None, submitted_at=None, priority: str | None = None) -> ModerationCase:
    """
    Open a case for a subject, or refresh the open one (hook for other apps, idempotent).

    A new submission of a subject that already has an open case moves its
    ``submitted_at`` (the waiting clock restarts, BR-MOD-01). A new case
    links to the last change request of the subject and marks its items
    resolved, because the host has resubmitted (BR-MOD-02).
    """
    now = timezone.now()
    submitted_at = submitted_at or now
    existing = ModerationCase.objects.filter(kind=kind, subject_id=subject_id).exclude(status=CaseStatus.RESOLVED).first()
    if existing is not None:
        changed = []
        if existing.submitted_at != submitted_at:
            existing.submitted_at = submitted_at
            changed.append("submitted_at")
        for field, value in (("subject_title", title[:200]), ("subject_reference", reference[:32])):
            if value and getattr(existing, field) != value:
                setattr(existing, field, value)
                changed.append(field)
        new_priority = priority_for(kind, existing.submitted_at, priority or existing.priority, now)
        if new_priority != existing.priority:
            existing.priority = new_priority
            changed.append("priority")
        if changed:
            existing.save(update_fields=changed)
        return existing
    previous = _last_change_request(kind, subject_id)
    try:
        with transaction.atomic():
            case = ModerationCase.objects.create(
                kind=kind, subject_type=subject_type, subject_id=subject_id, subject_title=title[:200],
                subject_reference=reference[:32], host_account_id=host_account_id, submitted_at=submitted_at,
                priority=priority_for(kind, submitted_at, priority or CasePriority.NORMAL, now), previous_case=previous,
            )
    except IntegrityError:
        # Another request opened it at the same moment: use that one.
        return ModerationCase.objects.filter(kind=kind, subject_id=subject_id).exclude(status=CaseStatus.RESOLVED).first()
    if previous is not None:
        ChangeRequestItem.objects.filter(case=previous, resolved_at__isnull=True).update(resolved_at=now)
    return case


def close_cases_for(subject_id, *, outcome: str, kind: str | None = None, actor=None) -> int:
    """
    Resolve the open cases of a subject decided or withdrawn outside the queue (hook for other apps).

    Returns the number of cases closed.
    """
    cases = ModerationCase.objects.filter(subject_id=subject_id).exclude(status=CaseStatus.RESOLVED)
    if kind:
        cases = cases.filter(kind=kind)
    return cases.update(status=CaseStatus.RESOLVED, outcome=outcome[:24], resolved_at=timezone.now(), resolved_by=actor)


def pending_subjects() -> dict[tuple[str, str], dict]:
    """
    Everything waiting for review in the other apps, keyed by ``(kind, subject_id)``.

    Read through each app's admin selectors; one query per kind.
    """
    found: dict[tuple[str, str], dict] = {}
    for account in host_selectors.admin_host_accounts(verification_status=VerificationStatus.UNDER_REVIEW):
        found[(CaseKind.HOST_VERIFICATION, str(account.id))] = {
            "kind": CaseKind.HOST_VERIFICATION, "subject_type": SubjectType.HOST_ACCOUNT, "subject_id": account.id,
            "title": account.display_name, "reference": "", "host_account_id": account.id,
            "submitted_at": account.submitted_at or account.created_at,
        }
    for row in catalog_selectors.admin_listings(status=ListingStatus.PENDING_REVIEW).values(
        "id", "title", "reference", "host_account_id", "submitted_at", "created_at"
    ):
        found[(CaseKind.LISTING_REVIEW, str(row["id"]))] = {
            "kind": CaseKind.LISTING_REVIEW, "subject_type": SubjectType.LISTING, "subject_id": row["id"],
            "title": row["title"], "reference": row["reference"], "host_account_id": row["host_account_id"],
            "submitted_at": row["submitted_at"] or row["created_at"],
        }
    for row in trip_selectors.admin_trips(status=ListingStatus.PENDING_REVIEW).values(
        "id", "title", "reference", "host_account_id", "submitted_at", "created_at"
    ):
        found[(CaseKind.TRIP_REVIEW, str(row["id"]))] = {
            "kind": CaseKind.TRIP_REVIEW, "subject_type": SubjectType.TRIP, "subject_id": row["id"],
            "title": row["title"], "reference": row["reference"], "host_account_id": row["host_account_id"],
            "submitted_at": row["submitted_at"] or row["created_at"],
        }
    # TODO(hosts): replace with a hosts selector of pending documents when one exists.
    documents = HostDocument.objects.alive().filter(status=DocumentStatus.PENDING).select_related(
        "host_account__organization", "host_account__user"
    )
    for doc in documents:
        found[(CaseKind.DOCUMENT, str(doc.id))] = {
            "kind": CaseKind.DOCUMENT, "subject_type": SubjectType.HOST_DOCUMENT, "subject_id": doc.id,
            "title": f"{doc.get_doc_type_display()} - {doc.host_account.display_name}", "reference": "",
            "host_account_id": doc.host_account_id, "submitted_at": doc.created_at,
        }
    return found


@transaction.atomic
def sync_cases() -> dict[str, int]:
    """
    Bring the queue in line with what is pending in the other apps (BR-MOD-01).

    Opens missing cases, refreshes the clock and titles of open ones, raises
    priorities and closes open cases whose subject is no longer pending
    (decided through the older admin routes or withdrawn by the host).
    Returns counters ``{"opened", "closed", "open"}``.
    """
    pending = pending_subjects()
    now = timezone.now()
    opened = closed = 0
    for case in ModerationCase.objects.filter(kind__in=SYNCED_KINDS).exclude(status=CaseStatus.RESOLVED):
        subject = pending.pop((case.kind, str(case.subject_id)), None)
        if subject is None:
            case.status, case.outcome, case.resolved_at = CaseStatus.RESOLVED, "closed_elsewhere", now
            case.save(update_fields=["status", "outcome", "resolved_at"])
            closed += 1
            continue
        open_case(**subject)
    for subject in pending.values():
        open_case(**subject)
        opened += 1
    return {"opened": opened, "closed": closed, "open": ModerationCase.objects.exclude(status=CaseStatus.RESOLVED).count()}


# ---------------------------------------------------------------------------
# Assignment (MOD-01)
# ---------------------------------------------------------------------------
def get_case_for_update(case_id) -> ModerationCase:
    """Lock one case, or 404 ``case_not_found``."""
    case = ModerationCase.objects.select_for_update().filter(pk=case_id).first()
    if case is None:
        raise NotFoundError("Unknown moderation case.", code="case_not_found")
    return case


@transaction.atomic
def assign_case(actor, case_id, assignee, *, ip: str | None = None) -> ModerationCase:
    """
    Take, give or release a case; audited (BR-STF-02).

    ``assignee`` is a user (an active admin, checked by the caller) or
    ``None`` to unassign. Assigned cases are ``in_progress``, unassigned ones
    ``open``. A resolved case answers 422 ``case_resolved``.
    """
    case = get_case_for_update(case_id)
    if case.status == CaseStatus.RESOLVED:
        raise DomainError("This case is already resolved.", code="case_resolved", status_code=422)
    before = {"assigned_to": str(case.assigned_to_id) if case.assigned_to_id else None, "status": case.status}
    case.assigned_to = assignee
    case.status = CaseStatus.IN_PROGRESS if assignee else CaseStatus.OPEN
    case.save(update_fields=["assigned_to", "status"])
    audit.record(actor=actor, action="CASE_ASSIGN", obj=case, ip=ip, before=before,
                 after={"assigned_to": str(assignee.id) if assignee else None, "status": case.status})
    return case


# ---------------------------------------------------------------------------
# Decisions (BR-MOD-02, BR-HST-03, BR-HST-04, BR-LST-02, BR-LST-03)
# ---------------------------------------------------------------------------
def clean_note(decision: str, note: str | None) -> str:
    """The trimmed note; 422 ``reason_required`` when the decision needs 10 characters or more (BR-HST-04)."""
    note = (note or "").strip()
    if decision in NOTE_REQUIRED and len(note) < MIN_NOTE_LENGTH:
        raise DomainError(
            f"Give a note of at least {MIN_NOTE_LENGTH} characters.", code="reason_required", status_code=422,
            errors={"note": [f"At least {MIN_NOTE_LENGTH} characters."]},
        )
    return note


def find_reason(kind: str, decision: str, code: str | None) -> ReasonCode | None:
    """
    The catalogue row for ``code`` (MOD-03), or ``None`` when no code was given.

    The code must belong to the action of this kind and decision (for
    example ``reject_listing``); for other decisions any active code is
    accepted. Unknown codes answer 422 ``unknown_reason``.
    """
    if not code:
        return None
    rows = ReasonCode.objects.filter(code=code, is_active=True)
    action = REASON_ACTIONS.get((kind, decision))
    if action:
        rows = rows.filter(action=action)
    reason = rows.order_by("action").first()
    if reason is None:
        raise DomainError("Unknown reason code.", code="unknown_reason", status_code=422,
                          errors={"reason_code": ["Not in the reason catalogue for this decision."]})
    return reason


def clean_items(decision: str, items: list[dict] | None) -> list[dict]:
    """
    Check the change request items against the checklist (BR-MOD-02).

    ``request_changes`` needs at least one item (422 ``items_required``);
    every ``checklist_code`` must be in the ``change_request`` catalogue
    (422 ``unknown_checklist_code``). Other decisions ignore items.
    """
    if decision != "request_changes":
        return []
    items = items or []
    if not items:
        raise DomainError("List what the host must fix.", code="items_required", status_code=422,
                          errors={"items": ["At least one item."]})
    known = set(ReasonCode.objects.filter(action=CHECKLIST_ACTION, is_active=True).values_list("code", flat=True))
    unknown = sorted({i["checklist_code"] for i in items} - known)
    if unknown:
        raise DomainError("Unknown checklist item.", code="unknown_checklist_code", status_code=422,
                          errors={"items": [f"Unknown: {', '.join(unknown)}."]})
    return items


def _host_text(note: str, reason: ReasonCode | None) -> str:
    """What the owning app stores and shows the host: the catalogue text (French) then the moderator's note."""
    if reason is not None and reason.host_text_fr:
        return f"{reason.host_text_fr} {note}".strip()
    return note


def _apply_host(case, decision, actor, text, ip):
    """Host verification: approve, reject or request changes through ``hosts.services.admin_host_action``."""
    action = {"approve": "approve", "reject": "reject", "request_changes": "request-changes"}.get(decision)
    if action is None:
        return False
    try:
        host_services.admin_host_action(actor, case.subject_id, action, reason=text, ip=ip)
    except ConflictError as exc:
        if exc.code == "documents_missing":
            raise DomainError("Every required document must be approved first.", code="documents_not_approved",
                              status_code=422, errors=exc.errors) from exc
        raise
    return True


def _apply_document(case, decision, actor, text, ip):
    """Document: approve or reject through ``hosts.services.admin_review_document`` (BR-HST-03)."""
    if decision not in ("approve", "reject"):
        return False
    host_services.admin_review_document(actor, case.subject_id, approve=decision == "approve", reason=text, ip=ip)
    return True


def _apply_catalog(model):
    """Listing or trip: approve, reject or request changes through ``catalog.workflow.admin_moderate`` (BR-LST-03)."""

    def apply(case, decision, actor, text, ip):
        """Load the subject and run the shared state machine."""
        if decision not in ("approve", "reject", "request_changes"):
            return False
        obj = model.objects.filter(pk=case.subject_id).first()
        if obj is None:
            raise NotFoundError("The subject of this case no longer exists.", code="subject_not_found")
        workflow.admin_moderate(obj, decision, actor=actor, reason=text)
        return True

    return apply


APPLIERS = {
    CaseKind.HOST_VERIFICATION: _apply_host,
    CaseKind.DOCUMENT: _apply_document,
    CaseKind.LISTING_REVIEW: _apply_catalog(Listing),
    CaseKind.TRIP_REVIEW: _apply_catalog(Trip),
}


@transaction.atomic
def decide_case(actor, case_id, *, decision: str, reason_code: str | None = None, note: str | None = None,
                items: list[dict] | None = None, ip: str | None = None) -> ModerationCase:
    """
    Decide a case and apply it to its subject in one transaction (MOD-02, BR-MOD-02).

    ``escalate`` raises the priority to high and keeps the case open. Other
    decisions resolve the case after the owning app accepted the change.
    Errors: 409 ``case_resolved``, 409 ``invalid_transition`` (decision not
    possible for this kind or state), 422 ``reason_required``,
    ``unknown_reason``, ``items_required``, ``documents_not_approved``.
    """
    if decision not in DECISIONS:
        raise DomainError("Unknown decision.", code="validation_failed", status_code=422)
    case = get_case_for_update(case_id)
    if case.status == CaseStatus.RESOLVED:
        raise ConflictError("This case is already resolved.", code="case_resolved")
    note = clean_note(decision, note)
    reason = find_reason(case.kind, decision, reason_code)
    items = clean_items(decision, items)
    before = {"status": case.status, "priority": case.priority}

    if decision == "escalate":
        case.priority = CasePriority.HIGH
        case.save(update_fields=["priority"])
    else:
        apply = APPLIERS.get(case.kind)
        try:
            applied = apply is not None and apply(case, decision, actor, _host_text(note, reason), ip)
        except ConflictError as exc:
            if exc.code in ("invalid_status_change", "invalid_transition"):
                raise ConflictError(exc.message, code="invalid_transition") from exc
            raise
        if not applied:
            raise ConflictError(f"Cannot {decision} a {case.kind} case.", code="invalid_transition")
        case.status, case.outcome = CaseStatus.RESOLVED, decision
        case.resolved_by, case.resolved_at = actor, timezone.now()
        case.save(update_fields=["status", "outcome", "resolved_by", "resolved_at"])

    ModerationDecision.objects.create(case=case, decision=decision, reason=reason, note=note, actor=actor)
    ChangeRequestItem.objects.bulk_create(
        [ChangeRequestItem(case=case, checklist_code=i["checklist_code"], message=i.get("message") or "") for i in items]
    )
    audit.record(actor=actor, action=f"CASE_{decision.upper()}", obj=case, ip=ip, note=note, before=before,
                 after={"status": case.status, "priority": case.priority, "reason_code": reason.code if reason else None})
    if decision != "escalate":
        # BR-NTF-01: the notifications app delivers it to the host (handler registered there).
        outbox.enqueue("moderation.decided", {
            "case_id": str(case.id), "kind": case.kind, "decision": decision,
            "subject_type": case.subject_type, "subject_id": str(case.subject_id),
            "host_account_id": str(case.host_account_id) if case.host_account_id else None,
            "reason_code": reason.code if reason else None,
        })
    return case


def bulk_decide(actor, case_ids: list, *, ip: str | None = None, **decision) -> list[dict]:
    """
    Apply the same decision to many cases, each in its own transaction (MOD-04).

    Returns one ``{"id", "ok", "error"}`` per case; a failure on one case
    does not undo the others. Each success writes its own audit row.
    """
    results = []
    for case_id in case_ids:
        try:
            decide_case(actor, case_id, ip=ip, **decision)
        except DomainError as exc:
            results.append({"id": case_id, "ok": False, "error": exc})
        else:
            results.append({"id": case_id, "ok": True, "error": None})
    return results
