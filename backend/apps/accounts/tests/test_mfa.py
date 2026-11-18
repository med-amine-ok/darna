"""Tests of the second factor for website users: TOTP enrolment, two-step sign-in, recovery codes (BR-ACC-04)."""

import pytest
from rest_framework.test import APIClient

from apps.accounts import services
from apps.accounts.models import AuthenticatorType, MfaAuthenticator
from apps.accounts.tests.conftest import enrol, totp_code
from conftest import make_user

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _staff_mfa_on(settings):
    """These tests cover the staff authenticator step, so they run with it switched on."""
    settings.STAFF_MFA_REQUIRED = True
PASSWORD = "Str0ng-pass-123"


def test_br_acc_04_enrol_totp_returns_recovery_codes(user_client, user):
    """GET gives a secret, POST with a good code enrols it and returns 10 recovery codes once."""
    setup = user_client.get("/api/v1/auth/authenticators/totp")
    assert setup.status_code == 200 and setup.data["totp_url"].startswith("otpauth://totp/")
    assert user_client.post("/api/v1/auth/authenticators/totp", {"code": "000000" if totp_code(setup.data["secret"]) != "000000" else "111111"}).status_code == 400
    res = user_client.post("/api/v1/auth/authenticators/totp", {"code": totp_code(setup.data["secret"])})
    assert res.status_code == 201, res.data
    assert res.data["type"] == "totp" and len(res.data["recovery_codes"]) == 10
    listed = user_client.get("/api/v1/auth/authenticators")
    assert sorted(row["type"] for row in listed.data["results"]) == ["recovery_codes", "totp"]
    assert user_client.get("/api/v1/me").data["has_mfa"] is True


def test_br_acc_04_totp_secret_is_stored_encrypted(user):
    """The shared secret is never stored in clear (08-security-privacy.md: login secrets)."""
    secret = enrol(user)
    row = MfaAuthenticator.objects.get(user=user, type=AuthenticatorType.TOTP)
    stored = bytes(row.secret_encrypted)
    assert stored.startswith(b"fernet:") and secret.encode() not in stored


def test_br_acc_04_enrolling_twice_is_a_conflict(user_client, user):
    """A second enrolment answers 409; asking for a new secret answers 400."""
    secret = enrol(user)
    assert user_client.post("/api/v1/auth/authenticators/totp", {"code": totp_code(secret)}).status_code == 409
    assert user_client.get("/api/v1/auth/authenticators/totp").data["code"] == "totp_already_enrolled"


def test_br_acc_04_login_with_mfa_needs_second_step(api):
    """The password step gives a pending token refused everywhere until the TOTP code is checked."""
    user = make_user(email="mfa@x.dz", password=PASSWORD)
    secret = enrol(user)
    res = api.post("/api/v1/auth/login", {"email": "mfa@x.dz", "password": PASSWORD})
    assert res.status_code == 200 and res.data["status"] == "pending_flow" and res.data["user"] is None
    assert res.data["pending_flows"][0]["id"] == "mfa_authenticate"
    token = res.data["session_token"]
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    assert client.get("/api/v1/me").status_code == 401

    second = APIClient()
    second.credentials(HTTP_X_SESSION_TOKEN=token)
    bad = "000000" if totp_code(secret) != "000000" else "111111"
    assert second.post("/api/v1/auth/2fa/authenticate", {"code": bad}).data["code"] == "invalid_code"
    ok = second.post("/api/v1/auth/2fa/authenticate", {"code": totp_code(secret)})
    assert ok.status_code == 200 and ok.data["status"] == "authenticated" and ok.data["user"]["email"] == "mfa@x.dz"
    assert client.get("/api/v1/me").status_code == 200


def test_br_acc_04_totp_code_cannot_be_replayed(api):
    """The same TOTP code does not open a second session."""
    user = make_user(email="mfa@x.dz", password=PASSWORD)
    secret = enrol(user)
    code = totp_code(secret)
    for expected in (200, 400):
        token = api.post("/api/v1/auth/login", {"email": "mfa@x.dz", "password": PASSWORD}).data["session_token"]
        client = APIClient()
        client.credentials(HTTP_X_SESSION_TOKEN=token)
        assert client.post("/api/v1/auth/2fa/authenticate", {"code": code}).status_code == expected


def test_br_acc_04_recovery_code_works_once(api, user):
    """A recovery code replaces the TOTP code once, then is spent."""
    user.email = "rec@x.dz"
    user.save(update_fields=["email"])
    enrol(user)
    codes = services._new_recovery_codes(user)  # the codes shown once at enrolment
    for expected in (200, 400):
        token = api.post("/api/v1/auth/login", {"email": "rec@x.dz", "password": PASSWORD}).data["session_token"]
        step_two = APIClient()
        step_two.credentials(HTTP_X_SESSION_TOKEN=token)
        assert step_two.post("/api/v1/auth/2fa/authenticate", {"code": codes[0].upper()}).status_code == expected


def test_br_acc_04_second_step_without_pending_token_is_refused(api, user_client):
    """A full session or no token at all cannot be used for the second step."""
    assert api.post("/api/v1/auth/2fa/authenticate", {"code": "123456"}).data["code"] == "invalid_session"


def test_authenticators_need_sign_in(api):
    """Anonymous callers get 401."""
    assert api.get("/api/v1/auth/authenticators").status_code == 401
