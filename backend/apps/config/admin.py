"""Django admin site registration for platform settings and onboarding flows (read-only console views)."""

from django.contrib import admin

from .models import OnboardingFlowVersion, PlatformSettings


@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    """
    History of settings versions.

    Read-only on purpose: changes go through ``PATCH /api/v1/admin/settings``
    so each one creates a new version and an audit row (BR-CFG-01).
    """

    list_display = ("version", "is_current", "created_by", "created_at")
    ordering = ("-version",)

    def has_add_permission(self, request) -> bool:
        """New versions are created by the API only."""
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        """Old versions never change."""
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        """Old versions are kept for history."""
        return False


@admin.register(OnboardingFlowVersion)
class OnboardingFlowVersionAdmin(admin.ModelAdmin):
    """
    Versions of the become-a-host wizards (BR-CFG-02).

    Read-only: drafts are edited and published through
    ``/api/v1/admin/onboarding-flows`` so the checks of BR-CFG-03 run and an
    audit row is written.
    """

    list_display = ("host_type", "version", "status", "published_at", "published_by")
    list_filter = ("host_type", "status")
    ordering = ("host_type", "-version")

    def has_add_permission(self, request) -> bool:
        """Versions are created by the API only."""
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        """Published versions never change; drafts change through the API."""
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        """Versions are kept: host drafts point at them (BR-HST-02)."""
        return False
