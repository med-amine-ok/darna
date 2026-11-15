"""Django app configuration for ``apps.trust``."""

from django.apps import AppConfig


class TrustConfig(AppConfig):
    """Moderation queues and cases, decisions, change requests and the reason catalogue (BR-MOD-01 to 04)."""

    name = "apps.trust"
    label = "trust"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Plug the hooks of the lower ``media`` app and the ``moderation.decided`` outbox handler."""
        from . import media_hooks, notify_hooks

        media_hooks.connect()
        notify_hooks.connect()
