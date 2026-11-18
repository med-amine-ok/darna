"""
Read queries of the reviews app.

Public lists show only ``published`` guest reviews (BR-REV-02, BR-REV-03):
a ``submitted`` review is invisible until both sides are in or the window
ends; ``flagged``, ``hidden`` and ``removed`` reviews are not shown.
"""

import uuid
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Avg, Count, Exists, OuterRef, Q, QuerySet

from apps.accounts.models import User
from apps.catalog.selectors import get_public_listing
from apps.core.errors import NotFoundError
from apps.trips.selectors import get_public_trip

from .models import SUB_RATING_FIELDS, AuthorRole, ReportStatus, Review, ReviewReport, ReviewStatus

_RELATED = ("author", "booking", "reply", "listing", "trip")


def _base() -> QuerySet:
    """Reviews with what the serializers read, in one query."""
    return Review.objects.select_related(*_RELATED)


def published_guest_reviews() -> QuerySet:
    """Guest reviews the public may read (BR-REV-02, BR-REV-03)."""
    return _base().filter(author_role=AuthorRole.GUEST, status=ReviewStatus.PUBLISHED)


def listing_reviews(listing_key) -> tuple[QuerySet, object]:
    """Published guest reviews of a public listing (404 when the listing is not public)."""
    listing = get_public_listing(str(listing_key))
    return published_guest_reviews().filter(listing=listing), listing


def trip_reviews(trip_key) -> tuple[QuerySet, object]:
    """Published guest reviews of a public trip (404 when the trip is not public)."""
    trip = get_public_trip(str(trip_key))
    return published_guest_reviews().filter(trip=trip), trip


def user_reviews(user_id, *, role: str = "host") -> QuerySet:
    """
    Public reviews of a person (``GET /users/{id or handle}/reviews``).

    ``role=author``: published reviews the person wrote as a guest.
    ``role=host``: published guest reviews received on the person's own
    (individual) host account. A missing or deleted user answers 404.
    """
    try:
        user_id = uuid.UUID(str(user_id))
    except ValueError:
        # A profile handle (ACC-06) instead of the id.
        user_id = User.objects.filter(handle=str(user_id).lower()).values_list("pk", flat=True).first()
    if not user_id or not User.objects.filter(pk=user_id, deleted_at__isnull=True).exists():
        raise NotFoundError("User not found.")
    if role == "author":
        return published_guest_reviews().filter(author_id=user_id)
    return published_guest_reviews().filter(host_account__user_id=user_id)


def my_reviews(user) -> QuerySet:
    """Every review the user wrote, whatever the side and status except ``removed`` (``GET /me/reviews``)."""
    return _base().filter(author=user).exclude(status=ReviewStatus.REMOVED)


def host_reviews(host_account, *, listing_id=None, trip_id=None, has_reply: bool | None = None) -> QuerySet:
    """
    Guest reviews received by a host account (``GET /host/reviews``).

    Submitted reviews stay invisible to the host (double-blind, BR-REV-02);
    removed ones are gone. Published, flagged and hidden ones are listed so
    the host can follow moderation.
    """
    qs = _base().filter(host_account=host_account, author_role=AuthorRole.GUEST).exclude(
        status__in=[ReviewStatus.SUBMITTED, ReviewStatus.REMOVED])
    for field, value in (("listing_id", listing_id), ("trip_id", trip_id)):
        if value:
            try:
                qs = qs.filter(**{field: uuid.UUID(str(value))})
            except ValueError:
                qs = qs.none()
    if has_reply is True:
        qs = qs.filter(reply__isnull=False)
    elif has_reply is False:
        qs = qs.filter(reply__isnull=True)
    return qs


def rating_summary(qs: QuerySet) -> dict:
    """
    ``RatingSummary`` of published guest reviews in ``qs``: average, count and sub-rating averages (BR-REV-04).

    Computed from the reviews themselves, so it always equals the cache that
    ``services.recompute_ratings`` writes.
    """
    qs = qs.filter(author_role=AuthorRole.GUEST, status=ReviewStatus.PUBLISHED)
    row = qs.aggregate(avg=Avg("rating_overall"), count=Count("id"),
                       **{name: Avg(name) for name in SUB_RATING_FIELDS})

    def _round(value):
        """Two decimals, half up, as a number (never a float in the cache)."""
        return None if value is None else float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

    sub = {name.removeprefix("rating_"): _round(row[name]) for name in SUB_RATING_FIELDS if row[name] is not None}
    return {"rating_avg": _round(row["avg"]), "review_count": row["count"], "sub_ratings": sub}


def admin_reviews(*, statuses=None, verticals=None, ratings=None, wilayas=None, reported: bool | None = None,
                  q: str | None = None) -> QuerySet:
    """
    Every review for moderators (``GET /admin/reviews``), newest first, with ``open_reports`` annotated.

    Filters: status, vertical (listing vertical; trips have none), overall
    rating, wilaya (listing commune or trip start commune), reported (has
    open reports), q (comment text or booking reference).
    """
    open_reports = ReviewReport.objects.filter(review=OuterRef("pk"), status=ReportStatus.OPEN)
    qs = (Review.objects.select_related("author", "booking", "reply", "listing", "listing__commune", "trip",
                                        "trip__start_commune")
          .prefetch_related("reports")
          .annotate(open_reports=Count("reports", filter=Q(reports__status=ReportStatus.OPEN), distinct=True),
                    has_open_reports=Exists(open_reports)))
    if statuses:
        qs = qs.filter(status__in=statuses)
    if verticals:
        qs = qs.filter(listing__vertical__in=verticals)
    if ratings:
        qs = qs.filter(rating_overall__in=ratings)
    if wilayas:
        qs = qs.filter(Q(listing__commune__wilaya_id__in=wilayas) | Q(trip__start_commune__wilaya_id__in=wilayas))
    if reported is True:
        qs = qs.filter(has_open_reports=True)
    elif reported is False:
        qs = qs.filter(has_open_reports=False)
    if q:
        q = q.strip()
        qs = qs.filter(Q(comment__icontains=q) | Q(booking__reference__iexact=q))
    return qs.order_by("-id")


def get_admin_review(review_id) -> Review:
    """One review for moderators, with its reports, else 404."""
    try:
        review_id = uuid.UUID(str(review_id))
    except ValueError as exc:
        raise NotFoundError("Review not found.") from exc
    review = admin_reviews().filter(pk=review_id).first()
    if review is None:
        raise NotFoundError("Review not found.")
    return review


def status_facets(qs: QuerySet) -> list[dict]:
    """Counts per status of the filtered set without its own status filter (``facets.status``)."""
    rows = (Review.objects.filter(pk__in=qs.order_by().values("pk")).order_by().values("status")
            .annotate(count=Count("id")))
    return [{"value": row["status"], "label": ReviewStatus(row["status"]).label, "count": row["count"]} for row in rows]
