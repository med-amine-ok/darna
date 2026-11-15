"""
Writes and business rules of the reviews app.

- BR-REV-01: a guest review needs a completed booking of that guest whose
  stay was confirmed (``Booking.review_eligible``, BR-BKG-09), within 14
  days after check-out, one per booking and side, ratings 1 to 5;
- BR-REV-02: double-blind. A review stays ``submitted`` (invisible) until
  the other side has also reviewed or the 14 days end (job
  :func:`publish_due_reviews`, command ``publish_reviews``). No edits after
  publication: there is no update of the text at all;
- BR-REV-03: states ``submitted``, ``published``, ``flagged``, ``hidden``,
  ``removed``; moderator moves are audited and need a reason where the API
  asks one; ``removed`` only by a super admin and final;
- BR-REV-04: rating caches on listing, trip and host account are computed
  from published guest reviews (:func:`recompute_ratings`) after each change,
  never typed in.
"""

import uuid
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.db import IntegrityError, transaction
from django.db.models import Avg, Count
from django.utils import timezone

from apps.audit import services as audit
from apps.bookings import selectors as booking_selectors
from apps.bookings.models import Booking, BookingStatus
from apps.bookings.services import check_out_at
from apps.catalog.models import Listing
from apps.core.errors import ConflictError, DomainError, ForbiddenError, NotFoundError
from apps.hosts.models import HostAccount
from apps.hosts.selectors import members_of
from apps.notifications.services import notify, notify_many
from apps.trips.models import Trip

from .models import (
    RATING_FIELDS,
    AuthorRole,
    ReportStatus,
    Review,
    ReviewReply,
    ReviewReport,
    ReviewStatus,
)

# BR-REV-01 / BR-REV-02: review window and double-blind end, in days after check-out.
REVIEW_WINDOW_DAYS = 14  # TODO(config): move to platform settings
# REV-03: a host reply can be edited for this long after it was first written.
REPLY_EDIT_HOURS = 48  # TODO(config): move to platform settings
# BR-REV-03: open reports from different users that move a published review to ``flagged``.
FLAG_AFTER_REPORTS = 3  # TODO(config): move to platform settings

# Reason codes of the ``report_review`` action (reason_code table of the trust app, not reachable from L5).
REPORT_REASON_CODES = ("fake", "offensive", "personal_data", "spam", "off_topic", "conflict_of_interest", "other")

# States visible to the public and counted in ratings.
PUBLIC_STATUSES = (ReviewStatus.PUBLISHED,)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def host_people(host_account: HostAccount) -> list:
    """People who act for a host account: the solo host, or the active team members of the organisation."""
    if host_account.user_id:
        return [host_account.user]
    if host_account.organization_id:
        return [m.user for m in members_of(host_account.organization)]
    return []


def window_ends_at(booking: Booking):
    """End of the review window: check-out time + 14 days (BR-REV-01, BR-REV-02)."""
    return check_out_at(booking) + timedelta(days=REVIEW_WINDOW_DAYS)


def _check_can_review(booking: Booking, role: str) -> None:
    """
    Refuse a review that BR-REV-01 does not allow.

    Order of checks: booking completed (409 ``booking_not_completed``), stay
    confirmed (409 ``stay_not_confirmed``, BR-BKG-09), not already reviewed
    by this side (409 ``review_exists``), window still open (422
    ``review_window_closed``).
    """
    if booking.status != BookingStatus.COMPLETED:
        raise ConflictError("Only a completed stay can be reviewed.", code="booking_not_completed")
    if not booking.review_eligible:
        raise ConflictError("This stay was never confirmed, so it cannot be reviewed.", code="stay_not_confirmed")
    if Review.objects.filter(booking=booking, author_role=role).exists():
        raise ConflictError("This booking was already reviewed.", code="review_exists")
    if timezone.now() > window_ends_at(booking):
        raise DomainError("The 14-day review window is closed.", code="review_window_closed", status_code=422)


def _create(booking: Booking, *, author, role: str, data: dict) -> Review:
    """Insert the review (unique key guards a double submit), then publish both if the other side is in (BR-REV-02)."""
    trip_id = booking.trip_departure.trip_id if booking.trip_departure_id else None
    try:
        with transaction.atomic():
            review = Review.objects.create(
                booking=booking, author=author, author_role=role, listing_id=booking.listing_id, trip_id=trip_id,
                host_account_id=booking.host_account_id, comment=data["comment"].strip(), language=data["language"],
                **{name: data.get(name) for name in RATING_FIELDS},
            )
    except IntegrityError as exc:
        raise ConflictError("This booking was already reviewed.", code="review_exists") from exc
    other_role = AuthorRole.HOST if role == AuthorRole.GUEST else AuthorRole.GUEST
    other = Review.objects.filter(booking=booking, author_role=other_role, status=ReviewStatus.SUBMITTED).first()
    params = {"reference": booking.reference, "title": booking.title}
    if other is not None:
        _publish([review, other])
    elif role == AuthorRole.GUEST:
        notify_many(host_people(booking.host_account), "review.received", params=params, link="/host/reviews")
    else:
        notify(booking.guest, "review.received", params=params, link=f"/trips/{booking.id}")
    return review


