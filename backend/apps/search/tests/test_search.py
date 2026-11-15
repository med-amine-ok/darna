"""Tests of the search app: facet counts and map pins (BR-SRC-01, BR-SRC-03, BR-SRC-04)."""

import pytest

from apps.catalog.models import Listing
from apps.catalog.tests import factories as f
from apps.inventory.services import set_days_blocked
from apps.search import selectors

pytestmark = pytest.mark.django_db


def _bucket(body, facet, value):
    """Count of one facet value, 0 when absent."""
    return next((b["count"] for b in body["facets"][facet] if b["value"] == value), 0)


def test_br_src_01_facet_ignores_its_own_filter(api):
    """With vertical=home the total is 2, but the vertical facet still counts the vehicle and the hotel."""
    host, _ = f.approved_individual_host()
    f.published_home(host)
    f.published_home(host, approval_mode="instant")
    f.listing(host, "vehicle", status="published")
    f.published_hotel()
    body = api.get("/api/v1/listings/facets?vertical=home").json()
    assert body["total"] == 2
    assert _bucket(body, "vertical", "home") == 2
    assert _bucket(body, "vertical", "vehicle") == 1
    # BR-SRC-04: hotel is its own vertical.
    assert _bucket(body, "vertical", "hotel") == 1
    assert _bucket(body, "host_type", "individual") == 2
    assert _bucket(body, "instant", "true") == 1
    assert body["price_histogram"]


def test_br_src_01_facets_hide_non_public_listings(api):
    """Drafts and listings of unapproved hosts are not counted."""
    f.published_home()
    f.listing(f.approved_individual_host()[0], "home")
    f.published_home(f.individual_host(approved=False)[0])
    assert api.get("/api/v1/listings/facets").json()["total"] == 1


def test_facets_use_the_same_dates_and_text_as_search(api):
    """Dates and free text filter the facets exactly like GET /listings."""
    free = f.published_home(title="Villa Tipaza")
    busy = f.published_home(title="Villa Tipaza bis")
    set_days_blocked(busy, [f.future(11)], True)
    query = f"q=tipaza&check_in={f.future(10).isoformat()}&check_out={f.future(13).isoformat()}"
    search = api.get(f"/api/v1/listings?{query}").json()
    facets = api.get(f"/api/v1/listings/facets?{query}").json()
    assert search["count"] == facets["total"] == 1
    pins = api.get(f"/api/v1/listings/map?{query}").json()["pins"]
    assert [p["id"] for p in pins] == [str(free.id)]


def test_br_src_03_map_pins_use_public_point(api):
    """Pins carry the public point, never the exact one, with price and title."""
    listing = f.published_home()
    body = api.get("/api/v1/listings/map").json()
    assert body["truncated"] is False
    pin = body["pins"][0]
    assert pin["location_public"] == {"lat": float(listing.public_latitude), "lng": float(listing.public_longitude)}
    assert pin["price_from"] == {"amount_minor": listing.base_price_minor, "currency": "DZD"}
    assert "12 rue" not in str(body)


def test_map_is_limited(api, monkeypatch):
    """Beyond the pin limit the answer is cut and says so."""
    monkeypatch.setattr(selectors, "MAP_PIN_LIMIT", 2)
    host, _ = f.approved_individual_host()
    for _ in range(3):
        f.published_home(host)
    body = api.get("/api/v1/listings/map").json()
    assert len(body["pins"]) == 2 and body["truncated"] is True


def test_search_parameters_are_validated(api):
    """Bad values answer 400 on the three endpoints; facets and map do not hit the listing page route."""
    for path in ("/api/v1/listings", "/api/v1/listings/facets", "/api/v1/listings/map"):
        assert api.get(f"{path}?wilaya=99").status_code == 400
        assert api.get(f"{path}?check_in={f.future(1)}&check_out={f.future(120)}").status_code == 400
    assert Listing.objects.count() == 0
