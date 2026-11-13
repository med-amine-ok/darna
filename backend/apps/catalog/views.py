"""
HTTP endpoints of the catalog app.

Three audiences:
- public (``AllowAny``): search, listing page, reference lists;
- host (``/host/...``): every query is scoped by ``ctx.host_account`` and
  needs the ``listings.manage`` permission (BR-ORG-05), so another host's
  listing answers 404;
- admin (``/admin/...``, ``IsAdmin``): review queue and decisions, audited.

Views are thin: read the input, call ``services``/``selectors``, return JSON.
"""

from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.core.errors import NotFoundError
from apps.hosts.context import get_host_context

from . import selectors, services, workflow
from .api import paginated, query_bbox, query_bool, query_int, date_pair
from .models import ListingPhoto, PropertyService, RoomType
from .serializers import (
    AdminListingRowSerializer,
    AdminListingSerializer,
    AmenitySerializer,
    CancellationPolicySerializer,
    CategorySerializer,
    HostListingSerializer,
    HostRoomTypeSerializer,
    ListingCardSerializer,
    ListingDetailSerializer,
    ListingWriteSerializer,
    PhotoOrderSerializer,
    PhotoSerializer,
    PhotoUpdateSerializer,
    PhotoWriteSerializer,
    PropertyServiceSerializer,
    PropertyServiceWriteSerializer,
    PropertyTypeSerializer,
    ReferenceTypeSerializer,
    RoomTypeWriteSerializer,
)
from .types import EXPERIENCE_TYPE_LABELS, TRIP_TYPE_LABELS, type_list


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------
class ListingSearchView(APIView):
    """``GET /listings``: public search with filters, dates and map box (BR-SRC-01, BR-AVL-05)."""

    permission_classes = [AllowAny]
    serializer_class = ListingCardSerializer

    def get(self, request):
        """Return a page of listing cards. See ``selectors.search_listings`` for every filter."""
        check_in, check_out = date_pair(request, "check_in", "check_out")
        results = selectors.search_listings(
            vertical=request.query_params.get("vertical"),
            wilaya=query_int(request, "wilaya"),
            commune=query_int(request, "commune"),
            guests=query_int(request, "guests", minimum=1),
            min_price=query_int(request, "min_price", minimum=0),
            max_price=query_int(request, "max_price", minimum=0),
            property_type=request.query_params.get("property_type"),
            amenities=request.query_params.get("amenities"),
            exp_type=request.query_params.get("exp_type"),
            instant=query_bool(request, "instant"),
            check_in=check_in,
            check_out=check_out,
            bbox=query_bbox(request),
            sort=request.query_params.get("sort"),
        )
        return paginated(request, results, ListingCardSerializer)


class ListingDetailView(APIView):
    """``GET /listings/{id_or_reference}``: the public listing page."""

    permission_classes = [AllowAny]
    serializer_class = ListingDetailSerializer

    def get(self, request, key):
        """Return the listing if it is public (BR-SRC-01), else 404."""
        listing = selectors.get_public_listing(key)
        return Response(ListingDetailSerializer(listing, context={"request": request}).data)


class ListingServicesView(APIView):
    """``GET /listings/{id}/services``: services of a public hotel or hostel (DEC-017)."""

    permission_classes = [AllowAny]
    serializer_class = PropertyServiceSerializer

    def get(self, request, key):
        """Active services of the listing."""
        listing = selectors.get_public_listing(key)
        services_qs = listing.services.filter(is_active=True).select_related("listing")
        return Response(PropertyServiceSerializer(services_qs, many=True).data)


class AmenityListView(APIView):
    """``GET /reference/amenities``."""

    permission_classes = [AllowAny]
    serializer_class = AmenitySerializer

    def get(self, request):
        """Active amenities (optionally ``?vertical=home``)."""
        rows = list(selectors.reference_amenities())
        vertical = request.query_params.get("vertical")
        if vertical:
            rows = [a for a in rows if vertical in (a.applies_to or [])]
        return Response(AmenitySerializer(rows, many=True).data)


