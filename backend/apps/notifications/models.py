"""
Tables of the notifications app (see docs/backend/05b-data-dictionary.md).

- ``notification``: one in-app message for one user (BR-NTF-01);
- ``notification_preference``: which non-critical kinds go by email, SMS or
  push (BR-NTF-02, BR-PRV-03);
- ``delivery_log``: one row per email or SMS sent for a notification, so a
  retried outbox message never sends twice (BR-NTF-02, "SMS sent once per event").

The outbox table itself still lives in ``apps.core`` (``OutboxMessage``);
the plan moves it here later (07-architecture.md section 2).
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel


class Channel(models.TextChoices):
    """Ways a notification can leave the app (in-app rows always exist)."""

    EMAIL = "email", "Email"
    SMS = "sms", "SMS"
    PUSH = "push", "Push"


class Notification(UUIDModel):
    """
    One in-app notification (BR-NTF-01).

    ``kind`` names the event (``booking.confirmed``); ``params`` holds the
    values of the localized template, so the title and body are rendered in
    the reader's language when read, never stored in one language.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=48)
    params = models.JSONField(default=dict, blank=True, help_text="Values for the localized template.")
    link = models.CharField(max_length=255, null=True, blank=True, help_text="Relative app path to open.")
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        """Newest first; the unread badge reads ``(user, read_at, id)``."""

        ordering = ["-id"]
        indexes = [models.Index(fields=["user", "read_at", "id"], name="notification_user_read_idx")]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.kind} for {self.user_id}"


class NotificationPreference(models.Model):
    """
    One switch: does ``kind`` go to ``user`` by ``channel``? (BR-NTF-02)

    Rows exist only for choices the user changed; a missing row means the
    default of the kind (see ``services.KINDS``). Critical kinds cannot be
    switched off by email or SMS (BR-PRV-03).
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_preferences")
    kind = models.CharField(max_length=48)
    channel = models.CharField(max_length=8, choices=Channel.choices)
    enabled = models.BooleanField()

    class Meta:
        """One switch per user, kind and channel (the plan's composite key)."""

        constraints = [
            models.UniqueConstraint(fields=["user", "kind", "channel"], name="notification_preference_unique"),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.user_id} {self.kind}/{self.channel}={'on' if self.enabled else 'off'}"


class DeliveryStatus(models.TextChoices):
    """Result of one email or SMS send."""

    SENT = "sent", "Sent"
    FAILED = "failed", "Failed"
    SKIPPED = "skipped", "Skipped (no address)"


class DeliveryLog(UUIDModel):
    """
    One email or SMS sent for a notification (BR-NTF-02).

    The unique ``(notification, channel)`` makes the outbox handler
    idempotent: a message delivered twice sends once. Only a hash of the
    recipient is kept (BR-PRV-01, data minimisation).
    """

    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, null=True, blank=True,
                                     related_name="deliveries")
    outbox_message = models.ForeignKey("core.OutboxMessage", on_delete=models.SET_NULL, null=True, blank=True,
                                       related_name="+")
    channel = models.CharField(max_length=8, choices=Channel.choices)
    provider = models.CharField(max_length=20)
    recipient_hash = models.CharField(max_length=64)
    status = models.CharField(max_length=12, choices=DeliveryStatus.choices)
    provider_message_id = models.CharField(max_length=100, null=True, blank=True)
    cost_minor = models.BigIntegerField(null=True, blank=True, help_text="Amount in centimes.")
    error = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        """One send per notification and channel."""

        constraints = [
            models.UniqueConstraint(fields=["notification", "channel"], name="delivery_log_once_per_channel"),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.channel} {self.status} ({self.notification_id})"
