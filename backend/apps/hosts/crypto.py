"""
Encryption of hotel system credentials (DEC-017, BR-HST-06, R9 key management).

Credentials are encrypted with Fernet (AES-128-CBC + HMAC-SHA256, authenticated)
from the ``cryptography`` package, under the keys of ``settings.INTEGRATION_KEYS``
(environment variable, comma list, never stored in the database):

- the FIRST key encrypts, every key decrypts (``MultiFernet``), so keys rotate
  by putting a new key first, calling :func:`rotate_secret` on every row, then
  removing the old key;
- each stored value starts with ``fernet:<key id>:`` where the key id is the
  first 8 hex characters of SHA-256 of the key (R9: "a key id per record"), so
  an operator can see which rows still use an old key without decrypting;
- rows written by the old placeholder (prefix :data:`PLACEHOLDER_PREFIX`) are
  still readable and are re-encrypted by migration
  ``hosts.0002_encrypt_integration_credentials`` and by :func:`rotate_secret`.

Every write of a credential goes through :func:`encrypt_secret`; serializers
never read ``PropertyIntegration.credentials_encrypted``.
"""

import hashlib

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from django.conf import settings

# Marks rows written by the former placeholder (plain text), kept to migrate them.
PLACEHOLDER_PREFIX = b"UNENCRYPTED-PLACEHOLDER:"
# Prefix of every value written by this module: b"fernet:<key id>:<token>".
FERNET_PREFIX = b"fernet:"
# True since the placeholder was replaced (R9); checked by the tests.
IS_REAL_ENCRYPTION = True


class CredentialDecryptError(Exception):
    """A stored credential cannot be decrypted with any configured key (wrong or removed key, altered row)."""


def key_id(key: str | bytes) -> str:
    """Short public id of a Fernet key: 8 hex characters of its SHA-256 (R9)."""
    raw = key.encode() if isinstance(key, str) else key
    return hashlib.sha256(raw).hexdigest()[:8]


def _keys() -> list[str]:
    """Configured keys, first one encrypts. Fails loudly when none is set."""
    keys = [key for key in getattr(settings, "INTEGRATION_KEYS", []) if key]
    if not keys:
        raise RuntimeError("settings.INTEGRATION_KEYS is empty: credentials cannot be encrypted.")
    return keys


def encrypt_secret(value: str) -> bytes:
    """
    Encrypt a secret for ``PropertyIntegration.credentials_encrypted`` (DEC-017, R9).

    Returns ``b"fernet:<key id>:<Fernet token>"`` encrypted with the first key
    of ``settings.INTEGRATION_KEYS``.
    """
    primary = _keys()[0]
    token = Fernet(primary).encrypt(value.encode("utf-8"))
    return FERNET_PREFIX + key_id(primary).encode() + b":" + token


def _split(raw: bytes) -> tuple[str | None, bytes]:
    """Split a stored value into ``(key id, Fernet token)``; key id is ``None`` for a bare token."""
    if raw.startswith(FERNET_PREFIX):
        kid, _, token = raw[len(FERNET_PREFIX):].partition(b":")
        return kid.decode("ascii", "replace"), token
    return None, raw


def decrypt_secret(stored: bytes | memoryview | None) -> str | None:
    """
    Read back a value written by :func:`encrypt_secret` (for the sync adapters only).

    Returns ``None`` when nothing is stored. Placeholder rows are returned as
    they are. Raises :class:`CredentialDecryptError` when no configured key
    opens the value or it was altered. Never call this to build an API response.
    """
    if stored is None:
        return None
    raw = bytes(stored)  # the database may return a memoryview
    if raw.startswith(PLACEHOLDER_PREFIX):
        return raw[len(PLACEHOLDER_PREFIX):].decode("utf-8")
    kid, token = _split(raw)
    keys = _keys()
    # Try the key named by the row first, then every other key.
    ordered = sorted(keys, key=lambda key: key_id(key) != kid)
    try:
        return MultiFernet([Fernet(key) for key in ordered]).decrypt(token).decode("utf-8")
    except InvalidToken as exc:
        raise CredentialDecryptError("No configured key decrypts this credential.") from exc


def needs_rotation(stored: bytes | memoryview | None) -> bool:
    """True when a stored value is a placeholder or was not encrypted with the current first key (R9)."""
    if stored is None:
        return False
    raw = bytes(stored)
    if raw.startswith(PLACEHOLDER_PREFIX):
        return True
    kid, _ = _split(raw)
    return kid != key_id(_keys()[0])


def rotate_secret(stored: bytes | memoryview | None) -> bytes | None:
    """
    Re-encrypt a stored value under the current first key (R9 yearly rotation).

    Placeholder rows become real ciphertext. Returns ``None`` for ``None``.
    """
    if stored is None:
        return None
    return encrypt_secret(decrypt_secret(stored))
