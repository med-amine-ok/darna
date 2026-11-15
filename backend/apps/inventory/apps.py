"""Django app configuration for ``apps.inventory``."""

from django.apps import AppConfig


class InventoryConfig(AppConfig):
    """Calendar and availability of listings and room types."""

    name = "apps.inventory"
    label = "inventory"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """
        Plug the inventory date filter and the room type resize check into
        the catalog, and the hotel push handler into the outbox.

        Catalog is a lower layer and may not import inventory, so inventory
        registers itself here (see ``catalog.selectors.register_date_filter``).
        """
        from apps.catalog.selectors import register_date_filter
        from apps.catalog.services import register_room_units_resizer
        from apps.core.outbox import register_handler

        from .selectors import available_listing_ids
        from .services import push_handler, resize_room_type

        register_date_filter(available_listing_ids)
        # BR-AVL-02: a room type cannot shrink below the units sold on future nights.
        register_room_units_resizer(resize_room_type)
        # Review R3: deliver "inventory.push" outbox messages to hotel systems.
        register_handler("inventory.push", push_handler)
