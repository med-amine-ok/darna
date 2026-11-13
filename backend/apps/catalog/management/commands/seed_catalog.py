"""
``python manage.py seed_catalog``: create the catalog reference rows.

Creates the three cancellation policies (BR-CAN-01), a starter list of
amenities, property types and categories per vertical (BR-LST-04). The data
lives in ``apps/catalog/seed_data.py``. Idempotent: running it again creates
nothing new. This replaces a data migration (the project does not ship
data migrations for reference rows).
"""

from django.core.management.base import BaseCommand

from apps.catalog.services import seed_reference_data


class Command(BaseCommand):
    """Seed the catalog reference tables without duplicating rows."""

    help = "Create cancellation policies, amenities, property types and categories (idempotent)."

    def handle(self, *args, **options):
        """Run the seed and print how many rows were created per table."""
        created = seed_reference_data()
        for table, count in created.items():
            self.stdout.write(f"{table}: {count} created")
        self.stdout.write(self.style.SUCCESS("Catalog reference data is ready."))
