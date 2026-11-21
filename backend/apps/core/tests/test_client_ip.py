"""The visitor address passed by the website server (BR-SYS-07, apps.core.client_ip)."""

import pytest
from django.test import RequestFactory

from apps.accounts.views import client_ip
from apps.core.client_ip import TrustedClientIpMiddleware

SECRET = "test-bff-secret-0123456789abcdef"


def run(meta: dict, settings, secret=SECRET, hops=1):
    """Pass a request through the middleware; return what ``client_ip`` sees and the cleaned META."""
    settings.BFF_PROXY_SECRET = secret
    settings.TRUSTED_PROXY_HOPS = hops
    request = RequestFactory().get("/", **meta)
    seen = {}

    def view(req):
        seen["ip"] = client_ip(req)
        seen["meta"] = req.META
        return None

    TrustedClientIpMiddleware(view)(request)
    return seen["ip"], seen["meta"]


def test_br_sys_07_vouched_address_is_used(settings):
    """With the right secret, limits see the visitor and not the website server."""
    ip, meta = run(
        {"REMOTE_ADDR": "10.0.0.1", "HTTP_X_FORWARDED_FOR": "76.76.21.21",
         "HTTP_X_BLADUS_CLIENT_IP": "41.200.10.7", "HTTP_X_BLADUS_PROXY_SECRET": SECRET},
        settings,
    )
    assert ip == "41.200.10.7"
    assert "HTTP_X_BLADUS_PROXY_SECRET" not in meta and "HTTP_X_BLADUS_CLIENT_IP" not in meta


@pytest.mark.parametrize("given", ["wrong-secret", ""])
def test_br_sys_07_wrong_or_missing_secret_is_ignored(settings, given):
    """Anybody can send the header; without the secret the address stays the real caller's."""
    meta = {"REMOTE_ADDR": "10.0.0.1", "HTTP_X_FORWARDED_FOR": "76.76.21.21", "HTTP_X_BLADUS_CLIENT_IP": "1.2.3.4"}
    if given:
        meta["HTTP_X_BLADUS_PROXY_SECRET"] = given
    ip, _ = run(meta, settings)
    assert ip == "76.76.21.21"


def test_br_sys_07_no_secret_configured_ignores_the_header(settings):
    """With BFF_PROXY_SECRET empty the feature is off, even if the caller sends an empty secret."""
    ip, _ = run(
        {"REMOTE_ADDR": "10.0.0.1", "HTTP_X_BLADUS_CLIENT_IP": "1.2.3.4", "HTTP_X_BLADUS_PROXY_SECRET": ""},
        settings, secret="", hops=0,
    )
    assert ip == "10.0.0.1"


def test_br_sys_07_invalid_address_is_ignored(settings):
    """A value that is not an IP address is never used."""
    ip, _ = run(
        {"REMOTE_ADDR": "10.0.0.1", "HTTP_X_BLADUS_CLIENT_IP": "not-an-ip", "HTTP_X_BLADUS_PROXY_SECRET": SECRET},
        settings, hops=0,
    )
    assert ip == "10.0.0.1"


@pytest.mark.django_db
def test_br_acc_02_code_limit_is_per_visitor_behind_the_website(settings, api):
    """Two visitors behind the same website server each get their own per IP code limit."""
    from apps.accounts.models import OtpSendLog

    settings.BFF_PROXY_SECRET = SECRET
    settings.TRUSTED_PROXY_HOPS = 1
    settings.OTP_MAX_SENDS_PER_IP_PER_HOUR = 2
    for n, visitor in enumerate(["41.200.10.7", "41.200.10.7", "105.98.1.2"]):
        api.post(
            "/api/v1/auth/code/request", {"phone": f"+21355500000{n}"}, format="json",
            HTTP_X_FORWARDED_FOR="76.76.21.21", HTTP_X_BLADUS_CLIENT_IP=visitor, HTTP_X_BLADUS_PROXY_SECRET=SECRET,
        )
    ips = sorted(OtpSendLog.objects.values_list("ip", flat=True))
    assert ips == ["105.98.1.2", "41.200.10.7", "41.200.10.7"]
