"""
HTTP endpoints of the trips app: public search and pages, agency management, admin review.

Host endpoints need ``trips.manage`` (BR-ORG-05) and are scoped by
``ctx.host_account``; admin endpoints use ``IsAdmin`` and are audited.
"""

import uuid

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.catalog.api import page_schema, paginated, query_bool, query_date, query_int
from apps.catalog.serializers import AdminStatusChangeSerializer, HostStatusChangeSerializer
from apps.core.errors import DomainError, NotFoundError
from apps.hosts.context import get_host_context

from . import selectors, services
from .models import TripDeparture
from .serializers import (
    AdminTripSerializer,
    DepartureSerializer,
    DepartureWriteSerializer,
    HostDepartureSerializer,
    HostTripSerializer,
    TripCardSerializer,
    TripDetailSerializer,
    TripPhotoSerializer,
    TripWriteSerializer,
)


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------
def _uuid_param(request, name: str) -> str | None:
    """An optional UUID query parameter; 400 ``invalid`` when it is not a UUID."""
    raw = request.query_params.get(name) or None
    if raw:
        try:
            uuid.UUID(raw)
        except ValueError as exc:
            raise DomainError("Invalid query parameter.", code="invalid", errors={name: ["Must be a UUID."]}) from exc
    return raw


class TripSearchView(APIView):
    """``GET /trips``: filters ``trip_type``, ``wilaya``, ``max_price``, ``from``/``to``, ``host_account``, ``sort``."""

    permission_classes = [AllowAny]
    serializer_class = TripCardSerializer

    def get(self, request):
        """Page of trip cards."""
        qs = selectors.search_trips(
            trip_type=request.query_params.get("trip_type"), wilaya=query_int(request, "wilaya"),
            max_price=query_int(request, "max_price", minimum=0), date_from=query_date(request, "from"),
            date_to=query_date(request, "to"), sort=request.query_params.get("sort"),
            host_account=_uuid_param(request, "host_account"),
        )
        return paginated(request, qs, TripCardSerializer)


class TripDetailView(APIView):
    """``GET /trips/{id_or_slug}``: public trip page."""

    permission_classes = [AllowAny]
    serializer_class = TripDetailSerializer

    def get(self, request, key):
        """The trip, if public, else 404."""
        trip = selectors.get_public_trip(key)
        return Response(TripDetailSerializer(trip, context={"request": request}).data)


class TripDeparturesView(APIView):
    """``GET /trips/{id_or_slug}/departures``: upcoming open departures with seats left."""

    permission_classes = [AllowAny]
    serializer_class = DepartureSerializer

    def get(self, request, key):
        """Departures of a public trip."""
        trip = selectors.get_public_trip(key)
        return Response(DepartureSerializer(selectors.upcoming_departures(trip), many=True).data)


# ---------------------------------------------------------------------------
# Host (agency)
# ---------------------------------------------------------------------------
def host_trip_for(request, trip_id):
    """Resolve the workspace, require ``trips.manage``, load one of its trips (404 otherwise)."""
    ctx = get_host_context(request)
    ctx.require("trips.manage")
    return selectors.get_host_trip(ctx.host_account, trip_id)


def _trip_response(request, trip, status_code=status.HTTP_200_OK):
    """Reload and answer with the host shape."""
    trip.refresh_from_db()
    return Response(HostTripSerializer(trip, context={"request": request}).data, status=status_code)


class HostTripListView(APIView):
    """``GET`` and ``POST /host/trips``."""

    @extend_schema(responses=page_schema(HostTripSerializer))
    def get(self, request):
        """Trips of the active workspace."""
        ctx = get_host_context(request)
        ctx.require("trips.manage")
        return paginated(request, selectors.host_trips(ctx.host_account), HostTripSerializer)

    @extend_schema(request=TripWriteSerializer, responses={201: HostTripSerializer})
    def post(self, request):
        """Create a draft trip; only approved agencies (BR-TRP-01)."""
        ctx = get_host_context(request)
        ctx.require("trips.manage")
        data = TripWriteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        trip = services.create_trip(ctx.host_account, data.validated_data)
        return _trip_response(request, trip, status.HTTP_201_CREATED)


class HostTripDetailView(APIView):
    """``GET``, ``PATCH``, ``DELETE`` (soft) ``/host/trips/{id}``."""

    @extend_schema(responses=HostTripSerializer)
    def get(self, request, trip_id):
        """One of my trips."""
        return _trip_response(request, host_trip_for(request, trip_id))

    @extend_schema(request=TripWriteSerializer, responses=HostTripSerializer)
    def patch(self, request, trip_id):
        """Partial update; reviewed fields of a live trip send it back to review."""
        trip = host_trip_for(request, trip_id)
        data = TripWriteSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        services.update_trip(trip, data.validated_data)
        return _trip_response(request, trip)

    @extend_schema(responses={204: None})
    def delete(self, request, trip_id):
        """Soft delete."""
        services.delete_trip(host_trip_for(request, trip_id))
        return Response(status=status.HTTP_204_NO_CONTENT)


