"""
HTTP endpoints of the catalog app.

Three audiences:
- public (``AllowAny``): search, listing page, ``GET /reference`` (every shared list);
- host (``/host/...``): every query is scoped by ``ctx.host_account`` and
  needs the ``listings.manage`` permission (BR-ORG-05), so another host's
  listing answers 404;
- admin (``/admin/...``, ``IsAdmin``): review queue, status changes,
  featured placements and the taxonomy (amenities, categories, property
  types), every change audited (BR-STF-02).

Views are thin: read the input, call ``services``/``selectors``, return JSON.
"""

import hashlib
import json

from django.db import transaction
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.core.errors import NotFoundError
from apps.hosts.context import get_host_context
from apps.hosts.models import HOST_ALLOWED_OFFERS

from . import selectors, services, workflow
from .api import SEARCH_PARAMETERS, page_schema, paginated, query_bool, search_filters
from .models import Amenity, Category, PropertyService, PropertyType, RoomType
from .serializers import (
    AdminAmenitySerializer,
    AdminCategorySerializer,
    AdminListingRowSerializer,
    AdminListingSerializer,
    AdminPropertyTypeSerializer,
    AdminStatusChangeSerializer,
    AmenityWriteSerializer,
    CancellationPolicySerializer,
    CategorySerializer,
    CategoryWriteSerializer,
    FeaturedUpdateSerializer,
    HostListingSerializer,
    HostRoomTypeSerializer,
    HostStatusChangeSerializer,
    ListingCardSerializer,
    ListingDetailSerializer,
    ListingWriteSerializer,
    PhotoListSerializer,
    PhotoRefSerializer,
    PhotoSerializer,
    PhotosReplaceSerializer,
    PhotoWriteSerializer,
    PropertyServiceSerializer,
    PropertyServiceWriteSerializer,
    PropertyTypeSerializer,
    PropertyTypeWriteSerializer,
    ReferenceAmenitySerializer,
    ReferenceDataSerializer,
    RoomTypeWriteSerializer,
    _locale,
)
from .types import EXPERIENCE_TYPE_LABELS, TRIP_TYPE_LABELS, VERTICAL_LABELS, labeled_values


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------
class ListingSearchView(APIView):
    """``GET /listings``: public search with filters, dates and map box (BR-SRC-01, BR-AVL-05)."""

    permission_classes = [AllowAny]
    serializer_class = ListingCardSerializer

    @extend_schema(
        parameters=[*SEARCH_PARAMETERS, OpenApiParameter("sort", str, description="price, -price, newest, rating.")],
        responses=page_schema(ListingCardSerializer),
    )
    def get(self, request):
        """Return a page of listing cards. See ``selectors.search_listings`` for every filter."""
        results = selectors.search_listings(**search_filters(request), sort=request.query_params.get("sort"))
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


# Locales served by the apps (``ReferenceData.locales``).
LOCALES = ["fr", "ar", "en"]
# How long clients and the website may cache ``GET /reference`` (06-api-design 3.11).
REFERENCE_MAX_AGE_S = 3600


def reference_document(request) -> dict:
    """
    Build the ``ReferenceData`` answer: every shared list in the caller's
    language (DEC-015, BR-LST-04, BR-LST-05, BR-HST-05, BR-CAN-01).

    ``version`` is a hash of the content, so it changes whenever any list
    (or the language) changes; it is also the ETag.
    """
    context = {"request": request}
    locale = _locale(ReferenceAmenitySerializer(context=context))
    body = {
        "verticals": labeled_values(VERTICAL_LABELS, locale),
        "experience_types": labeled_values(EXPERIENCE_TYPE_LABELS, locale),
        "trip_types": labeled_values(TRIP_TYPE_LABELS, locale),
        "amenities": ReferenceAmenitySerializer(selectors.reference_amenities(), many=True, context=context).data,
        "property_types": PropertyTypeSerializer(selectors.reference_property_types(), many=True, context=context).data,
        "categories": CategorySerializer(selectors.reference_categories(), many=True, context=context).data,
        "cancellation_policies": CancellationPolicySerializer(
            selectors.current_policies(), many=True, context=context
        ).data,
        "host_offer_rules": {kind: sorted(offers) for kind, offers in HOST_ALLOWED_OFFERS.items()},
        "locales": LOCALES,
    }
    digest = hashlib.sha256(json.dumps([locale, body], sort_keys=True, default=str).encode()).hexdigest()[:16]
    return {"version": digest, **body}


