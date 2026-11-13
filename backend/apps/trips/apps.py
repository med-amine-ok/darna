"""Django app configuration for ``apps.trips``."""

from django.apps import AppConfig


class TripsConfig(AppConfig):
    """Agency trips, itineraries and dated departures."""

    name = "apps.trips"
    label = "trips"
    default_auto_field = "django.db.models.BigAutoField"
