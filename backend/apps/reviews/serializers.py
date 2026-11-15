"""API shapes of the reviews app (openapi.yaml: Review, ReviewCreate, ReviewReply, ReviewReport, AdminReview, RatingSummary)."""

from rest_framework import serializers

from .models import AuthorRole, ReviewStatus


def user_ref(user) -> dict | None:
    """``UserRef``: a person as shown to others, never with contact details."""
    if user is None:
        return None
    return {"id": str(user.id), "display_name": user.display_name, "avatar_url": None}


class UserRefSerializer(serializers.Serializer):
    """``UserRef`` (for the OpenAPI schema)."""

    class Meta:
        """Own component name: other apps define the same shape."""

        ref_name = "ReviewUserRef"

    id = serializers.UUIDField()
    display_name = serializers.CharField()
    avatar_url = serializers.URLField(allow_null=True)


class ReplySerializer(serializers.Serializer):
    """The host's reply inside a review."""

    body = serializers.CharField()
    created_at = serializers.DateTimeField()
    editable_until = serializers.DateTimeField()


class ReviewSerializer(serializers.Serializer):
    """``Review``: one review as the public, the author or the host see it (stay month only, never dates)."""

    id = serializers.UUIDField()
    author = serializers.SerializerMethodField()
    author_role = serializers.ChoiceField(choices=AuthorRole.choices)
    listing_id = serializers.UUIDField(allow_null=True)
    trip_id = serializers.UUIDField(allow_null=True)
    host_account_id = serializers.UUIDField()
    rating_overall = serializers.IntegerField(min_value=1, max_value=5)
    rating_cleanliness = serializers.IntegerField(allow_null=True)
    rating_accuracy = serializers.IntegerField(allow_null=True)
    rating_communication = serializers.IntegerField(allow_null=True)
    rating_location = serializers.IntegerField(allow_null=True)
    rating_value = serializers.IntegerField(allow_null=True)
    comment = serializers.CharField()
    language = serializers.CharField()
    status = serializers.ChoiceField(choices=ReviewStatus.choices)
    stay_month = serializers.CharField(allow_null=True)
    published_at = serializers.DateTimeField(allow_null=True)
    reply = serializers.SerializerMethodField()

    def get_author(self, obj) -> UserRefSerializer:
        """The author as a ``UserRef``."""
        return user_ref(obj.author)

    def get_reply(self, obj) -> ReplySerializer(allow_null=True):
        """The host reply, or null."""
        reply = getattr(obj, "reply", None) if hasattr(obj, "reply") else None
        if reply is None:
            return None
        return {"body": reply.body, "created_at": reply.created_at, "editable_until": reply.editable_until}


class ReviewCreateSerializer(serializers.Serializer):
    """``ReviewCreate``: every rating 1 to 5, comment 20 to 4000 characters, language en/fr/ar (BR-REV-01)."""

    rating_overall = serializers.IntegerField(min_value=1, max_value=5)
    rating_cleanliness = serializers.IntegerField(min_value=1, max_value=5)
    rating_accuracy = serializers.IntegerField(min_value=1, max_value=5)
    rating_communication = serializers.IntegerField(min_value=1, max_value=5)
    rating_location = serializers.IntegerField(min_value=1, max_value=5)
    rating_value = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(min_length=20, max_length=4000)
    language = serializers.ChoiceField(choices=["en", "fr", "ar"])

    def validate(self, attrs):
        """``additionalProperties: false``: unknown fields are refused."""
        unknown = set(self.initial_data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({name: ["Unknown field."] for name in sorted(unknown)})
        return attrs


class ReviewReplySerializer(serializers.Serializer):
    """``ReviewReply``: the reply body, 2 to 2000 characters."""

    body = serializers.CharField(min_length=2, max_length=2000)


class ReviewReportSerializer(serializers.Serializer):
    """``ReviewReport``: a reason code and an optional note."""

    reason_code = serializers.CharField(max_length=48)
    note = serializers.CharField(max_length=2000, required=False, allow_blank=True)


class ModerationReasonSerializer(serializers.Serializer):
    """``Reason``: what a moderator writes for a move (BR-REV-03)."""

    reason_code = serializers.CharField(max_length=48, required=False, allow_null=True)
    reason = serializers.CharField(min_length=10, max_length=2000)


class OptionalReasonSerializer(ModerationReasonSerializer):
    """``Reason`` when the body is optional (restore, dismiss reports)."""

    reason = serializers.CharField(min_length=10, max_length=2000, required=False)


class RatingSummarySerializer(serializers.Serializer):
    """``RatingSummary`` (BR-REV-04)."""

    rating_avg = serializers.FloatField(allow_null=True)
    review_count = serializers.IntegerField()
    sub_ratings = serializers.DictField(child=serializers.FloatField())


class AdminReportSerializer(serializers.Serializer):
    """One report inside ``AdminReview``."""

    reason_code = serializers.CharField()
    note = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    created_at = serializers.DateTimeField()


class AdminReviewSerializer(ReviewSerializer):
    """``AdminReview``: a review with its booking reference, place and reports, for moderators."""

    booking_reference = serializers.CharField(source="booking.reference")
    listing_title = serializers.SerializerMethodField()
    vertical = serializers.SerializerMethodField()
    wilaya_code = serializers.SerializerMethodField()
    open_reports = serializers.SerializerMethodField()
    reports = serializers.SerializerMethodField()

    def get_listing_title(self, obj) -> str | None:
        """Title of the listing or trip reviewed."""
        if obj.listing_id:
            return obj.listing.title
        return obj.trip.title if obj.trip_id else None

    def get_vertical(self, obj) -> str | None:
        """Listing vertical; null for trips (trips are not a vertical, DEC-006)."""
        return obj.listing.vertical if obj.listing_id else None

    def get_wilaya_code(self, obj) -> int | None:
        """Wilaya of the listing commune or of the trip start."""
        if obj.listing_id and obj.listing.commune_id:
            return obj.listing.commune.wilaya_id
        if obj.trip_id and obj.trip.start_commune_id:
            return obj.trip.start_commune.wilaya_id
        return None

    def get_open_reports(self, obj) -> int:
        """Number of open reports."""
        annotated = getattr(obj, "open_reports", None)
        if annotated is not None:
            return annotated
        return sum(1 for r in obj.reports.all() if r.status == "open")

    def get_reports(self, obj) -> AdminReportSerializer(many=True):
        """Every report, newest first (the reporter is not shown)."""
        rows = sorted(obj.reports.all(), key=lambda r: r.id, reverse=True)
        return [{"reason_code": r.reason_code, "note": r.note or None, "status": r.status, "created_at": r.created_at}
                for r in rows]
