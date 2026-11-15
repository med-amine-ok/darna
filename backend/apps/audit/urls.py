"""URL routes of the audit app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

urlpatterns = [
    path("admin/audit-events", views.AuditEventListView.as_view(), name="admin-audit-events"),
    path("admin/exports", views.ExportListView.as_view(), name="admin-exports"),
    path("admin/exports/<uuid:export_id>", views.ExportDetailView.as_view(), name="admin-export"),
    # Target of the signed download_url of an export (token-protected, 5 minutes).
    path("admin/exports/<uuid:export_id>/download", views.ExportDownloadView.as_view(), name="admin-export-download"),
]
