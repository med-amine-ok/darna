"""
HTTP endpoints of the trust app.

- Public: ``GET /reference/reasons`` (reason catalogue for one action, cached with an ETag).
- Host: ``GET /host/change-requests`` (what moderators asked the active workspace to fix, BR-MOD-02).
- Admin (``IsAdmin``, DEC-016): moderation queue, counts, cases, assignment,
  decisions and bulk decisions, reason catalogue, dashboard attention,
  analytics (KPIs, charts) and the command palette search.

Views stay thin: read and check the query or body, call a selector or a
service, format the answer.
"""

import hashlib
import json
import math
import uuid

from django.contrib.auth import get_user_model
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.accounts.views import client_ip
from apps.catalog.api import query_bool, query_date, query_int
from apps.core import idempotency
from apps.core.errors import DomainError
from apps.geo.serializers import request_locale
from apps.hosts.context import get_host_context

from . import admin_search, analytics, selectors, services
from .models import CaseKind, CasePriority, CaseStatus
from .reason_data import PUBLIC_ACTIONS
from .serializers import (
    AssignSerializer,
    AttentionItemsSerializer,
    BulkDecisionSerializer,
    BulkResultSerializer,
    ChangeRequestItemSerializer,
    DecisionCreateSerializer,
    KpiChartsSerializer,
    KpiReportSerializer,
    ModerationCasePageSerializer,
    ModerationCaseSerializer,
    ModerationCountsSerializer,
    ReasonCodeSerializer,
    SearchHitSerializer,
)

# 06-api-design 3.6: numbered admin pages, 1 to 100 rows, default 20.
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
# 06-api-design 3.11: reference lists are cached one hour.
REFERENCE_MAX_AGE = 3600
ORDERINGS = ("submitted_at", "-submitted_at", "priority")


def _bad(name: str, message: str) -> DomainError:
    """400 for an unreadable query parameter."""
    return DomainError("Invalid query parameter.", code="invalid", errors={name: [message]})


def _csv_choices(request, name: str, allowed) -> list[str]:
    """Comma list of values from the query string, each one of ``allowed`` (else 400)."""
    raw = request.query_params.get(name) or ""
    values = [v.strip() for v in raw.split(",") if v.strip()]
    wrong = [v for v in values if v not in allowed]
    if wrong:
        raise _bad(name, f"Unknown value(s): {', '.join(wrong)}.")
    return values


def _reason_results(request, rows) -> list[dict]:
    """Reason rows serialized in the caller's language."""
    return ReasonCodeSerializer(rows, many=True, context={"locale": request_locale(request)}).data


def _case_context(request) -> dict:
    """Serializer context of cases: language and checklist labels (one query)."""
    locale = request_locale(request)
    return {"locale": locale, "checklist_labels": selectors.checklist_labels(locale)}


def _case_body(request, case_id) -> dict:
    """``ModerationCase`` answer for one case, freshly read with its history."""
    return ModerationCaseSerializer(selectors.get_case(case_id), context=_case_context(request)).data


ReasonListSerializer = inline_serializer("ReasonCodeList", {"results": ReasonCodeSerializer(many=True)})


# ---------------------------------------------------------------------------
# Reason catalogue (MOD-03)
# ---------------------------------------------------------------------------
class PublicReasonListView(APIView):
    """``GET /reference/reasons?action=``: reasons a guest or host can pick (listReasonCodes)."""

    permission_classes = [AllowAny]
    serializer_class = ReasonCodeSerializer

    @extend_schema(
        operation_id="listReasonCodes", tags=["public.reference"], responses={200: ReasonListSerializer, 304: None},
        parameters=[OpenApiParameter("action", str, required=True, enum=list(PUBLIC_ACTIONS))],
    )
    def get(self, request):
        """Active reasons of one public action; ``ETag`` and one hour of caching, 304 on ``If-None-Match``."""
        action = request.query_params.get("action")
        if action not in PUBLIC_ACTIONS:
            raise _bad("action", f"One of: {', '.join(PUBLIC_ACTIONS)}.")
        body = {"results": _reason_results(request, selectors.reason_codes(action))}
        etag = '"' + hashlib.sha256(json.dumps(body, sort_keys=True, default=str).encode()).hexdigest()[:32] + '"'
        if request.headers.get("If-None-Match") == etag:
            response = Response(status=status.HTTP_304_NOT_MODIFIED)
        else:
            response = Response(body)
        response["ETag"] = etag
        response["Cache-Control"] = f"public, max-age={REFERENCE_MAX_AGE}"
        response["Vary"] = "Accept-Language"
        return response


