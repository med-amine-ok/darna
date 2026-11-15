"""
HTTP endpoints of the reviews app (thin layer: rules live in ``services.py``).

- Public: ``GET /listings/{id}/reviews``, ``/trips/{id}/reviews``, ``/users/{id}/reviews``
  (published guest reviews, cursor pages, with a ``RatingSummary`` where the spec has one);
- Guest: ``POST /me/bookings/{id}/review``, ``GET /me/reviews``, ``POST /reviews/{id}/reports``;
- Host: ``GET /host/reviews``, ``PUT /host/reviews/{id}/reply``, ``POST /host/bookings/{id}/guest-review``;
- Admin: ``GET /admin/reviews`` (numbered pages), hide, restore, dismiss reports, delete (audited).
"""

import math

from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.core.errors import DomainError
from apps.hosts.context import IsHost, get_host_context
from apps.notifications.cursor import CURSOR_PARAMETERS, cursor_body, cursor_page_schema, cursor_slice, read_bool

from . import selectors, services
from .serializers import (
    AdminReviewSerializer,
    OptionalReasonSerializer,
    RatingSummarySerializer,
    ModerationReasonSerializer,
    ReviewCreateSerializer,
    ReviewReplySerializer,
    ReviewReportSerializer,
    ReviewSerializer,
)

REVIEW_PAGE = cursor_page_schema(ReviewSerializer)
REVIEW_PAGE_WITH_SUMMARY = cursor_page_schema(ReviewSerializer, name="ReviewCursorPageWithSummary",
                                              extra={"summary": RatingSummarySerializer()})


def _review_page(request, qs, **extra) -> Response:
    """Answer one cursor page of reviews plus ``extra`` keys."""
    rows, next_cursor, has_more = cursor_slice(request, qs)
    return Response(cursor_body(ReviewSerializer(rows, many=True).data, next_cursor, has_more, **extra))


# ---------------------------------------------------------------------------
# Public lists (BR-REV-02, BR-REV-03, BR-REV-04)
# ---------------------------------------------------------------------------
class ListingReviewListView(APIView):
    """``GET /listings/{listing_id}/reviews``: published guest reviews of a public listing, with its rating summary."""

    permission_classes = [AllowAny]

    @extend_schema(operation_id="listListingReviews", parameters=CURSOR_PARAMETERS, responses=REVIEW_PAGE_WITH_SUMMARY,
                   tags=["public.catalog"])
    def get(self, request, listing_id):
        """404 when the listing is not public."""
        qs, _listing = selectors.listing_reviews(listing_id)
        return _review_page(request, qs, summary=selectors.rating_summary(qs))


class TripReviewListView(APIView):
    """``GET /trips/{trip_id}/reviews``: published guest reviews of a public trip, with its rating summary."""

    permission_classes = [AllowAny]

    @extend_schema(operation_id="listTripReviews", parameters=CURSOR_PARAMETERS, responses=REVIEW_PAGE_WITH_SUMMARY,
                   tags=["public.trips"])
    def get(self, request, trip_id):
        """404 when the trip is not public."""
        qs, _trip = selectors.trip_reviews(trip_id)
        return _review_page(request, qs, summary=selectors.rating_summary(qs))


class UserReviewListView(APIView):
    """``GET /users/{user_id}/reviews``: reviews written by a person (``role=author``) or received as a host (default)."""

    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="listUserReviews",
        parameters=[OpenApiParameter("role", str, enum=["author", "host"], default="host",
                                     description="author = written by the user; host = received on their host account."),
                    *CURSOR_PARAMETERS],
        responses=REVIEW_PAGE_WITH_SUMMARY, tags=["public.profiles"],
    )
    def get(self, request, user_id):
        """404 when the user does not exist."""
        role = request.query_params.get("role") or "host"
        if role not in ("author", "host"):
            raise DomainError("Invalid query parameter.", code="invalid", errors={"role": ["author or host."]})
        qs = selectors.user_reviews(user_id, role=role)
        extra = {"summary": selectors.rating_summary(qs)} if role == "host" else {}
        return _review_page(request, qs, **extra)


# ---------------------------------------------------------------------------
# Guest
# ---------------------------------------------------------------------------
class MyBookingReviewView(APIView):
    """``POST /me/bookings/{booking_id}/review``: review a completed, confirmed stay (BR-REV-01, BR-REV-02)."""

    serializer_class = ReviewSerializer

    @extend_schema(operation_id="createMyReview", request=ReviewCreateSerializer, responses={201: ReviewSerializer},
                   tags=["me.bookings"])
    def post(self, request, key):
        """Create the guest review; 409 ``stay_not_confirmed`` / ``review_exists``, 422 ``review_window_closed``."""
        data = ReviewCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        review = services.create_guest_review(guest=request.user, booking_key=key, data=data.validated_data)
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class MyReviewListView(APIView):
    """``GET /me/reviews``: reviews I wrote, newest first (submitted ones included, so I see what is waiting)."""

    @extend_schema(operation_id="listMyReviews", parameters=CURSOR_PARAMETERS, responses=REVIEW_PAGE,
                   tags=["me.bookings"])
    def get(self, request):
        """Cursor page of the caller's reviews."""
        return _review_page(request, selectors.my_reviews(request.user))


