"""Django app configuration for ``apps.reviews``."""

from django.apps import AppConfig


class ReviewsConfig(AppConfig):
    """Reviews of stays and guests, host replies, reports and rating caches (BR-REV-01 to 04)."""

    name = "apps.reviews"
    label = "reviews"
    default_auto_field = "django.db.models.BigAutoField"
