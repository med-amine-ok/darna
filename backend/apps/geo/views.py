"""
Public geography endpoints (``/api/v1/geo/*``, BR-SRC-02).

Reference data that every visitor needs to search and every host needs to
place a listing, so no sign-in is asked. Lists are short and not paginated;
the answer is always ``{"results": [...]}``.
"""

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.errors import DomainError, NotFoundError

from . import selectors
from .serializers import CommuneSerializer, WilayaSerializer


def query_int(raw: str | None, name: str, default: int | None = None) -> int | None:
    """Read an optional whole number from the query string; 400 when it is not a number."""
    if raw in (None, ""):
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise DomainError(f"'{name}' must be a whole number.", code="invalid") from exc


class WilayaListView(APIView):
    """``GET /geo/wilayas``: the 69 wilayas, names in the ``Accept-Language`` language."""

    permission_classes = [AllowAny]
    serializer_class = WilayaSerializer

    def get(self, request):
        """Return every wilaya ordered by code."""
        data = WilayaSerializer(selectors.list_wilayas(), many=True, context={"request": request}).data
        return Response({"results": data})


class WilayaCommunesView(APIView):
    """``GET /geo/wilayas/{code}/communes``: communes of one wilaya."""

    permission_classes = [AllowAny]
    serializer_class = CommuneSerializer

    def get(self, request, code: int):
        """Return the communes ordered by French name; 404 for an unknown wilaya code."""
        wilaya = selectors.get_wilaya(code)
        if wilaya is None:
            raise NotFoundError("Unknown wilaya.", code="wilaya_not_found")
        communes = selectors.communes_of_wilaya(wilaya)
        return Response({"results": CommuneSerializer(communes, many=True, context={"request": request}).data})


class CommuneSearchView(APIView):
    """``GET /geo/communes?q=``: autocomplete of communes (at most 20 results)."""

    permission_classes = [AllowAny]
    serializer_class = CommuneSerializer

    def get(self, request):
        """
        Search by a part of the name in French, Arabic or English.

        Optional ``wilaya`` (code) narrows the search and ``limit`` (1 to 20,
        default 10) sets how many rows come back.
        """
        communes = selectors.search_communes(
            request.query_params.get("q", ""),
            wilaya_code=query_int(request.query_params.get("wilaya"), "wilaya"),
            limit=query_int(request.query_params.get("limit"), "limit", default=10),
        )
        return Response({"results": CommuneSerializer(communes, many=True, context={"request": request}).data})
