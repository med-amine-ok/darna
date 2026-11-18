"""
Additive read-only facts used by the website (2026-11-15 wiring): search card
facts and host card links.
"""

import pytest

from apps.catalog.tests import factories as f

pytestmark = pytest.mark.django_db


def test_search_card_has_filter_facts_and_host_links(api):
    """GET /listings rows carry capacity, amenities, policy code and the host card with its public links."""
    home = f.published_home(capacity_guests=5, bedrooms=2)
    body = api.get("/api/v1/listings").json()
    card = next(row for row in body["results"] if row["id"] == str(home.id))
    assert card["capacity_guests"] == 5
    assert card["bedrooms"] == 2
    assert isinstance(card["amenity_slugs"], list)
    assert card["cancellation_policy_code"] == "moderate"
    assert card["host_card"]["host_type"] == "individual"
    assert card["host_card"]["user_id"] == str(home.host_account.user_id)
    assert card["host_card"]["organization_slug"] is None
    # Still no private location on the public card (BR-SRC-03).
    assert "latitude" not in card and "address_line" not in card


def test_hotel_card_links_to_its_organisation(api):
    """An organisation host card gives the slug of its public page, and no user id."""
    hotel, _room = f.published_hotel()
    body = api.get(f"/api/v1/listings/{hotel.id}").json()
    org = hotel.host_account.organization
    assert body["host"]["organization_slug"] == org.slug
    assert body["host"]["organization_id"] == str(org.id)
    assert body["host"]["user_id"] is None


def test_search_by_host_user_and_trips_by_agency(api):
    """``host_user`` keeps the listings of one solo host; ``GET /trips?host_account=`` keeps one agency's trips."""
    from apps.trips.tests.test_trips import make_trip

    mine = f.published_home()
    f.published_home()
    rows = api.get("/api/v1/listings", {"host_user": str(mine.host_account.user_id)}).json()["results"]
    assert [row["id"] for row in rows] == [str(mine.id)]
    assert api.get("/api/v1/listings", {"host_user": "nope"}).status_code == 400

    trip = make_trip()
    make_trip()
    rows = api.get("/api/v1/trips", {"host_account": str(trip.host_account_id)}).json()["results"]
    assert [row["id"] for row in rows] == [str(trip.id)]
    assert api.get("/api/v1/trips", {"host_account": "nope"}).status_code == 400
