"""Tests of sign-up, sign-in, one-time codes and sessions (BR-ACC-01 to BR-ACC-05)."""

import re

import pytest

from apps.accounts.models import ConsentRecord, User
from apps.accounts.sms import MemorySmsBackend
from conftest import client_for, make_user

pytestmark = pytest.mark.django_db
PASSWORD = "Str0ng-pass-123"


def last_code() -> str:
    """Read the 6-digit code from the last SMS kept by the in-memory backend."""
    return re.search(r"\b(\d{6})\b", MemorySmsBackend.outbox[-1][1]).group(1)


def test_signup_creates_user_session_and_consents(api):
    """Sign-up returns a token and records the accepted terms."""
    res = api.post("/api/v1/auth/signup", {"email": "New@Example.dz", "password": PASSWORD, "accept_terms_version": "2026-11"})
    assert res.status_code == 201, res.data
    assert res.data["token"] and res.data["user"]["email"] == "new@example.dz"
    assert ConsentRecord.objects.filter(user__email="new@example.dz").count() == 2


def test_br_acc_01_email_is_unique_case_insensitive(api):
    """The same email with other letter case is refused."""
    make_user(email="a@x.dz")
    res = api.post("/api/v1/auth/signup", {"email": "A@x.dz", "password": PASSWORD, "accept_terms_version": "1"})
    assert res.status_code == 409 and res.data["code"] == "email_taken"


def test_login_and_logout_revokes_token(api):
    """A token works until logout, then is refused (BR-ACC-03)."""
    make_user(email="a@x.dz", password=PASSWORD)
    token = api.post("/api/v1/auth/login", {"email": "a@x.dz", "password": PASSWORD}).data["token"]
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    assert api.get("/api/v1/me").status_code == 200
    assert api.delete("/api/v1/auth/session").status_code == 204
    assert api.get("/api/v1/me").status_code == 401


def test_wrong_password_and_unknown_email_give_same_error(api):
    """Failures never reveal whether the email exists."""
    make_user(email="a@x.dz", password=PASSWORD)
    one = api.post("/api/v1/auth/login", {"email": "a@x.dz", "password": "nope-nope-1"})
    two = api.post("/api/v1/auth/login", {"email": "ghost@x.dz", "password": "nope-nope-1"})
    assert one.status_code == two.status_code == 401
    assert one.data["code"] == two.data["code"] == "invalid_credentials"


def test_br_acc_05_login_locks_after_five_failures(api):
    """The sixth attempt is locked even with the right password."""
    make_user(email="a@x.dz", password=PASSWORD)
    for _ in range(5):
        api.post("/api/v1/auth/login", {"email": "a@x.dz", "password": "wrong-pass-1"})
    res = api.post("/api/v1/auth/login", {"email": "a@x.dz", "password": PASSWORD})
    assert res.status_code == 429 and res.data["code"] == "login_locked"


def test_phone_code_login_creates_verified_account(api):
    """A phone signs in with the SMS code; the account is created and verified."""
    phone = "+213551234567"
    assert api.post("/api/v1/auth/code/request", {"phone": phone}).status_code == 204
    res = api.post("/api/v1/auth/code/confirm", {"phone": phone, "code": last_code()})
    assert res.status_code == 200 and res.data["user"]["phone_verified"] is True
    assert User.objects.get(phone_e164=phone).phone_verified


def test_br_acc_02_code_dies_after_five_wrong_attempts(api):
    """After 5 wrong tries even the right code is refused."""
    phone = "+213551234567"
    api.post("/api/v1/auth/code/request", {"phone": phone})
    good = last_code()
    bad = "000000" if good != "000000" else "111111"
    for _ in range(5):
        assert api.post("/api/v1/auth/code/confirm", {"phone": phone, "code": bad}).status_code == 401
    assert api.post("/api/v1/auth/code/confirm", {"phone": phone, "code": good}).status_code == 401


def test_br_acc_02_at_most_three_codes_per_hour(api):
    """The fourth code request within an hour is refused."""
    phone = "+213551234567"
    for _ in range(3):
        assert api.post("/api/v1/auth/code/request", {"phone": phone}).status_code == 204
    assert api.post("/api/v1/auth/code/request", {"phone": phone}).status_code == 429


def test_set_and_verify_phone():
    """Changing the phone makes it unverified until the code is confirmed."""
    user = make_user(email="a@x.dz", verified=False, phone="+213661111111")
    client = client_for(user)
    res = client.put("/api/v1/me/phone", {"phone": "+213662222222"})
    assert res.status_code == 202 and res.data["phone_verified"] is False
    res = client.post("/api/v1/auth/phone/verify", {"code": last_code()})
    assert res.status_code == 200 and res.data["phone_verified"] is True


def test_profile_update_ignores_protected_fields(user_client, user):
    """PATCH /me edits the profile but can never make someone staff (mass assignment)."""
    res = user_client.patch("/api/v1/me", {"first_name_latin": "Yacine", "is_staff": True, "status": "banned"})
    assert res.status_code == 200 and res.data["first_name_latin"] == "Yacine"
    user.refresh_from_db()
    assert user.is_staff is False and user.status == "active"


def test_change_password_signs_out_other_devices(user):
    """After a password change, other sessions stop working."""
    here, there = client_for(user), client_for(user)
    res = here.post("/api/v1/me/password", {"current_password": PASSWORD, "new_password": "An0ther-pass-456"})
    assert res.status_code == 204
    assert here.get("/api/v1/me").status_code == 200
    assert there.get("/api/v1/me").status_code == 401


def test_anonymous_is_refused_with_error_shape(api):
    """Errors always carry code, message and status."""
    res = api.get("/api/v1/me")
    assert res.status_code == 401 and set(res.data) >= {"code", "message", "status"}
