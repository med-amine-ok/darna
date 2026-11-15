"""
Input and output shapes of the trust API (openapi.yaml: ReasonCode, ModerationCase, DecisionCreate,
BulkDecision, BulkResult, ChangeRequestItem, ModerationCounts, AttentionItems, KpiReport, KpiCharts, SearchHit).

The caller's language (``Accept-Language``) is passed in the serializer
context as ``locale``; labels come out in that language (BR-SYS-04).
"""

from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.ledger.serializers import MoneySerializer, UserRefSerializer

from .models import CaseKind, ChangeRequestItem, ModerationCase, ModerationDecision, ReasonCode
from .services import DECISIONS


def _locale(serializer) -> str:
    """Language from the context, French by default."""
    return serializer.context.get("locale", "fr")


class ReasonCodeSerializer(serializers.ModelSerializer):
    """One reason of the catalogue in the caller's language (MOD-03)."""

    label = serializers.SerializerMethodField()
    host_text = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads."""

        model = ReasonCode
        fields = ["id", "action", "code", "label", "host_text"]

    def get_label(self, reason: ReasonCode) -> str:
        """Label in the caller's language."""
        return reason.label_for(_locale(self))

    def get_host_text(self, reason: ReasonCode) -> str | None:
        """Text shown to the host, in the caller's language, or null."""
        return reason.host_text_for(_locale(self))


def user_ref(user) -> dict | None:
    """``UserRef`` of a user (no contact details), or ``None``."""
    if user is None:
        return None
    return {"id": str(user.id), "display_name": user.display_name, "avatar_url": None}


class ChangeRequestItemSerializer(serializers.ModelSerializer):
    """One thing the host must fix (BR-MOD-02); ``label`` comes from the checklist."""

    case_id = serializers.UUIDField()
    subject_type = serializers.CharField(source="case.subject_type")
    subject_id = serializers.UUIDField(source="case.subject_id")
    label = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads."""

        model = ChangeRequestItem
        fields = ["id", "case_id", "subject_type", "subject_id", "checklist_code", "label", "message",
                  "resolved_at", "created_at"]

    def get_label(self, item: ChangeRequestItem) -> str:
        """Checklist label in the caller's language (the code when unknown)."""
        return self.context.get("checklist_labels", {}).get(item.checklist_code, item.checklist_code)

    def get_message(self, item: ChangeRequestItem) -> str | None:
        """Moderator's message for this item, or null."""
        return item.message or None


class DecisionRecordSerializer(serializers.ModelSerializer):
    """One decision in the case history."""

    reason_code = serializers.SerializerMethodField()
    note = serializers.SerializerMethodField()
    actor = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads."""

        model = ModerationDecision
        fields = ["id", "decision", "reason_code", "note", "actor", "created_at"]

    @extend_schema_field(UserRefSerializer)
    def get_actor(self, decision: ModerationDecision) -> dict:
        """Who decided (``UserRef``)."""
        return user_ref(decision.actor)

    def get_reason_code(self, decision: ModerationDecision) -> str | None:
        """Code of the catalogue reason, or null."""
        return decision.reason.code if decision.reason_id else None

    def get_note(self, decision: ModerationDecision) -> str | None:
        """Moderator's note, or null."""
        return decision.note or None


class CaseSubjectSerializer(serializers.Serializer):
    """What the case is about (``CaseSubject``)."""

    type = serializers.CharField(source="subject_type")
    id = serializers.UUIDField(source="subject_id")
    reference = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    host_account_id = serializers.UUIDField(allow_null=True)

    def get_reference(self, case: ModerationCase) -> str | None:
        """Human reference (LST-..., TRP-...) or null."""
        return case.subject_reference or None

    def get_title(self, case: ModerationCase) -> str:
        """Title copied when the case was synced."""
        return case.subject_title or str(case.subject_id)


