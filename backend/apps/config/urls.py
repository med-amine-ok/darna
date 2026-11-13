"""URL routes of the config app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

urlpatterns = [
    path("settings/public", views.PublicSettingsView.as_view(), name="settings-public"),
    path("admin/settings", views.AdminSettingsView.as_view(), name="admin-settings"),
]
