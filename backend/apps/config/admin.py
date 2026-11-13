"""Django admin site registration for platform settings (read-only console view)."""

from django.contrib import admin

from .models import PlatformSettings


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
