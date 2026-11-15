"""Fixtures and helpers of the accounts tests (second factor, staff)."""

import re
from datetime import timedelta

import pyotp
import pytest
from django.core import mail
from django.utils import timezone

from apps.accounts import services
from apps.accounts.models import StaffProfile, StaffStatus
from conftest import make_user

STAFF_PASSWORD = "Staff-Str0ng-pass-123"


def totp_code(secret: str, steps: int = 0) -> str:
    """TOTP code of the current 30 s step moved by ``steps`` (the service accepts -1, 0 and +1)."""
    return pyotp.TOTP(secret).at(timezone.now() + timedelta(seconds=30 * steps))


def enrol(user) -> str:
    """Enrol an authenticator app for ``user`` through the services; returns the secret.

    The enrolment uses the code of the previous step, so the current and next
    steps stay free for the sign-in that follows (codes cannot be replayed).
    """
    secret = services.totp_setup(user)["secret"]
    services.enrol_totp(user, totp_code(secret, -1))
    return secret


def make_staff(email: str, *, mfa: bool = True, status: str = StaffStatus.ACTIVE):
    """An active staff member with a password and, by default, an enrolled authenticator app.

    Returns ``(user, secret)``; ``secret`` is ``None`` without MFA.
    """
    user = make_user(email=email, password=STAFF_PASSWORD, is_staff=True)
    StaffProfile.objects.create(user=user, status=status, activated_at=timezone.now())
    return user, (enrol(user) if mfa else None)


def last_mail_token(pattern: str) -> str:
    """Read a key or token from the last email kept by the in-memory email backend."""
    return re.search(pattern, mail.outbox[-1].body).group(1)


@pytest.fixture
def staff_member(db):
    """A third active admin (``admin_user`` is the first), with MFA."""
    user, _ = make_staff("third@bladus.dz")
    return user


@pytest.fixture
def second_admin(db):
    """Another active admin, so deactivation keeps two admins (08-security-privacy.md 5.2)."""
    user, _ = make_staff("second@bladus.dz")
    return user

