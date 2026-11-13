"""
``python manage.py seed_geo``: load the Algerian wilayas, dairas and communes.

The data comes from two JSON files bundled in ``apps/geo/data/`` (their
origin and licence are written in ``apps/geo/data/SOURCE.md``). The command
can be run as often as wanted: it updates existing rows and adds missing
ones, it never creates duplicates and never deletes anything (BR-SRC-02).
"""

import json
from datetime import date
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.geo.models import Commune, Daira, Wilaya

# Folder with wilayas.json and communes.json.
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
# Written in the ``source`` column of every row loaded by this command.
SOURCE_NAME = "el-amin-dev/algeria-wilayas-communes"
# Publication date of the law that created the 69-wilaya map (Loi 26-06).
VALID_FROM = date(2026, 4, 5)
# Wilayas 1 to 58 already existed in the old 58-wilaya system.
LAST_LEGACY_CODE = 58


def load_json(name: str) -> list[dict]:
    """Read one bundled data file (UTF-8) and return its list of rows."""
    with open(DATA_DIR / name, encoding="utf-8") as handle:
        return json.load(handle)


class Command(BaseCommand):
    """Load or refresh the geography reference tables from the bundled files."""

    help = "Load wilayas, dairas and communes from apps/geo/data (safe to run again)."

    @transaction.atomic
    def handle(self, *args, **options):
        """
        Load everything in one transaction and print the counts.

        A failure in the middle leaves the tables exactly as they were.
        """
        wilayas_created = self._seed_wilayas(load_json("wilayas.json"))
        dairas_created, communes_created = self._seed_communes(load_json("communes.json"))
        self.stdout.write(
            f"Wilayas: {Wilaya.objects.count()} ({wilayas_created} new). "
            f"Dairas: {Daira.objects.count()} ({dairas_created} new). "
            f"Communes: {Commune.objects.count()} ({communes_created} new)."
        )

    def _seed_wilayas(self, rows: list[dict]) -> int:
        """Create or update one ``Wilaya`` per row, keyed by its official code. Returns how many were new."""
        created_count = 0
        for row in rows:
            code = int(row["code"])
            _, created = Wilaya.objects.update_or_create(
                code=code,
                defaults={
                    "name_fr": row["name_fr"],
                    "name_ar": row["name_ar"],
                    "name_en": row["name_en"],
                    # The source does not say which old wilaya the 11 new ones (59 to 69)
                    # came from, so their legacy code stays empty instead of being guessed.
                    "legacy_code_58": code if code <= LAST_LEGACY_CODE else None,
                    "source": SOURCE_NAME,
                    "valid_from": VALID_FROM,
                },
            )
            created_count += created
        return created_count

    def _seed_communes(self, rows: list[dict]) -> tuple[int, int]:
        """
        Create or update dairas and communes. Returns ``(new dairas, new communes)``.

        The source has no commune code, so a commune is recognised by its
        wilaya and French name (this pair is unique in the dataset). A daira
        is recognised by its wilaya and French name too.
        """
        # Existing rows are read once into dictionaries: 1,541 lookups in memory
        # instead of 1,541 SELECT queries.
        dairas = {(d.wilaya_id, d.name_fr): d for d in Daira.objects.all()}
        communes = {(c.wilaya_id, c.name_fr): c for c in Commune.objects.all()}
        dairas_created = communes_created = 0

        for row in rows:
            wilaya_code = int(row["wilaya_code"])
            daira = None
            if row.get("daira_fr"):
                key = (wilaya_code, row["daira_fr"])
                daira = dairas.get(key)
                if daira is None:
                    daira = Daira.objects.create(
                        wilaya_id=wilaya_code, name_fr=row["daira_fr"], name_ar=row.get("daira_ar", "")
                    )
                    dairas[key] = daira
                    dairas_created += 1

            values = {
                "daira": daira,
                "name_ar": row.get("name_ar", ""),
                "name_en": row.get("name_en", ""),
                "postal_code": row.get("postal_code", ""),
                "source": SOURCE_NAME,
                "valid_from": VALID_FROM,
            }
            commune = communes.get((wilaya_code, row["name_fr"]))
            if commune is None:
                commune = Commune.objects.create(wilaya_id=wilaya_code, name_fr=row["name_fr"], **values)
                communes[(wilaya_code, row["name_fr"])] = commune
                communes_created += 1
            else:
                for name, value in values.items():
                    setattr(commune, name, value)
                commune.save(update_fields=list(values))
        return dairas_created, communes_created
