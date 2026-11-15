"""Django app configuration for ``apps.media``."""

from django.apps import AppConfig


class MediaConfig(AppConfig):
    """Uploads: upload slots, scanning, renditions and signed download URLs (BR-MED-01, BR-MED-02)."""

    name = "apps.media"
    label = "media"
    default_auto_field = "django.db.models.BigAutoField"
