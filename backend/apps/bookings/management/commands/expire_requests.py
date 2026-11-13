"""
``python manage.py expire_requests``: expire booking requests the host did not answer in time (BR-BKG-04, DEC-008).

Run it every 5 minutes. Today a cron entry (or any scheduler) calls it;
later Celery beat will call ``services.expire_pending_requests`` on the
same schedule. Safe to run as often as wanted: a booking expires only once.
"""

from django.core.management.base import BaseCommand

from apps.bookings.services import expire_pending_requests


class Command(BaseCommand):
    """Expire pending requests whose deadline has passed and free their dates or seats."""

    help = "Expire booking requests past their deadline (BR-BKG-04). Run every 5 minutes."

    def handle(self, *args, **options) -> None:
        """Run the job once and print how many bookings expired."""
        count = expire_pending_requests()
        self.stdout.write(f"{count} request(s) expired.")
