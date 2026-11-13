"""Django app configuration for ``apps.ledger``."""

from django.apps import AppConfig


class LedgerConfig(AppConfig):
    """Host deposit wallet, commission and money ledger."""

    name = "apps.ledger"
    label = "ledger"
    default_auto_field = "django.db.models.BigAutoField"