class ReviewReportView(APIView):
    """``POST /reviews/{review_id}/reports``: report a public review, once per user (409 ``already_reported``)."""

    throttle_scope = "reports"  # BR-REV-03: limits report spam

    @extend_schema(operation_id="reportReview", request=ReviewReportSerializer, responses={204: None},
                   tags=["me.bookings"])
    def post(self, request, review_id):
        """Store the report; answer 204."""
        data = ReviewReportSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.report_review(reporter=request.user, review_id=review_id,
                               reason_code=data.validated_data["reason_code"], note=data.validated_data.get("note", ""))
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Host
# ---------------------------------------------------------------------------
class HostReviewListView(APIView):
    """``GET /host/reviews``: guest reviews received by the active host account, with its rating summary."""

    permission_classes = [IsHost]

    @extend_schema(
        operation_id="listHostReviews",
        parameters=[OpenApiParameter("listing_id", str, description="Filter."),
                    OpenApiParameter("trip_id", str, description="Filter."),
                    OpenApiParameter("has_reply", bool, description="Filter."), *CURSOR_PARAMETERS],
        responses=REVIEW_PAGE_WITH_SUMMARY, tags=["host.reviews"],
    )
    def get(self, request):
        """Any active member may read (x-host-permission: any active member)."""
        ctx = get_host_context(request)
        params = request.query_params
        qs = selectors.host_reviews(ctx.host_account, listing_id=params.get("listing_id"),
                                    trip_id=params.get("trip_id"), has_reply=read_bool(request, "has_reply"))
        return _review_page(request, qs, summary=selectors.rating_summary(qs))


class HostReviewReplyView(APIView):
    """``PUT /host/reviews/{review_id}/reply``: write or edit the public reply (48 h, then 409 ``reply_locked``)."""

    permission_classes = [IsHost]
    serializer_class = ReviewSerializer

    @extend_schema(operation_id="replyToReview", request=ReviewReplySerializer, responses=ReviewSerializer,
                   tags=["host.reviews"])
    def put(self, request, review_id):
        """Needs ``messages.reply`` in the active workspace."""
        data = ReviewReplySerializer(data=request.data)
        data.is_valid(raise_exception=True)
        ctx = get_host_context(request)
        review = services.reply_to_review(ctx=ctx, actor=request.user, review_id=review_id,
                                          body=data.validated_data["body"])
        review = selectors.host_reviews(ctx.host_account).get(pk=review.pk)
        return Response(ReviewSerializer(review).data)


class HostGuestReviewView(APIView):
    """``POST /host/bookings/{booking_id}/guest-review``: the host reviews the guest (double-blind, BR-REV-02)."""

    permission_classes = [IsHost]
    serializer_class = ReviewSerializer

    @extend_schema(operation_id="reviewGuest", request=ReviewCreateSerializer, responses={201: ReviewSerializer},
                   tags=["host.bookings"])
    def post(self, request, key):
        """Needs ``bookings.respond``; same window and eligibility as the guest review."""
        data = ReviewCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        review = services.create_host_review(ctx=get_host_context(request), actor=request.user, booking_key=key,
                                             data=data.validated_data)
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Admin (BR-REV-03, BR-STF-02)
# ---------------------------------------------------------------------------
ADMIN_DEFAULT_PAGE_SIZE = 20
ADMIN_MAX_PAGE_SIZE = 100


def _csv(request, name: str, cast=str) -> list:
    """A comma list from the query string (``status=published,flagged``); a bad number is a 400."""
    raw = request.query_params.get(name)
    if not raw:
        return []
    try:
        return [cast(part.strip()) for part in raw.split(",") if part.strip()]
    except ValueError as exc:
        raise DomainError("Invalid query parameter.", code="invalid", errors={name: ["Comma list of numbers."]}) from exc


def _page_numbers(request) -> tuple[int, int]:
    """``page`` (from 1) and ``page_size`` (1 to 100, default 20) for admin tables (06-api-design.md 3.6)."""
    values = {}
    for name, default, maximum in (("page", 1, None), ("page_size", ADMIN_DEFAULT_PAGE_SIZE, ADMIN_MAX_PAGE_SIZE)):
        raw = request.query_params.get(name)
        try:
            value = default if raw in (None, "") else int(raw)
        except ValueError as exc:
            raise DomainError("Invalid query parameter.", code="invalid", errors={name: ["Whole number."]}) from exc
        if value < 1 or (maximum and value > maximum):
            raise DomainError("Invalid query parameter.", code="invalid", errors={name: ["Out of range."]})
        values[name] = value
    return values["page"], values["page_size"]