def _publish(reviews: list[Review], now=None) -> None:
    """Publish submitted reviews, tell both sides once per booking and refresh the rating caches (BR-REV-02, BR-REV-04)."""
    now = now or timezone.now()
    bookings = {}
    for review in reviews:
        if review.status != ReviewStatus.SUBMITTED:
            continue
        review.status, review.published_at = ReviewStatus.PUBLISHED, now
        review.save(update_fields=["status", "published_at", "updated_at"])
        bookings[review.booking_id] = review.booking
    for booking in bookings.values():
        params = {"reference": booking.reference, "title": booking.title}
        notify(booking.guest, "review.published", params=params, link=f"/trips/{booking.id}")
        notify_many(host_people(booking.host_account), "review.published", params=params, link="/host/reviews")
    for review in reviews:
        recompute_ratings_for(review)


# ---------------------------------------------------------------------------
# Writing reviews (BR-REV-01, BR-REV-02)
# ---------------------------------------------------------------------------
@transaction.atomic
def create_guest_review(*, guest, booking_key, data: dict) -> Review:
    """
    The guest reviews a completed, confirmed stay (``POST /me/bookings/{id}/review``, BR-REV-01).

    Another guest's booking answers 404. The review stays hidden until the
    host has also reviewed or the 14 days end (BR-REV-02).
    """
    booking = booking_selectors.get_guest_booking(guest, booking_key)
    booking = Booking.objects.select_for_update(of=("self",)).select_related("trip_departure", "host_account").get(pk=booking.pk)
    _check_can_review(booking, AuthorRole.GUEST)
    return _create(booking, author=guest, role=AuthorRole.GUEST, data=data)


@transaction.atomic
def create_host_review(*, ctx, actor, booking_key, data: dict) -> Review:
    """
    The host reviews the guest (``POST /host/bookings/{id}/guest-review``, BR-REV-02).

    Needs ``bookings.respond`` in the active workspace; same eligibility and
    window as the guest review, double-blind with it.
    """
    ctx.require("bookings.respond")
    booking = booking_selectors.get_host_booking(ctx.host_account, booking_key)
    booking = Booking.objects.select_for_update(of=("self",)).select_related("trip_departure", "host_account").get(pk=booking.pk)
    _check_can_review(booking, AuthorRole.HOST)
    return _create(booking, author=actor, role=AuthorRole.HOST, data=data)


def publish_due_reviews(now=None) -> int:
    """
    Publish submitted reviews whose 14-day window has ended (BR-REV-02, hourly job).

    Each booking is handled in its own transaction. Returns how many reviews
    were published. Run by ``python manage.py publish_reviews``.
    """
    now = now or timezone.now()
    cutoff_day = (now - timedelta(days=REVIEW_WINDOW_DAYS - 1)).date()
    candidates = (Review.objects.filter(status=ReviewStatus.SUBMITTED, booking__check_out__lte=cutoff_day)
                  .select_related("booking", "booking__host_account").order_by("id"))
    count = 0
    for review in candidates:
        if window_ends_at(review.booking) > now:
            continue
        with transaction.atomic():
            locked = Review.objects.select_for_update(of=("self",)).select_related("booking", "booking__host_account").get(pk=review.pk)
            if locked.status == ReviewStatus.SUBMITTED:
                _publish([locked], now)
                count += 1
    return count


# ---------------------------------------------------------------------------
# Host reply (REV-03)
# ---------------------------------------------------------------------------
@transaction.atomic
def reply_to_review(*, ctx, actor, review_id, body: str) -> Review:
    """
    Write or edit the public reply of the active host account (``PUT /host/reviews/{id}/reply``).

    Needs ``messages.reply``. Only on a published guest review of this host
    account (another host's review answers 404). Editable for 48 hours
    after it was first written, then 409 ``reply_locked``.
    """
    ctx.require("messages.reply")
    review = (Review.objects.select_for_update()
              .filter(pk=_uuid(review_id), host_account=ctx.host_account, author_role=AuthorRole.GUEST)
              .exclude(status__in=[ReviewStatus.SUBMITTED, ReviewStatus.REMOVED]).first())
    if review is None:
        raise NotFoundError("Review not found.")
    if review.status != ReviewStatus.PUBLISHED:
        raise ConflictError("Only a published review can get a reply.", code="review_not_published")
    now = timezone.now()
    reply = ReviewReply.objects.filter(review=review).first()
    if reply is None:
        ReviewReply.objects.create(review=review, author=actor, body=body.strip(), created_at=now,
                                   editable_until=now + timedelta(hours=REPLY_EDIT_HOURS))
    else:
        if now > reply.editable_until:
            raise ConflictError("The reply can no longer be edited.", code="reply_locked")
        reply.body, reply.author = body.strip(), actor
        reply.save(update_fields=["body", "author", "updated_at"])
    return review


