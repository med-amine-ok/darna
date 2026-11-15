"""Fixtures of the reviews tests: a completed stay whose arrival was confirmed (BR-BKG-09)."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.bookings import services as booking_services
from apps.bookings.models import BookingStatus
from apps.catalog.tests import factories as f
from apps.core.money import dzd
from apps.pricing import services as pricing
from conftest import client_for


def make_booking(guest, listing=None, *, start: int = 10, end: int = 13):
    """A confirmed villa booking of ``guest`` (instant mode) for ``[future(start), future(end))``."""
    listing = listing or f.published_home(None, title="Villa Tipaza", base_price_minor=dzd(18_500),
                                          cleaning_fee_minor=dzd(4_000), approval_mode="instant")
    quote = pricing.build_quote(listing_id=listing.id, check_in=f.future(start), check_out=f.future(end), guests=2)
    return booking_services.create_booking(guest=guest, quote_id=quote.id)


def finish_stay(booking, *, confirmed: bool = True, days_ago: int = 1):
    """Move a booking to ``completed`` with check-out ``days_ago`` days ago; stay confirmed unless told otherwise."""
    nights = (booking.check_out - booking.check_in).days
    booking.check_out = timezone.localdate() - timedelta(days=days_ago)
    booking.check_in = booking.check_out - timedelta(days=nights)
    booking.status = BookingStatus.COMPLETED
    booking.completed_at = timezone.now()
    booking.stay_confirmed_at = timezone.now() if confirmed else None
    booking.stay_confirmed_via = "guest" if confirmed else ""
    booking.save()
    return booking


def host_client_for(booking):
    """API client of the solo host of the booking, in that workspace."""
    account = booking.host_account
    return client_for(account.user, account)


@pytest.fixture
def stay(user):
    """A completed, confirmed stay of the default guest."""
    return finish_stay(make_booking(user))
