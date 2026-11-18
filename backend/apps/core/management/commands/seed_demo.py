"""
``python manage.py seed_demo``: fill the backend with the BLADUS demo world.

Thin entry point around :class:`apps.core.demo.seeder.DemoSeeder` (users,
hosts, organisations, listings, trips, bookings in every state, reviews,
messages, top-ups), built through the backend's own services. Safe to run
twice: a finished seed is detected and nothing is written again.

Every demo account shares one password (DEMO_PASSWORD, the same value as the
website's former demo data); it is never printed. Development and staging
only: the command refuses to run when DJANGO_DEBUG is False unless --force.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.core.demo.seeder import DemoSeeder

# Shared password of every demo account (test data only, never a real account).
DEMO_PASSWORD = "darna-demo-2026"


class Command(BaseCommand):
    """Build the demo world once; later runs change nothing."""

    help = "Fill the database with the BLADUS demo world (idempotent)."

    def add_arguments(self, parser):
        """``--force`` allows a run with DEBUG off (a staging database, never production)."""
        parser.add_argument("--force", action="store_true", help="Run even when DJANGO_DEBUG is False (staging only).")

    def handle(self, *args, **options):
        """Run the seeder and print what was created, per kind."""
        if not settings.DEBUG and not options["force"]:
            raise CommandError("seed_demo creates test accounts: refused with DJANGO_DEBUG=False (use --force on staging).")
        seeder = DemoSeeder(password=DEMO_PASSWORD, log=lambda text: self.stdout.write(text))
        if seeder.already_seeded():
            self.stdout.write(self.style.SUCCESS("The demo world is already there; nothing to do."))
            return
        counts = seeder.run()
        for kind, number in sorted(counts.items()):
            self.stdout.write(f"  {kind}: {number}")
        self.stdout.write(self.style.SUCCESS("Demo world ready."))
