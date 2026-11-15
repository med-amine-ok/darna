"""Django app configuration for ``apps.search``."""

from django.apps import AppConfig


class SearchConfig(AppConfig):
    """Search read model: facets and map pins for the listing search (BR-SRC-01, 03, 04)."""

    name = "apps.search"
    label = "search"
    default_auto_field = "django.db.models.BigAutoField"
