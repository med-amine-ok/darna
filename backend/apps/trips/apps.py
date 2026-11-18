"""Django app configuration for ``apps.trips``."""

from django.apps import AppConfig


class TripsConfig(AppConfig):
    """Agency trips, itineraries and dated departures."""

    name = "apps.trips"
    label = "trips"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Register the favourite hooks with accounts (ACC-09)."""
        from . import favorites

        favorites.connect()
