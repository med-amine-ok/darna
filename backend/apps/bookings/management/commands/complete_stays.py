"""
``python manage.py complete_stays``: mark finished stays as completed (BR-BKG-05, DEC-010).

A confirmed booking completes at check-out time + 2 hours (Africa/Algiers).
Run it every 5 minutes. Today a cron entry (or any scheduler) calls it;
later Celery beat will call ``services.complete_finished_stays`` on the
same schedule. Safe to run as often as wanted.
"""

from django.core.management.base import BaseCommand

from apps.bookings.services import complete_finished_stays


class Command(BaseCommand):
    """Complete confirmed bookings whose check-out time + 2 hours has passed."""

    help = "Complete finished stays (BR-BKG-05). Run every 5 minutes."

    def handle(self, *args, **options) -> None:
        """Run the job once and print how many bookings completed."""
        count = complete_finished_stays()
        self.stdout.write(f"{count} booking(s) completed.")
