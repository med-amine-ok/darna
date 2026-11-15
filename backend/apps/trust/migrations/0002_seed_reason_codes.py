"""Seed the reason catalogue (MOD-03, 05-database-schema seed step 6); idempotent."""

from django.db import migrations


def seed(apps, schema_editor):
    """Create or update every reason of ``apps.trust.reason_data.REASONS`` (static data, no app code)."""
    from apps.trust.reason_data import seed as seed_reasons

    seed_reasons(apps.get_model("trust", "ReasonCode"))


class Migration(migrations.Migration):
    """Data migration: reason catalogue in English, French and Arabic."""

    dependencies = [("trust", "0001_initial")]

    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