class PropertyTypeListView(APIView):
    """``GET /reference/property-types``."""

    permission_classes = [AllowAny]
    serializer_class = PropertyTypeSerializer

    def get(self, request):
        """Active property types (optionally ``?vertical=home``)."""
        rows = selectors.reference_property_types()
        if vertical := request.query_params.get("vertical"):
            rows = rows.filter(vertical=vertical)
        return Response(PropertyTypeSerializer(rows, many=True).data)


class CategoryListView(APIView):
    """``GET /reference/categories``."""

    permission_classes = [AllowAny]
    serializer_class = CategorySerializer

    def get(self, request):
        """Active categories (optionally ``?vertical=home``)."""
        rows = selectors.reference_categories()
        if vertical := request.query_params.get("vertical"):
            rows = rows.filter(vertical=vertical)
        return Response(CategorySerializer(rows, many=True).data)


class CancellationPolicyListView(APIView):
    """``GET /reference/cancellation-policies``: current flexible, moderate, strict (BR-CAN-01)."""

    permission_classes = [AllowAny]
    serializer_class = CancellationPolicySerializer

    def get(self, request):
        """The current version of each policy."""
        return Response(CancellationPolicySerializer(selectors.current_policies(), many=True).data)


class ExperienceTypeListView(APIView):
    """``GET /reference/experience-types``: the 8 experience types with en/fr/ar labels (BR-LST-05)."""

    permission_classes = [AllowAny]
    serializer_class = ReferenceTypeSerializer

    def get(self, request):
        """Fixed list from ``types.py``."""
        return Response(type_list(EXPERIENCE_TYPE_LABELS))


class TripTypeListView(APIView):
    """``GET /reference/trip-types``: the 8 trip types with en/fr/ar labels (BR-LST-05)."""

    permission_classes = [AllowAny]
    serializer_class = ReferenceTypeSerializer

    def get(self, request):
        """Fixed list from ``types.py``."""
        return Response(type_list(TRIP_TYPE_LABELS))


# ---------------------------------------------------------------------------
# Host
# ---------------------------------------------------------------------------
def host_listing_for(request, listing_id, permission: str = "listings.manage"):
    """
    Resolve the host workspace, check the role permission, and load one of
    its listings (404 for anyone else's). Used by catalog and inventory host views.
    """
    ctx = get_host_context(request)
    ctx.require(permission)
    return selectors.get_host_listing(ctx.host_account, listing_id)


def _host_listing_response(request, listing, status_code=status.HTTP_200_OK):
    """Reload the listing and answer with the host shape."""
    listing.refresh_from_db()
    return Response(HostListingSerializer(listing, context={"request": request}).data, status=status_code)


class HostListingListView(APIView):
    """``GET /host/listings`` (my listings) and ``POST /host/listings`` (new draft)."""

    def get(self, request):
        """Listings of the active workspace, optionally ``?status=draft,published``."""
        ctx = get_host_context(request)
        ctx.require("listings.manage")
        qs = selectors.host_listings(ctx.host_account)
        if status_filter := request.query_params.get("status"):
            qs = qs.filter(status__in=status_filter.split(","))
        return paginated(request, qs, HostListingSerializer)

    def post(self, request):
        """Create a draft; refused with 403 ``host_offer_not_allowed`` for a wrong vertical (DEC-014)."""
        ctx = get_host_context(request)
        ctx.require("listings.manage")
        data = ListingWriteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        listing = services.create_listing(ctx.host_account, data.validated_data)
        return _host_listing_response(request, listing, status.HTTP_201_CREATED)


class HostListingDetailView(APIView):
    """``GET``, ``PATCH`` and ``DELETE`` (soft) ``/host/listings/{id}``."""

    def get(self, request, listing_id):
        """One of my listings, with private fields."""
        return _host_listing_response(request, host_listing_for(request, listing_id))

    def patch(self, request, listing_id):
        """Partial update; reviewed fields of a live listing send it back to review (BR-LST-02)."""
        listing = host_listing_for(request, listing_id)
        data = ListingWriteSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        services.update_listing(listing, data.validated_data)
        return _host_listing_response(request, listing)

    def delete(self, request, listing_id):
        """Soft delete (an admin can restore it)."""
        services.delete_listing(host_listing_for(request, listing_id))
        return Response(status=status.HTTP_204_NO_CONTENT)


