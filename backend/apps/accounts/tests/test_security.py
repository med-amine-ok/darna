"""Tests of the R9 account controls: peppered hashes and one-time code / SMS limits (BR-ACC-02)."""

import hashlib
import hmac
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts import services
from apps.accounts.models import OtpSendLog, SessionToken, hash_secret
from apps.accounts.sms import MemorySmsBackend
from apps.core.errors import DomainError

pytestmark = pytest.mark.django_db


def test_br_sec_hash_01_hash_is_hmac_keyed_by_pepper(settings):
    """``hash_secret`` is HMAC-SHA256 with HASH_PEPPER, not plain SHA-256; another pepper gives another hash."""
    settings.HASH_PEPPER = "pepper-one"
    first = hash_secret("123456")
    assert first == hmac.new(b"pepper-one", b"123456", hashlib.sha256).hexdigest()
    assert first != hashlib.sha256(b"123456").hexdigest()
    settings.HASH_PEPPER = "pepper-two"
    assert hash_secret("123456") != first


def test_br_sec_hash_02_session_token_stored_as_peppered_hash(user, api):
    """A session works through the HMAC hash, and stops working when the pepper changes."""
    raw = services.start_session(user)
    assert SessionToken.objects.get(user=user).token_hash == hash_secret(raw)
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {raw}")
    assert api.get("/api/v1/me").status_code == 200


def test_br_sec_hash_03_dev_pepper_refused_in_production():
    """settings.py refuses to start with the dev pepper, no integration keys, local uploads or no virus scanner when DEBUG is False."""
    import subprocess
    import sys

    from django.conf import settings as django_settings

    # Empty values hide anything a local backend/.env would add (read_env never overrides).
    env = {"DJANGO_DEBUG": "False", "DJANGO_SECRET_KEY": "x" * 50, "INTEGRATION_KEYS": "", "MEDIA_UPLOADS_ENABLED": "True",
           "MEDIA_STORAGE_BACKEND": "local", "MEDIA_SCANNER": "", "SYSTEMROOT": __import__("os").environ.get("SYSTEMROOT", "")}
    code = "import backend.settings"
    run = lambda extra: subprocess.run(  # noqa: E731
        [sys.executable, "-c", code], cwd=django_settings.BASE_DIR, env={**env, **extra}, capture_output=True, text=True
    )
    assert "HASH_PEPPER" in run({}).stderr
    assert "INTEGRATION_KEYS" in run({"HASH_PEPPER": "p" * 40}).stderr
    keys = {"HASH_PEPPER": "p" * 40, "INTEGRATION_KEYS": "ZmFrZS1rZXktZm9yLXRlc3RzLW9ubHktMzItYnl0ZXM="}
    assert "MEDIA_STORAGE_BACKEND" in run(keys).stderr
    assert "MEDIA_SCANNER" in run({**keys, "MEDIA_STORAGE_BACKEND": "s3"}).stderr
    ok = run({**keys, "MEDIA_STORAGE_BACKEND": "s3", "MEDIA_SCANNER": "apps.media.scanning.StubScanner"})
    assert ok.returncode == 0, ok.stderr
    # First release: uploads switched off, so no storage or scanner is needed to start.
    uploads_off = run({**keys, "MEDIA_UPLOADS_ENABLED": "False"})
    assert uploads_off.returncode == 0, uploads_off.stderr


def request(destination: str, ip: str | None = "198.51.100.7"):
    """Ask for a login code, as the service sees it."""
    services.request_code(destination=destination, purpose="login", ip=ip)


def assert_refused(destination: str, code: str, ip: str | None = "198.51.100.7", status: int = 429):
    """The next request is refused with ``code`` and nothing is sent."""
    sent_before = len(MemorySmsBackend.outbox)
    with pytest.raises(DomainError) as exc:
        request(destination, ip)
    assert exc.value.code == code and exc.value.status == status
    assert len(MemorySmsBackend.outbox) == sent_before


def age_logs(**delta):
    """Move every send log row back in time by ``delta`` (timedelta keywords)."""
    for row in OtpSendLog.objects.all():
        OtpSendLog.objects.filter(pk=row.pk).update(created_at=row.created_at - timedelta(**delta))


def test_br_acc_02_destination_three_per_hour():
    """The fourth code within one hour to the same destination is refused (429) and logged as blocked."""
    for _ in range(3):
        request("+213551000001")
    assert_refused("+213551000001", "otp_rate_limited")
    assert OtpSendLog.objects.filter(status="blocked_rate_limit").count() == 1
    request("+213551000002")  # another destination is not affected


