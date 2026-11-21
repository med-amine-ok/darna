"""
``python manage.py send_test_email you@example.com``: check that the server can send email.

Run it in the Render Shell after setting the email variables. It prints the
backend and sender in use, then either "sent" or the exact error (for example
a wrong password, a refused sender address, or an SMTP port that does not
answer). Exit code 1 on failure.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.mailer import _backend, send_email


class Command(BaseCommand):
    """Send one test email and show why it failed, if it did."""

    help = "Send a test email to check the email provider settings."

    def add_arguments(self, parser):
        """The recipient address."""
        parser.add_argument("to", help="Address that receives the test email.")

    def handle(self, *args, **options):
        """Print the settings in use, send, and report the outcome."""
        self.stdout.write(f"Backend: {_backend()}")
        self.stdout.write(f"Sender:  {settings.DEFAULT_FROM_EMAIL}")
        try:
            send_email(options["to"], "BLADUS test email", "This is a test email from the BLADUS backend.")
        except Exception as exc:  # show any provider or network error as is
            raise CommandError(f"Not sent: {type(exc).__name__}: {exc}") from exc
        self.stdout.write(self.style.SUCCESS(f"Sent to {options['to']}. Check the inbox (and spam)."))
