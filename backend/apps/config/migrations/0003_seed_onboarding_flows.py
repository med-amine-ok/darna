"""
Seed version 1 of the four onboarding flows (BR-HST-01, DEC-007).

The steps come from ``apps/config/fixtures/onboarding_flows_v1.json``, a copy
of the wizard the website used before the flows moved to the server
(individual 12 steps, agency 5, hotel 7, hostel 7; every flow asks the
booking approval mode). Each is created as the published version 1, so the
become-a-host wizard works on a fresh database. Rows that already exist are
left alone, which makes the migration safe to run twice.
"""

import json
from pathlib import Path

from django.db import migrations
from django.utils import timezone

FIXTURE = Path(__file__).resolve().parent.parent / "fixtures" / "onboarding_flows_v1.json"


def seed(apps, schema_editor):
    """Create the published version 1 of each host type that has no flow yet."""
    OnboardingFlowVersion = apps.get_model("config", "OnboardingFlowVersion")
    flows = json.loads(FIXTURE.read_text(encoding="utf-8"))
    now = timezone.now()
    for host_type, schema in flows.items():
        if OnboardingFlowVersion.objects.filter(host_type=host_type).exists():
            continue
        OnboardingFlowVersion.objects.create(
            host_type=host_type, version=1, status="published", schema=schema,
            published_at=now, created_at=now, updated_at=now,
        )


def unseed(apps, schema_editor):
    """Remove the seeded version 1 rows that were never replaced."""
    OnboardingFlowVersion = apps.get_model("config", "OnboardingFlowVersion")
    OnboardingFlowVersion.objects.filter(version=1, published_by__isnull=True).delete()


class Migration(migrations.Migration):
    """Data migration: published onboarding flows, version 1."""

    dependencies = [("config", "0002_onboarding_flow_version")]

    operations = [migrations.RunPython(seed, unseed)]
