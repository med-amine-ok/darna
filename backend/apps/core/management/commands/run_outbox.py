"""Worker step: deliver due outbox messages (review R14). Run every minute."""

from django.core.management.base import BaseCommand

from apps.core.outbox import run_due


class Command(BaseCommand):
    """``python manage.py run_outbox``: one pass over the due messages."""

    help = "Deliver due outbox messages with retry and backoff."

    def handle(self, *args, **options):
        """Deliver and print how many were sent and how many failed."""
        sent, failed = run_due()
        self.stdout.write(f"sent {sent}, failed {failed}")
