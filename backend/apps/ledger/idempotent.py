"""
Run a money-moving request once per ``Idempotency-Key`` (BR-SYS-01).

Wraps :mod:`apps.core.idempotency` for views whose contract makes the
header required (top-ups, refunds, payments, payouts). A retry with the
same key and body gets the stored answer with ``Idempotency-Replayed: true``;
the same key with another body answers 422 ``idempotency_key_reused``.
The bookings app uses it too (it may import ledger, layer L4).
"""

import json
from collections.abc import Callable

from django.core.serializers.json import DjangoJSONEncoder
from rest_framework.response import Response

from apps.core import idempotency
from apps.core.errors import DomainError


def require_key(request) -> str:
    """The ``Idempotency-Key`` header (8 to 80 characters), or 400 ``idempotency_key_required``."""
    key = (request.headers.get("Idempotency-Key") or "").strip()
    if not 8 <= len(key) <= 80:
        raise DomainError("Send an Idempotency-Key header (8 to 80 characters).", code="idempotency_key_required",
                          errors={"Idempotency-Key": ["Required, 8 to 80 characters."]})
    return key


def run_once(request, endpoint: str, payload, work: Callable[[], dict], *, status_code: int = 201,
             required: bool = True) -> Response:
    """
    Call ``work()`` (which returns the response body) once per key.

    ``endpoint`` is a stable name such as ``"ledger.topup.create"``;
    ``payload`` is what identifies the request (path ids and body). With
    ``required=False`` a missing key simply runs the work.
    """
    key = require_key(request) if required else (request.headers.get("Idempotency-Key") or "").strip() or None
    stored = idempotency.lookup(request.user, endpoint, key, payload)
    if stored:
        response = Response(stored.response_body, status=stored.response_code)
        response["Idempotency-Replayed"] = "true"
        return response
    body = json.loads(json.dumps(work(), cls=DjangoJSONEncoder))
    idempotency.remember(request.user, endpoint, key, payload, status_code, body)
    return Response(body, status=status_code)
