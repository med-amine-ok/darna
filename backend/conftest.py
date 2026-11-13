"""Shared pytest fixtures and helpers for the whole backend."""

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts import services as account_services
from apps.accounts.models import StaffProfile, StaffStatus, User

_phone_counter = {"n": 0}


@pytest.fixture(autouse=True)
def _test_settings(settings):
    """Fast, isolated settings for tests: in-memory SMS and email, no rate limits, cheap password hashing."""
    from django.core.cache import cache

    from apps.accounts.sms import MemorySmsBackend

    settings.SMS_BACKEND = "apps.accounts.sms.MemorySmsBackend"
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK, "DEFAULT_THROTTLE_CLASSES": [], "DEFAULT_THROTTLE_RATES": {}}
    cache.clear()
    MemorySmsBackend.outbox.clear()


@pytest.fixture
def api():
    """Anonymous API client."""
    return APIClient()


def make_user(email="guest@example.dz", password="Str0ng-pass-123", phone=None, verified=True, **extra) -> User:
    """Create a user; by default with a verified phone so they may book."""
    if phone is None:
        _phone_counter["n"] += 1
        phone = f"+2135{_phone_counter['n']:08d}"
    user = User.objects.create_user(email=email, password=password, phone_e164=phone, **extra)
    if verified:
        user.phone_verified_at = timezone.now()
        user.save(update_fields=["phone_verified_at"])
    return user


def client_for(user: User, host_account=None) -> APIClient:
    """
    API client signed in as ``user`` with a real session token.

    Pass ``host_account`` to act in that workspace (sets ``X-Host-Account``).
    """
    client = APIClient()
    token = account_services.start_session(user)
    headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"}
    if host_account is not None:
        headers["HTTP_X_HOST_ACCOUNT"] = str(host_account.id)
    client.credentials(**headers)
    return client


@pytest.fixture
def user(db):
    """A guest with a verified phone."""
    return make_user()


@pytest.fixture
def user_client(user):
    """API client signed in as the guest."""
    return client_for(user)


@pytest.fixture
def admin_user(db):
    """An active BLADUS admin."""
    admin = make_user(email="admin@bladus.dz", is_staff=True)
    StaffProfile.objects.create(user=admin, status=StaffStatus.ACTIVE)
    return admin


@pytest.fixture
def admin_client(admin_user):
    """API client signed in as the admin."""
    return client_for(admin_user)
