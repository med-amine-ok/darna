"""Django app configuration for ``apps.audit``."""

from django.apps import AppConfig


class AuditConfig(AppConfig):
    """Append-only log of who did what."""

    name = "apps.audit"
    label = "audit"
    default_auto_field = "django.db.models.BigAutoField"
