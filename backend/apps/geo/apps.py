"""Django app configuration for ``apps.geo``."""

from django.apps import AppConfig


class GeoConfig(AppConfig):
    """Algerian geography: wilayas, dairas and communes."""

    name = "apps.geo"
    label = "geo"
    default_auto_field = "django.db.models.BigAutoField"
