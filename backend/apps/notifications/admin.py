"""Django console views of notifications (support reads; no edits of delivery history)."""

from django.contrib import admin

from .models import DeliveryLog, Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """In-app notifications, newest first."""

    list_display = ("kind", "user", "read_at", "created_at")
    list_filter = ("kind",)
    raw_id_fields = ("user",)


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    """Stored switches (only those a user changed)."""

    list_display = ("user", "kind", "channel", "enabled")
    raw_id_fields = ("user",)


@admin.register(DeliveryLog)
class DeliveryLogAdmin(admin.ModelAdmin):
    """Emails and SMS sent for notifications (recipient kept only as a hash)."""

    list_display = ("channel", "provider", "status", "created_at")
    list_filter = ("channel", "status")
    raw_id_fields = ("notification", "outbox_message")
