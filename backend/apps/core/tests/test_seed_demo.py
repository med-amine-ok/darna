"""``seed_demo`` builds a consistent demo world once (second run writes nothing)."""

import pytest
from django.core.management import call_command

from apps.accounts.models import User
from apps.bookings.models import Booking
from apps.catalog.models import Listing

pytestmark = pytest.mark.django_db(transaction=False)


def test_seed_demo_is_complete_and_idempotent(settings):
    """Counts are stable across two runs, every booking state exists and demo users can sign in."""
    settings.DEBUG = True
    call_command("seed_demo")
    counts = (User.objects.count(), Listing.objects.count(), Booking.objects.count())
    states = set(Booking.objects.values_list("status", flat=True))
    call_command("seed_demo")
    assert counts == (User.objects.count(), Listing.objects.count(), Booking.objects.count())
    assert {"pending", "confirmed", "completed", "cancelled"} <= states
    assert User.objects.get(email="yacine.traveler@bladus.dz").check_password("darna-demo-2026")
