"""Django app configuration for ``apps.catalog``."""

from django.apps import AppConfig


class CatalogConfig(AppConfig):
    """Listings, room types and the shared lists they use."""

    name = "apps.catalog"
    label = "catalog"
    default_auto_field = "django.db.models.BigAutoField"
