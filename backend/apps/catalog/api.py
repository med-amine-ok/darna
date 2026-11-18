"""
Small HTTP helpers shared by the catalog, inventory and trips views.

They read query parameters safely (bad values give a clean 400 in the
standard error shape) and paginate a list with the project paginator.
"""

import uuid
from datetime import date
from decimal import Decimal, InvalidOperation

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, inline_serializer
from rest_framework import serializers

from apps.core.errors import DomainError
from apps.core.pagination import PageNumberPagination


def paginated(request, items, serializer_class, *, context: dict | None = None):
    """Return the paginated response ``{"count", "page", "page_size", "results"}`` for a queryset or list."""
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(items, request)
    data = serializer_class(page, many=True, context={"request": request, **(context or {})}).data
    return paginator.get_paginated_response(data)


def page_schema(item_serializer):
    """
    OpenAPI shape of a ``paginated`` answer whose rows use ``item_serializer``.

    For ``@extend_schema(responses=...)`` on plain ``APIView`` methods, which
    Swagger cannot read on its own.
    """
    name = item_serializer.__name__.removesuffix("Serializer")
    return inline_serializer(
        name=f"{name}Page",
        fields={
            "count": serializers.IntegerField(),
            "page": serializers.IntegerField(),
            "page_size": serializers.IntegerField(),
            "results": item_serializer(many=True),
        },
    )


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


def query_decimal(request, name: str, *, minimum=None, maximum=None) -> Decimal | None:
    """Read an optional decimal number (for example ``min_rating=4.5``) from the query string."""
    raw = request.query_params.get(name)
    if raw in (None, ""):
        return None
    try:
        value = Decimal(raw)
    except InvalidOperation as exc:
        raise _bad(name, "Must be a number.") from exc
    if (minimum is not None and value < minimum) or (maximum is not None and value > maximum):
        raise _bad(name, f"Between {minimum} and {maximum}.")
    return value


def _bounded(request, name: str, low: int, high: int, *aliases: str) -> int | None:
    """Optional whole number between ``low`` and ``high``; the first of ``name`` and ``aliases`` that is sent wins."""
    for key in (name, *aliases):
        value = query_int(request, key, minimum=low)
        if value is not None:
            if value > high:
                raise _bad(key, f"At most {high}.")
            return value
    return None


def _first(request, *names: str) -> str | None:
    """The value of the first query parameter of ``names`` that is sent."""
    for name in names:
        value = request.query_params.get(name)
        if value not in (None, ""):
            return value
    return None


# Longest stay a search accepts, in nights (openapi: check_out "max 90 nights").
MAX_SEARCH_NIGHTS = 90
# Longest free text accepted by the search endpoints (openapi: q maxLength 120).
MAX_QUERY_CHARS = 120


def search_filters(request) -> dict:
    """
    Read the listing search filters from the query string, as keyword
    arguments of ``catalog.selectors.search_listings``.

    One parser for ``GET /listings``, ``GET /listings/facets`` and
    ``GET /listings/map`` so the three always apply the same filters
    (BR-SRC-01). Names follow docs/backend/openapi.yaml (``min_price_minor``,
    ``experience_type``...); the older names ``min_price``, ``max_price``
    and ``exp_type`` are still read. Bad values answer 400 ``invalid``.
    """
    check_in, check_out = date_pair(request, "check_in", "check_out")
    if check_in and (check_out - check_in).days > MAX_SEARCH_NIGHTS:
        raise _bad("check_out", f"At most {MAX_SEARCH_NIGHTS} nights after check_in.")
    q = request.query_params.get("q")
    if q and len(q) > MAX_QUERY_CHARS:
        raise _bad("q", f"At most {MAX_QUERY_CHARS} characters.")
    host_account = request.query_params.get("host_account") or None
    if host_account:
        try:
            uuid.UUID(host_account)
        except ValueError as exc:
            raise _bad("host_account", "Must be a UUID.") from exc
    host_user = request.query_params.get("host_user") or None
    if host_user:
        try:
            uuid.UUID(host_user)
        except ValueError as exc:
            raise _bad("host_user", "Must be a UUID.") from exc
    return {
        "q": q,
        "vertical": request.query_params.get("vertical"),
        "wilaya": _bounded(request, "wilaya", 1, 69),
        "commune": query_int(request, "commune", minimum=1),
        "guests": _bounded(request, "guests", 1, 50),
        "rooms": _bounded(request, "rooms", 1, 20),
        "min_price": _bounded(request, "min_price_minor", 0, 10**12, "min_price"),
        "max_price": _bounded(request, "max_price_minor", 0, 10**12, "max_price"),
        "property_type": request.query_params.get("property_type"),
        "category": request.query_params.get("category") or None,
        "amenities": request.query_params.get("amenities"),
        "experience_type": _first(request, "experience_type", "exp_type"),
        "host_type": request.query_params.get("host_type"),
        "host_account": host_account,
        "host_user": host_user,
        "bedrooms_min": query_int(request, "bedrooms_min", minimum=0),
        "bathrooms_min": query_int(request, "bathrooms_min", minimum=0),
        "min_rating": query_decimal(request, "min_rating", minimum=1, maximum=5),
        "instant": query_bool(request, "instant"),
        "featured": query_bool(request, "featured"),
        "check_in": check_in,
        "check_out": check_out,
        "bbox": query_bbox(request),
    }


# OpenAPI only: the filters read by :func:`search_filters`, shared by the search, facets and map endpoints.
SEARCH_PARAMETERS = [
    OpenApiParameter("vertical", str, description="Comma list: home, hotel, hostel, experience, vehicle."),
    OpenApiParameter("q", str, description="Free text on title and place names (trigram, accent tolerant)."),
    OpenApiParameter("wilaya", int, description="Wilaya code, 1 to 69."),
    OpenApiParameter("commune", int, description="Commune id."),
    OpenApiParameter("check_in", OpenApiTypes.DATE, description="First night (with check_out)."),
    OpenApiParameter("check_out", OpenApiTypes.DATE, description="Day of departure, at most 90 nights later."),
    OpenApiParameter("guests", int, description="Total guests, 1 to 50."),
    OpenApiParameter("rooms", int, description="Hotels and hostels: rooms or beds needed, 1 to 20."),
    OpenApiParameter("min_price_minor", int, description="Minimum price per unit, centimes."),
    OpenApiParameter("max_price_minor", int, description="Maximum price per unit, centimes."),
    OpenApiParameter("property_type", str, description="Comma list of property type slugs."),
    OpenApiParameter("category", str, description="Category slug."),
    OpenApiParameter("amenities", str, description="Comma list of amenity slugs; a listing must have all."),
    OpenApiParameter("experience_type", str, description="Comma list of experience types."),
    OpenApiParameter("host_type", str, description="Comma list: individual, agency, hotel, hostel."),
    OpenApiParameter("host_account", OpenApiTypes.UUID, description="Only listings of one host account."),
    OpenApiParameter("host_user", OpenApiTypes.UUID, description="Only listings of one individual host (user id)."),
    OpenApiParameter("bedrooms_min", int, description="Minimum bedrooms."),
    OpenApiParameter("bathrooms_min", int, description="Minimum bathrooms."),
    OpenApiParameter("min_rating", float, description="Minimum average rating, 1 to 5."),
    OpenApiParameter("instant", bool, description="Only listings that resolve to instant booking."),
    OpenApiParameter("featured", bool, description="Only featured listings."),
    OpenApiParameter("bbox", str, description="Map box: min_lng,min_lat,max_lng,max_lat (public points)."),
]
