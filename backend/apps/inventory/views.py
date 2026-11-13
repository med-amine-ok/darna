"""
HTTP endpoints of the inventory app: public availability, host calendar, experience slots.

Host endpoints need the ``calendar.manage`` permission (BR-ORG-05) and only
reach listings of the active workspace (another host's listing is 404).
Calendar edits are live at once, without review (BR-LST-02).
"""

from datetime import timedelta

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog import selectors as catalog_selectors
from apps.catalog.api import query_date
from apps.catalog.models import InventoryKind, RoomType
from apps.catalog.views import host_listing_for, host_room_type_for
from apps.core.errors import DomainError, NotFoundError
from apps.core.timeutils import business_today

from . import selectors, services
from .models import ExperienceSlot, ListingDay, RoomTypeNight
from .serializers import (
    CalendarBlocksSerializer,
    CalendarPricesSerializer,
    HostSlotSerializer,
    RoomCalendarSerializer,
    SlotWriteSerializer,
)

DEFAULT_RANGE_DAYS = 30


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


class HostCalendarBlocksView(APIView):
    """``PUT /host/listings/{id}/calendar/blocks`` ``{dates, blocked}`` (homes, vehicles)."""

    def put(self, request, listing_id):
        """Close or open the given days."""
        listing = host_listing_for(request, listing_id, "calendar.manage")
        data = CalendarBlocksSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.set_days_blocked(listing, data.validated_data["dates"], data.validated_data["blocked"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class HostCalendarPricesView(APIView):
    """``PUT /host/listings/{id}/calendar/prices`` ``{dates, price_minor|null}`` (homes, vehicles)."""

    def put(self, request, listing_id):
        """Set or remove a special price on the given days."""
        listing = host_listing_for(request, listing_id, "calendar.manage")
        data = CalendarPricesSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.set_day_prices(listing, data.validated_data["dates"], data.validated_data["price_minor"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class HostRoomCalendarView(APIView):
    """``PUT /host/room-types/{id}/calendar`` ``{dates, total?, price_minor?}`` (hotels, hostels)."""

    def put(self, request, room_type_id):
        """Change sellable units and/or special price on the given nights."""
        room = host_room_type_for(request, room_type_id, "calendar.manage")
        data = RoomCalendarSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        services.set_room_nights(
            room, values["dates"], total=values.get("total"),
            price_minor=values.get("price_minor"), set_price="price_minor" in values,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class HostSlotListView(APIView):
    """``GET`` and ``POST /host/listings/{id}/slots`` (experiences)."""

    def get(self, request, listing_id):
        """Every slot of the experience, optionally ``?from=&to=``."""
        listing = host_listing_for(request, listing_id, "calendar.manage")
        slots = ExperienceSlot.objects.filter(listing=listing).select_related("listing")
        if start := query_date(request, "from"):
            slots = slots.filter(starts_at__date__gte=start)
        if end := query_date(request, "to"):
            slots = slots.filter(starts_at__date__lt=end)
        return Response(HostSlotSerializer(slots, many=True).data)

    def post(self, request, listing_id):
        """Add a slot."""
        listing = host_listing_for(request, listing_id, "calendar.manage")
        data = SlotWriteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        slot = services.create_slot(listing, data.validated_data)
        return Response(HostSlotSerializer(slot).data, status=status.HTTP_201_CREATED)


class HostSlotDetailView(APIView):
    """``PATCH`` and ``DELETE /host/listings/{id}/slots/{slot_id}``."""

    def _slot(self, request, listing_id, slot_id) -> ExperienceSlot:
        """One slot of one of my experiences, else 404."""
        listing = host_listing_for(request, listing_id, "calendar.manage")
        slot = ExperienceSlot.objects.filter(listing=listing, id=slot_id).select_related("listing").first()
        if slot is None:
            raise NotFoundError("Slot not found.")
        return slot

    def patch(self, request, listing_id, slot_id):
        """Change times, seats or price."""
        slot = self._slot(request, listing_id, slot_id)
        data = SlotWriteSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        slot = services.update_slot(slot, data.validated_data)
        return Response(HostSlotSerializer(slot).data)

    def delete(self, request, listing_id, slot_id):
        """Delete an empty slot, or cancel one with seats taken."""
        services.delete_slot(self._slot(request, listing_id, slot_id))
        return Response(status=status.HTTP_204_NO_CONTENT)