class AdminReasonListView(APIView):
    """``GET /admin/reason-codes``: the whole catalogue, optionally one action (adminListReasonCodes)."""

    permission_classes = [IsAdmin]
    serializer_class = ReasonCodeSerializer

    @extend_schema(operation_id="adminListReasonCodes", tags=["admin.moderation"], responses=ReasonListSerializer,
                   parameters=[OpenApiParameter("action", str)])
    def get(self, request):
        """Active reasons, catalogue order."""
        rows = selectors.reason_codes(request.query_params.get("action") or None)
        return Response({"results": _reason_results(request, rows)})


# ---------------------------------------------------------------------------
# Host side (BR-MOD-02)
# ---------------------------------------------------------------------------
class HostChangeRequestListView(APIView):
    """``GET /host/change-requests``: what moderators asked the active workspace to fix (listHostChangeRequests)."""

    serializer_class = ChangeRequestItemSerializer

    @extend_schema(
        operation_id="listHostChangeRequests", tags=["host.verification"],
        responses=inline_serializer("ChangeRequestItemList", {"results": ChangeRequestItemSerializer(many=True)}),
        parameters=[OpenApiParameter("open", bool, description="Only unresolved items (default true).")],
    )
    def get(self, request):
        """Items of the cases of this host account; only unresolved ones unless ``open=false``."""
        ctx = get_host_context(request)
        open_only = query_bool(request, "open")
        rows = selectors.host_change_requests(ctx.host_account, open_only=open_only is not False)
        locale = request_locale(request)
        data = ChangeRequestItemSerializer(
            rows, many=True, context={"locale": locale, "checklist_labels": selectors.checklist_labels(locale)}
        ).data
        return Response({"results": data})


# ---------------------------------------------------------------------------
# Moderation queue (MOD-01, MOD-02, MOD-04)
# ---------------------------------------------------------------------------
class AdminCaseListView(APIView):
    """``GET /admin/moderation/cases``: the queue, numbered pages with facets (adminListCases)."""

    permission_classes = [IsAdmin]
    serializer_class = ModerationCaseSerializer

    @extend_schema(
        operation_id="adminListCases", tags=["admin.moderation"], responses=ModerationCasePageSerializer,
        parameters=[
            OpenApiParameter("kind", str, description="Comma list of queues."),
            OpenApiParameter("status", str, description="Comma list; default open,in_progress."),
            OpenApiParameter("priority", str, enum=CasePriority.values),
            OpenApiParameter("assigned_to", str, description="`me`, `none` or a staff user id."),
            OpenApiParameter("ordering", str, enum=list(ORDERINGS)),
            OpenApiParameter("page", int), OpenApiParameter("page_size", int),
        ],
    )
    def get(self, request):
        """Sync the queue with the other apps, then filter, sort and paginate it."""
        services.sync_cases()
        priority = request.query_params.get("priority") or None
        if priority and priority not in CasePriority.values:
            raise _bad("priority", "low, normal or high.")
        assigned_to = request.query_params.get("assigned_to") or None
        if assigned_to and assigned_to not in ("me", "none"):
            try:
                uuid.UUID(assigned_to)
            except ValueError as exc:
                raise _bad("assigned_to", "me, none or a user id.") from exc
        ordering = request.query_params.get("ordering") or None
        if ordering and ordering not in ORDERINGS:
            raise _bad("ordering", f"One of: {', '.join(ORDERINGS)}.")
        page = query_int(request, "page", minimum=1) or 1
        page_size = query_int(request, "page_size", minimum=1) or DEFAULT_PAGE_SIZE
        if page_size > MAX_PAGE_SIZE:
            raise _bad("page_size", f"At most {MAX_PAGE_SIZE}.")
        filters = selectors.queue_filters(
            kinds=_csv_choices(request, "kind", CaseKind.values),
            statuses=_csv_choices(request, "status", CaseStatus.values),
            priority=priority, assigned_to=assigned_to, user=request.user,
        )
        rows = selectors.queue(filters, ordering)
        total = rows.count()
        page_rows = rows[(page - 1) * page_size: page * page_size]
        return Response({
            "results": ModerationCaseSerializer(page_rows, many=True, context=_case_context(request)).data,
            "meta": {"page": page, "page_size": page_size, "total_count": total,
                     "total_pages": math.ceil(total / page_size) if total else 0},
            "facets": selectors.queue_facets(filters),
        })


