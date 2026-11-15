"""
HTTP endpoints of the pricing app: ``POST /quotes`` and ``GET /quotes/{id}`` (BR-PRC-01),
and the admin coupon catalogue ``/admin/coupons`` (R2, BR-PRM-01).
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.catalog.api import query_bool

from . import services
from .serializers import CouponSerializer, CouponWriteSerializer, QuoteRequestSerializer, QuoteSerializer


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


# ---------------------------------------------------------------------------
# Admin coupons (R2, BR-PRM-01, BR-PRM-02)
# ---------------------------------------------------------------------------
@extend_schema(parameters=[OpenApiParameter("active", OpenApiTypes.BOOL, OpenApiParameter.QUERY, required=False,
                                            description="Only active (true) or inactive (false) coupons.")])
class AdminCouponListCreateView(generics.ListAPIView):
    """``GET /admin/coupons`` (filter ``active``) and ``POST /admin/coupons``: the coupon catalogue (admin only)."""

    permission_classes = [IsAdmin]
    serializer_class = CouponSerializer

    def get_queryset(self):
        """Every coupon, newest first, with its use count."""
        return services.coupons(active=query_bool(self.request, "active"))

    @extend_schema(request=CouponWriteSerializer, responses={201: CouponSerializer})
    def post(self, request):
        """Create a coupon; 409 ``code_taken`` when the code exists in any case."""
        data = CouponWriteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        coupon = services.create_coupon(data=data.to_service(), actor=request.user)
        return Response(CouponSerializer(coupon).data, status=status.HTTP_201_CREATED)


class AdminCouponDetailView(APIView):
    """``PATCH`` and ``DELETE /admin/coupons/{coupon_id}``: edit, enable, disable or delete an unused coupon."""

    permission_classes = [IsAdmin]
    serializer_class = CouponSerializer

    @extend_schema(request=CouponWriteSerializer, responses={200: CouponSerializer})
    def patch(self, request, coupon_id):
        """Change the given fields only."""
        data = CouponWriteSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        coupon = services.update_coupon(coupon_id, data=data.to_service(), actor=request.user)
        return Response(CouponSerializer(coupon).data)

    @extend_schema(request=None, responses={204: None})
    def delete(self, request, coupon_id):
        """Delete; 409 ``in_use`` once redeemed (disable it instead)."""
        services.delete_coupon(coupon_id, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
