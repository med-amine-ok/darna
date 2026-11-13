"""
Identifier helpers.

Every table uses a UUID version 7 as primary key: it is unique like any UUID,
cannot be guessed, and (unlike UUID4) sorts by creation time, which keeps
database indexes compact. People never see these ids; they see short human
references such as ``BLD-2026-7K2M9Q`` built by :func:`human_reference`.
"""

import secrets
import time
import uuid

# Letters and digits that cannot be confused when read aloud or typed
# (no 0/O, 1/I/L).
_REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"


def uuid7() -> uuid.UUID:
    """
    Return a new UUID version 7 (time-ordered).

    Layout (RFC 9562): 48 bits of Unix time in milliseconds, 4 bits version,
    12 random bits, 2 bits variant, 62 random bits.
    Python 3.13 has no built-in ``uuid.uuid7`` yet, so we build it here.
    """
    unix_ms = time.time_ns() // 1_000_000
    rand_a = secrets.randbits(12)
    rand_b = secrets.randbits(62)
    value = (unix_ms & 0xFFFFFFFFFFFF) << 80
    value |= 0x7 << 76          # version 7
    value |= rand_a << 64
    value |= 0b10 << 62         # RFC variant
    value |= rand_b
    return uuid.UUID(int=value)


def random_code(length: int = 6) -> str:
    """Return ``length`` random characters from the unambiguous alphabet."""
    return "".join(secrets.choice(_REFERENCE_ALPHABET) for _ in range(length))


def human_reference(prefix: str, year: int | None = None, length: int = 6) -> str:
    """
    Build a short reference people can read on the phone.

    Examples: ``human_reference("BLD", 2026)`` gives ``BLD-2026-7K2M9Q``;
    ``human_reference("LST")`` gives ``LST-7K2M9Q``.
    The caller is responsible for retrying if the (very unlikely) duplicate
    happens; the database column is unique.
    """
    code = random_code(length)
    return f"{prefix}-{year}-{code}" if year else f"{prefix}-{code}"