class HostTripStatusView(APIView):
    """
    ``POST /host/trips/{id}/status`` ``{status, note?}``: submit, withdraw,
    pause, resume or archive a trip (BR-LST-03, table 4a; going live always
    passes review, DEC-003).
    """

    @extend_schema(request=HostStatusChangeSerializer, responses=HostTripSerializer)
    def post(self, request, trip_id):
        """Apply the move; 409 ``invalid_transition``, 422 ``listing_incomplete`` on submit."""
        trip = host_trip_for(request, trip_id)
        data = HostStatusChangeSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.change_host_trip_status(trip, data.validated_data["status"])
        return _trip_response(request, trip)


class HostTripPhotoView(APIView):
    """
    ``POST /host/trips/{id}/photos`` ``{url, caption?, is_cover?}``. Kept
    until the media app exists: the plan sets trip photos with
    ``TripWrite.photo_media_ids``, which needs media assets (BR-MED-01).
    """

    @extend_schema(request=TripPhotoSerializer, responses={201: TripPhotoSerializer})
    def post(self, request, trip_id):
        """Add a photo."""
        trip = host_trip_for(request, trip_id)
        data = TripPhotoSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        photo = services.add_photo(trip, url=values["url"], caption=values.get("caption", ""),
                                   is_cover=values.get("is_cover", False))
        return Response(TripPhotoSerializer(photo).data, status=status.HTTP_201_CREATED)


class HostDepartureListView(APIView):
    """``GET`` and ``POST /host/trips/{id}/departures``."""

    @extend_schema(responses=HostDepartureSerializer(many=True))
    def get(self, request, trip_id):
        """Every departure of the trip."""
        trip = host_trip_for(request, trip_id)
        return Response(HostDepartureSerializer(trip.departures.all(), many=True).data)

    @extend_schema(request=DepartureWriteSerializer, responses={201: HostDepartureSerializer})
    def post(self, request, trip_id):
        """Add a departure."""
        trip = host_trip_for(request, trip_id)
        data = DepartureWriteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        departure = services.create_departure(trip, data.validated_data)
        return Response(HostDepartureSerializer(departure).data, status=status.HTTP_201_CREATED)


def _departure(request, trip_id, departure_id) -> TripDeparture:
    """One departure of one of my trips, else 404."""
    trip = host_trip_for(request, trip_id)
    departure = trip.departures.filter(id=departure_id).select_related("trip").first()
    if departure is None:
        raise NotFoundError("Departure not found.")
    return departure


class HostDepartureDetailView(APIView):
    """``PATCH /host/trips/{id}/departures/{departure_id}`` (cancelling uses the cancel endpoint)."""

    @extend_schema(request=DepartureWriteSerializer, responses=HostDepartureSerializer)
    def patch(self, request, trip_id, departure_id):
        """Change dates, seats, price or status."""
        departure = _departure(request, trip_id, departure_id)
        data = DepartureWriteSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        departure = services.update_departure(departure, data.validated_data)
        return Response(HostDepartureSerializer(departure).data)


class HostDepartureCancelView(APIView):
    """``POST /host/trips/{id}/departures/{departure_id}/cancel``."""

    @extend_schema(request=None, responses=HostDepartureSerializer)
    def post(self, request, trip_id, departure_id):
        """Mark the departure cancelled (bookings are handled by the bookings app, BR-TRP-03)."""
        departure = services.cancel_departure(_departure(request, trip_id, departure_id))
        return Response(HostDepartureSerializer(departure).data)


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------
class AdminTripListView(APIView):
    """``GET /admin/trips``: filters ``status``, ``trip_type``, ``host``, ``deleted``."""

    permission_classes = [IsAdmin]
    serializer_class = AdminTripSerializer

    def get(self, request):
        """Page of trips, oldest submission first."""
        qs = selectors.admin_trips(
            status=request.query_params.get("status"), trip_type=request.query_params.get("trip_type"),
            host=request.query_params.get("host"), deleted=bool(query_bool(request, "deleted")),
        )
        return paginated(request, qs, AdminTripSerializer)


class AdminTripDetailView(APIView):
    """``GET /admin/trips/{id}``."""

    permission_classes = [IsAdmin]
    serializer_class = AdminTripSerializer

    def get(self, request, trip_id):
        """Any trip."""
        return Response(AdminTripSerializer(selectors.get_admin_trip(trip_id), context={"request": request}).data)


class AdminTripStatusView(APIView):
    """
    ``POST /admin/trips/{id}/status`` ``{status, reason_code?, reason?}``:
    approve, reject, request changes, suspend, unsuspend, delete or restore
    a trip (table 4a, BR-LST-03, BR-STF-02). Audited.
    """

    permission_classes = [IsAdmin]

    @extend_schema(request=AdminStatusChangeSerializer, responses=AdminTripSerializer)
    def post(self, request, trip_id):
        """Apply the move (409 ``invalid_transition``, 422 ``reason_required``) and return the trip."""
        trip = selectors.get_admin_trip(trip_id)
        data = AdminStatusChangeSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        services.admin_change_trip_status(
            trip, values["status"], actor=request.user, reason=values.get("reason"),
            reason_code=values.get("reason_code") or None,
        )
        trip.refresh_from_db()
        return Response(AdminTripSerializer(trip, context={"request": request}).data)
