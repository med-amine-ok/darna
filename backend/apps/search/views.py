"""
HTTP endpoints of the search app: facet counts and map pins of the public listing search.

Both read the same query string as ``GET /listings`` through
``apps.catalog.api.search_filters`` (one parser, same filters, BR-SRC-01)
and are public (``AllowAny``).
"""

from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.api import SEARCH_PARAMETERS, search_filters
from apps.catalog.serializers import MoneyInputSerializer

from . import selectors

# OpenAPI only: ``FacetBucket``.
FACET_BUCKET = inline_serializer("FacetBucket", {
    "value": serializers.CharField(), "label": serializers.CharField(), "count": serializers.IntegerField(),
})

# OpenAPI only: answer of ``GET /listings/facets``.
FACETS_SCHEMA = inline_serializer("ListingFacets", {
    "total": serializers.IntegerField(),
    "facets": serializers.DictField(child=serializers.ListField(child=FACET_BUCKET)),
    "price_histogram": serializers.ListField(child=inline_serializer("PriceHistogramBar", {
        "from_minor": serializers.IntegerField(), "to_minor": serializers.IntegerField(),
        "count": serializers.IntegerField(),
    })),
})

# OpenAPI only: answer of ``GET /listings/map``.
MAP_SCHEMA = inline_serializer("ListingMap", {
    "pins": serializers.ListField(child=inline_serializer("MapPin", {
        "id": serializers.UUIDField(),
        "vertical": serializers.CharField(),
        "location_public": inline_serializer("GeoPoint", {
            "lat": serializers.FloatField(), "lng": serializers.FloatField(),
        }),
        "price_from": MoneyInputSerializer(),
        "title": serializers.CharField(),
    })),
    "truncated": serializers.BooleanField(),
})


def _locale(request) -> str:
    """Language of the caller (``Accept-Language``), French by default."""
    code = (getattr(request, "LANGUAGE_CODE", None) or "fr")[:2]
    return code if code in ("en", "fr", "ar") else "fr"


class ListingFacetsView(APIView):
    """``GET /listings/facets``: counts per filter value for the current search (BR-SRC-01, BR-SRC-04)."""

    permission_classes = [AllowAny]

    @extend_schema(parameters=SEARCH_PARAMETERS, responses=FACETS_SCHEMA)
    def get(self, request):
        """Total, facet buckets (each without its own filter) and price histogram."""
        return Response(selectors.listing_facets(search_filters(request), _locale(request)))


class ListingMapView(APIView):
    """``GET /listings/map``: map pins (public points, BR-SRC-03) of the current search, at most 500."""

    permission_classes = [AllowAny]

    @extend_schema(parameters=SEARCH_PARAMETERS, responses=MAP_SCHEMA)
    def get(self, request):
        """Pins and a ``truncated`` flag when more than 500 listings match."""
        return Response(selectors.map_pins(search_filters(request)))
