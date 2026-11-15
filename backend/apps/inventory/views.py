"""
HTTP endpoints of the inventory app: public availability, host calendar, experience slots.

Host endpoints need the ``calendar.manage`` permission (BR-ORG-05) and only
reach listings of the active workspace (another host's listing is 404).
Calendar edits are live at once, without review (BR-LST-02).
"""

import uuid
from datetime import timedelta

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import generics, serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.audit import services as audit
from apps.catalog import selectors as catalog_selectors
from apps.catalog.api import query_date
from apps.catalog.models import InventoryKind, RoomType
from apps.catalog.views import host_listing_for
from apps.core import outbox
from apps.core.errors import DomainError, NotFoundError
from apps.core.models import OutboxMessage
from apps.core.timeutils import business_today
from apps.hosts.context import get_host_context

from . import selectors, services
from .models import ExperienceSlot, InventoryConflict, ListingDay, RoomTypeNight
from .serializers import (
    CalendarBlocksSerializer,
    CalendarPricesSerializer,
    CalendarResponseSerializer,
    ConflictResolveSerializer,
    HostSlotSerializer,
    InventoryConflictSerializer,
    OutboxMessageSerializer,
    SlotWriteSerializer,
)

DEFAULT_RANGE_DAYS = 30


# OpenAPI only: ``?from=&to=`` of the host calendar and slot lists.
RANGE_PARAMETERS = [
    OpenApiParameter("from", OpenApiTypes.DATE, description="First day (default today)."),
    OpenApiParameter("to", OpenApiTypes.DATE, description="Day after the last one (default from + 30 days)."),
]

# OpenAPI only: the host calendar answer. Exactly one of ``days`` (single
# unit), ``room_types`` (room pool) or ``slots`` (experience) is present.
HOST_CALENDAR_SCHEMA = inline_serializer(
    "HostCalendar",
    {
        "listing_id": serializers.UUIDField(),
        "inventory_kind": serializers.CharField(),
        "from": serializers.DateField(),
        "to": serializers.DateField(),
        "days": serializers.ListField(child=serializers.DictField(), required=False),
        "room_types": serializers.ListField(child=serializers.DictField(), required=False),
        "slots": HostSlotSerializer(many=True, required=False),
    },
)


def calendar_range(request):
    """
    Read ``?from=&to=`` (``to`` exclusive). Defaults: today in Algeria and 30
    days later. At most 366 days, so one call stays cheap.
    """
    start = query_date(request, "from") or business_today()
    end = query_date(request, "to") or start + timedelta(days=DEFAULT_RANGE_DAYS)
    if end <= start or (end - start).days > services.MAX_CALENDAR_DAYS:
        raise DomainError("Invalid date range.", code="invalid", errors={"to": ["After from, at most 366 days later."]})
    return start, end


@extend_schema(
    summary="Public listing availability",
    description="Free or not, with reason and price, per day (or per room type, or per slot).",
    responses={200: serializers.DictField()},
    tags=["inventory"],
)
class ListingAvailabilityView(APIView):
    """``GET /listings/{id}/availability?from=&to=&room_type_id=``: public calendar of a public listing."""

    permission_classes = [AllowAny]

    def get(self, request, listing_id):
        """Free or not, with reason and price, per day (or per room type, or per slot)."""
        listing = catalog_selectors.get_public_listing(str(listing_id))
        start, end = calendar_range(request)
        return Response(
            selectors.public_availability(listing, start, end, room_type_id=request.query_params.get("room_type_id"))
        )


def _single_days(listing, start, end) -> list[dict]:
    """Host calendar rows of a home or vehicle: block, booked flag and price per day."""
    stored = {d.day: d for d in ListingDay.objects.filter(listing=listing, day__gte=start, day__lt=end)}
    booked = selectors.booked_ranges([listing.id], start, end).get(listing.id, [])
    rows = []
    for day, price in selectors.nightly_prices(listing, start, end):
        row = stored.get(day)
        rows.append({
            "date": day.isoformat(),
            "is_blocked": bool(row and row.is_blocked),
            "is_booked": any(first <= day < last for first, last in booked),
            "price_minor": price,
            "has_price_override": bool(row and row.price_override_minor is not None),
        })
    return rows


