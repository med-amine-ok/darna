"""
HTTP endpoints of the bookings app (thin layer: rules live in ``services.py``).

- Guest: ``/me/bookings`` (create with an ``Idempotency-Key``, list, detail, cancel);
- Host: ``/host/bookings`` scoped to the active workspace (list, detail,
  accept, decline, cancel); another host's booking answers 404;
- Admin: ``/admin/bookings`` (list, detail, cancel), ``IsAdmin`` only.
"""

import json

from django.core.serializers.json import DjangoJSONEncoder
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsPhoneVerified
from apps.core import idempotency
from apps.core.errors import ForbiddenError
from apps.hosts.context import IsHost, get_host_context

from . import selectors, services
from .models import Booking
from .serializers import (
    AdminBookingSerializer,
    AdminCancelSerializer,
    BookingCreateSerializer,
    GuestBookingSerializer,
    HostBookingSerializer,
    ReasonSerializer,
)

# Logical name of booking creation in the idempotency table (BR-SYS-01).
CREATE_ENDPOINT = "bookings.create"


# ---------------------------------------------------------------------------
# Guest
# ---------------------------------------------------------------------------
class GuestBookingListCreateView(generics.ListAPIView):
    """
    ``GET /me/bookings`` (filter ``status``, paginated) and ``POST /me/bookings``.

    Creating needs a verified phone (DEC-012) and should carry an
    ``Idempotency-Key`` header: a retry with the same key returns the first
    answer and never books twice (BR-SYS-01).
    """

    serializer_class = GuestBookingSerializer
    throttle_scope = "booking"

    def get_permissions(self):
        """Any signed-in user may list; creating also needs a verified phone (DEC-012)."""
        if self.request.method == "POST":
            return [IsAuthenticated(), IsPhoneVerified()]
        return [IsAuthenticated()]

    def permission_denied(self, request, message=None, code=None):
        """Answer ``phone_not_verified`` (instead of a generic 403) when only the phone check failed."""
        if request.user and request.user.is_authenticated and not request.user.phone_verified:
            raise ForbiddenError("Verify your phone number first.", code="phone_not_verified")
        super().permission_denied(request, message=message, code=code)

    def get_queryset(self):
        """Only the caller's own bookings."""
        if getattr(self, "swagger_fake_view", False):  # schema generation runs without a user
            return Booking.objects.none()
        return selectors.guest_bookings(self.request.user, status=self.request.query_params.get("status"))

    def post(self, request):
        """Create a booking from a quote, once per ``Idempotency-Key``."""
        data = BookingCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        key = request.headers.get("Idempotency-Key")
        payload = {"quote_id": str(data.validated_data["quote_id"])}
        stored = idempotency.lookup(request.user, CREATE_ENDPOINT, key, payload)
        if stored:
            return Response(stored.response_body, status=stored.response_code)
        booking = services.create_booking(guest=request.user, quote_id=data.validated_data["quote_id"])
        # Plain JSON types (UUIDs, dates as text) so the answer can be stored for retries.
        body = json.loads(json.dumps(GuestBookingSerializer(booking).data, cls=DjangoJSONEncoder))
        idempotency.remember(request.user, CREATE_ENDPOINT, key, payload, status.HTTP_201_CREATED, body)
        return Response(body, status=status.HTTP_201_CREATED)


class GuestBookingDetailView(APIView):
    """``GET /me/bookings/{id_or_reference}``: one of the caller's bookings (address only once confirmed, BR-SRC-03)."""

    serializer_class = GuestBookingSerializer  # response shape, for the OpenAPI schema

    def get(self, request, key):
        """Return the booking, or 404 when it is not the caller's."""
        return Response(GuestBookingSerializer(selectors.get_guest_booking(request.user, key)).data)


class GuestBookingCancelView(APIView):
    """``POST /me/bookings/{id}/cancel``: the guest cancels (BR-CAN-01, BR-CAN-02)."""

    serializer_class = GuestBookingSerializer  # response shape, for the OpenAPI schema

    def post(self, request, key):
        """Cancel and return the booking with the refund the host owes."""
        data = ReasonSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        booking = services.cancel_by_guest(guest=request.user, booking_key=key, reason=data.validated_data["reason"])
        return Response(GuestBookingSerializer(booking).data)


