"""
Email sending for the accounts app (verification links, password reset, staff invitations).

Like the SMS backends (:mod:`apps.accounts.sms`), this module only depends on
Django's email API: ``settings.EMAIL_BACKEND`` decides where mail goes. It is
the console in development (DEBUG), SMTP through your own mailbox in
production, ``locmem`` in tests, or whatever ``EMAIL_BACKEND`` is set to in
the environment (always honoured, also with DEBUG on).
"""

import logging

from django.conf import settings
from django.core.mail import get_connection, send_mail

logger = logging.getLogger("bladus.email")

def _backend() -> str:
    """Dotted path of the email backend in use (``settings.EMAIL_BACKEND``, chosen in settings.py)."""
    return settings.EMAIL_BACKEND


def send_email(to: str, subject: str, body: str) -> None:
    """Send one plain-text email. Raises when the backend fails, so callers can report it."""
    send_mail(subject, body, None, [to], fail_silently=False, connection=get_connection(_backend()))


def frontend_url(path: str) -> str:
    """
    Absolute website link for an emailed action (verification, reset, invitation).

    TODO(config): move to platform settings; reads ``settings.FRONTEND_URL`` when it exists.
    """
    base = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return f"{base}/{path.lstrip('/')}"
