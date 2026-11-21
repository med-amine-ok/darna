"""Email sign-up without a code step, the reset link rule and the email check command (ACC-01, ACC-04)."""

import re

import pytest
from django.core import mail

from apps.accounts.models import User

pytestmark = pytest.mark.django_db
PASSWORD = "Str0ng-pass-123"
EMAIL = "nour@bladus.dz"


def test_acc_01_email_signup_signs_in_at_once_and_sends_no_email(api):
    """The website goes straight on to "complete your profile": a session comes back and no email is sent."""
    mail.outbox.clear()
    res = api.post(
        "/api/v1/auth/signup",
        {"email": EMAIL, "password": PASSWORD, "first_name": "Nour", "accept_terms_version": "2026-11"},
        format="json",
    )
    assert res.status_code == 201 and res.data["status"] == "authenticated" and res.data["session_token"]
    assert not mail.outbox
    login = api.post("/api/v1/auth/login", {"email": EMAIL, "password": PASSWORD}, format="json")
    assert login.status_code == 200


def test_acc_04_reset_link_confirms_the_email_and_replaces_the_password(api):
    """The reset link reached the mailbox: the email is confirmed and the old password stops working."""
    api.post("/api/v1/auth/signup", {"email": EMAIL, "password": "Stranger-pass-123", "accept_terms_version": "1"}, format="json")
    assert User.objects.get(email=EMAIL).email_verified_at is None
    assert api.post("/api/v1/auth/password/request", {"email": EMAIL}, format="json").status_code == 204
    key = re.search(r"key=(\S+)", mail.outbox[-1].body).group(1)
    res = api.post("/api/v1/auth/password/reset", {"key": key, "password": "Owner-pass-456"}, format="json")
    assert res.status_code == 200
    assert User.objects.get(email=EMAIL).email_verified_at is not None
    old = api.post("/api/v1/auth/login", {"email": EMAIL, "password": "Stranger-pass-123"}, format="json")
    assert old.status_code == 401


def test_send_test_email_command_reports_failure(monkeypatch):
    """The Render check command exits with the exact error when sending fails."""
    from django.core.management import CommandError, call_command

    from apps.accounts import mailer

    def broken(*args, **kwargs):
        raise OSError("timed out")

    monkeypatch.setattr(mailer, "send_mail", broken)
    with pytest.raises(CommandError, match="OSError: timed out"):
        call_command("send_test_email", "guest@bladus.test")