class ModerationCaseSerializer(serializers.ModelSerializer):
    """A case with its subject, waiting time and history (MOD-01, MOD-02)."""

    subject = serializers.SerializerMethodField()
    waiting_hours = serializers.SerializerMethodField()
    assigned_to = serializers.SerializerMethodField()
    change_request_items = serializers.SerializerMethodField()
    decisions = DecisionRecordSerializer(many=True)

    class Meta:
        """Model and fields this serializer reads."""

        model = ModerationCase
        fields = ["id", "kind", "subject", "status", "priority", "submitted_at", "waiting_hours", "assigned_to",
                  "change_request_items", "decisions", "created_at"]

    @extend_schema_field(CaseSubjectSerializer)
    def get_subject(self, case: ModerationCase) -> dict:
        """``CaseSubject`` object."""
        return CaseSubjectSerializer(case).data

    def get_waiting_hours(self, case: ModerationCase) -> int:
        """Whole hours since the last submission, until resolution for a resolved case (BR-MOD-01)."""
        end = case.resolved_at or timezone.now()
        return max(0, int((end - case.submitted_at).total_seconds() // 3600))

    @extend_schema_field(UserRefSerializer(allow_null=True))
    def get_assigned_to(self, case: ModerationCase) -> dict | None:
        """Staff member working on the case, or null."""
        return user_ref(case.assigned_to)

    @extend_schema_field(ChangeRequestItemSerializer(many=True))
    def get_change_request_items(self, case: ModerationCase) -> list[dict]:
        """Items of this case's change request (BR-MOD-02)."""
        return ChangeRequestItemSerializer(case.change_request_items.all(), many=True, context=self.context).data


class DecisionItemSerializer(serializers.Serializer):
    """One item of a change request in a decision body."""

    checklist_code = serializers.CharField(max_length=48)
    message = serializers.CharField(allow_null=True, allow_blank=True, required=False, max_length=2000)


class DecisionCreateSerializer(serializers.Serializer):
    """``POST .../decisions`` body (DecisionCreate). Unknown keys are refused (additionalProperties false)."""

    decision = serializers.ChoiceField(choices=DECISIONS)
    reason_code = serializers.CharField(allow_null=True, required=False, max_length=48)
    note = serializers.CharField(allow_blank=True, required=False, max_length=4000)
    items = DecisionItemSerializer(many=True, required=False)

    def validate(self, attrs):
        """Refuse keys that are not part of the contract."""
        unknown = set(getattr(self, "initial_data", {}) or {}) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({key: ["Unknown field."] for key in sorted(unknown)})
        return attrs


class BulkDecisionSerializer(serializers.Serializer):
    """``POST /admin/moderation/bulk-decisions`` body: 1 to 100 cases and one decision (MOD-04)."""

    case_ids = serializers.ListField(child=serializers.UUIDField(), min_length=1, max_length=100)
    decision = DecisionCreateSerializer()


class AssignSerializer(serializers.Serializer):
    """``POST .../assign`` body: ``assignee_id`` null = unassign, omitted = me."""

    assignee_id = serializers.UUIDField(allow_null=True, required=False)


class ProblemSerializer(serializers.Serializer):
    """Error of one item of a bulk decision (``Problem``)."""

    type = serializers.CharField()
    title = serializers.CharField()
    status = serializers.IntegerField()
    code = serializers.CharField()
    message = serializers.CharField()


class BulkItemSerializer(serializers.Serializer):
    """Result of one case in a bulk decision."""

    id = serializers.UUIDField()
    ok = serializers.BooleanField()
    error = ProblemSerializer(allow_null=True)


class BulkResultSerializer(serializers.Serializer):
    """``BulkResult``."""

    results = BulkItemSerializer(many=True)


class QueueCountSerializer(serializers.Serializer):
    """One queue in ``ModerationCounts``."""

    kind = serializers.ChoiceField(choices=CaseKind.choices)
    open = serializers.IntegerField()
    high_priority = serializers.IntegerField()
    oldest_submitted_at = serializers.DateTimeField(allow_null=True)


class ModerationCountsSerializer(serializers.Serializer):
    """``ModerationCounts``."""

    queues = QueueCountSerializer(many=True)


class AttentionRowSerializer(serializers.Serializer):
    """One row of an attention group."""

    id = serializers.CharField()
    title = serializers.CharField()
    href = serializers.CharField()
    since = serializers.DateTimeField(allow_null=True)


class AttentionGroupSerializer(serializers.Serializer):
    """One group of the dashboard attention list."""

    kind = serializers.CharField()
    count = serializers.IntegerField()
    top = AttentionRowSerializer(many=True)


class AttentionItemsSerializer(serializers.Serializer):
    """``AttentionItems``."""

    items = AttentionGroupSerializer(many=True)


class CountBucketSerializer(serializers.Serializer):
    """``FacetBucket`` shape (value, label, count); own component name to avoid clashing with search."""

    value = serializers.CharField()
    label = serializers.CharField(required=False)
    count = serializers.IntegerField()


class PageMetaSerializer(serializers.Serializer):
    """``PageMeta`` of numbered admin pages."""

    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total_count = serializers.IntegerField()
    total_pages = serializers.IntegerField()


class CaseFacetsSerializer(serializers.Serializer):
    """Facets of the queue: counts per kind, status and priority."""

    kind = CountBucketSerializer(many=True)
    status = CountBucketSerializer(many=True)
    priority = CountBucketSerializer(many=True)


class ModerationCasePageSerializer(serializers.Serializer):
    """Numbered page of cases (admin tables): ``results``, ``meta``, ``facets``."""

    results = ModerationCaseSerializer(many=True)
    meta = PageMetaSerializer()
    facets = CaseFacetsSerializer()


class KpiMetricSerializer(serializers.Serializer):
    """One KPI with its previous value."""

    key = serializers.CharField()
    value = serializers.FloatField()
    previous = serializers.FloatField(allow_null=True)
    change_bp = serializers.IntegerField(allow_null=True)
    money = MoneySerializer(allow_null=True)


class KpiReportSerializer(serializers.Serializer):
    """``KpiReport`` (BR-RPT-01)."""

    to = serializers.DateField()
    previous_from = serializers.DateField()
    previous_to = serializers.DateField()
    metrics = KpiMetricSerializer(many=True)

    def get_fields(self):
        """Add ``from``, a Python keyword, as a field name."""
        fields = super().get_fields()
        fields["from"] = serializers.DateField()
        return fields


class ChartPointSerializer(serializers.Serializer):
    """One point of a chart series."""

    x = serializers.CharField()
    y = serializers.FloatField()


class ChartSeriesSerializer(serializers.Serializer):
    """``ChartSeries``."""

    key = serializers.CharField()
    points = ChartPointSerializer(many=True)


class KpiChartsSerializer(serializers.Serializer):
    """``KpiCharts`` (RPT-02)."""

    revenue_by_month = ChartSeriesSerializer(many=True)
    revenue_by_host_type = CountBucketSerializer(many=True)
    revenue_by_vertical = CountBucketSerializer(many=True)
    bookings_by_wilaya = CountBucketSerializer(many=True)
    host_type_by_vertical = serializers.DictField()


class SearchHitSerializer(serializers.Serializer):
    """``SearchHit`` of the command palette."""

    type = serializers.ChoiceField(choices=["host", "listing", "trip", "booking", "user"])
    id = serializers.CharField()
    title = serializers.CharField()
    subtitle = serializers.CharField(allow_null=True)
    href = serializers.CharField()
