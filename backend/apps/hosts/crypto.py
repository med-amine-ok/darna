"""
Storage of hotel system credentials (DEC-017, BR-HST-06).

WARNING, NOT REAL ENCRYPTION. This module is a documented PLACEHOLDER.
No encryption library (such as ``cryptography``/Fernet) is installed yet, and
inventing our own cryptography would be worse than having none. So
:func:`encrypt_secret` only wraps the value with a marker prefix; the secret
is readable by anyone with access to the database.

What the placeholder does guarantee today:

- every write of a credential goes through this one function, so the real
  implementation only has to change this file;
- the stored value is never put in any API response (serializers never read
  ``PropertyIntegration.credentials_encrypted``).

Before production this MUST be replaced by real authenticated encryption
(for example Fernet or AES-GCM) with a key kept OUTSIDE the database (an
environment variable or a key management service), plus a migration that
re-encrypts the rows written with the placeholder (they start with
:data:`PLACEHOLDER_PREFIX`).
"""

# Marks rows written by the placeholder, so the future migration can find them.
PLACEHOLDER_PREFIX = b"UNENCRYPTED-PLACEHOLDER:"
# False until real encryption replaces the placeholder; checked by the tests.
IS_REAL_ENCRYPTION = False


def encrypt_secret(value: str) -> bytes:
    """
    Turn a secret into the bytes stored in ``credentials_encrypted``.

    PLACEHOLDER: the bytes are NOT encrypted (see the module docstring).
    """
    return PLACEHOLDER_PREFIX + value.encode("utf-8")


def decrypt_secret(stored: bytes | memoryview | None) -> str | None:
    """
    Read back a value written by :func:`encrypt_secret` (for the future sync adapters).

    Returns ``None`` when nothing is stored. Never call this to build an API response.
    """
    if stored is None:
        return None
    raw = bytes(stored)  # the database may return a memoryview
    if raw.startswith(PLACEHOLDER_PREFIX):
        raw = raw[len(PLACEHOLDER_PREFIX):]
    return raw.decode("utf-8")
