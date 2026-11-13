"""Tests of the quote service and endpoint (BR-PRC-01 to BR-PRC-03, DEC-002)."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.catalog.tests import factories as f
from apps.core.errors import ConflictError, DomainError
from apps.core.money import dzd
from apps.inventory import services as inventory
from apps.pricing import services
from apps.pricing.models import Quote

pytestmark = pytest.mark.django_db


def villa(**fields):
    """The Tipaza villa of example 8a: 18,500 DZD a night, 4,000 DZD cleaning, instant."""
    data = {"title": "Villa Tipaza", "base_price_minor": dzd(18_500), "cleaning_fee_minor": dzd(4_000),
            "approval_mode": "instant", **fields}
    return f.published_home(**data)


def test_br_prc_01_villa_quote_example(api):
    """3 nights x 18,500 + 4,000 cleaning = 59,500 DZD; no BLADUS fee (BR-PRC-02); commission base 55,500 (DEC-002)."""
    listing = villa()
    response = api.post("/api/v1/quotes", {"listing_id": str(listing.id), "check_in": f.future(10).isoformat(),
                                           "check_out": f.future(13).isoformat(), "guests_adults": 2}, format="json")
    assert response.status_code == 201, response.data
    body = response.data
    assert body["subtotal"] == {"amount_minor": dzd(55_500), "currency": "DZD"}
    assert body["cleaning_fee"]["amount_minor"] == dzd(4_000)
    assert body["total"]["amount_minor"] == dzd(59_500)
    assert body["platform_fee"]["amount_minor"] == 0
    assert [line["kind"] for line in body["lines"]] == ["night", "night", "night", "cleaning_fee"]
    assert body["approval_mode"] == "instant"
    quote = Quote.objects.get(id=body["id"])
    assert quote.commission_base_minor == dzd(55_500)
    assert quote.guest is None  # anonymous visitor
    assert timedelta(minutes=29) < quote.expires_at - timezone.now() <= timedelta(minutes=30)


def test_br_prc_01_day_override_price_is_used():
    """A special price on one night replaces the base price of that night only."""
    listing = villa(cleaning_fee_minor=0)
    inventory.set_day_prices(listing, [f.future(11)], dzd(20_000))
    quote = services.build_quote(listing_id=listing.id, check_in=f.future(10), check_out=f.future(12), guests=2)
    assert quote.subtotal_minor == dzd(18_500) + dzd(20_000)


def test_br_prc_03_weekly_discount_on_seven_nights():
    """7 nights get the weekly discount only (10 % of the subtotal), applied before commission."""
    listing = villa(cleaning_fee_minor=0, weekly_discount_bp=1000, monthly_discount_bp=2000)
    quote = services.build_quote(listing_id=listing.id, check_in=f.future(10), check_out=f.future(17), guests=2)
    assert quote.subtotal_minor == 7 * dzd(18_500)
    assert quote.discount_minor == 7 * dzd(18_500) // 10
    assert quote.commission_base_minor == quote.subtotal_minor - quote.discount_minor
    assert quote.total_minor == quote.commission_base_minor
    assert any(line["kind"] == "discount" for line in quote.lines)


def test_br_prc_03_thirty_nights_use_monthly_only():
    """30 nights: only the larger (monthly) discount applies, they are never added."""
    listing = villa(cleaning_fee_minor=0, weekly_discount_bp=1000, monthly_discount_bp=2000)
    quote = services.build_quote(listing_id=listing.id, check_in=f.future(10), check_out=f.future(40), guests=2)
    assert quote.discount_minor == 30 * dzd(18_500) * 20 // 100


def test_br_avl_05_window_problem_is_the_error_code():
    """A stay shorter than min nights is refused with code ``min_nights`` (422)."""
    listing = villa(min_nights=3)
    with pytest.raises(DomainError) as exc:
        services.build_quote(listing_id=listing.id, check_in=f.future(10), check_out=f.future(11), guests=2)
    assert exc.value.code == "min_nights"
    assert exc.value.status == 422


def test_capacity_exceeded_refused():
    """More guests than the listing capacity: ``capacity_exceeded``."""
    listing = villa()
    with pytest.raises(DomainError) as exc:
        services.build_quote(listing_id=listing.id, check_in=f.future(10), check_out=f.future(12), guests=9)
    assert exc.value.code == "capacity_exceeded"


def test_br_avl_04_blocked_day_refused():
    """A night closed by the host cannot be quoted (409 ``dates_unavailable``)."""
    listing = villa()
    inventory.set_days_blocked(listing, [f.future(11)], True)
    with pytest.raises(ConflictError) as exc:
        services.build_quote(listing_id=listing.id, check_in=f.future(10), check_out=f.future(12), guests=2)
    assert exc.value.code == "dates_unavailable"


def test_br_avl_03_room_pool_price_times_units_and_capacity():
    """Two hotel rooms for two nights cost 4 x the room price; 5 guests do not fit in 2 double rooms."""
    hotel, room = f.published_hotel(units=3, price_minor=dzd(9_000))
    quote = services.build_quote(listing_id=hotel.id, room_type_id=room.id, check_in=f.future(10),
                                 check_out=f.future(12), guests=4, units=2)
    assert quote.subtotal_minor == 4 * dzd(9_000)
    assert quote.units == 2
    with pytest.raises(DomainError) as exc:
        services.build_quote(listing_id=hotel.id, room_type_id=room.id, check_in=f.future(10),
                             check_out=f.future(12), guests=5, units=2)
    assert exc.value.code == "capacity_exceeded"


def test_unpublished_listing_cannot_be_quoted(api):
    """Only public listings are priced (BR-SRC-01): a draft answers 404."""
    host, _ = f.approved_individual_host()
    draft = f.listing(host, "home")
    response = api.post("/api/v1/quotes", {"listing_id": str(draft.id), "check_in": f.future(10).isoformat(),
                                           "check_out": f.future(12).isoformat(), "guests": 2}, format="json")
    assert response.status_code == 404
