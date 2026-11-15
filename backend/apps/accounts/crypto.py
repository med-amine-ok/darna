"""
Encryption of second-factor secrets (TOTP shared secrets, BR-ACC-04, 08-security-privacy.md "login secrets").

Same scheme as ``apps.hosts.crypto`` (which ``accounts`` may not import, it is
a higher app): Fernet (authenticated encryption) under the keys of
``settings.INTEGRATION_KEYS``; the first key encrypts, every key decrypts, so
keys rotate by putting a new key first. Stored values look like
``b"fernet:<key id>:<token>"`` where the key id is 8 hex characters of
SHA-256 of the key.

TODO(config): a dedicated ``MFA_KEYS`` setting would separate MFA secrets
from hotel system credentials; it needs a change in ``backend/settings.py``.
"""

import hashlib

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from django.conf import settings

PREFIX = b"fernet:"


class SecretDecryptError(Exception):
    """No configured key opens a stored secret (key removed or row altered)."""


def _key_id(key: str) -> str:
    """Short public id of a key: 8 hex characters of its SHA-256."""
    return hashlib.sha256(key.encode()).hexdigest()[:8]


def _keys() -> list[str]:
    """Configured keys; fails loudly when none is set so secrets are never stored in clear."""
    keys = [key for key in getattr(settings, "INTEGRATION_KEYS", []) if key]
    if not keys:
        raise RuntimeError("settings.INTEGRATION_KEYS is empty: second-factor secrets cannot be encrypted.")
    return keys


def encrypt_secret(value: str) -> bytes:
    """Encrypt ``value`` with the first configured key; returns ``b"fernet:<key id>:<token>"``."""
    primary = _keys()[0]
    return PREFIX + _key_id(primary).encode() + b":" + Fernet(primary).encrypt(value.encode("utf-8"))


def decrypt_secret(stored: bytes | memoryview | None) -> str | None:
    """Read back a value written by :func:`encrypt_secret`; ``None`` stays ``None``."""
    if stored is None:
        return None
    raw = bytes(stored)
    kid, token = None, raw
    if raw.startswith(PREFIX):
        kid_bytes, _, token = raw[len(PREFIX):].partition(b":")
        kid = kid_bytes.decode("ascii", "replace")
    ordered = sorted(_keys(), key=lambda key: _key_id(key) != kid)
    try:
        return MultiFernet([Fernet(key) for key in ordered]).decrypt(token).decode("utf-8")
    except InvalidToken as exc:
        raise SecretDecryptError("No configured key decrypts this secret.") from exc
