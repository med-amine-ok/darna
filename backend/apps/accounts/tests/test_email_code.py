"""Sign-up by email waits for the emailed 6-digit code (ACC-01, BR-ACC-02)."""

import pytest
from django.core import mail
from django.test import TestCase

from apps.accounts.models import SessionToken, User
from conftest import last_email_code, make_user

pytestmark = pytest.mark.django_db
PASSWORD = "Str0ng-pass-123"
EMAIL = "nour@bladus.dz"


def sign_up(api, email=EMAIL, password=PASSWORD):
    """Post the website's sign-up and run the after-commit email step; returns the answer."""
    with TestCase.captureOnCommitCallbacks(execute=True):
        return api.post(
            "/api/v1/auth/signup",
            {"email": email, "password": password, "first_name": "Nour", "accept_terms_version": "2026-11"},
            format="json",
        )


def test_acc_01_signup_emails_a_code_and_opens_no_session(api):
    """The answer is a pending verify_email step without any token; the email carries a 6-digit code."""
    res = sign_up(api)
    assert res.status_code == 201
    assert res.data["status"] == "pending_flow" and res.data["user"] is None
    assert res.data["pending_flows"] == [{"id": "verify_email", "is_pending": True}]
    assert "session_token" not in res.data and "token" not in res.data
    assert not SessionToken.objects.filter(user__email=EMAIL).exists()
    assert len(last_email_code(EMAIL)) == 6
    assert User.objects.get(email=EMAIL).email_verified_at is None


def test_acc_01_right_code_confirms_the_email_and_signs_in(api):
    """The code finishes the sign-up: email confirmed, session returned, and the code works once."""
    sign_up(api)
    code = last_email_code(EMAIL)
    res = api.post("/api/v1/auth/email/verify", {"email": EMAIL, "code": code}, format="json")
    assert res.status_code == 200 and res.data["status"] == "authenticated" and res.data["session_token"]
    assert res.data["user"]["email_verified"] is True
    again = api.post("/api/v1/auth/email/verify", {"email": EMAIL, "code": code}, format="json")
    assert again.status_code == 401 and again.data["code"] == "invalid_code"


def test_acc_01_wrong_code_and_unknown_email_give_the_same_error(api):
    """A wrong code and an email without an account answer the same way; 5 wrong tries spend the code."""
    sign_up(api)
    code = last_email_code(EMAIL)
    wrong = "000000" if code != "000000" else "111111"
    unknown = api.post("/api/v1/auth/email/verify", {"email": "nobody@bladus.dz", "code": code}, format="json")
    assert unknown.status_code == 401 and unknown.data["code"] == "invalid_code"
    for _ in range(5):
        res = api.post("/api/v1/auth/email/verify", {"email": EMAIL, "code": wrong}, format="json")
        assert res.status_code == 401 and res.data["code"] == "invalid_code"
    late = api.post("/api/v1/auth/email/verify", {"email": EMAIL, "code": code}, format="json")
    assert late.status_code == 401
    assert User.objects.get(email=EMAIL).email_verified_at is None


def test_acc_01_password_sign_in_waits_for_the_code(api):
    """Before the code: the right password gives 403 email_not_verified, a wrong one the usual 401."""
    sign_up(api)
    res = api.post("/api/v1/auth/login", {"email": EMAIL, "password": PASSWORD}, format="json")
    assert res.status_code == 403 and res.data["code"] == "email_not_verified"
    bad = api.post("/api/v1/auth/login", {"email": EMAIL, "password": "Wrong-pass-999"}, format="json")
    assert bad.status_code == 401 and bad.data["code"] == "invalid_credentials"
    api.post("/api/v1/auth/email/verify", {"email": EMAIL, "code": last_email_code(EMAIL)}, format="json")
    assert api.post("/api/v1/auth/login", {"email": EMAIL, "password": PASSWORD}, format="json").status_code == 200


def test_acc_01_resend_needs_the_password(api):
    """A new code needs the email and the password; the old code stops working."""
    sign_up(api)
    first = last_email_code(EMAIL)
    mail.outbox.clear()
    refused = api.post("/api/v1/auth/email/resend", {"email": EMAIL, "password": "Wrong-pass-999"}, format="json")
    assert refused.status_code == 401 and not mail.outbox
    sent = api.post("/api/v1/auth/email/resend", {"email": EMAIL, "password": PASSWORD}, format="json")
    assert sent.status_code == 204
    second = last_email_code(EMAIL)
    if first != second:
        old = api.post("/api/v1/auth/email/verify", {"email": EMAIL, "code": first}, format="json")
        assert old.status_code == 401
    ok = api.post("/api/v1/auth/email/verify", {"email": EMAIL, "code": second}, format="json")
    assert ok.status_code == 200


def test_acc_01_resend_sends_nothing_once_confirmed(api):
    """A confirmed account gets no new code (nothing to confirm)."""
    make_user(email="done@bladus.dz", password=PASSWORD)
    mail.outbox.clear()
    res = api.post("/api/v1/auth/email/resend", {"email": "done@bladus.dz", "password": PASSWORD}, format="json")
    assert res.status_code == 204 and not mail.outbox


def test_acc_01_reset_link_confirms_the_email_and_replaces_the_password(api):
    """
    Someone signs up with another person's email. The real owner resets the
    password by the emailed link: the email is confirmed and the stranger's
    password no longer works.
    """
    sign_up(api, password="Stranger-pass-123")
    assert api.post("/api/v1/auth/password/request", {"email": EMAIL}, format="json").status_code == 204
    import re

    key = re.search(r"key=(\S+)", mail.outbox[-1].body).group(1)
    res = api.post("/api/v1/auth/password/reset", {"key": key, "password": "Owner-pass-456"}, format="json")
    assert res.status_code == 200
    assert User.objects.get(email=EMAIL).email_verified_at is not None
    stranger = api.post("/api/v1/auth/login", {"email": EMAIL, "password": "Stranger-pass-123"}, format="json")
    assert stranger.status_code == 401


def test_acc_01_phone_signup_is_unchanged(api):
    """A phone-only sign-up still answers with a session (the phone has its own SMS check)."""
    res = api.post(
        "/api/v1/auth/signup", {"phone": "+213555123456", "accept_terms_version": "2026-11"}, format="json"
    )
    assert res.status_code == 201 and res.data["status"] == "authenticated" and res.data["session_token"]
