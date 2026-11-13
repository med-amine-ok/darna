"""Django app configuration for ``apps.inventory``."""

from django.apps import AppConfig


class InventoryConfig(AppConfig):
    """Calendar and availability of listings and room types."""

    name = "apps.inventory"
    label = "inventory"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """
        Plug the inventory date filter into the catalog search.

        Catalog is a lower layer and may not import inventory, so inventory
        registers itself here (see ``catalog.selectors.register_date_filter``).
        """
        from apps.catalog.selectors import register_date_filter

        from .selectors import available_listing_ids

        register_date_filter(available_listing_ids)
