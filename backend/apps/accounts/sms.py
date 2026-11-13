"""
SMS sending behind a small interface.

The real provider (a local Algerian aggregator, with an international
fallback) is not chosen yet, so the code only depends on ``SmsBackend``.
``settings.SMS_BACKEND`` holds the dotted path of the class to use.
"""

import logging

from django.conf import settings
from django.utils.module_loading import import_string

logger = logging.getLogger("bladus.sms")


class SmsBackend:
    """Interface every SMS provider adapter must implement."""

    def send(self, phone_e164: str, text: str) -> None:
        """Send ``text`` to ``phone_e164``. Raise an exception if it fails."""
        raise NotImplementedError


class ConsoleSmsBackend(SmsBackend):
    """Development backend: writes the message to the log instead of sending it."""

    def send(self, phone_e164: str, text: str) -> None:
        """Log the SMS (visible in the runserver console)."""
        logger.warning("SMS to %s: %s", phone_e164, text)


class MemorySmsBackend(SmsBackend):
    """Test backend: keeps messages in ``MemorySmsBackend.outbox`` so tests can read the code."""

    outbox: list[tuple[str, str]] = []

    def send(self, phone_e164: str, text: str) -> None:
        """Store the message in memory."""
        self.outbox.append((phone_e164, text))


def get_sms_backend() -> SmsBackend:
    """Instantiate the backend named in settings."""
    return import_string(settings.SMS_BACKEND)()
