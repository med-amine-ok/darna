"""Continue with Google (ACC-10): linking rules, refusals, sessions and ID token checks."""

import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from rest_framework.test import APIClient

from apps.accounts import google
from apps.accounts.models import ConsentRecord, SessionToken, SocialAccount, User
from apps.accounts.tests.conftest import enrol, make_staff
from conftest import make_user

pytestmark = pytest.mark.django_db

CALLBACK = "http://localhost:3000/api/auth/google/callback"
VERIFIER = "v" * 64


@pytest.fixture(autouse=True)
def google_on(settings):
    """Google configured with test keys and the local callback registered."""
    settings.GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com"
    settings.GOOGLE_CLIENT_SECRET = "test-secret"
    settings.GOOGLE_REDIRECT_URIS = [CALLBACK]


def fake_google(monkeypatch, **claims):
    """Make Google answer with these identity claims (no network)."""
    identity = google.GoogleIdentity(
        subject=claims.get("sub", "google-sub-1"),
        email=claims.get("email", "nadia@gmail.com"),
        email_verified=claims.get("email_verified", True),
        given_name=claims.get("given_name", "Nadia"),
        family_name=claims.get("family_name", "Benali"),
        locale="fr",
    )
    monkeypatch.setattr(google, "exchange_code", lambda **kwargs: "id-token")
    monkeypatch.setattr(google, "verify_id_token", lambda token: identity)


def sign_in(**overrides):
    """POST /auth/google as the website callback does."""
    body = {"code": "one-time-code", "code_verifier": VERIFIER, "redirect_uri": CALLBACK,
            "accept_terms_version": "2026-11", **overrides}
    return APIClient().post("/api/v1/auth/google", body, format="json")


def test_acc_10_new_google_user_gets_an_account_and_a_session(monkeypatch):
    """A first sign-in creates a verified, password-less account with consents and a working session."""
    fake_google(monkeypatch)
    res = sign_in()
    assert res.status_code == 200 and res.data["status"] == "authenticated" and res.data["created"] is True
    user = User.objects.get(email="nadia@gmail.com")
    assert user.email_verified_at is not None and not user.has_usable_password()
    assert user.first_name_latin == "Nadia" and user.handle == "nadia-b"
    assert ConsentRecord.objects.filter(user=user, document="terms").exists()
    assert SocialAccount.objects.get(user=user).subject == "google-sub-1"
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['session_token']}")
    assert client.get("/api/v1/me").status_code == 200


def test_acc_10_returning_user_found_by_google_account_not_email(monkeypatch):
    """The link follows Google's account id, even after the Gmail address changed."""
    fake_google(monkeypatch)
    first = sign_in()
    fake_google(monkeypatch, email="nadia.new@gmail.com")
    again = sign_in()
    assert again.data["created"] is False and again.data["user"]["id"] == first.data["user"]["id"]
    assert User.objects.count() == 1


def test_acc_10_existing_verified_account_is_linked_and_keeps_its_password(monkeypatch):
    """Same verified email: link to the existing account, nothing else changes."""
    user = make_user(email="nadia@gmail.com")
    User.objects.filter(pk=user.pk).update(email_verified_at=user.date_joined)
    fake_google(monkeypatch)
    res = sign_in()
    assert res.status_code == 200 and res.data["created"] is False and res.data["user"]["id"] == str(user.id)
    user.refresh_from_db()
    assert user.has_usable_password()


def test_acc_10_unverified_squatter_account_is_reclaimed(monkeypatch):
    """An account made with someone else's email (never verified) loses its password and sessions."""
    squatter = make_user(email="nadia@gmail.com")
    SessionToken.issue(squatter)
    fake_google(monkeypatch)
    res = sign_in()
    assert res.status_code == 200
    squatter.refresh_from_db()
    assert not squatter.has_usable_password() and squatter.email_verified_at is not None
    assert SessionToken.objects.filter(user=squatter, revoked_at__isnull=True).count() == 1  # only the new one


def test_acc_10_unverified_google_email_is_refused(monkeypatch):
    """Google must vouch for the email before we create or link anything."""
    fake_google(monkeypatch, email_verified=False)
    res = sign_in()
    assert res.status_code == 400 and res.data["code"] == "google_email_unverified"
    assert not User.objects.filter(email="nadia@gmail.com").exists()


