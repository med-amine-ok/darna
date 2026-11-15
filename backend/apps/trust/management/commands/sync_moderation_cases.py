"""``manage.py sync_moderation_cases``: open, refresh and close moderation cases (every 15 minutes, BR-MOD-01)."""

from django.core.management.base import BaseCommand

from apps.trust.services import sync_cases


class Command(BaseCommand):
    """Run :func:`apps.trust.services.sync_cases` (the ``trust.refresh_queue_priority`` job)."""

    help = "Open cases for pending items, raise priorities of cases waiting too long, close decided ones."

    def handle(self, *args, **options):
        """Sync once and print the counters."""
        result = sync_cases()
        self.stdout.write(f"opened={result['opened']} closed={result['closed']} open={result['open']}")