# ---------------------------------------------------------------------------
# Host
# ---------------------------------------------------------------------------
class HostBookingListView(generics.ListAPIView):
    """``GET /host/bookings``: bookings of the active workspace (filters ``status``, ``listing``; needs ``bookings.view``)."""

    permission_classes = [IsHost]
    serializer_class = HostBookingSerializer

    def get_queryset(self):
        """Always scoped to ``ctx.host_account`` (OWASP API1)."""
        if getattr(self, "swagger_fake_view", False):  # schema generation runs without a user
            return Booking.objects.none()
        ctx = get_host_context(self.request)
        ctx.require("bookings.view")
        params = self.request.query_params
        return selectors.host_bookings(ctx.host_account, status=params.get("status"), listing=params.get("listing"))


class HostBookingDetailView(APIView):
    """``GET /host/bookings/{id}``: one booking of the active workspace, else 404."""

    serializer_class = HostBookingSerializer  # response shape, for the OpenAPI schema
    permission_classes = [IsHost]

    def get(self, request, key):
        """Return the booking as the host sees it."""
        ctx = get_host_context(request)
        ctx.require("bookings.view")
        return Response(HostBookingSerializer(selectors.get_host_booking(ctx.host_account, key)).data)


class HostBookingAcceptView(APIView):
    """``POST /host/bookings/{id}/accept``: confirm a request (BR-BKG-03, BR-PAY-10)."""

    serializer_class = HostBookingSerializer  # response shape, for the OpenAPI schema
    permission_classes = [IsHost]

    def post(self, request, key):
        """Accept and return the confirmed booking."""
        booking = services.accept_booking(ctx=get_host_context(request), booking_key=key, actor=request.user)
        return Response(HostBookingSerializer(booking).data)


class HostBookingDeclineView(APIView):
    """``POST /host/bookings/{id}/decline`` with ``{"reason"}``: refuse a request (BR-BKG-03)."""

    serializer_class = HostBookingSerializer  # response shape, for the OpenAPI schema
    permission_classes = [IsHost]

    def post(self, request, key):
        """Decline and return the booking; the dates are free again."""
        data = ReasonSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        booking = services.decline_booking(ctx=get_host_context(request), booking_key=key, actor=request.user,
                                           reason=data.validated_data["reason"])
        return Response(HostBookingSerializer(booking).data)


class HostBookingCancelView(APIView):
    """``POST /host/bookings/{id}/cancel`` with ``{"reason"}``: cancel a confirmed booking (BR-CAN-03)."""

    serializer_class = HostBookingSerializer  # response shape, for the OpenAPI schema
    permission_classes = [IsHost]

    def post(self, request, key):
        """Cancel; the guest is owed the full total and the commission comes back (DEC-018)."""
        data = ReasonSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        booking = services.cancel_by_host(ctx=get_host_context(request), booking_key=key, actor=request.user,
                                          reason=data.validated_data["reason"])
        return Response(HostBookingSerializer(booking).data)


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------
class AdminBookingListView(generics.ListAPIView):
    """``GET /admin/bookings``: every booking (filters ``status``, ``host``, ``listing``, ``guest``, ``reference``)."""

    permission_classes = [IsAdmin]
    serializer_class = AdminBookingSerializer

    def get_queryset(self):
        """Apply the query filters."""
        params = self.request.query_params
        return selectors.admin_bookings(
            status=params.get("status"), host=params.get("host"), listing=params.get("listing"),
            guest=params.get("guest"), reference=params.get("reference"),
        ).prefetch_related("events")


class AdminBookingDetailView(APIView):
    """``GET /admin/bookings/{id}``: any booking, with its history."""

    serializer_class = AdminBookingSerializer  # response shape, for the OpenAPI schema
    permission_classes = [IsAdmin]

    def get(self, request, key):
        """Return the booking as support sees it."""
        return Response(AdminBookingSerializer(selectors.get_admin_booking(key)).data)


class AdminBookingCancelView(APIView):
    """``POST /admin/bookings/{id}/cancel`` with ``{"reason", "refund_due_minor"?}`` (section 8, audited)."""

    serializer_class = AdminBookingSerializer  # response shape, for the OpenAPI schema
    permission_classes = [IsAdmin]

    def post(self, request, key):
        """Cancel any pending or confirmed booking."""
        data = AdminCancelSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        booking = services.cancel_by_admin(actor=request.user, booking_key=key, reason=data.validated_data["reason"],
                                           refund_due_minor=data.validated_data.get("refund_due_minor"))
        return Response(AdminBookingSerializer(booking).data)
