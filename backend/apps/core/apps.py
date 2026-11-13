"""Django app configuration for ``apps.core``."""

from django.apps import AppConfig


class CoreConfig(AppConfig):
    """Shared building blocks: ids, money, errors, base models."""

    name = "apps.core"
    label = "core"
    default_auto_field = "django.db.models.BigAutoField"
