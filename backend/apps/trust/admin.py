"""Django admin console registration of the trust tables (internal tool)."""

from django.contrib import admin

from .models import ModerationCase, ReasonCode


@admin.register(ReasonCode)
class ReasonCodeAdmin(admin.ModelAdmin):
    """Reason catalogue: edit labels and host texts, switch reasons off (MOD-03)."""

    list_display = ("action", "code", "label_en", "label_fr", "is_active")
    list_filter = ("action", "is_active")
    search_fields = ("code", "label_en", "label_fr", "label_ar")


@admin.register(ModerationCase)
class ModerationCaseAdmin(admin.ModelAdmin):
    """Moderation cases, read mostly (decisions go through the API so they are audited)."""

    list_display = ("kind", "subject_title", "status", "priority", "submitted_at", "assigned_to")
    list_filter = ("kind", "status", "priority")
    search_fields = ("subject_title", "subject_reference", "subject_id")
