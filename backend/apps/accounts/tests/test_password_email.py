"""Tests of email verification, password reset and the public profile (ACC-01, ACC-04, ACC-06, BR-ACC-03)."""

import re

import pytest
from django.core import mail
from rest_framework.test import APIClient

from apps.accounts.models import StaffProfile, StaffStatus, UserStatus
from apps.accounts.sms import MemorySmsBackend
from apps.accounts.tests.conftest import last_mail_token
from conftest import client_for, make_user

pytestmark = pytest.mark.django_db
PASSWORD = "Str0ng-pass-123"
NEW_PASSWORD = "An0ther-pass-456"


def test_signup_emails_a_verification_key_that_verifies(api, django_capture_on_commit_callbacks):
    """The emailed key marks the email verified; an altered key is refused."""
    with django_capture_on_commit_callbacks(execute=True):
        api.post("/api/v1/auth/signup", {"email": "new@x.dz", "password": PASSWORD, "accept_terms_version": "1"})
    key = last_mail_token(r"key=(\S+)")
    assert "new@x.dz" not in key  # no personal data in the link
    bad = api.post("/api/v1/auth/email/verify", {"key": key + "x"})
    assert bad.status_code == 400 and bad.data["code"] == "invalid_key"
    res = api.post("/api/v1/auth/email/verify", {"key": key})
    assert res.status_code == 200 and res.data["user"]["email_verified"] is True


def test_reset_by_email_link_revokes_sessions_and_works_once(api):
    """The reset link sets a new password, signs out other devices and cannot be reused."""
    user = make_user(email="a@x.dz", password=PASSWORD)
    old = client_for(user)
    assert api.post("/api/v1/auth/password/request", {"email": "A@x.dz"}).status_code == 204
    key = last_mail_token(r"key=(\S+)")
    res = api.post("/api/v1/auth/password/reset", {"key": key, "password": NEW_PASSWORD})
    assert res.status_code == 200 and res.data["status"] == "authenticated" and res.data["session_token"]
    assert old.get("/api/v1/me").status_code == 401
    assert api.post("/api/v1/auth/login", {"email": "a@x.dz", "password": NEW_PASSWORD}).status_code == 200
    again = api.post("/api/v1/auth/password/reset", {"key": key, "password": "Third-pass-789"})
    assert again.status_code == 400 and again.data["code"] == "invalid_key"


def test_reset_request_for_unknown_email_sends_nothing(api):
    """Same 204 for unknown accounts, and no email leaves."""
    assert api.post("/api/v1/auth/password/request", {"email": "ghost@x.dz"}).status_code == 204
    assert not mail.outbox


def test_reset_by_sms_code(api):
    """A phone gets a 6-digit code that works as the reset key."""
    make_user(email="p@x.dz", password=PASSWORD, phone="+213551112233")
    assert api.post("/api/v1/auth/password/request", {"phone": "+213551112233"}).status_code == 204
    code = re.search(r"\b(\d{6})\b", MemorySmsBackend.outbox[-1][1]).group(1)
    res = api.post("/api/v1/auth/password/reset", {"key": code, "password": NEW_PASSWORD})
    assert res.status_code == 200
    assert APIClient().post("/api/v1/auth/login", {"email": "p@x.dz", "password": NEW_PASSWORD}).status_code == 200


def test_reset_request_unknown_phone_sends_no_sms(api):
    """Unknown phones answer 204 and cost no SMS."""
    assert api.post("/api/v1/auth/password/request", {"phone": "+213559998877"}).status_code == 204
    assert MemorySmsBackend.outbox == []


def test_public_profile_hides_contacts_and_inactive_accounts(api, user):
    """The public profile has no email or phone; suspended and staff accounts are 404."""
    res = api.get(f"/api/v1/users/{user.id}")
    assert res.status_code == 200 and res.data["is_host"] is False
    assert not {"email", "phone", "phone_e164", "address_line", "last_name_latin"} & set(res.data)
    user.status = UserStatus.SUSPENDED
    user.save(update_fields=["status"])
    assert api.get(f"/api/v1/users/{user.id}").status_code == 404
    staff = make_user(email="ops@bladus.dz", is_staff=True)
    StaffProfile.objects.create(user=staff, status=StaffStatus.ACTIVE)
    assert api.get(f"/api/v1/users/{staff.id}").status_code == 404


def test_email_resend_sends_the_link_again_to_an_unverified_user():
    """The signed-in user gets a new verification email; a verified one gets nothing; anonymous is refused."""
    user = make_user(email="resend@x.dz", password=PASSWORD)
    user.email_verified_at = None
    user.save(update_fields=["email_verified_at"])
    mail.outbox.clear()
    assert client_for(user).post("/api/v1/auth/email/resend").status_code == 204
    assert len(mail.outbox) == 1 and "verify-email?key=" in mail.outbox[0].body
    user.refresh_from_db()
    from django.utils import timezone
    user.email_verified_at = timezone.now()
    user.save(update_fields=["email_verified_at"])
    mail.outbox.clear()
    assert client_for(user).post("/api/v1/auth/email/resend").status_code == 204
    assert len(mail.outbox) == 0
    assert APIClient().post("/api/v1/auth/email/resend").status_code == 401
