"""
API shapes of the messaging app (openapi.yaml: Conversation, Message, MessageCreate,
ConversationCreate, ReadMarker, SyncResponse).

A conversation and its messages look different for each reader (my role,
unread count, masked bodies, BR-MSG-01), so the bodies are built by
:class:`Presenter` for one reader; the serializer classes describe the
shapes for the OpenAPI schema and validate request bodies.
"""

from rest_framework import serializers

from . import selectors, services
from .models import Conversation, ConversationParticipant, Message, ParticipantRole

PREVIEW_LENGTH = 120


class UserRefSerializer(serializers.Serializer):
    """``UserRef``: a person as shown to others, never with contact details."""

    class Meta:
        """Own component name: other apps define the same shape."""

        ref_name = "MessagingUserRef"

    id = serializers.UUIDField()
    display_name = serializers.CharField()
    avatar_url = serializers.URLField(allow_null=True)


class SubjectSerializer(serializers.Serializer):
    """What a thread is about."""

    listing_id = serializers.UUIDField(allow_null=True)
    trip_id = serializers.UUIDField(allow_null=True)
    booking_id = serializers.UUIDField(allow_null=True)
    booking_reference = serializers.CharField(allow_null=True)
    title = serializers.CharField()
    photo = serializers.DictField(allow_null=True)


class LastMessageSerializer(serializers.Serializer):
    """Preview of the newest message, as the reader sees it."""

    id = serializers.UUIDField()
    preview = serializers.CharField()
    created_at = serializers.DateTimeField()
    sender_is_me = serializers.BooleanField()


class ConversationSerializer(serializers.Serializer):
    """``Conversation`` (schema only; bodies come from :class:`Presenter`)."""

    id = serializers.UUIDField()
    kind = serializers.CharField()
    my_role = serializers.ChoiceField(choices=ParticipantRole.choices)
    host_account_id = serializers.UUIDField(allow_null=True)
    subject = SubjectSerializer()
    other_party = UserRefSerializer()
    last_message = LastMessageSerializer(allow_null=True)
    last_read_message_id = serializers.UUIDField(allow_null=True)
    unread_count = serializers.IntegerField()
    muted = serializers.BooleanField()
    last_message_at = serializers.DateTimeField(allow_null=True)


class MessageSerializer(serializers.Serializer):
    """``Message`` (schema only); ``body`` is already masked for the reader when ``is_masked`` (BR-MSG-01)."""

    id = serializers.UUIDField()
    conversation_id = serializers.UUIDField()
    sender = UserRefSerializer(allow_null=True)
    sender_role = serializers.CharField()
    kind = serializers.CharField()
    body = serializers.CharField()
    is_masked = serializers.BooleanField()
    client_message_id = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()


class MessageCreateSerializer(serializers.Serializer):
    """``MessageCreate``: body 1 to 4000 characters and an optional client id for safe retries."""

    body = serializers.CharField(min_length=1, max_length=4000)
    client_message_id = serializers.CharField(max_length=64, required=False, allow_blank=True)


class ConversationCreateSerializer(serializers.Serializer):
    """``ConversationCreate``: exactly one of listing_id, trip_id, booking_id, and an optional first message."""

    listing_id = serializers.UUIDField(required=False, allow_null=True)
    trip_id = serializers.UUIDField(required=False, allow_null=True)
    booking_id = serializers.UUIDField(required=False, allow_null=True)
    first_message = serializers.CharField(min_length=1, max_length=4000, required=False)

    def validate(self, attrs):
        """Exactly one subject."""
        if sum(1 for name in ("listing_id", "trip_id", "booking_id") if attrs.get(name)) != 1:
            raise serializers.ValidationError("Send exactly one of listing_id, trip_id, booking_id.")
        return attrs


class ReadMarkerSerializer(serializers.Serializer):
    """``ReadMarker``: the newest message I have read."""

    last_read_message_id = serializers.UUIDField()


