"""
Tables of the reviews app (see docs/backend/05b-data-dictionary.md, "Reviews").

- ``review``: one review per booking and side (guest reviews the stay, host
  reviews the guest), ratings 1 to 5 (BR-REV-01), double-blind (BR-REV-02),
  moderated through ``status`` (BR-REV-03);
- ``review_reply``: the host's public answer, editable for 48 hours;
- ``review_report``: a user reports a review, once per review (REV-04).

Rating caches (``rating_avg``, ``review_count``) live on listing, trip and
host account and are recomputed by ``services.recompute_ratings`` (BR-REV-04).
"""

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.models import UUIDModel

RATING_FIELDS = (
    "rating_overall", "rating_cleanliness", "rating_accuracy", "rating_communication", "rating_location", "rating_value",
)
SUB_RATING_FIELDS = RATING_FIELDS[1:]


class AuthorRole(models.TextChoices):
    """Who wrote the review (subset of the ``actor_role`` enum)."""

    GUEST = "guest", "Guest (reviews the stay)"
    HOST = "host", "Host (reviews the guest)"


class ReviewStatus(models.TextChoices):
    """States of a review (BR-REV-03)."""

    SUBMITTED = "submitted", "Submitted (waiting for the other side, BR-REV-02)"
    PUBLISHED = "published", "Published"
    FLAGGED = "flagged", "Flagged (reported, waiting for a moderator)"
    HIDDEN = "hidden", "Hidden by a moderator"
    REMOVED = "removed", "Removed by a super admin (final)"


class Review(UUIDModel):
    """
    A review of one booking by one side.

    Rules carried by this table:
    - one review per booking and side: unique ``(booking, author_role)`` (BR-REV-01);
    - every rating between 1 and 5 (database check, BR-REV-01);
    - ``status`` changes only through ``services.py`` (BR-REV-02, BR-REV-03);
    - no edit after publication (BR-REV-02): the services never update the text.
    """

    booking = models.ForeignKey("bookings.Booking", on_delete=models.PROTECT, related_name="reviews")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="reviews_written")
    author_role = models.CharField(max_length=8, choices=AuthorRole.choices)
    listing = models.ForeignKey("catalog.Listing", on_delete=models.PROTECT, null=True, blank=True, related_name="reviews")
    trip = models.ForeignKey("trips.Trip", on_delete=models.PROTECT, null=True, blank=True, related_name="reviews")
    host_account = models.ForeignKey("hosts.HostAccount", on_delete=models.PROTECT, related_name="reviews")
    rating_overall = models.PositiveSmallIntegerField()
    rating_cleanliness = models.PositiveSmallIntegerField(null=True, blank=True)
    rating_accuracy = models.PositiveSmallIntegerField(null=True, blank=True)
    rating_communication = models.PositiveSmallIntegerField(null=True, blank=True)
    rating_location = models.PositiveSmallIntegerField(null=True, blank=True)
    rating_value = models.PositiveSmallIntegerField(null=True, blank=True)
    comment = models.TextField()
    language = models.CharField(max_length=2)
    status = models.CharField(max_length=10, choices=ReviewStatus.choices, default=ReviewStatus.SUBMITTED)
    status_reason = models.TextField(blank=True, help_text="Last moderator reason (BR-REV-03). Never shown publicly.")
    submitted_at = models.DateTimeField(default=timezone.now)
    published_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        """One review per booking and side; ratings in range; lists read by subject and status."""

        ordering = ["-id"]
        constraints = [
            models.UniqueConstraint(fields=["booking", "author_role"], name="review_one_per_booking_side"),
            *[
                models.CheckConstraint(
                    condition=Q(**{f"{name}__isnull": True}) | Q(**{f"{name}__gte": 1, f"{name}__lte": 5}),
                    name=f"review_{name}_1_to_5",
                )
                for name in RATING_FIELDS
            ],
        ]
        indexes = [
            models.Index(fields=["listing", "status"], name="review_listing_status_idx"),
            models.Index(fields=["trip", "status"], name="review_trip_status_idx"),
            models.Index(fields=["host_account", "status"], name="review_host_status_idx"),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.author_role} review {self.rating_overall}/5 ({self.status})"

    @property
    def stay_month(self) -> str | None:
        """Month of the stay (``2026-08``), never the exact dates (privacy, openapi ``stay_month``)."""
        return self.booking.check_in.strftime("%Y-%m") if self.booking_id else None


class ReviewReply(models.Model):
    """The host's public answer to a guest review (REV-03): one per review, editable for 48 hours."""

    review = models.OneToOneField(Review, on_delete=models.CASCADE, primary_key=True, related_name="reply")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    body = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    editable_until = models.DateTimeField()

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"Reply to {self.review_id}"


class ReportStatus(models.TextChoices):
    """Life of a review report."""

    OPEN = "open", "Open"
    DISMISSED = "dismissed", "Dismissed (review kept)"
    ACTIONED = "actioned", "Actioned (review hidden or removed)"


class ReviewReport(UUIDModel):
    """
    A user reports a review (REV-04, BR-REV-03): once per user and review.

    ``reason_code`` is the code of a ``report_review`` reason. The plan links
    the ``reason_code`` table (trust app, a higher layer), so the code is
    stored as text and checked against ``services.REPORT_REASON_CODES``.
    """

    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="reports")
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    reason_code = models.CharField(max_length=48)
    note = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=ReportStatus.choices, default=ReportStatus.OPEN)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """One report per user and review (409 ``already_reported``)."""

        ordering = ["-id"]
        constraints = [
            models.UniqueConstraint(fields=["review", "reporter"], name="review_report_once_per_user"),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"Report {self.reason_code} on {self.review_id} ({self.status})"
