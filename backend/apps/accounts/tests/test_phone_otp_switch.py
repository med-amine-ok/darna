"""Phone codes switched off (settings.PHONE_OTP_REQUIRED=False): a saved number is enough, nothing is sent."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.sms import MemorySmsBackend

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _codes_off(settings):
    """The current decision: no SMS code."""
    settings.PHONE_OTP_REQUIRED = False


def new_client():
    """A fresh sign-up, as the website creates it."""
    api = APIClient()
    res = api.post("/api/v1/auth/signup", {"email": "nocode@bladus.dz", "password": "Str0ng-pass-123",
                                            "first_name": "Rania", "accept_terms_version": "2026-11"}, format="json")
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['session_token']}")
    return api


def test_saving_a_phone_sends_no_code_and_counts_for_the_profile():
    """PUT /me/phone stores the number, sends no SMS, and the phone step is done."""
    api = new_client()
    assert api.put("/api/v1/me/phone", {"phone": "+213555444333"}, format="json").status_code in (200, 202, 204)
    assert MemorySmsBackend.outbox == []
    me = api.get("/api/v1/me").data
    assert me["phone"] == "+213555444333" and me["phone_verified"] is False
    assert "phone" not in me["profile_missing"]


def test_a_saved_phone_is_enough_to_book_and_to_host():
    """Booking and hosting accept the saved number while codes are off."""
    new_client().put("/api/v1/me/phone", {"phone": "+213555444333"}, format="json")
    user = User.objects.get(email="nocode@bladus.dz")
    assert user.phone_ok and not user.phone_verified


def test_without_any_phone_it_is_still_missing():
    """Codes off does not mean no phone: the step stays required."""
    me = new_client().get("/api/v1/me").data
    assert "phone" in me["profile_missing"]


def test_providers_tell_the_website(settings):
    """GET /auth/providers says codes are off, so the website skips the code screen."""
    assert APIClient().get("/api/v1/auth/providers").data["phone_otp_required"] is False
    settings.PHONE_OTP_REQUIRED = True
    assert APIClient().get("/api/v1/auth/providers").data["phone_otp_required"] is True
