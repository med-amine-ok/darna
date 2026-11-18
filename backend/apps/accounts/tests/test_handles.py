"""Public profile handles (ACC-06): every user has a shareable /users/<handle> link."""

import pytest

from apps.accounts.handles import base_for, is_valid, unique_handle
from conftest import make_user

pytestmark = pytest.mark.django_db


def test_handle_made_from_display_name_and_unique():
    """New users get first-name-initial handles; a clash adds a number."""
    first = make_user(email="k1@example.dz", first_name_latin="Karim", last_name_latin="Mansouri")
    second = make_user(email="k2@example.dz", first_name_latin="Karim", last_name_latin="Mebarki")
    assert first.handle == "karim-m"
    assert second.handle == "karim-m-2"


def test_handle_shape_rules():
    """Reserved words, short names and odd characters never become handles."""
    assert not is_valid("admin") and not is_valid("ab") and not is_valid("-abc") and not is_valid("a--b")
    assert is_valid("leila-h")
    assert base_for("") == "user" and base_for("Élise B.") == "elise-b"
    assert unique_handle("Admin", taken=lambda h: False) == "user-2"  # never an official-looking handle


def test_public_profile_by_handle_and_by_id(api):
    """GET /users/{handle} and /users/{id} answer the same profile; the handle is in it."""
    user = make_user(email="leila@example.dz", first_name_latin="Leila", last_name_latin="Hadj")
    by_handle = api.get(f"/api/v1/users/{user.handle}")
    by_id = api.get(f"/api/v1/users/{user.id}")
    assert by_handle.status_code == 200 and by_id.status_code == 200
    assert by_handle.data["id"] == str(user.id) and by_handle.data["handle"] == "leila-h"
    assert api.get("/api/v1/users/LEILA-H").status_code == 200
    assert api.get("/api/v1/users/nobody-here").status_code == 404
    assert api.get(f"/api/v1/users/{user.handle}/reviews").status_code == 200


def test_change_handle(user_client, user):
    """PATCH /me changes the handle; taken, reserved or malformed ones are refused."""
    other = make_user(email="taken@example.dz", first_name_latin="Taken", last_name_latin="X")
    assert user_client.patch("/api/v1/me", {"handle": "My-Travels"}, format="json").status_code == 200
    user.refresh_from_db()
    assert user.handle == "my-travels"
    assert user_client.patch("/api/v1/me", {"handle": other.handle}, format="json").status_code == 409
    assert user_client.patch("/api/v1/me", {"handle": "admin"}, format="json").status_code in (400, 422)
    assert user_client.patch("/api/v1/me", {"handle": "a b"}, format="json").status_code in (400, 422)


def test_hidden_accounts_not_found_by_handle(api):
    """Suspended accounts answer 404 by handle too, so handles cannot be probed."""
    user = make_user(email="sus@example.dz", first_name_latin="Sami", last_name_latin="K", status="suspended")
    assert api.get(f"/api/v1/users/{user.handle}").status_code == 404