class ReferenceDataView(APIView):
    """
    ``GET /reference``: all shared lists in one cacheable answer (DEC-015).

    Sends ``ETag`` and ``Cache-Control: public, max-age=3600``; a matching
    ``If-None-Match`` answers 304 without a body.
    """

    permission_classes = [AllowAny]
    serializer_class = ReferenceDataSerializer

    @extend_schema(
        parameters=[OpenApiParameter("If-None-Match", str, OpenApiParameter.HEADER, description="ETag of a copy.")],
        responses={200: ReferenceDataSerializer, 304: None},
    )
    def get(self, request):
        """The reference document, or 304 when the client copy is current."""
        body = reference_document(request)
        etag = f'"{body["version"]}"'
        headers = {"ETag": etag, "Cache-Control": f"public, max-age={REFERENCE_MAX_AGE_S}", "Vary": "Accept-Language"}
        sent = [tag.strip() for tag in request.headers.get("If-None-Match", "").split(",")]
        if etag in sent or body["version"] in sent:
            return Response(status=status.HTTP_304_NOT_MODIFIED, headers=headers)
        return Response(body, headers=headers)


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

    @extend_schema(parameters=[OpenApiParameter("status", str, description="Comma list, for example draft,published.")], responses=page_schema(HostListingSerializer))
    def get(self, request):
        """Listings of the active workspace, optionally ``?status=draft,published``."""
        ctx = get_host_context(request)
        ctx.require("listings.manage")
        qs = selectors.host_listings(ctx.host_account)
        if status_filter := request.query_params.get("status"):
            qs = qs.filter(status__in=status_filter.split(","))
        return paginated(request, qs, HostListingSerializer)

    @extend_schema(request=ListingWriteSerializer, responses={201: HostListingSerializer})
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

    @extend_schema(responses=HostListingSerializer)
    def get(self, request, listing_id):
        """One of my listings, with private fields."""
        return _host_listing_response(request, host_listing_for(request, listing_id))

    @extend_schema(request=ListingWriteSerializer, responses=HostListingSerializer)
    def patch(self, request, listing_id):
        """Partial update; reviewed fields of a live listing send it back to review (BR-LST-02)."""
        listing = host_listing_for(request, listing_id)
        data = ListingWriteSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        services.update_listing(listing, data.validated_data)
        return _host_listing_response(request, listing)

    @extend_schema(responses={204: None})
    def delete(self, request, listing_id):
        """Soft delete (an admin can restore it)."""
        services.delete_listing(host_listing_for(request, listing_id))
        return Response(status=status.HTTP_204_NO_CONTENT)


class HostListingStatusView(APIView):
    """
    ``POST /host/listings/{id}/status`` ``{status, note?}``: submit, withdraw,
    pause, resume or archive (BR-LST-03, table 4a).
    """

    @extend_schema(request=HostStatusChangeSerializer, responses=HostListingSerializer)
    def post(self, request, listing_id):
        """Apply the move; 409 ``invalid_transition``, 422 ``listing_incomplete`` on submit."""
        listing = host_listing_for(request, listing_id)
        data = HostStatusChangeSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.change_host_listing_status(listing, data.validated_data["status"])
        return _host_listing_response(request, listing)