def _room_type_rows(listing, start, end) -> list[dict]:
    """Host calendar rows of a hotel or hostel: per room type, total, held, booked and price per night."""
    result = []
    for room in RoomType.objects.alive().filter(listing=listing):
        stored = {r.night: r for r in RoomTypeNight.objects.filter(room_type=room, night__gte=start, night__lt=end)}
        nights = []
        for day, price in selectors.nightly_prices(listing, start, end, room_type=room):
            row = stored.get(day)
            nights.append({
                "date": day.isoformat(),
                "total": row.total if row else room.unit_count,
                "held": row.held if row else 0,
                "booked": row.booked if row else 0,
                "price_minor": price,
            })
        result.append({"room_type_id": str(room.id), "name": room.name, "unit_count": room.unit_count, "nights": nights})
    return result


class HostCalendarView(APIView):
    """``GET /host/listings/{id}/calendar?from=&to=``: the host's view of the calendar."""

    @extend_schema(parameters=RANGE_PARAMETERS, responses=HOST_CALENDAR_SCHEMA)
    def get(self, request, listing_id):
        """Single unit: days; hotels: per room type counters; experiences: slots."""
        listing = host_listing_for(request, listing_id, "calendar.manage")
        start, end = calendar_range(request)
        body = {"listing_id": str(listing.id), "inventory_kind": listing.inventory_kind,
                "from": start.isoformat(), "to": end.isoformat()}
        if listing.inventory_kind == InventoryKind.SINGLE:
            body["days"] = _single_days(listing, start, end)
        elif listing.inventory_kind == InventoryKind.ROOM_POOL:
            body["room_types"] = _room_type_rows(listing, start, end)
        else:
            slots = ExperienceSlot.objects.filter(listing=listing, starts_at__date__gte=start, starts_at__date__lt=end)
            body["slots"] = HostSlotSerializer(slots.select_related("listing"), many=True).data
        return Response(body)


def _selected_room_type(listing, room_type_id) -> RoomType | None:
    """The room type named by ``room_type_id`` (one of this listing's, else 404), or None for the whole listing."""
    if not room_type_id:
        return None
    room = RoomType.objects.alive().filter(id=room_type_id, listing=listing).first()
    if room is None:
        raise NotFoundError("Room type not found.")
    return room


def _check_no_past_days(days) -> None:
    """Blocks only on today or later (DateSelection: no past days for blocks)."""
    today = business_today()
    past = sorted(d.isoformat() for d in days if d < today)
    if past:
        raise DomainError("Past days cannot be blocked.", code="validation_failed", status_code=422,
                          errors={"dates": past})


class HostCalendarBlocksView(APIView):
    """
    ``PUT /host/listings/{id}/calendar/blocks`` ``CalendarBlocks``: close or
    open days of a home or vehicle, or nights of one room type
    (``room_type_id``) of a hotel or hostel (BR-AVL-04, AVL-03).
    """

    @extend_schema(request=CalendarBlocksSerializer, responses={204: None})
    def put(self, request, listing_id):
        """Close or open the chosen days; 409 ``dates_booked`` or ``night_booked`` when already sold."""
        listing = host_listing_for(request, listing_id, "calendar.manage")
        data = CalendarBlocksSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        if values["blocked"]:
            _check_no_past_days(values["days"])
        room = _selected_room_type(listing, values.get("room_type_id"))
        if room is not None:
            services.set_room_nights_blocked(room, values["days"], values["blocked"])
        else:
            services.set_days_blocked(listing, values["days"], values["blocked"], note=values.get("note"))
        return Response(status=status.HTTP_204_NO_CONTENT)