class AdminCaseDetailView(APIView):
    """``GET /admin/moderation/cases/{case_id}``: one case with its history (adminGetCase)."""

    permission_classes = [IsAdmin]
    serializer_class = ModerationCaseSerializer

    @extend_schema(operation_id="adminGetCase", tags=["admin.moderation"], responses=ModerationCaseSerializer)
    def get(self, request, case_id):
        """The case, its decisions and change request items; 404 ``case_not_found``."""
        return Response(_case_body(request, case_id))


class AdminCaseAssignView(APIView):
    """``POST /admin/moderation/cases/{case_id}/assign``: take, give or release a case (adminAssignCase)."""

    permission_classes = [IsAdmin]
    serializer_class = AssignSerializer

    @extend_schema(operation_id="adminAssignCase", tags=["admin.moderation"], request=AssignSerializer,
                   responses=ModerationCaseSerializer)
    def post(self, request, case_id):
        """``assignee_id`` omitted = me, null = nobody; another id must be an active admin (else 422)."""
        data = AssignSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        if "assignee_id" not in data.validated_data:
            assignee = request.user
        elif data.validated_data["assignee_id"] is None:
            assignee = None
        else:
            assignee = get_user_model().objects.filter(pk=data.validated_data["assignee_id"]).first()
            if assignee is None or not assignee.is_admin:
                raise DomainError("The assignee must be an active admin.", code="invalid_assignee", status_code=422,
                                  errors={"assignee_id": ["Not an active admin."]})
        services.assign_case(request.user, case_id, assignee, ip=client_ip(request))
        return Response(_case_body(request, case_id))


class AdminCaseDecisionView(APIView):
    """``POST /admin/moderation/cases/{case_id}/decisions``: decide a case (adminDecideCase)."""

    permission_classes = [IsAdmin]
    serializer_class = DecisionCreateSerializer

    @extend_schema(
        operation_id="adminDecideCase", tags=["admin.moderation"], request=DecisionCreateSerializer,
        responses=ModerationCaseSerializer,
        parameters=[OpenApiParameter("Idempotency-Key", OpenApiTypes.STR, OpenApiParameter.HEADER)],
    )
    def post(self, request, case_id):
        """Apply the decision to the subject (BR-MOD-02); an optional ``Idempotency-Key`` replays the answer."""
        endpoint = f"trust.decide:{case_id}"
        key = request.headers.get("Idempotency-Key")
        stored = idempotency.lookup(request.user, endpoint, key, request.data)
        if stored:
            response = Response(stored.response_body, status=stored.response_code)
            response["Idempotency-Replayed"] = "true"
            return response
        data = DecisionCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.decide_case(request.user, case_id, ip=client_ip(request), **data.validated_data)
        body = _case_body(request, case_id)
        idempotency.remember(request.user, endpoint, key, request.data, 200, json.loads(json.dumps(body, default=str)))
        return Response(body)


def _problem(exc: DomainError) -> dict:
    """``Problem`` object for one failed item of a bulk decision."""
    return {
        "type": f"https://api.bladus.dz/errors/{exc.code}",
        "title": exc.code.replace("_", " ").capitalize(),
        "status": exc.status,
        "code": exc.code,
        "message": exc.message,
    }


class AdminBulkDecisionView(APIView):
    """``POST /admin/moderation/bulk-decisions``: the same decision on up to 100 cases (adminBulkDecide)."""

    permission_classes = [IsAdmin]
    serializer_class = BulkDecisionSerializer

    @extend_schema(operation_id="adminBulkDecide", tags=["admin.moderation"], request=BulkDecisionSerializer,
                   responses=BulkResultSerializer)
    def post(self, request):
        """Per-item result; one audit row per decided case (MOD-04)."""
        data = BulkDecisionSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        results = services.bulk_decide(
            request.user, data.validated_data["case_ids"], ip=client_ip(request), **data.validated_data["decision"]
        )
        body = [{"id": str(r["id"]), "ok": r["ok"], "error": _problem(r["error"]) if r["error"] else None}
                for r in results]
        return Response({"results": body})


class AdminModerationCountsView(APIView):
    """``GET /admin/moderation/counts``: queue sizes, oldest waiting, high priority (adminModerationCounts)."""

    permission_classes = [IsAdmin]
    serializer_class = ModerationCountsSerializer

    @extend_schema(operation_id="adminModerationCounts", tags=["admin.moderation"], responses=ModerationCountsSerializer)
    def get(self, request):
        """One row per queue (BR-MOD-01)."""
        services.sync_cases()
        return Response(ModerationCountsSerializer({"queues": selectors.moderation_counts()}).data)


