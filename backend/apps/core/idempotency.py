"""
Idempotency keys (BR-SYS-01).

A client that creates a booking or records money sends an ``Idempotency-Key``
header. If the network fails and the client retries with the same key, the
server must not do the work twice: it returns the first answer again.

Usage inside a view::

    key = request.headers.get("Idempotency-Key")
    stored = idempotency.lookup(request.user, "bookings.create", key, request.data)
    if stored:
        return Response(stored.response_body, status=stored.response_code)
    ... do the work ...
    idempotency.remember(request.user, "bookings.create", key, request.data, 201, body)
"""

import hashlib
import json
from datetime import timedelta

from django.utils import timezone

from .errors import DomainError
from .models import IdempotencyRecord

KEEP_HOURS = 24


def _hash(payload) -> str:
    """Stable SHA-256 of a JSON-like payload (keys sorted)."""
    raw = json.dumps(payload, sort_keys=True, default=str).encode()
    return hashlib.sha256(raw).hexdigest()


def lookup(user, endpoint: str, key: str | None, payload) -> IdempotencyRecord | None:
    """
    Return the stored answer for this key, or ``None`` if the key is new
    (or no key was sent).

    Raises ``DomainError(code="idempotency_key_reused", 422)`` when the same
    key is used with different data, which is always a client bug.
    """
    if not key:
        return None
    record = IdempotencyRecord.objects.filter(
        user=user, endpoint=endpoint, key=key, expires_at__gt=timezone.now()
    ).first()
    if record is None:
        return None
    if record.request_hash != _hash(payload):
        raise DomainError(
            "This Idempotency-Key was already used with different data.",
            code="idempotency_key_reused",
            status_code=422,
        )
    return record if record.response_code else None


def remember(user, endpoint: str, key: str | None, payload, response_code: int, response_body) -> None:
    """Store the answer of a finished operation so a retry gets the same one."""
    if not key:
        return
    IdempotencyRecord.objects.update_or_create(
        user=user,
        endpoint=endpoint,
        key=key,
        defaults={
            "request_hash": _hash(payload),
            "response_code": response_code,
            "response_body": response_body,
            "expires_at": timezone.now() + timedelta(hours=KEEP_HOURS),
        },
    )
