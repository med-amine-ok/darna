"""``python manage.py publish_reviews``: hourly double-blind publication and rating refresh (BR-REV-02, BR-REV-04)."""

from django.core.management.base import BaseCommand

from apps.reviews import services


class Command(BaseCommand):
    """Publish reviews whose 14-day window ended; with ``--recompute``, rebuild every rating cache (nightly)."""

    help = "Publish double-blind reviews whose window ended (hourly); --recompute rebuilds rating caches (nightly)."

    def add_arguments(self, parser):
        """``--recompute``: also run the full rating pass (BR-REV-04)."""
        parser.add_argument("--recompute", action="store_true", help="Rebuild every rating cache.")

    def handle(self, *args, **options):
        """Run the job(s) and print what changed."""
        published = services.publish_due_reviews()
        self.stdout.write(f"Published {published} review(s).")
        if options["recompute"]:
            touched = services.recompute_all_ratings()
            self.stdout.write(f"Recomputed {touched} rating cache(s).")
