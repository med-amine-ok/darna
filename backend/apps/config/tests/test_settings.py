"""Tests of the platform settings endpoints and of the commission rate lookup (BR-CFG-01, BR-PAY-06)."""

import pytest
from django.conf import settings as django_settings

from apps.audit.models import AuditEvent
from apps.config.models import PlatformSettings
from apps.config.services import commission_rate_bp, get_settings, update_settings
from apps.hosts.models import HostAccount, HostAccountKind
from conftest import make_user

pytestmark = pytest.mark.django_db


def test_public_settings_open_to_anyone(api):
    """Anonymous callers get the public subset with the defaults on an empty database."""
    res = api.get("/api/v1/settings/public")
    assert res.status_code == 200
    assert set(res.data) == {"commission_bp", "request_ttl_hours", "instant_booking_enabled", "maintenance_mode"}
    assert res.data["commission_bp"] == django_settings.DEFAULT_COMMISSION_BP
    assert "credit_limit_minor" not in res.data


def test_admin_settings_need_admin(user_client, api):
    """A guest gets 403, an anonymous caller 401 (BR-STF-01)."""
    assert user_client.get("/api/v1/admin/settings").status_code == 403
    assert user_client.patch("/api/v1/admin/settings", {"maintenance_mode": True}).status_code == 403
    assert api.get("/api/v1/admin/settings").status_code == 401


def test_admin_reads_every_setting(admin_client):
    """Version 0 and every key while only the defaults exist."""
    res = admin_client.get("/api/v1/admin/settings")
    assert res.status_code == 200
    assert res.data["version"] == 0 and res.data["created_by"] is None
    assert res.data["data"]["credit_limit_minor"] == django_settings.DEFAULT_CREDIT_LIMIT_MINOR


def test_br_cfg_01_patch_creates_new_version_and_audit(admin_client, admin_user):
    """Each change is a new version with its author, and one audit row."""
    res = admin_client.patch("/api/v1/admin/settings", {"commission_bp": {"hotel": 1700}, "request_ttl_hours": 12})
    assert res.status_code == 200, res.data
    assert res.data["version"] == 1 and res.data["created_by"]["id"] == str(admin_user.id)
    assert res.data["data"]["commission_bp"]["hotel"] == 1700
    assert res.data["data"]["commission_bp"]["agency"] == django_settings.DEFAULT_COMMISSION_BP["agency"]
    admin_client.patch("/api/v1/admin/settings", {"maintenance_mode": True})
    assert PlatformSettings.objects.count() == 2
    assert PlatformSettings.objects.filter(is_current=True).get().version == 2
    event = AuditEvent.objects.get(action="SETTINGS_UPDATE", note="version 1")
    assert event.actor == admin_user and event.actor_kind == "admin"
    assert event.after["request_ttl_hours"] == 12 and event.before["request_ttl_hours"] == 24


def test_br_cfg_01_unknown_key_and_bad_values_refused(admin_client):
    """Only whitelisted keys with valid values are accepted; nothing is saved otherwise."""
    assert admin_client.patch("/api/v1/admin/settings", {"free_money": True}).status_code == 400
    assert admin_client.patch("/api/v1/admin/settings", {"commission_bp": {"hotel": 10001}}).status_code == 400
    assert admin_client.patch("/api/v1/admin/settings", {"commission_bp": {"castle": 100}}).status_code == 400
    assert admin_client.patch("/api/v1/admin/settings", {"request_ttl_hours": 0}).status_code == 400
    assert admin_client.patch("/api/v1/admin/settings", {}).status_code == 400
    assert PlatformSettings.objects.count() == 0
    assert AuditEvent.objects.count() == 0


def test_br_pay_06_commission_rate_override_wins():
    """The host's own rate beats the default of its type; the default follows the settings."""
    host = HostAccount.objects.create(kind=HostAccountKind.INDIVIDUAL, user=make_user(email="h@x.dz"))
    assert commission_rate_bp(host) == django_settings.DEFAULT_COMMISSION_BP["individual"]
    update_settings({"commission_bp": {"individual": 900}}, actor=None)
    assert commission_rate_bp(host) == 900
    host.commission_rate_override_bp = 500
    assert commission_rate_bp(host) == 500
    host.commission_rate_override_bp = 0  # zero is a real rate, not "no override"
    assert commission_rate_bp(host) == 0
    assert get_settings()["commission_bp"]["hotel"] == django_settings.DEFAULT_COMMISSION_BP["hotel"]
