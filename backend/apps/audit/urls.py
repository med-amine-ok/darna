"""URL routes of the audit app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

urlpatterns = [
    path("admin/audit-events", views.AuditEventListView.as_view(), name="admin-audit-events"),
]