def test_br_acc_02_destination_ten_per_day():
    """After 10 codes in 24 hours a destination is refused even when the hourly limit is free."""
    destination = "+213551000003"
    now = timezone.now()
    for n in range(10):  # 2 to 20 hours ago: none in the last hour
        OtpSendLog.objects.create(destination_hash=hash_secret(destination), purpose="login", channel="sms",
                                  created_at=now - timedelta(hours=2 + 2 * n))
    assert_refused(destination, "otp_rate_limited", ip=None)
    age_logs(hours=5)  # the oldest code leaves the 24 hour window
    request(destination, ip=None)


def test_br_acc_02_ip_ten_per_hour():
    """One IP may ask for 10 codes per hour across destinations; the 11th is refused."""
    for n in range(10):
        request(f"+2135520000{n:02d}", ip="203.0.113.9")
    assert_refused("+213552000099", "otp_rate_limited", ip="203.0.113.9")
    request("+213552000099", ip="203.0.113.10")  # another IP is free
    age_logs(minutes=61)
    request("+213552000098", ip="203.0.113.9")


def test_br_acc_02_failed_sends_count_against_limits(settings, monkeypatch):
    """A provider failure (503 otp_send_failed) still counts, so retries cannot bypass the limit."""
    from apps.accounts import sms

    def broken(self, phone, text):
        """Simulate the SMS provider being down."""
        raise ConnectionError("provider down")

    monkeypatch.setattr(sms.MemorySmsBackend, "send", broken)
    for _ in range(3):
        with pytest.raises(DomainError) as exc:
            request("+213551000004")
        assert exc.value.code == "otp_send_failed"
    assert_refused("+213551000004", "otp_rate_limited")


def test_br_acc_02_sms_daily_budget(settings):
    """When the day's SMS budget is spent, SMS codes get 503 sms_budget_exceeded and nothing is sent; email still works."""
    settings.SMS_DAILY_BUDGET = 2
    request("+213551000005", ip=None)
    request("+213551000006", ip=None)
    assert_refused("+213551000007", "sms_budget_exceeded", ip=None, status=503)
    assert OtpSendLog.objects.filter(status="blocked_budget").count() == 1
    request("someone@example.dz", ip=None)  # email is not billed per message


def test_br_acc_02_sms_budget_resets_next_business_day(settings):
    """The budget counts the current business day only; yesterday's SMS do not count."""
    settings.SMS_DAILY_BUDGET = 1
    request("+213551000008", ip=None)
    assert_refused("+213551000009", "sms_budget_exceeded", ip=None, status=503)
    OtpSendLog.objects.update(created_at=timezone.now() - timedelta(days=1, hours=1))
    request("+213551000009", ip=None)


def test_br_acc_02_budget_error_over_http(api, settings):
    """The API answers 503 with code ``sms_budget_exceeded``."""
    settings.SMS_DAILY_BUDGET = 0
    res = api.post("/api/v1/auth/code/request", {"phone": "+213551000010"})
    assert res.status_code == 503 and res.data["code"] == "sms_budget_exceeded"
    assert MemorySmsBackend.outbox == []


def test_br_acc_04_plain_session_for_staff_cannot_reach_admin_api(api):
    """``start_session`` without the explicit test flag gives staff a web session, which the admin API refuses."""
    from conftest import make_user

    staff = make_user(email="staff-plain@example.dz", is_staff=True)
    raw = services.start_session(staff)
    session = SessionToken.objects.get(user=staff)
    assert session.scope == "web" and session.mfa_verified_at is None
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {raw}")
    assert api.get("/api/v1/admin/users").status_code in (401, 403)


def test_br_sys_07_forwarded_ip_trusted_only_from_known_proxies(rf, settings):
    """X-Forwarded-For is ignored by default; with N trusted proxies the Nth entry from the right is used."""
    from apps.accounts.views import client_ip

    request = rf.get("/", HTTP_X_FORWARDED_FOR="6.6.6.6, 203.0.113.9", REMOTE_ADDR="10.0.0.2")
    settings.TRUSTED_PROXY_HOPS = 0
    assert client_ip(request) == "10.0.0.2"
    settings.TRUSTED_PROXY_HOPS = 1
    assert client_ip(request) == "203.0.113.9"
    spoof_only = rf.get("/", HTTP_X_FORWARDED_FOR="", REMOTE_ADDR="10.0.0.2")
    assert client_ip(spoof_only) == "10.0.0.2"
