"""
Cursor pagination for feeds (06-api-design.md section 3.6).

Query: ``cursor`` (opaque, from ``next_cursor`` of the previous page) and
``limit`` (1 to 50, default 20). Answer: ``{"results", "next_cursor",
"has_more"}`` plus any extra keys the caller adds (``unread_count``,
``summary``...).

Keyset pagination: rows are ordered by ``(key, id)`` descending and the
cursor holds the last row's values, so a new row never shifts a page (unlike
page numbers). Cursors are base64 JSON: the apps must not build or read them.

It lives in ``notifications`` (layer L1) so that ``reviews`` and
``messaging`` can share it without importing each other.
TODO(core): move to ``apps.core.pagination`` (core is not ours to edit).
"""

import base64
import binascii
import json
import uuid
from datetime import datetime

from django.db import models
from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, inline_serializer
from rest_framework import serializers

from apps.core.errors import DomainError

DEFAULT_LIMIT = 20
MAX_LIMIT = 50

CURSOR_PARAMETERS = [
    OpenApiParameter("cursor", str, description="Opaque cursor from `next_cursor` of the previous page."),
    OpenApiParameter("limit", int, description="Items per page (1 to 50, default 20)."),
]


def _bad(name: str, message: str) -> DomainError:
    """The 400 answer for an unreadable ``cursor`` or ``limit``."""
    return DomainError("Invalid query parameter.", code="invalid", errors={name: [message]})


def read_limit(request, default: int = DEFAULT_LIMIT, maximum: int = MAX_LIMIT) -> int:
    """``limit`` from the query string, 1 to ``maximum`` (protects the API from huge pages, OWASP API4)."""
    raw = request.query_params.get("limit")
    if raw in (None, ""):
        return default
    try:
        value = int(raw)
    except ValueError as exc:
        raise _bad("limit", "Must be a whole number.") from exc
    if not 1 <= value <= maximum:
        raise _bad("limit", f"Between 1 and {maximum}.")
    return value


def encode_cursor(values: list) -> str:
    """Make an opaque cursor from a list of JSON-friendly values."""
    raw = json.dumps(values, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def decode_cursor(cursor: str, name: str = "cursor") -> list:
    """Read a cursor made by :func:`encode_cursor`; a damaged cursor gives a clean 400."""
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        values = json.loads(base64.urlsafe_b64decode(padded.encode()))
    except (binascii.Error, ValueError, UnicodeDecodeError) as exc:
        raise _bad(name, "Unknown cursor.") from exc
    if not isinstance(values, list):
        raise _bad(name, "Unknown cursor.")
    return values


def _to_json(value):
    """Turn a key value into something JSON can hold."""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    return value


def _from_json(value, sample_field):
    """Turn a cursor value back into the type of the ordering field."""
    if value is None:
        return None
    if isinstance(sample_field, models.DateTimeField):
        return datetime.fromisoformat(value)
    if isinstance(sample_field, models.UUIDField):
        return uuid.UUID(value)
    return value


def cursor_slice(request, queryset, *, key: str = "id") -> tuple[list, str | None, bool]:
    """
    One page of ``queryset`` ordered by ``(key, id)`` newest first.

    Returns ``(rows, next_cursor, has_more)``. ``key`` must never be null
    (``id`` or a timestamp that is always set).
    """
    limit = read_limit(request)
    order = [f"-{key}", "-id"] if key != "id" else ["-id"]
    queryset = queryset.order_by(*order)
    raw = request.query_params.get("cursor")
    if raw:
        values = decode_cursor(raw)
        try:
            if key == "id":
                (last_id,) = values
                queryset = queryset.filter(id__lt=uuid.UUID(str(last_id)))
            else:
                last_key, last_id = values
                field = queryset.model._meta.get_field(key)
                last_key = _from_json(last_key, field)
                last_id = uuid.UUID(str(last_id))
                queryset = queryset.filter(Q(**{f"{key}__lt": last_key}) | Q(**{key: last_key, "id__lt": last_id}))
        except (ValueError, TypeError) as exc:
            raise _bad("cursor", "Unknown cursor.") from exc
    rows = list(queryset[: limit + 1])
    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = None
    if has_more and rows:
        last = rows[-1]
        values = [str(last.id)] if key == "id" else [_to_json(getattr(last, key)), str(last.id)]
        next_cursor = encode_cursor(values)
    return rows, next_cursor, has_more


def cursor_body(results: list, next_cursor: str | None, has_more: bool, **extra) -> dict:
    """The JSON body of a cursor page."""
    return {"results": results, "next_cursor": next_cursor, "has_more": has_more, **extra}


def cursor_page_schema(item_serializer, *, name: str | None = None, extra: dict | None = None):
    """
    OpenAPI shape ``{"results", "next_cursor", "has_more", ...extra}`` for ``@extend_schema``.

    ``extra`` maps more field names to serializer fields (for example
    ``{"unread_count": serializers.IntegerField()}``).
    """
    name = name or f"{item_serializer.__name__.removesuffix('Serializer')}CursorPage"
    return inline_serializer(
        name=name,
        fields={
            "results": item_serializer(many=True),
            "next_cursor": serializers.CharField(allow_null=True),
            "has_more": serializers.BooleanField(),
            **(extra or {}),
        },
    )


def read_bool(request, name: str) -> bool | None:
    """Optional boolean (``true``/``false``/``1``/``0``) from the query string; anything else is a 400."""
    raw = request.query_params.get(name)
    if raw in (None, ""):
        return None
    if raw.lower() in ("1", "true", "yes"):
        return True
    if raw.lower() in ("0", "false", "no"):
        return False
    raise _bad(name, "Must be true or false.")
