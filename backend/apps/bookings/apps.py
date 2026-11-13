"""Django app configuration for ``apps.bookings``."""

from django.apps import AppConfig


class BookingsConfig(AppConfig):
    """Bookings, their status changes and cancellations."""

    name = "apps.bookings"
    label = "bookings"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """
        Tell the inventory app which nights of a home are booked (BR-AVL-01).

        Inventory is a lower layer and may not import bookings, so bookings
        registers its provider here (see
        ``inventory.selectors.register_booked_ranges_provider``). The public
        search, the availability calendar and pricing then see booked nights.
        """
        from apps.inventory.selectors import register_booked_ranges_provider

        from .selectors import booked_ranges_for

        register_booked_ranges_provider(booked_ranges_for)