def test_acc_10_staff_accounts_cannot_use_google(monkeypatch):
    """Staff sign in to the admin with their password only."""
    make_staff("ops@bladus.dz", mfa=False)
    fake_google(monkeypatch, email="ops@bladus.dz")
    res = sign_in()
    assert res.status_code == 403 and res.data["code"] == "google_staff_account"


def test_acc_10_unregistered_redirect_address_is_refused(monkeypatch):
    """Only the callback addresses registered with Google are accepted."""
    fake_google(monkeypatch)
    res = sign_in(redirect_uri="https://evil.example/callback")
    assert res.status_code == 400 and res.data["code"] == "invalid_redirect_uri"


def test_acc_10_suspended_account_is_refused(monkeypatch):
    """A suspended person cannot get back in through Google."""
    fake_google(monkeypatch)
    sign_in()
    User.objects.filter(email="nadia@gmail.com").update(status="suspended")
    res = sign_in()
    assert res.status_code == 403 and res.data["code"] == "account_disabled"


def test_br_acc_04_google_sign_in_still_asks_the_authenticator_code(monkeypatch):
    """With an authenticator enrolled, Google sign-in waits for the code like a password sign-in."""
    fake_google(monkeypatch)
    first = sign_in()
    enrol(User.objects.get(pk=first.data["user"]["id"]))
    res = sign_in()
    assert res.status_code == 200 and res.data["status"] == "pending_flow" and res.data["user"] is None


def test_acc_10_google_off_without_keys(settings):
    """Without keys the feature is off: providers says so and sign-in is refused."""
    settings.GOOGLE_CLIENT_ID = ""
    providers = APIClient().get("/api/v1/auth/providers")
    assert providers.data == {"google_enabled": False, "google_client_id": ""}
    assert sign_in().data["code"] == "google_disabled"


def test_acc_10_disconnect_needs_a_password(monkeypatch):
    """Disconnecting Google is refused while it is the only way in, allowed once a password exists."""
    fake_google(monkeypatch)
    res = sign_in()
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['session_token']}")
    listed = client.get("/api/v1/me/social-accounts")
    assert listed.data["has_password"] is False and listed.data["results"][0]["provider"] == "google"
    account_id = listed.data["results"][0]["id"]
    refused = client.delete(f"/api/v1/me/social-accounts/{account_id}")
    assert refused.status_code == 409 and refused.data["code"] == "last_sign_in_method"
    user = User.objects.get(email="nadia@gmail.com")
    user.set_password("A-new-Str0ng-pass-1")
    user.save()
    assert client.delete(f"/api/v1/me/social-accounts/{account_id}").status_code == 204
    assert not SocialAccount.objects.exists()


# ---- The real ID token checks, with a locally made signing key -------------------------
@pytest.fixture
def signing_key(monkeypatch):
    """A private key standing in for Google's, served by a fake key set."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    class FakeJwks:
        def get_signing_key_from_jwt(self, token):
            return type("Key", (), {"key": key.public_key()})()

    monkeypatch.setattr(google, "_jwks_client", FakeJwks())
    return key


def make_token(key, **overrides):
    """An RS256 ID token like Google's."""
    now = int(time.time())
    claims = {"iss": "https://accounts.google.com", "aud": "test-client.apps.googleusercontent.com", "sub": "123",
              "email": "Nadia@Gmail.com", "email_verified": True, "iat": now, "exp": now + 600, **overrides}
    return jwt.encode(claims, key, algorithm="RS256")


def test_acc_10_valid_id_token_is_read(signing_key):
    """Signature, audience and issuer pass; the email is lower-cased."""
    identity = google.verify_id_token(make_token(signing_key))
    assert identity.subject == "123" and identity.email == "nadia@gmail.com" and identity.email_verified is True


@pytest.mark.parametrize("override", [
    {"aud": "someone-else.apps.googleusercontent.com"},
    {"iss": "https://evil.example"},
    {"exp": int(time.time()) - 3600},
])
def test_acc_10_wrong_audience_issuer_or_expired_token_is_refused(signing_key, override):
    """A token made for another app, by another issuer, or expired, is never trusted."""
    with pytest.raises(Exception) as caught:
        google.verify_id_token(make_token(signing_key, **override))
    assert getattr(caught.value, "code", "") == "google_failed"


def test_acc_10_token_signed_by_another_key_is_refused(signing_key):
    """A forged token (other key) fails the signature check."""
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    with pytest.raises(Exception) as caught:
        google.verify_id_token(make_token(other))
    assert getattr(caught.value, "code", "") == "google_failed"