class AdminAttentionView(APIView):
    """``GET /admin/dashboard/attention``: what needs attention now (adminAttentionItems)."""

    permission_classes = [IsAdmin]
    serializer_class = AttentionItemsSerializer

    @extend_schema(operation_id="adminAttentionItems", tags=["admin.moderation"], responses=AttentionItemsSerializer)
    def get(self, request):
        """Moderation queues, wallets below zero and top-ups waiting (BR-MOD-01, BR-PAY-10)."""
        services.sync_cases()
        return Response(AttentionItemsSerializer({"items": selectors.attention_items()}).data)


# ---------------------------------------------------------------------------
# Analytics (RPT-01, RPT-02) and command palette (STF-05)
# ---------------------------------------------------------------------------
ANALYTICS_PARAMETERS = [
    OpenApiParameter("period", str, enum=["7d", "30d", "90d", "1y", "custom"], default="30d"),
    OpenApiParameter("from", OpenApiTypes.DATE), OpenApiParameter("to", OpenApiTypes.DATE),
    OpenApiParameter("host_type", str, description="Comma list: individual, agency, hotel, hostel."),
    OpenApiParameter("vertical", str, description="Comma list: home, hotel, hostel, experience, vehicle."),
    OpenApiParameter("wilaya", str, description="Comma list of wilaya codes."),
    OpenApiParameter("group_stays", bool, description="Roll home, hotel, hostel into stays (BR-SRC-04)."),
]


def _analytics_input(request) -> tuple[analytics.Window, analytics.Filters]:
    """Read the period and filters shared by the KPI and chart endpoints (400 on bad values)."""
    win = analytics.window(request.query_params.get("period"), query_date(request, "from"), query_date(request, "to"))
    raw_wilayas = _csv_choices(request, "wilaya", [str(n) for n in range(1, 70)])
    filters = analytics.Filters(
        host_types=_csv_choices(request, "host_type", analytics.HOST_TYPES),
        verticals=_csv_choices(request, "vertical", ("home", "hotel", "hostel", "experience", "vehicle")),
        wilayas=[int(w) for w in raw_wilayas],
        group_stays=bool(query_bool(request, "group_stays")),
    )
    return win, filters


class AdminKpiView(APIView):
    """``GET /admin/analytics/kpis``: KPIs with the previous period (adminGetKpis)."""

    permission_classes = [IsAdmin]
    serializer_class = KpiReportSerializer

    @extend_schema(operation_id="adminGetKpis", tags=["admin.analytics"], responses=KpiReportSerializer,
                   parameters=ANALYTICS_PARAMETERS)
    def get(self, request):
        """Real date windows in Africa/Algiers (BR-RPT-01)."""
        win, filters = _analytics_input(request)
        return Response(KpiReportSerializer(analytics.kpi_report(win, filters)).data)


class AdminChartsView(APIView):
    """``GET /admin/analytics/charts``: chart series (adminGetCharts)."""

    permission_classes = [IsAdmin]
    serializer_class = KpiChartsSerializer

    @extend_schema(operation_id="adminGetCharts", tags=["admin.analytics"], responses=KpiChartsSerializer,
                   parameters=ANALYTICS_PARAMETERS)
    def get(self, request):
        """Revenue by month, host type and vertical, bookings by wilaya, host type by vertical (RPT-02)."""
        win, filters = _analytics_input(request)
        return Response(KpiChartsSerializer(analytics.charts(win, filters, request_locale(request))).data)


class AdminSearchView(APIView):
    """``GET /admin/search?q=``: command palette search (adminGlobalSearch)."""

    permission_classes = [IsAdmin]
    serializer_class = SearchHitSerializer

    @extend_schema(
        operation_id="adminGlobalSearch", tags=["admin.analytics"],
        responses=inline_serializer("SearchHitList", {"results": SearchHitSerializer(many=True)}),
        parameters=[OpenApiParameter("q", str, required=True), OpenApiParameter("limit", int)],
    )
    def get(self, request):
        """At least 2 characters; ``limit`` 1 to 20 (default 12)."""
        q = (request.query_params.get("q") or "").strip()
        if len(q) < admin_search.MIN_CHARS:
            raise _bad("q", f"At least {admin_search.MIN_CHARS} characters.")
        limit = query_int(request, "limit", minimum=1) or admin_search.DEFAULT_LIMIT
        if limit > admin_search.MAX_LIMIT:
            raise _bad("limit", f"At most {admin_search.MAX_LIMIT}.")
        hits = admin_search.search(q, limit)
        return Response({"results": SearchHitSerializer(hits, many=True).data})

