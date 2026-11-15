"""Nightly job: compare every stored wallet balance with the sum of its ledger lines (review R11)."""

import sys

from django.core.management.base import BaseCommand

from apps.ledger.services import reconcile_balances


class Command(BaseCommand):
    """``python manage.py reconcile_balances [--fix]``: prints differences and exits 1 when there are any."""

    help = "Recompute wallet balances from ledger lines and report differences (use --fix after a human check)."

    def add_arguments(self, parser):
        """``--fix`` rewrites the stored balances to the computed values."""
        parser.add_argument("--fix", action="store_true", help="Rewrite stored balances (audited).")

    def handle(self, *args, **options):
        """Run the check; a non-zero exit code makes the scheduler raise an alert."""
        differences = reconcile_balances(fix=options["fix"])
        for diff in differences:
            self.stdout.write(f"{diff['account']}: stored {diff['stored_minor']} computed {diff['computed_minor']}")
        if not differences:
            self.stdout.write("All balances match.")
            return
        if not options["fix"]:
            sys.exit(1)