class SyncResponseSerializer(serializers.Serializer):
    """``SyncResponse`` of ``GET /conversations/sync``."""

    conversations = ConversationSerializer(many=True)
    messages = MessageSerializer(many=True)
    unread_total = serializers.IntegerField()
    next_cursor = serializers.CharField()
    has_more = serializers.BooleanField()
    poll_after_ms = serializers.IntegerField(min_value=2000, max_value=60000)


class MessagePageSerializer(serializers.Serializer):
    """Answer of ``GET /conversations/{id}/messages``."""

    results = MessageSerializer(many=True)
    has_more = serializers.BooleanField()
    last_read_message_id = serializers.UUIDField(allow_null=True)


def user_ref(user) -> dict | None:
    """``UserRef`` of a person."""
    if user is None:
        return None
    return {"id": str(user.id), "display_name": user.display_name, "avatar_url": None}


def host_ref(host_account) -> dict | None:
    """The host side as one party: the host account id and its public name."""
    if host_account is None:
        return None
    return {"id": str(host_account.id), "display_name": host_account.display_name, "avatar_url": None}


class Presenter:
    """
    Builds conversation and message bodies for one reader.

    Caches whether contacts are unlocked per thread, so a sync page with
    many messages of one thread asks the database once (BR-MSG-01).
    """

    def __init__(self, user):
        """Remember the reader."""
        self.user = user
        self._unlocked: dict = {}

    def unlocked(self, conversation: Conversation) -> bool:
        """True when contact details are visible in this thread (cached)."""
        if conversation.pk not in self._unlocked:
            self._unlocked[conversation.pk] = services.contacts_unlocked(conversation)
        return self._unlocked[conversation.pk]

    def message(self, message: Message, conversation: Conversation | None = None) -> dict:
        """``Message`` as the reader sees it."""
        conversation = conversation or message.conversation
        body, is_masked = services.shown_body(message, self.user.id, self.unlocked(conversation))
        return {
            "id": str(message.id), "conversation_id": str(message.conversation_id), "sender": user_ref(message.sender),
            "sender_role": message.sender_role, "kind": message.kind, "body": body, "is_masked": is_masked,
            "client_message_id": message.client_message_id if message.sender_id == self.user.id else None,
            "created_at": message.created_at,
        }

    def conversation(self, conversation: Conversation, role: str) -> dict:
        """``Conversation`` for the reader on side ``role``."""
        row = ConversationParticipant.objects.filter(conversation=conversation, user=self.user).first()
        pointer = row.last_read_message_id if row else None
        last = (Message.objects.filter(conversation=conversation, deleted_at__isnull=True)
                .order_by("-id").first())
        last_message = None
        if last is not None:
            body, _ = services.shown_body(last, self.user.id, self.unlocked(conversation))
            last_message = {"id": str(last.id), "preview": body[:PREVIEW_LENGTH], "created_at": last.created_at,
                            "sender_is_me": last.sender_id == self.user.id}
        booking = conversation.booking if conversation.booking_id else None
        title = (booking.title if booking else conversation.listing.title if conversation.listing_id
                 else conversation.trip.title if conversation.trip_id else "BLADUS")
        other = host_ref(conversation.host_account) if role == ParticipantRole.GUEST else user_ref(conversation.guest)
        return {
            "id": str(conversation.id), "kind": conversation.kind, "my_role": role,
            "host_account_id": str(conversation.host_account_id) if conversation.host_account_id else None,
            "subject": {
                "listing_id": str(conversation.listing_id) if conversation.listing_id else None,
                "trip_id": str(conversation.trip_id) if conversation.trip_id else None,
                "booking_id": str(conversation.booking_id) if conversation.booking_id else None,
                "booking_reference": booking.reference if booking else None,
                "title": title, "photo": None,
            },
            "other_party": other or {"id": None, "display_name": "BLADUS", "avatar_url": None},
            "last_message": last_message,
            "last_read_message_id": str(pointer) if pointer else None,
            "unread_count": selectors.unread_count(self.user, conversation, pointer),
            "muted": bool(row and row.muted),
            "last_message_at": conversation.last_message_at,
        }