class AdminReviewListView(APIView):
    """``GET /admin/reviews``: reviews with their reports, numbered pages, ``meta`` and status ``facets``."""

    permission_classes = [IsAdmin]

    @extend_schema(
        operation_id="adminListReviews",
        parameters=[
            OpenApiParameter("status", str, description="Comma list of review statuses."),
            OpenApiParameter("vertical", str, description="Comma list of verticals."),
            OpenApiParameter("rating", str, description="Comma list of overall ratings."),
            OpenApiParameter("wilaya", str, description="Comma list of wilaya codes."),
            OpenApiParameter("reported", bool, description="Has open reports."),
            OpenApiParameter("q", str, description="Comment text or booking reference."),
            OpenApiParameter("page", int), OpenApiParameter("page_size", int),
        ],
        responses=inline_serializer(name="AdminReviewPage", fields={
            "results": AdminReviewSerializer(many=True),
            "meta": inline_serializer(name="AdminReviewPageMeta", fields={
                "page": serializers.IntegerField(), "page_size": serializers.IntegerField(),
                "total_count": serializers.IntegerField(), "total_pages": serializers.IntegerField()}),
            "facets": serializers.DictField(child=serializers.ListField(child=serializers.DictField())),
        }),
        tags=["admin.reviews"],
    )
    def get(self, request):
        """Filter, count, slice one page."""
        filters = {
            "verticals": _csv(request, "vertical"), "ratings": _csv(request, "rating", int),
            "wilayas": _csv(request, "wilaya", int), "reported": read_bool(request, "reported"),
            "q": request.query_params.get("q"),
        }
        qs = selectors.admin_reviews(statuses=_csv(request, "status"), **filters)
        page, page_size = _page_numbers(request)
        total = qs.count()
        rows = list(qs[(page - 1) * page_size: page * page_size])
        return Response({
            "results": AdminReviewSerializer(rows, many=True).data,
            "meta": {"page": page, "page_size": page_size, "total_count": total,
                     "total_pages": math.ceil(total / page_size) if total else 0},
            "facets": {"status": selectors.status_facets(selectors.admin_reviews(**filters))},
        })


class _AdminReviewMove(APIView):
    """Shared shape of the moderator moves: optional or required ``Reason`` body, answers ``AdminReview``."""

    permission_classes = [IsAdmin]
    serializer_class = AdminReviewSerializer
    reason_serializer = OptionalReasonSerializer

    def move(self, request, review_id):
        """Run the move with the validated reason (subclasses set ``move_service``)."""
        data = self.reason_serializer(data=request.data or {})
        data.is_valid(raise_exception=True)
        type(self).move_service(actor=request.user, review_id=review_id, reason=data.validated_data.get("reason", ""),
                          reason_code=data.validated_data.get("reason_code"))
        return Response(AdminReviewSerializer(selectors.get_admin_review(review_id)).data)


class AdminReviewHideView(_AdminReviewMove):
    """``POST /admin/reviews/{review_id}/hide`` with a required reason (BR-REV-03)."""

    reason_serializer = ModerationReasonSerializer
    move_service = staticmethod(services.hide_review)

    @extend_schema(operation_id="adminHideReview", request=ModerationReasonSerializer, responses=AdminReviewSerializer,
                   tags=["admin.reviews"])
    def post(self, request, review_id):
        """Hide a published or flagged review."""
        return self.move(request, review_id)


class AdminReviewRestoreView(_AdminReviewMove):
    """``POST /admin/reviews/{review_id}/restore``: publish a hidden or flagged review again (409 ``review_removed``)."""

    move_service = staticmethod(services.restore_review)

    @extend_schema(operation_id="adminRestoreReview", request=OptionalReasonSerializer,
                   responses=AdminReviewSerializer, tags=["admin.reviews"])
    def post(self, request, review_id):
        """Restore the review."""
        return self.move(request, review_id)


class AdminReviewDismissReportsView(_AdminReviewMove):
    """``POST /admin/reviews/{review_id}/dismiss-reports``: dismiss open reports and keep the review."""

    move_service = staticmethod(services.dismiss_reports)

    @extend_schema(operation_id="adminDismissReviewReports", request=OptionalReasonSerializer,
                   responses=AdminReviewSerializer, tags=["admin.reviews"])
    def post(self, request, review_id):
        """Dismiss the reports."""
        return self.move(request, review_id)


class AdminReviewRemoveView(APIView):
    """``DELETE /admin/reviews/{review_id}``: status ``removed``, super admin only, final (BR-REV-03)."""

    permission_classes = [IsAdmin]

    @extend_schema(operation_id="adminRemoveReview", responses={204: None}, tags=["admin.reviews"])
    def delete(self, request, review_id):
        """Remove the review; answer 204."""
        services.remove_review(actor=request.user, review_id=review_id)
        return Response(status=status.HTTP_204_NO_CONTENT)
