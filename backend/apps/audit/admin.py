"""Django admin site registration for the audit log (strictly read-only, BR-STF-02)."""

from django.contrib import admin

from .models import AuditEvent


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    """Browse and search the audit log. Rows can never be added, changed or deleted here."""

    list_display = ("occurred_at", "action", "object_type", "object_id", "actor", "actor_kind")
    list_filter = ("action", "object_type", "actor_kind")
    search_fields = ("object_id", "action", "note")

    def has_add_permission(self, request) -> bool:
        """Rows are written by services only, never by hand."""
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        """The audit log is append-only."""
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        """The audit log is append-only."""
        return False
