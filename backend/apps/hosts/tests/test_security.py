"""Tests of the R9 controls of the hotel system connection: credential encryption and URL guard (DEC-017, BR-HST-06)."""

import socket

import pytest
from cryptography.fernet import Fernet

from apps.core import netguard
from apps.hosts import crypto
from apps.hosts.models import PropertyIntegration
from conftest import client_for

from .helpers import make_org, owner_of

pytestmark = pytest.mark.django_db

KEY_OLD = Fernet.generate_key().decode()
KEY_NEW = Fernet.generate_key().decode()


def test_br_sec_crypto_01_round_trip_and_tamper(settings):
    """Encrypt then decrypt gives the secret back; the ciphertext hides it and names the key; a changed byte is refused."""
    settings.INTEGRATION_KEYS = [KEY_OLD]
    stored = crypto.encrypt_secret("api-key-123")
    assert b"api-key-123" not in stored
    assert stored.startswith(crypto.FERNET_PREFIX + crypto.key_id(KEY_OLD).encode() + b":")
    assert crypto.decrypt_secret(stored) == "api-key-123"
    assert crypto.decrypt_secret(memoryview(stored)) == "api-key-123"
    assert crypto.decrypt_secret(None) is None
    tampered = stored[:-5] + (b"A" if stored[-5:-4] != b"A" else b"B") + stored[-4:]
    with pytest.raises(crypto.CredentialDecryptError):
        crypto.decrypt_secret(tampered)


def test_br_sec_crypto_02_rotation(settings):
    """A new first key encrypts; old rows still decrypt, are flagged, and rotate to the new key; without the old key they fail."""
    settings.INTEGRATION_KEYS = [KEY_OLD]
    old_row = crypto.encrypt_secret("hotel-secret")

    settings.INTEGRATION_KEYS = [KEY_NEW, KEY_OLD]
    assert crypto.decrypt_secret(old_row) == "hotel-secret"
    assert crypto.needs_rotation(old_row)
    rotated = crypto.rotate_secret(old_row)
    assert not crypto.needs_rotation(rotated) and crypto.key_id(KEY_NEW).encode() in rotated

    settings.INTEGRATION_KEYS = [KEY_NEW]
    assert crypto.decrypt_secret(rotated) == "hotel-secret"
    with pytest.raises(crypto.CredentialDecryptError):
        crypto.decrypt_secret(old_row)


def test_br_sec_crypto_03_placeholder_rows_are_read_and_rotated(settings):
    """Rows written by the former placeholder are still readable and become real ciphertext when rotated."""
    settings.INTEGRATION_KEYS = [KEY_NEW]
    legacy = crypto.PLACEHOLDER_PREFIX + b'{"api_key": "x"}'
    assert crypto.decrypt_secret(legacy) == '{"api_key": "x"}' and crypto.needs_rotation(legacy)
    rotated = crypto.rotate_secret(legacy)
    assert rotated.startswith(crypto.FERNET_PREFIX) and crypto.decrypt_secret(rotated) == '{"api_key": "x"}'


def test_br_sec_crypto_04_no_key_fails_loudly(settings):
    """With no key configured nothing is written in clear: encryption raises."""
    settings.INTEGRATION_KEYS = []
    with pytest.raises(RuntimeError):
        crypto.encrypt_secret("x")


def fake_dns(monkeypatch, table):
    """Resolve names from ``table`` instead of the network."""
    monkeypatch.setattr(
        netguard.socket, "getaddrinfo",
        lambda host, port, *a, **k: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, port)) for ip in table[host]],
    )


def test_br_sec_ssrf_10_integration_base_url_must_be_public_https(monkeypatch):
    """A hotel cannot save a system or iCal URL that is http or points to a private address (unsafe_url)."""
    fake_dns(monkeypatch, {"pms.example.com": ["93.184.216.34"], "internal.example.com": ["169.254.169.254"],
                            "127.0.0.1": ["127.0.0.1"]})
    hotel = make_org(category="hotel", name="Hotel Cirta")
    client = client_for(owner_of(hotel), hotel)

    for url in ("http://pms.example.com/", "https://internal.example.com/latest/meta-data", "https://127.0.0.1/"):
        res = client.post("/api/v1/host/integrations", {"kind": "ical", "system_name": "Booking iCal", "base_url": url})
        assert res.status_code == 400 and res.data["code"] == "unsafe_url", url
    assert not PropertyIntegration.objects.exists()

    res = client.post("/api/v1/host/integrations",
                      {"kind": "ical", "system_name": "Booking iCal", "base_url": "https://pms.example.com/cal.ics"})
    assert res.status_code == 201 and res.data["base_url"] == "https://pms.example.com/cal.ics"
    blank = client.post("/api/v1/host/integrations", {"kind": "csv_import", "system_name": "CSV", "base_url": ""})
    assert blank.status_code == 201
