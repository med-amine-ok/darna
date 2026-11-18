"""Django app configuration for ``apps.hosts``."""

from django.apps import AppConfig


class HostsConfig(AppConfig):
    """Host accounts, organisations, team members and verification."""

    name = "apps.hosts"
    label = "hosts"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Register the admin users hooks (is_host filter and host facts) with accounts."""
        from . import admin_hooks

        admin_hooks.connect()
