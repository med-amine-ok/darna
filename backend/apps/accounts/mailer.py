"""
Email sending for the accounts app (verification links, password reset, staff invitations).

No email provider is chosen yet. Like the SMS backends (:mod:`apps.accounts.sms`),
this module only depends on Django's email API: ``settings.EMAIL_BACKEND``
decides where mail goes (``locmem`` in tests). When the project still has
Django's default SMTP backend and ``DEBUG`` is on, mail is written to the
console instead, so development never needs an SMTP server.
"""

import logging

from django.conf import settings
from django.core.mail import get_connection, send_mail

logger = logging.getLogger("bladus.email")

DJANGO_DEFAULT_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
CONSOLE_BACKEND = "django.core.mail.backends.console.EmailBackend"


def _backend() -> str:
    """Dotted path of the email backend to use (console in development without a provider)."""
    backend = getattr(settings, "EMAIL_BACKEND", DJANGO_DEFAULT_BACKEND)
    if backend == DJANGO_DEFAULT_BACKEND and settings.DEBUG:
        return CONSOLE_BACKEND
    return backend


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