# ---------------------------------------------------------------------------
# Reports (REV-04, BR-REV-03)
# ---------------------------------------------------------------------------
@transaction.atomic
def report_review(*, reporter, review_id, reason_code: str, note: str = "") -> ReviewReport:
    """
    A signed-in user reports a public review (``POST /reviews/{id}/reports``).

    One report per user and review (409 ``already_reported``); an unknown
    reason is 422 ``invalid_reason_code``; reporting one's own review is 422
    ``cannot_report_own_review``. After ``FLAG_AFTER_REPORTS`` open reports
    a published review becomes ``flagged`` (hidden until a moderator decides).
    """
    review = Review.objects.select_for_update().filter(
        pk=_uuid(review_id), status__in=[ReviewStatus.PUBLISHED, ReviewStatus.FLAGGED]).first()
    if review is None:
        raise NotFoundError("Review not found.")
    if reason_code not in REPORT_REASON_CODES:
        raise DomainError("Unknown reason.", code="invalid_reason_code", status_code=422,
                          errors={"reason_code": [f"One of: {', '.join(REPORT_REASON_CODES)}."]})
    if review.author_id == reporter.id:
        raise DomainError("You cannot report your own review.", code="cannot_report_own_review", status_code=422)
    try:
        with transaction.atomic():
            report = ReviewReport.objects.create(review=review, reporter=reporter, reason_code=reason_code,
                                                 note=(note or "").strip())
    except IntegrityError as exc:
        raise ConflictError("You already reported this review.", code="already_reported") from exc
    open_reports = review.reports.filter(status=ReportStatus.OPEN).count()
    if review.status == ReviewStatus.PUBLISHED and open_reports >= FLAG_AFTER_REPORTS:
        review.status = ReviewStatus.FLAGGED
        review.save(update_fields=["status", "updated_at"])
        recompute_ratings_for(review)
    return report


# ---------------------------------------------------------------------------
# Moderation (BR-REV-03, BR-STF-02: audited)
# ---------------------------------------------------------------------------
def _lock_for_admin(review_id) -> Review:
    """Any review by id under a row lock, else 404."""
    review = Review.objects.select_for_update().filter(pk=_uuid(review_id)).first()
    if review is None:
        raise NotFoundError("Review not found.")
    return review


def _move(review: Review, *, actor, new_status: str, action: str, reason: str = "", reason_code: str | None = None,
          report_status: str | None = None) -> Review:
    """Change the status, close open reports, audit the move and refresh rating caches."""
    before = review.status
    review.status = new_status
    if reason:
        review.status_reason = reason
    if new_status == ReviewStatus.PUBLISHED and review.published_at is None:
        review.published_at = timezone.now()
    review.save(update_fields=["status", "status_reason", "published_at", "updated_at"])
    if report_status:
        review.reports.filter(status=ReportStatus.OPEN).update(status=report_status)
    audit.record(actor=actor, action=action, obj=review, note=reason,
                 before={"status": before}, after={"status": new_status, "reason_code": reason_code})
    recompute_ratings_for(review)
    return review


@transaction.atomic
def hide_review(*, actor, review_id, reason: str, reason_code: str | None = None) -> Review:
    """Hide a published or flagged review (``POST /admin/reviews/{id}/hide``); open reports become ``actioned``."""
    review = _lock_for_admin(review_id)
    if review.status not in (ReviewStatus.PUBLISHED, ReviewStatus.FLAGGED):
        raise ConflictError("Only a published or flagged review can be hidden.", code="invalid_review_transition")
    return _move(review, actor=actor, new_status=ReviewStatus.HIDDEN, action="REVIEW_HIDE", reason=reason,
                 reason_code=reason_code, report_status=ReportStatus.ACTIONED)


@transaction.atomic
def restore_review(*, actor, review_id, reason: str = "", reason_code: str | None = None) -> Review:
    """
    Publish a hidden or flagged review again (``POST /admin/reviews/{id}/restore``).

    A removed review is final: 409 ``review_removed`` (BR-REV-03).
    """
    review = _lock_for_admin(review_id)
    if review.status == ReviewStatus.REMOVED:
        raise ConflictError("A removed review cannot be restored.", code="review_removed")
    if review.status not in (ReviewStatus.HIDDEN, ReviewStatus.FLAGGED):
        raise ConflictError("Only a hidden or flagged review can be restored.", code="invalid_review_transition")
    return _move(review, actor=actor, new_status=ReviewStatus.PUBLISHED, action="REVIEW_RESTORE", reason=reason,
                 reason_code=reason_code, report_status=ReportStatus.DISMISSED)