class HostRoomTypeListView(APIView):
    """``GET`` and ``POST /host/listings/{id}/room-types`` (hotels and hostels)."""

    @extend_schema(responses=HostRoomTypeSerializer(many=True))
    def get(self, request, listing_id):
        """Every non-deleted room type of the listing."""
        listing = host_listing_for(request, listing_id)
        rooms = RoomType.objects.alive().filter(listing=listing).select_related("listing")
        return Response(HostRoomTypeSerializer(rooms, many=True).data)

    @extend_schema(request=RoomTypeWriteSerializer, responses={201: HostRoomTypeSerializer})
    def post(self, request, listing_id):
        """Add a room type."""
        listing = host_listing_for(request, listing_id)
        data = RoomTypeWriteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        room = services.create_room_type(listing, data.validated_data)
        return Response(HostRoomTypeSerializer(room).data, status=status.HTTP_201_CREATED)


def host_room_type_for(request, listing_id, room_type_id, permission: str = "listings.manage") -> RoomType:
    """One non-deleted room type of one listing of the active workspace, else 404."""
    listing = host_listing_for(request, listing_id, permission)
    room = RoomType.objects.alive().filter(id=room_type_id, listing=listing).select_related("listing").first()
    if room is None:
        raise NotFoundError("Room type not found.")
    return room


class HostRoomTypeDetailView(APIView):
    """``PATCH`` and ``DELETE /host/listings/{listing_id}/room-types/{room_type_id}``."""

    @extend_schema(request=RoomTypeWriteSerializer, responses=HostRoomTypeSerializer)
    def patch(self, request, listing_id, room_type_id):
        """Change a room type; lowering units under future bookings: 409 ``inventory_in_use`` (BR-AVL-02)."""
        room = host_room_type_for(request, listing_id, room_type_id)
        data = RoomTypeWriteSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        services.update_room_type(room, data.validated_data)
        return Response(HostRoomTypeSerializer(room).data)

    @extend_schema(responses={204: None})
    def delete(self, request, listing_id, room_type_id):
        """Soft-delete a room type; 409 ``inventory_in_use`` while future nights are held or booked."""
        services.delete_room_type(host_room_type_for(request, listing_id, room_type_id))
        return Response(status=status.HTTP_204_NO_CONTENT)


class HostPhotoListView(APIView):
    """
    ``POST /host/listings/{id}/photos`` (add by URL, kept until the media
    app exists) and ``PUT /host/listings/{id}/photos`` (order and cover).
    """

    @extend_schema(request=PhotoWriteSerializer, responses={201: PhotoSerializer})
    def post(self, request, listing_id):
        """Add a photo by URL (stop-gap until media uploads exist, BR-MED-01)."""
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

    @extend_schema(request=PhotosReplaceSerializer, responses=PhotoListSerializer)
    def put(self, request, listing_id):
        """Save the gallery order, captions and cover; photos left out are removed (BR-MED-01)."""
        listing = host_listing_for(request, listing_id)
        data = PhotosReplaceSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        photos = services.replace_listing_photos(
            listing, [dict(p) for p in data.validated_data["photos"]], data.validated_data["cover_media_id"]
        )
        return Response({"results": PhotoRefSerializer(photos, many=True).data})


