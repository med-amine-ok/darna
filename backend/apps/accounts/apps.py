"""Django app configuration for ``apps.accounts``."""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Users, sign-up, sign-in, one-time codes and admin staff."""

    name = "apps.accounts"
    label = "accounts"
    default_auto_field = "django.db.models.BigAutoField"
