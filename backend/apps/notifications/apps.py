"""Django app configuration for ``apps.notifications``."""

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """In-app notifications, notification preferences and the email and SMS delivery log (BR-NTF-01, BR-NTF-02)."""

    name = "apps.notifications"
    label = "notifications"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Register the ``notification.send`` outbox handler (sends the email or SMS of a notification)."""
        from apps.core.outbox import register_handler

        from .services import SEND_TOPIC, deliver_handler

        register_handler(SEND_TOPIC, deliver_handler)
