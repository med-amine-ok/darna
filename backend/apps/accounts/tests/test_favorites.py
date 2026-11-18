"""Tests of favourites (ACC-09) and of the hooks that let catalog and trips check and show them."""

import uuid

import pytest

from apps.accounts import extensions
from apps.accounts.extensions import FavoriteTargetHooks

pytestmark = pytest.mark.django_db


def test_add_list_remove_favourites_idempotently(user_client):
    """PUT twice and DELETE twice answer 204; the list shows one row with the listing card."""
    from apps.catalog.tests.factories import published_home, reference_data

    reference_data()
    target = published_home().id
    url = f"/api/v1/me/favorites/listing/{target}"
    assert user_client.put(url).status_code == 204
    assert user_client.put(url).status_code == 204
    res = user_client.get("/api/v1/me/favorites")
    assert res.status_code == 200 and len(res.data["results"]) == 1 and res.data["has_more"] is False
    row = res.data["results"][0]
    assert row["target_type"] == "listing" and row["target_id"] == str(target) and row["is_available"] is True
    assert user_client.delete(url).status_code == 204
    assert user_client.delete(url).status_code == 204
    assert user_client.get("/api/v1/me/favorites").data["results"] == []


def test_favourites_cursor_pages_and_filter(user_client):
    """limit and cursor walk the list newest first; target_type filters."""
    from apps.catalog.tests.factories import approved_agency, published_home, reference_data
    from apps.trips.tests.test_trips import make_trip

    reference_data()
    agency, _owner = approved_agency()
    for index in range(3):
        assert user_client.put(f"/api/v1/me/favorites/trip/{make_trip(agency, title=f'Trip {index}').id}").status_code == 204
    assert user_client.put(f"/api/v1/me/favorites/listing/{published_home().id}").status_code == 204
    first = user_client.get("/api/v1/me/favorites", {"target_type": "trip", "limit": 2})
    assert len(first.data["results"]) == 2 and first.data["has_more"] is True
    second = user_client.get("/api/v1/me/favorites", {"target_type": "trip", "limit": 2, "cursor": first.data["next_cursor"]})
    assert len(second.data["results"]) == 1 and second.data["next_cursor"] is None
    seen = {row["target_id"] for row in first.data["results"] + second.data["results"]}
    assert len(seen) == 3


def test_unknown_listing_or_trip_is_404(user_client):
    """With the catalog and trips hooks registered, an id that is no listing or trip cannot be saved."""
    assert user_client.put(f"/api/v1/me/favorites/listing/{uuid.uuid4()}").status_code == 404
    assert user_client.put(f"/api/v1/me/favorites/trip/{uuid.uuid4()}").status_code == 404


def test_unknown_target_type_is_refused(user_client):
    """Only listing and trip can be favourited."""
    assert user_client.put(f"/api/v1/me/favorites/hotel/{uuid.uuid4()}").status_code == 400


def test_registered_hook_checks_existence_and_gives_cards(user_client, monkeypatch):
    """With the catalog hook, a missing listing is 404 and the list shows the card."""
    known = uuid.uuid4()
    hooks = FavoriteTargetHooks(
        exists=lambda target_id: target_id == known,
        cards=lambda ids, request: {known: ({"id": str(known), "title": "Dar"}, False)},
    )
    monkeypatch.setitem(extensions._favorite_targets, "listing", hooks)
    assert user_client.put(f"/api/v1/me/favorites/listing/{uuid.uuid4()}").status_code == 404
    assert user_client.put(f"/api/v1/me/favorites/listing/{known}").status_code == 204
    row = user_client.get("/api/v1/me/favorites").data["results"][0]
    assert row["listing"]["title"] == "Dar" and row["is_available"] is False and row["trip"] is None


def test_favourites_need_sign_in(api):
    """Anonymous callers get 401."""
    assert api.get("/api/v1/me/favorites").status_code == 401
