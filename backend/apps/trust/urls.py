"""URL routes of the trust app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

urlpatterns = [
    # Public and host
    path("reference/reasons", views.PublicReasonListView.as_view(), name="reference-reasons"),
    path("host/change-requests", views.HostChangeRequestListView.as_view(), name="host-change-requests"),
    # Admin: moderation
    path("admin/moderation/counts", views.AdminModerationCountsView.as_view(), name="admin-moderation-counts"),
    path("admin/moderation/cases", views.AdminCaseListView.as_view(), name="admin-moderation-cases"),
    path("admin/moderation/cases/<uuid:case_id>", views.AdminCaseDetailView.as_view(), name="admin-moderation-case"),
    path("admin/moderation/cases/<uuid:case_id>/assign", views.AdminCaseAssignView.as_view(),
         name="admin-moderation-case-assign"),
    path("admin/moderation/cases/<uuid:case_id>/decisions", views.AdminCaseDecisionView.as_view(),
         name="admin-moderation-case-decisions"),
    path("admin/moderation/bulk-decisions", views.AdminBulkDecisionView.as_view(), name="admin-moderation-bulk"),
    path("admin/reason-codes", views.AdminReasonListView.as_view(), name="admin-reason-codes"),
    path("admin/dashboard/attention", views.AdminAttentionView.as_view(), name="admin-dashboard-attention"),
    # Admin: analytics and command palette
    path("admin/analytics/kpis", views.AdminKpiView.as_view(), name="admin-analytics-kpis"),
    path("admin/analytics/charts", views.AdminChartsView.as_view(), name="admin-analytics-charts"),
    path("admin/search", views.AdminSearchView.as_view(), name="admin-search"),
]
