"""URL routes of the config app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

FLOW = "admin/onboarding-flows/<str:host_type>"

urlpatterns = [
    path("settings/public", views.PublicSettingsView.as_view(), name="settings-public"),
    path("onboarding-flows/<str:host_type>", views.PublicOnboardingFlowView.as_view(), name="onboarding-flow-public"),
    path("admin/settings", views.AdminSettingsView.as_view(), name="admin-settings"),
    path("admin/settings/versions", views.AdminSettingsVersionListView.as_view(), name="admin-settings-versions"),
    path("admin/commission-rates", views.AdminCommissionRatesView.as_view(), name="admin-commission-rates"),
    path("admin/onboarding-flows", views.AdminOnboardingFlowListView.as_view(), name="admin-onboarding-flows"),
    path(f"{FLOW}/versions", views.AdminOnboardingVersionListView.as_view(), name="admin-onboarding-versions"),
    path(f"{FLOW}/versions/<int:version>", views.AdminOnboardingVersionView.as_view(), name="admin-onboarding-version"),
    path(f"{FLOW}/draft", views.AdminOnboardingDraftView.as_view(), name="admin-onboarding-draft"),
    path(f"{FLOW}/publish", views.AdminOnboardingPublishView.as_view(), name="admin-onboarding-publish"),
    path(
        f"{FLOW}/versions/<int:version>/republish",
        views.AdminOnboardingRepublishView.as_view(),
        name="admin-onboarding-republish",
    ),
]
