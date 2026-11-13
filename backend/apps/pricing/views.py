"""HTTP endpoints of the pricing app: ``POST /quotes`` and ``GET /quotes/{id}`` (BR-PRC-01)."""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .serializers import QuoteRequestSerializer, QuoteSerializer


class QuoteCreateView(APIView):
    """
    ``POST /quotes``: the only place a price is computed (BR-PRC-01).

    Open to visitors (``AllowAny``); a signed-in caller becomes the owner of
    the quote, so nobody else can book it.
    """

    serializer_class = QuoteSerializer  # response shape, for the OpenAPI schema
    permission_classes = [AllowAny]

    def post(self, request):
        """Validate the request, compute and save the quote, answer 201 with it."""
        data = QuoteRequestSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        guest = request.user if request.user and request.user.is_authenticated else None
        quote = services.build_quote(guest=guest, **data.validated_data)
        return Response(QuoteSerializer(quote).data, status=status.HTTP_201_CREATED)


class QuoteDetailView(APIView):
    """``GET /quotes/{id}``: read a quote again; an expired one comes back with ``expires_at`` in the past."""

    serializer_class = QuoteSerializer  # response shape, for the OpenAPI schema
    permission_classes = [AllowAny]

    def get(self, request, pk):
        """Return the stored quote (prices are not recomputed here)."""
        return Response(QuoteSerializer(services.get_quote(pk)).data)
