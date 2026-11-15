"""
Tables of the trust app (see docs/backend/05b-data-dictionary.md).

- ``reason_code``: the reason catalogue (MOD-03), labels and host texts in
  English, French and Arabic, seeded by a data migration.
- ``moderation_case``: one thing waiting for a staff decision (a host
  account, a listing, a trip, a document; reviews and disputes later).
  At most one unresolved case per (kind, subject) (partial unique index).
- ``moderation_decision``: every decision taken on a case, never edited.
- ``change_request_item``: what the host must fix after "request changes"
  (BR-MOD-02); the host sees exactly these items.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel


class ReasonCode(UUIDModel):
    """
    One preset reason for an action (decline a booking, reject a listing...), MOD-03.

    ``label_*`` is what staff and users pick from; ``host_text_*`` is the
    plain explanation sent to the host (reviewed per language, 10-testing).
    The action ``change_request`` holds the checklist of BR-MOD-02.
    """

    action = models.CharField(max_length=32)
    code = models.CharField(max_length=48)
    label_en = models.CharField(max_length=120)
    label_fr = models.CharField(max_length=120)
    label_ar = models.CharField(max_length=120)
    host_text_en = models.TextField(blank=True)
    host_text_fr = models.TextField(blank=True)
    host_text_ar = models.TextField(blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        """Unique code per action; listed in catalogue order."""

        ordering = ["action", "sort_order", "code"]
        constraints = [models.UniqueConstraint(fields=["action", "code"], name="reason_code_action_code_unique")]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.action}:{self.code}"

    def label_for(self, locale: str) -> str:
        """Label in ``locale`` (en, fr, ar), French when missing."""
        return getattr(self, f"label_{locale}", "") or self.label_fr

    def host_text_for(self, locale: str) -> str | None:
        """Host-facing text in ``locale``, French when missing, ``None`` when there is none."""
        return getattr(self, f"host_text_{locale}", "") or self.host_text_fr or None


class CaseKind(models.TextChoices):
    """Moderation queues (``case_kind`` enum)."""

    HOST_VERIFICATION = "host_verification", "Host verification"
    LISTING_REVIEW = "listing_review", "Listing review"
    LISTING_REVISION = "listing_revision", "Listing revision"
    TRIP_REVIEW = "trip_review", "Trip review"
    DOCUMENT = "document", "Document"
    REVIEW_REPORT = "review_report", "Reported review"
    DISPUTE = "dispute", "Dispute"
    RISK_FLAG = "risk_flag", "Risk flag"
    LEGAL_CHANGE = "legal_change", "Legal change"
    HOST_CANCELLATIONS = "host_cancellations", "Host cancellations"


class CaseStatus(models.TextChoices):
    """``case_status`` enum."""

    OPEN = "open", "Open"
    IN_PROGRESS = "in_progress", "In progress"
    RESOLVED = "resolved", "Resolved"


class CasePriority(models.TextChoices):
    """``case_priority`` enum (BR-MOD-01)."""

    LOW = "low", "Low"
    NORMAL = "normal", "Normal"
    HIGH = "high", "High"


class SubjectType(models.TextChoices):
    """What a case is about (``CaseSubject.type`` in openapi.yaml)."""

    HOST_ACCOUNT = "host_account", "Host account"
    LISTING = "listing", "Listing"
    LISTING_REVISION = "listing_revision", "Listing revision"
    TRIP = "trip", "Trip"
    HOST_DOCUMENT = "host_document", "Host document"
    REVIEW = "review", "Review"
    BOOKING = "booking", "Booking"
    USER = "user", "User"


class ModerationCase(UUIDModel):
    """
    One item in a moderation queue (MOD-01).

    ``subject_type`` + ``subject_id`` point at the reviewed object (no
    foreign key: subjects live in several apps). ``subject_title`` and
    ``subject_reference`` are copies refreshed by ``sync_cases`` so the queue
    is listed without joining every app. ``submitted_at`` is the last
    submission: waiting time and priority count from it (BR-MOD-01).
    ``previous_case`` links a resubmission to the change request it answers
    (BR-MOD-02).
    """

    kind = models.CharField(max_length=20, choices=CaseKind.choices)
    subject_type = models.CharField(max_length=24, choices=SubjectType.choices)
    subject_id = models.UUIDField()
    subject_title = models.CharField(max_length=200, blank=True)
    subject_reference = models.CharField(max_length=32, blank=True)
    host_account = models.ForeignKey(
        "hosts.HostAccount", on_delete=models.PROTECT, null=True, blank=True, related_name="moderation_cases"
    )
    status = models.CharField(max_length=12, choices=CaseStatus.choices, default=CaseStatus.OPEN)
    priority = models.CharField(max_length=8, choices=CasePriority.choices, default=CasePriority.NORMAL)
    submitted_at = models.DateTimeField(help_text="Waiting time counts from here (BR-MOD-01).")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    outcome = models.CharField(max_length=24, blank=True)
    previous_case = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Queue order index and one unresolved case per subject and kind."""

        indexes = [models.Index(fields=["status", "kind", "submitted_at"])]
        constraints = [
            models.UniqueConstraint(
                fields=["kind", "subject_id"], condition=~models.Q(status="resolved"), name="moderation_case_one_open_per_subject"
            ),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.kind}:{self.subject_id} ({self.status})"


class ModerationDecision(UUIDModel):
    """A decision taken on a case (approve, reject, request changes, escalate...), MOD-02. Insert only."""

    case = models.ForeignKey(ModerationCase, on_delete=models.CASCADE, related_name="decisions")
    decision = models.CharField(max_length=24)
    reason = models.ForeignKey(ReasonCode, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    note = models.TextField(blank=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """History in time order."""

        ordering = ["created_at"]


class ChangeRequestItem(UUIDModel):
    """
    One thing the host must fix (BR-MOD-02), from the ``change_request`` checklist.

    ``resolved_at`` is set when the host resubmits the subject.
    """

    case = models.ForeignKey(ModerationCase, on_delete=models.CASCADE, related_name="change_request_items")
    checklist_code = models.CharField(max_length=48)
    message = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Items in the order the moderator wrote them."""

        ordering = ["created_at", "id"]