class HostListingActionView(APIView):
    """``POST /host/listings/{id}/submit|pause|resume|archive|withdraw|reopen`` (BR-LST-03)."""

    action_name = ""

    def post(self, request, listing_id):
        """Apply the status move named by the URL."""
        listing = host_listing_for(request, listing_id)
        if self.action_name == "submit":
            services.submit_listing(listing)
        else:
            services.host_move(listing, self.action_name)
        return _host_listing_response(request, listing)


class HostRoomTypeListView(APIView):
    """``GET`` and ``POST /host/listings/{id}/room-types`` (hotels and hostels)."""

    def get(self, request, listing_id):
        """Every non-deleted room type of the listing."""
        listing = host_listing_for(request, listing_id)
        rooms = RoomType.objects.alive().filter(listing=listing).select_related("listing")
        return Response(HostRoomTypeSerializer(rooms, many=True).data)

    def post(self, request, listing_id):
        """Add a room type."""
        listing = host_listing_for(request, listing_id)
        data = RoomTypeWriteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        room = services.create_room_type(listing, data.validated_data)
        return Response(HostRoomTypeSerializer(room).data, status=status.HTTP_201_CREATED)


def host_room_type_for(request, room_type_id, permission: str = "listings.manage") -> RoomType:
    """One non-deleted room type of the active workspace, else 404. Shared with inventory views."""
    ctx = get_host_context(request)
    ctx.require(permission)
    room = (
        RoomType.objects.alive()
        .filter(id=room_type_id, listing__host_account=ctx.host_account, listing__deleted_at__isnull=True)
        .select_related("listing")
        .first()
    )
    if room is None:
        raise NotFoundError("Room type not found.")
    return room


class HostRoomTypeDetailView(APIView):
    """``GET``, ``PATCH``, ``DELETE /host/room-types/{id}``."""

    def get(self, request, room_type_id):
        """One room type."""
        return Response(HostRoomTypeSerializer(host_room_type_for(request, room_type_id)).data)

    def patch(self, request, room_type_id):
        """Change a room type."""
        room = host_room_type_for(request, room_type_id)
        data = RoomTypeWriteSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        services.update_room_type(room, data.validated_data)
        return Response(HostRoomTypeSerializer(room).data)

    def delete(self, request, room_type_id):
        """Soft-delete a room type."""
        services.delete_room_type(host_room_type_for(request, room_type_id))
        return Response(status=status.HTTP_204_NO_CONTENT)


class HostPhotoListView(APIView):
    """``GET`` and ``POST /host/listings/{id}/photos``."""

    def get(self, request, listing_id):
        """Photos in gallery order."""
        listing = host_listing_for(request, listing_id)
        return Response(PhotoSerializer(listing.photos.all(), many=True).data)

    def post(self, request, listing_id):
        """Add a photo (by URL until file uploads exist)."""
        listing = host_listing_for(request, listing_id)
        data = PhotoWriteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        values = dict(data.validated_data)
        room_type_id = values.pop("room_type_id", None)
        room = None
        if room_type_id:
            room = RoomType.objects.alive().filter(id=room_type_id, listing=listing).first()
            if room is None:
                raise NotFoundError("Room type not found.")
        photo = services.add_photo(listing, room_type=room, **values)
        return Response(PhotoSerializer(photo).data, status=status.HTTP_201_CREATED)


class HostPhotoOrderView(APIView):
    """``PUT /host/listings/{id}/photos/order``: reorder the gallery."""

    def put(self, request, listing_id):
        """Save the new order and return the photos."""
        listing = host_listing_for(request, listing_id)
        data = PhotoOrderSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.reorder_photos(listing, data.validated_data["ids"])
        return Response(PhotoSerializer(listing.photos.all(), many=True).data)


