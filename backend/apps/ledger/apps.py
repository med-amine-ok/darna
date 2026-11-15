"""Django app configuration for ``apps.ledger``."""

from django.apps import AppConfig


class LedgerConfig(AppConfig):
    """Host deposit wallet, commission and money ledger."""

    name = "apps.ledger"
    label = "ledger"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """
        Register the outbox handler that applies verified gateway events once (BR-SYS-02).

        The webhook view only stores and verifies the event; the worker
        (``run_outbox``) calls :func:`apps.ledger.services.process_gateway_event`.
        """
        from apps.core.outbox import register_handler

        from .services import GATEWAY_EVENT_TOPIC, process_gateway_event

        register_handler(GATEWAY_EVENT_TOPIC, process_gateway_event)
