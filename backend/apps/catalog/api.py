"""
Small HTTP helpers shared by the catalog, inventory and trips views.

They read query parameters safely (bad values give a clean 400 in the
standard error shape) and paginate a list with the project paginator.
"""

from datetime import date
from decimal import Decimal, InvalidOperation

from apps.core.errors import DomainError
from apps.core.pagination import PageNumberPagination


def paginated(request, items, serializer_class, *, context: dict | None = None):
    """Return the paginated response ``{"count", "page", "page_size", "results"}`` for a queryset or list."""
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(items, request)
    data = serializer_class(page, many=True, context={"request": request, **(context or {})}).data
    return paginator.get_paginated_response(data)


def _bad(name: str, message: str):
    """Build the 400 error raised for an unreadable query parameter."""
    return DomainError("Invalid query parameter.", code="invalid", errors={name: [message]})


def query_int(request, name: str, *, minimum: int | None = None) -> int | None:
    """Read an optional whole number from the query string."""
    raw = request.query_params.get(name)
    if raw in (None, ""):
        return None
    try:
        value = int(raw)
    except ValueError as exc:
        raise _bad(name, "Must be a whole number.") from exc
    if minimum is not None and value < minimum:
        raise _bad(name, f"Must be at least {minimum}.")
    return value


def query_bool(request, name: str) -> bool | None:
    """Read an optional boolean (``true``/``false``/``1``/``0``) from the query string."""
    raw = request.query_params.get(name)
    if raw in (None, ""):
        return None
    if raw.lower() in ("1", "true", "yes"):
        return True
    if raw.lower() in ("0", "false", "no"):
        return False
    raise _bad(name, "Must be true or false.")


def query_date(request, name: str) -> date | None:
    """Read an optional ISO date (``2026-07-14``) from the query string."""
    raw = request.query_params.get(name)
    if raw in (None, ""):
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError as exc:
        raise _bad(name, "Use the format YYYY-MM-DD.") from exc


def query_bbox(request, name: str = "bbox") -> tuple[Decimal, Decimal, Decimal, Decimal] | None:
    """Read ``min_lng,min_lat,max_lng,max_lat`` (map search box) from the query string."""
    raw = request.query_params.get(name)
    if not raw:
        return None
    try:
        parts = [Decimal(p) for p in raw.split(",")]
    except InvalidOperation as exc:
        raise _bad(name, "Four numbers: min_lng,min_lat,max_lng,max_lat.") from exc
    if len(parts) != 4 or parts[0] > parts[2] or parts[1] > parts[3]:
        raise _bad(name, "Four numbers: min_lng,min_lat,max_lng,max_lat.")
    return parts[0], parts[1], parts[2], parts[3]


def date_pair(request, start_name: str, end_name: str) -> tuple[date | None, date | None]:
    """Read two dates that must come together and be in order (end after start)."""
    start, end = query_date(request, start_name), query_date(request, end_name)
    if (start is None) != (end is None):
        raise _bad(end_name if end is None else start_name, f"Send both {start_name} and {end_name}.")
    if start and end and end <= start:
        raise _bad(end_name, f"Must be after {start_name}.")
    return start, end