class HostCalendarPricesView(APIView):
    """
    ``PUT /host/listings/{id}/calendar/prices`` ``CalendarPrices``: set or
    remove (``null``) a special price on days of a home or vehicle, or on
    nights of one room type (``room_type_id``). Live at once (BR-LST-02).
    """

    @extend_schema(request=CalendarPricesSerializer, responses={204: None})
    def put(self, request, listing_id):
        """Set or remove the special price on the chosen days."""
        listing = host_listing_for(request, listing_id, "calendar.manage")
        data = CalendarPricesSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        room = _selected_room_type(listing, values.get("room_type_id"))
        if room is not None:
            services.set_room_nights(room, values["days"], price_minor=values["price_minor"], set_price=True)
        else:
            services.set_day_prices(listing, values["days"], values["price_minor"])
        return Response(status=status.HTTP_204_NO_CONTENT)


# Longest window of ``GET /host/calendar``, in days (openapi: to is at most 400 days after from).
MAX_HOST_CALENDAR_DAYS = 400
# Most listings in one ``GET /host/calendar`` call (openapi: listing_ids maxItems 50).
MAX_HOST_CALENDAR_LISTINGS = 50


class HostMultiCalendarView(APIView):
    """
    ``GET /host/calendar?listing_ids=&from=&to=``: calendar of several listings
    of the active workspace in one call (AVL-03, BR-AVL-04). Any active member may read it.
    """

    @extend_schema(
        parameters=[
            OpenApiParameter("listing_ids", str, description="Comma list of listing ids (max 50). Default: all."),
            OpenApiParameter("from", OpenApiTypes.DATE, required=True, description="First day."),
            OpenApiParameter("to", OpenApiTypes.DATE, required=True,
                             description="Day after the last one (half-open), at most 400 days after from."),
        ],
        responses=CalendarResponseSerializer,
    )
    def get(self, request):
        """Rows per listing (and per room type for hotels and hostels) with the state of each day."""
        ctx = get_host_context(request)
        start, end = query_date(request, "from"), query_date(request, "to")
        if start is None or end is None:
            missing = "from" if start is None else "to"
            raise DomainError("Send from and to.", code="invalid", errors={missing: ["Required."]})
        if end <= start or (end - start).days > MAX_HOST_CALENDAR_DAYS:
            raise DomainError("Invalid date range.", code="invalid",
                              errors={"to": [f"After from, at most {MAX_HOST_CALENDAR_DAYS} days later."]})
        listings = catalog_selectors.host_listings(ctx.host_account).order_by("created_at")
        raw_ids = [i.strip() for i in (request.query_params.get("listing_ids") or "").split(",") if i.strip()]
        if raw_ids:
            if len(raw_ids) > MAX_HOST_CALENDAR_LISTINGS:
                raise DomainError("Too many listings.", code="invalid",
                                  errors={"listing_ids": [f"At most {MAX_HOST_CALENDAR_LISTINGS}."]})
            try:
                wanted = {uuid.UUID(i) for i in raw_ids}
            except ValueError as exc:
                raise DomainError("Invalid listing id.", code="invalid", errors={"listing_ids": ["UUIDs."]}) from exc
            listings = listings.filter(id__in=wanted)
            if listings.count() != len(wanted):
                raise NotFoundError("Listing not found.")
        rows = selectors.host_calendar(list(listings), start, end)
        return Response({"from": start.isoformat(), "to": end.isoformat(), "results": rows})