class HostServiceListView(APIView):
    """``GET`` and ``POST /host/listings/{id}/services`` (DEC-017)."""

    @extend_schema(responses=PropertyServiceSerializer(many=True))
    def get(self, request, listing_id):
        """Every service of the listing, active or not."""
        listing = host_listing_for(request, listing_id)
        return Response(PropertyServiceSerializer(listing.services.select_related("listing"), many=True).data)

    @extend_schema(request=PropertyServiceWriteSerializer, responses={201: PropertyServiceSerializer})
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

    @extend_schema(request=PropertyServiceWriteSerializer, responses=PropertyServiceSerializer)
    def patch(self, request, listing_id, service_id):
        """Change a manual service."""
        service = self._service(request, listing_id, service_id)
        data = PropertyServiceWriteSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        services.update_service(service, data.validated_data)
        return Response(PropertyServiceSerializer(service).data)

    @extend_schema(responses={204: None})
    def delete(self, request, listing_id, service_id):
        """Delete a manual service."""
        services.delete_service(self._service(request, listing_id, service_id))
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Admin: listings
# ---------------------------------------------------------------------------
def _admin_listing_response(request, listing):
    """Reload the listing and answer with the admin shape."""
    listing.refresh_from_db()
    return Response(AdminListingSerializer(listing, context={"request": request}).data)


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
    """``GET /admin/listings/{id}`` (any listing, even deleted) and ``DELETE`` (soft delete, audited)."""

    permission_classes = [IsAdmin]
    serializer_class = AdminListingSerializer

    def get(self, request, listing_id):
        """Any listing, even deleted."""
        listing = selectors.get_admin_listing(listing_id)
        return Response(AdminListingSerializer(listing, context={"request": request}).data)

    @extend_schema(responses={204: None})
    def delete(self, request, listing_id):
        """Soft delete; the previous status is kept so ``restore`` can bring it back (table 4a, BR-STF-02)."""
        services.admin_delete_listing(selectors.get_admin_listing(listing_id), actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminListingActionView(APIView):
    """
    ``POST /admin/listings/{id}/approve|reject|request-changes|suspend|restore``.

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
        return _admin_listing_response(request, listing)


class AdminListingStatusView(APIView):
    """
    ``POST /admin/listings/{id}/status`` ``{status, reason_code?, reason?}``:
    any other staff move of table 4a, for example unsuspend (BR-LST-03, BR-STF-02).
    """

    permission_classes = [IsAdmin]

    @extend_schema(request=AdminStatusChangeSerializer, responses=AdminListingSerializer)
    def post(self, request, listing_id):
        """Apply the move (409 ``invalid_transition``, 422 ``reason_required``) and return the listing."""
        listing = selectors.get_admin_listing(listing_id)
        data = AdminStatusChangeSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        services.admin_change_listing_status(
            listing, values["status"], actor=request.user, reason=values.get("reason"),
            reason_code=values.get("reason_code") or None,
        )
        return _admin_listing_response(request, listing)


class AdminListingFeaturedView(APIView):
    """``PUT /admin/listings/{id}/featured`` ``FeaturedUpdate``: feature or unfeature (LST-09, audited)."""

    permission_classes = [IsAdmin]

    @extend_schema(request=FeaturedUpdateSerializer, responses=AdminListingSerializer)
    def put(self, request, listing_id):
        """Feature (published listings only, 409 ``not_published``) or unfeature the listing."""
        listing = selectors.get_admin_listing(listing_id)
        data = FeaturedUpdateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.set_listing_featured(listing, data.validated_data, actor=request.user)
        return _admin_listing_response(request, listing)


# ---------------------------------------------------------------------------
# Admin: taxonomy (BR-LST-04)
# ---------------------------------------------------------------------------
TAXONOMY_FILTERS = [
    OpenApiParameter("vertical", str, description="Only rows of this vertical (amenities: that apply to it)."),
    OpenApiParameter("active", bool, description="Only active (true) or inactive (false) rows."),
]


class _TaxonomyListView(APIView):
    """
    ``GET`` (list with ``listing_count``) and ``POST`` (create, 409
    ``slug_taken``) of one taxonomy table. Subclasses set the model and serializers.
    """

    permission_classes = [IsAdmin]
    model = None
    read_serializer = None
    write_serializer = None

    def get(self, request):
        """Every row, active or not, ``{"results": [...]}``; filters ``vertical`` and ``active``."""
        rows = selectors.admin_taxonomy(
            self.model, vertical=request.query_params.get("vertical"), active=query_bool(request, "active")
        )
        return Response({"results": self.read_serializer(rows, many=True, context={"request": request}).data})

    def post(self, request):
        """Create a row (audited, BR-STF-02)."""
        data = self.write_serializer(data=request.data)
        data.is_valid(raise_exception=True)
        row = services.create_taxonomy_row(self.model, data.validated_data, actor=request.user)
        return Response(self.read_serializer(row, context={"request": request}).data, status=status.HTTP_201_CREATED)


class _TaxonomyDetailView(APIView):
    """``PATCH`` (edit, reorder, activate, deactivate) and ``DELETE`` (only if never used) of one taxonomy row."""

    permission_classes = [IsAdmin]
    model = None
    read_serializer = None
    write_serializer = None
    lookup = ""  # name of the path parameter, for example ``category_id``

    def patch(self, request, **kwargs):
        """Partial update (audited); 409 ``slug_taken`` or ``in_use`` for a vertical change of a used row."""
        row = selectors.get_taxonomy_row(self.model, kwargs[self.lookup])
        data = self.write_serializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        services.update_taxonomy_row(row, data.validated_data, actor=request.user)
        row = selectors.admin_taxonomy(self.model).get(pk=row.pk)
        return Response(self.read_serializer(row, context={"request": request}).data)

    def delete(self, request, **kwargs):
        """Hard delete when never used, else 409 ``in_use`` (deactivate instead, BR-LST-04)."""
        services.delete_taxonomy_row(selectors.get_taxonomy_row(self.model, kwargs[self.lookup]), actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


def _list_schema(item):
    """``{"results": [item]}`` answer for the taxonomy lists."""
    name = item.__name__.removesuffix("Serializer")
    return inline_serializer(name=f"{name}List", fields={"results": item(many=True)})


@extend_schema(parameters=TAXONOMY_FILTERS, responses=_list_schema(AdminCategorySerializer), methods=["GET"])
@extend_schema(request=CategoryWriteSerializer, responses={201: AdminCategorySerializer}, methods=["POST"])
class AdminCategoryListView(_TaxonomyListView):
    """``GET`` and ``POST /admin/categories``."""

    model, read_serializer, write_serializer = Category, AdminCategorySerializer, CategoryWriteSerializer


@extend_schema(request=CategoryWriteSerializer, responses=AdminCategorySerializer, methods=["PATCH"])
@extend_schema(responses={204: None}, methods=["DELETE"])
class AdminCategoryDetailView(_TaxonomyDetailView):
    """``PATCH`` and ``DELETE /admin/categories/{category_id}``."""

    model, read_serializer, write_serializer = Category, AdminCategorySerializer, CategoryWriteSerializer
    lookup = "category_id"


@extend_schema(parameters=TAXONOMY_FILTERS, responses=_list_schema(AdminAmenitySerializer), methods=["GET"])
@extend_schema(request=AmenityWriteSerializer, responses={201: AdminAmenitySerializer}, methods=["POST"])
class AdminAmenityListView(_TaxonomyListView):
    """``GET`` and ``POST /admin/amenities``."""

    model, read_serializer, write_serializer = Amenity, AdminAmenitySerializer, AmenityWriteSerializer


@extend_schema(request=AmenityWriteSerializer, responses=AdminAmenitySerializer, methods=["PATCH"])
@extend_schema(responses={204: None}, methods=["DELETE"])
class AdminAmenityDetailView(_TaxonomyDetailView):
    """``PATCH`` and ``DELETE /admin/amenities/{amenity_id}``."""

    model, read_serializer, write_serializer = Amenity, AdminAmenitySerializer, AmenityWriteSerializer
    lookup = "amenity_id"


@extend_schema(parameters=TAXONOMY_FILTERS, responses=_list_schema(AdminPropertyTypeSerializer), methods=["GET"])
@extend_schema(request=PropertyTypeWriteSerializer, responses={201: AdminPropertyTypeSerializer}, methods=["POST"])
class AdminPropertyTypeListView(_TaxonomyListView):
    """``GET`` and ``POST /admin/property-types``."""

    model, read_serializer, write_serializer = PropertyType, AdminPropertyTypeSerializer, PropertyTypeWriteSerializer


@extend_schema(request=PropertyTypeWriteSerializer, responses=AdminPropertyTypeSerializer, methods=["PATCH"])
@extend_schema(responses={204: None}, methods=["DELETE"])
class AdminPropertyTypeDetailView(_TaxonomyDetailView):
    """``PATCH`` and ``DELETE /admin/property-types/{property_type_id}``."""

    model, read_serializer, write_serializer = PropertyType, AdminPropertyTypeSerializer, PropertyTypeWriteSerializer
    lookup = "property_type_id"
