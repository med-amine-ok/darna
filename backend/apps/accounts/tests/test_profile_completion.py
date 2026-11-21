"""'Complete your profile' after sign-up (ACC-11): required steps, adult birthday, completion stamp."""

from datetime import date

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.core.timeutils import business_today

pytestmark = pytest.mark.django_db


def signed_up_client():
    """A brand new account as the website creates it (email and password only)."""
    from conftest import signup_and_confirm

    api = APIClient()
    signup_and_confirm(api, {"email": "new@bladus.dz", "password": "Str0ng-pass-123",
                             "first_name": "Nour", "accept_terms_version": "2026-11"})
    return api


def years_ago(years: int, extra_days: int = 0) -> str:
    """An ISO date ``years`` years before today (plus or minus days)."""
    today = business_today()
    return date(today.year - years, today.month, min(today.day, 28)).isoformat()


def test_acc_11_new_account_lists_missing_steps():
    """A fresh sign-up still needs a verified phone and a birthday; the name came with sign-up."""
    me = signed_up_client().get("/api/v1/me").data
    assert me["profile_completed_at"] is None
    assert me["profile_missing"] == ["phone", "date_of_birth"]


def test_acc_11_birthday_must_be_an_adult():
    """Under 18 is refused (underage); impossible dates too; 18 and over is saved."""
    api = signed_up_client()
    young = api.patch("/api/v1/me", {"date_of_birth": years_ago(17)}, format="json")
    assert young.status_code == 400 and young.data["code"] == "underage"
    future = api.patch("/api/v1/me", {"date_of_birth": "2999-01-01"}, format="json")
    assert future.data["code"] == "invalid_birth_date"
    ok = api.patch("/api/v1/me", {"date_of_birth": years_ago(30)}, format="json")
    assert ok.status_code == 200
    assert api.get("/api/v1/me").data["profile_missing"] == ["phone"]


def test_acc_11_complete_refused_until_required_steps_done():
    """Completing early gives 422 with the missing steps; once done it stamps the profile."""
    api = signed_up_client()
    early = api.post("/api/v1/me/profile/complete")
    assert early.status_code == 422 and early.data["code"] == "profile_incomplete"
    api.patch("/api/v1/me", {"date_of_birth": years_ago(25)}, format="json")
    User.objects.filter(email="new@bladus.dz").update(phone_e164="+213555000111", phone_verified_at=timezone.now())
    done = api.post("/api/v1/me/profile/complete")
    assert done.status_code == 200 and done.data["profile_completed_at"] and done.data["profile_missing"] == []
    again = api.post("/api/v1/me/profile/complete")
    assert again.status_code == 200 and again.data["profile_completed_at"] == done.data["profile_completed_at"]


def test_acc_11_birthday_is_private():
    """The public profile never shows the birthday."""
    api = signed_up_client()
    api.patch("/api/v1/me", {"date_of_birth": years_ago(30)}, format="json")
    user = User.objects.get(email="new@bladus.dz")
    public = APIClient().get(f"/api/v1/users/{user.handle}").data
    assert "date_of_birth" not in public