class HostSlotListView(APIView):
    """``GET`` and ``POST /host/listings/{id}/slots`` (experiences)."""

    @extend_schema(parameters=RANGE_PARAMETERS, responses=HostSlotSerializer(many=True))
    def get(self, request, listing_id):
        """Every slot of the experience, optionally ``?from=&to=``."""
        listing = host_listing_for(request, listing_id, "calendar.manage")
        slots = ExperienceSlot.objects.filter(listing=listing).select_related("listing")
        if start := query_date(request, "from"):
            slots = slots.filter(starts_at__date__gte=start)
        if end := query_date(request, "to"):
            slots = slots.filter(starts_at__date__lt=end)
        return Response(HostSlotSerializer(slots, many=True).data)

    @extend_schema(request=SlotWriteSerializer, responses={201: HostSlotSerializer})
    def post(self, request, listing_id):
        """Add a slot."""
        listing = host_listing_for(request, listing_id, "calendar.manage")
        data = SlotWriteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        slot = services.create_slot(listing, data.validated_data)
        return Response(HostSlotSerializer(slot).data, status=status.HTTP_201_CREATED)


class HostSlotDetailView(APIView):
    """``PATCH /host/listings/{id}/slots/{slot_id}``: times, seats, price, or ``is_cancelled`` to close it."""

    def _slot(self, request, listing_id, slot_id) -> ExperienceSlot:
        """One slot of one of my experiences, else 404."""
        listing = host_listing_for(request, listing_id, "calendar.manage")
        slot = ExperienceSlot.objects.filter(listing=listing, id=slot_id).select_related("listing").first()
        if slot is None:
            raise NotFoundError("Slot not found.")
        return slot

    @extend_schema(request=SlotWriteSerializer, responses=HostSlotSerializer)
    def patch(self, request, listing_id, slot_id):
        """Change times, seats or price, or cancel (409 ``inventory_in_use`` below the seats taken)."""
        slot = self._slot(request, listing_id, slot_id)
        data = SlotWriteSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        slot = services.update_slot(slot, data.validated_data)
        return Response(HostSlotSerializer(slot).data)


# ---------------------------------------------------------------------------
# Admin: hotel sync conflicts and failed deliveries (review R3, R14)
# ---------------------------------------------------------------------------
class AdminInventoryConflictListView(generics.ListAPIView):
    """``GET /admin/inventory-conflicts`` (filter ``status``, default open first)."""

    permission_classes = [IsAdmin]
    serializer_class = InventoryConflictSerializer
    filterset_fields = ["status"]
    queryset = InventoryConflict.objects.select_related("room_type")


class AdminInventoryConflictResolveView(APIView):
    """``POST /admin/inventory-conflicts/{id}/resolve``: close a conflict with a note (audited)."""

    permission_classes = [IsAdmin]
    serializer_class = ConflictResolveSerializer

    def post(self, request, conflict_id):
        """Resolve and return the conflict."""
        data = ConflictResolveSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        conflict = services.resolve_conflict(conflict_id, actor=request.user, note=data.validated_data["note"])
        audit.record(actor=request.user, action="INVENTORY_CONFLICT_RESOLVE", obj=conflict,
                     note=data.validated_data["note"])
        return Response(InventoryConflictSerializer(conflict).data)


class AdminOutboxListView(generics.ListAPIView):
    """``GET /admin/outbox`` (filters ``status``, ``topic``): watch failed deliveries, ``status=dead`` first."""

    permission_classes = [IsAdmin]
    serializer_class = OutboxMessageSerializer
    filterset_fields = ["status", "topic"]
    queryset = OutboxMessage.objects.all()


class AdminOutboxRetryView(APIView):
    """``POST /admin/outbox/{id}/retry``: queue a dead message again for an immediate attempt (audited)."""

    permission_classes = [IsAdmin]
    serializer_class = OutboxMessageSerializer

    def post(self, request, message_id):
        """Reset attempts and return the message."""
        if not OutboxMessage.objects.filter(pk=message_id).exists():
            raise NotFoundError("Message not found.")
        message = outbox.retry(message_id)
        audit.record(actor=request.user, action="OUTBOX_RETRY", obj=message)
        return Response(OutboxMessageSerializer(message).data)
