"""Django app configuration for ``apps.hosts``."""

from django.apps import AppConfig


class HostsConfig(AppConfig):
    """Host accounts, organisations, team members and verification."""

    name = "apps.hosts"
    label = "hosts"
    default_auto_field = "django.db.models.BigAutoField"
