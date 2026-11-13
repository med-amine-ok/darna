"""Django app configuration for ``apps.pricing``."""

from django.apps import AppConfig


class PricingConfig(AppConfig):
    """Server-side price quotes."""

    name = "apps.pricing"
    label = "pricing"
    default_auto_field = "django.db.models.BigAutoField"
