"""Django app configuration for ``apps.messaging``."""

from django.apps import AppConfig


class MessagingConfig(AppConfig):
    """Conversations between guests and hosts, messages, contact masking and cursor sync (BR-MSG-01)."""

    name = "apps.messaging"
    label = "messaging"
    default_auto_field = "django.db.models.BigAutoField"
