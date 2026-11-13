"""Django app configuration for ``apps.config``."""

from django.apps import AppConfig


class ConfigConfig(AppConfig):
    """Platform settings kept in the database (commission rates, switches)."""

    name = "apps.config"
    label = "config"
    default_auto_field = "django.db.models.BigAutoField"