@transaction.atomic
def dismiss_reports(*, actor, review_id, reason: str = "", reason_code: str | None = None) -> Review:
    """
    Dismiss the open reports and keep the review (``POST /admin/reviews/{id}/dismiss-reports``).

    A flagged review is published again; other states keep their status.
    """
    review = _lock_for_admin(review_id)
    if review.status == ReviewStatus.REMOVED:
        raise ConflictError("A removed review cannot change.", code="review_removed")
    new_status = ReviewStatus.PUBLISHED if review.status == ReviewStatus.FLAGGED else review.status
    return _move(review, actor=actor, new_status=new_status, action="REVIEW_DISMISS_REPORTS", reason=reason,
                 reason_code=reason_code, report_status=ReportStatus.DISMISSED)


def is_super_admin(user) -> bool:
    """True for a super admin (BR-REV-03). One staff role today (DEC-016): Django's ``is_superuser`` marks it."""
    profile = getattr(user, "staff_profile", None)
    return bool(getattr(user, "is_superuser", False) or (profile and getattr(profile, "role", "") == "super_admin"))


@transaction.atomic
def remove_review(*, actor, review_id) -> Review:
    """
    Remove a review for good (``DELETE /admin/reviews/{id}``): super admin only (403 ``super_admin_required``).

    Status ``removed`` (the row stays for the audit trail); repeating it changes nothing.
    """
    if not is_super_admin(actor):
        raise ForbiddenError("Only a super admin can remove a review.", code="super_admin_required")
    review = _lock_for_admin(review_id)
    if review.status == ReviewStatus.REMOVED:
        return review
    return _move(review, actor=actor, new_status=ReviewStatus.REMOVED, action="REVIEW_REMOVE",
                 report_status=ReportStatus.ACTIONED)


# ---------------------------------------------------------------------------
# Rating caches (BR-REV-04)
# ---------------------------------------------------------------------------
def _aggregate(**filters) -> tuple[Decimal | None, int]:
    """Average overall rating (2 decimals, half up) and count of published guest reviews matching ``filters``."""
    row = Review.objects.filter(author_role=AuthorRole.GUEST, status__in=PUBLIC_STATUSES, **filters).aggregate(
        avg=Avg("rating_overall"), count=Count("id"))
    avg = None if row["avg"] is None else Decimal(str(row["avg"])).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return avg, row["count"]


def recompute_ratings(*, listing_id=None, trip_id=None, host_account_id=None) -> None:
    """
    Recompute ``rating_avg`` and ``review_count`` from published guest reviews (BR-REV-04).

    Writes only the two cache columns of listing, trip and host account
    (an organisation is rated through its host account). Safe to run any
    number of times: it rebuilds the numbers, it never adds to them.
    """
    if listing_id:
        avg, count = _aggregate(listing_id=listing_id)
        Listing.objects.filter(pk=listing_id).update(rating_avg=avg, review_count=count)
    if trip_id:
        avg, count = _aggregate(trip_id=trip_id)
        Trip.objects.filter(pk=trip_id).update(rating_avg=avg, review_count=count)
    if host_account_id:
        avg, count = _aggregate(host_account_id=host_account_id)
        HostAccount.objects.filter(pk=host_account_id).update(rating_avg=avg, review_count=count)


def recompute_ratings_for(review: Review) -> None:
    """Refresh every cache a guest review counts in (host reviews of guests count nowhere)."""
    if review.author_role == AuthorRole.GUEST:
        recompute_ratings(listing_id=review.listing_id, trip_id=review.trip_id, host_account_id=review.host_account_id)


def recompute_all_ratings() -> int:
    """Nightly full pass (BR-REV-04): rebuild the caches of everything that has a guest review. Returns rows touched."""
    pairs = Review.objects.filter(author_role=AuthorRole.GUEST).values_list("listing_id", "trip_id", "host_account_id")
    listings, trips, hosts = set(), set(), set()
    for listing_id, trip_id, host_id in pairs:
        listings.add(listing_id)
        trips.add(trip_id)
        hosts.add(host_id)
    for listing_id in listings - {None}:
        recompute_ratings(listing_id=listing_id)
    for trip_id in trips - {None}:
        recompute_ratings(trip_id=trip_id)
    for host_id in hosts - {None}:
        recompute_ratings(host_account_id=host_id)
    return len(listings - {None}) + len(trips - {None}) + len(hosts - {None})


def _uuid(value):
    """Parse a path id; a malformed id answers 404 like an unknown one."""
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise NotFoundError("Review not found.") from exc
