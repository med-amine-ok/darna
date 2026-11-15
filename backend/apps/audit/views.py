"""
Audit log and CSV export endpoints for admins (BR-STF-02, BR-STF-04).

The audit log is read only: the API offers no way to change or delete an
audit row. Exports are built at once, stored privately and downloaded through
a link that works 5 minutes; creating and downloading one are both audited.
"""

from django.http import HttpResponse
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.accounts.views import client_ip

from . import selectors, services
from .models import ExportJob
from .serializers import AuditEventSerializer, ExportCreateSerializer, ExportJobSerializer


class AuditEventListView(ListAPIView):
    """
    ``GET /admin/audit-events``: paginated, newest first.

    Filters (query string): ``action``, ``object_type``, ``object_id``,
    ``actor`` (user id).
    """

    permission_classes = [IsAdmin]
    serializer_class = AuditEventSerializer
    # Filtering is done by the selector; the global django-filter backend is not needed.
    filter_backends: list = []

    def get_queryset(self):
        """Events matching the query-string filters."""
        params = self.request.query_params
        return selectors.list_events(
            action=params.get("action", ""),
            object_type=params.get("object_type", ""),
            object_id=params.get("object_id", ""),
            actor=params.get("actor", ""),
        )


class ExportListView(ListAPIView):
    """``GET /admin/exports`` (my recent exports, paginated) and ``POST /admin/exports`` (new export)."""

    permission_classes = [IsAdmin]
    serializer_class = ExportJobSerializer
    filter_backends: list = []

    def get_queryset(self):
        """The caller's own exports, newest first."""
        return ExportJob.objects.filter(requested_by=self.request.user).order_by("-created_at")

    @extend_schema(request=ExportCreateSerializer, responses={201: ExportJobSerializer})
    def post(self, request):
        """Build the CSV now (formula-safe), audit it and answer the job with its download link."""
        data = ExportCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        job = services.create_export(
            request.user, dataset=data.validated_data["dataset"], filters=data.validated_data["filters"],
            ip=client_ip(request),
        )
        return Response(ExportJobSerializer(job, context={"request": request}).data, status=status.HTTP_201_CREATED)


class ExportDetailView(APIView):
    """``GET /admin/exports/{id}``: status of one of my exports and a fresh 5-minute download link."""

    permission_classes = [IsAdmin]
    serializer_class = ExportJobSerializer

    def get(self, request, export_id):
        """404 for an unknown export or one asked by another admin."""
        job = services.export_of(request.user, export_id)
        return Response(ExportJobSerializer(job, context={"request": request}).data)


class ExportDownloadView(APIView):
    """
    ``GET /admin/exports/{id}/download?token=...``: the CSV file behind a signed link.

    The token is the permission (a browser opening the link sends no session
    header); it works 5 minutes for this export only. Not in openapi.yaml: it
    is the target of ``download_url``.
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    @extend_schema(
        parameters=[OpenApiParameter("token", str, OpenApiParameter.QUERY, required=True)],
        responses={(200, "text/csv"): bytes, 404: None},
    )
    def get(self, request, export_id):
        """Send the file as an attachment; the download is audited."""
        job, content = services.export_for_download(export_id, request.query_params.get("token", ""),
                                                    ip=client_ip(request))
        response = HttpResponse(content, content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="bladus-{job.dataset}-{job.created_at:%Y%m%d}.csv"'
        response["Cache-Control"] = "no-store"
        return response