class HostPhotoDetailView(APIView):
    """``PATCH`` and ``DELETE /host/listings/{id}/photos/{photo_id}``."""

    def _photo(self, request, listing_id, photo_id) -> ListingPhoto:
        """One photo of one of my listings, else 404."""
        listing = host_listing_for(request, listing_id)
        photo = listing.photos.filter(id=photo_id).first()
        if photo is None:
            raise NotFoundError("Photo not found.")
        return photo

    def patch(self, request, listing_id, photo_id):
        """Change caption or make it the cover."""
        photo = self._photo(request, listing_id, photo_id)
        data = PhotoUpdateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.update_photo(photo, **data.validated_data)
        return Response(PhotoSerializer(photo).data)

    def delete(self, request, listing_id, photo_id):
        """Remove the photo."""
        services.remove_photo(self._photo(request, listing_id, photo_id))
        return Response(status=status.HTTP_204_NO_CONTENT)


class HostServiceListView(APIView):
    """``GET`` and ``POST /host/listings/{id}/services`` (DEC-017)."""

    def get(self, request, listing_id):
        """Every service of the listing, active or not."""
        listing = host_listing_for(request, listing_id)
        return Response(PropertyServiceSerializer(listing.services.select_related("listing"), many=True).data)

    def post(self, request, listing_id):
        """Add a manual service."""
        listing = host_listing_for(request, listing_id)
        data = PropertyServiceWriteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        service = services.create_service(listing, data.validated_data)
        return Response(PropertyServiceSerializer(service).data, status=status.HTTP_201_CREATED)


class HostServiceDetailView(APIView):
    """``PATCH`` and ``DELETE /host/listings/{id}/services/{service_id}``."""

    def _service(self, request, listing_id, service_id) -> PropertyService:
        """One service of one of my listings, else 404."""
        listing = host_listing_for(request, listing_id)
        service = listing.services.filter(id=service_id).first()
        if service is None:
            raise NotFoundError("Service not found.")
        return service

    def patch(self, request, listing_id, service_id):
        """Change a manual service."""
        service = self._service(request, listing_id, service_id)
        data = PropertyServiceWriteSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        services.update_service(service, data.validated_data)
        return Response(PropertyServiceSerializer(service).data)

    def delete(self, request, listing_id, service_id):
        """Delete a manual service."""
        services.delete_service(self._service(request, listing_id, service_id))
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------
class AdminListingListView(APIView):
    """``GET /admin/listings``: review queue with filters ``status``, ``vertical``, ``host``, ``deleted``."""

    permission_classes = [IsAdmin]
    serializer_class = AdminListingRowSerializer

    def get(self, request):
        """Page of listing rows, oldest submission first."""
        qs = selectors.admin_listings(
            status=request.query_params.get("status"), vertical=request.query_params.get("vertical"),
            host=request.query_params.get("host"), deleted=bool(query_bool(request, "deleted")),
        )
        return paginated(request, qs, AdminListingRowSerializer)


class AdminListingDetailView(APIView):
    """``GET /admin/listings/{id}``: full listing, private fields included."""

    permission_classes = [IsAdmin]
    serializer_class = AdminListingSerializer

    def get(self, request, listing_id):
        """Any listing, even deleted."""
        listing = selectors.get_admin_listing(listing_id)
        return Response(AdminListingSerializer(listing, context={"request": request}).data)


class AdminListingActionView(APIView):
    """
    ``POST /admin/listings/{id}/approve|reject|request-changes|suspend|unsuspend|restore``.

    Body: ``{"reason": "..."}``, at least 10 characters for reject, request
    changes and suspend. Every decision is audited in the same transaction.
    """

    permission_classes = [IsAdmin]
    serializer_class = AdminListingSerializer
    action_name = ""

    def post(self, request, listing_id):
        """Apply the decision named by the URL and return the listing."""
        listing = selectors.get_admin_listing(listing_id)
        with transaction.atomic():
            if self.action_name == "restore":
                workflow.restore(listing, actor=request.user)
            else:
                workflow.admin_moderate(listing, self.action_name, actor=request.user, reason=request.data.get("reason"))
        listing.refresh_from_db()
        return Response(AdminListingSerializer(listing, context={"request": request}).data)
