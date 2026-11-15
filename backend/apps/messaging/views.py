"""
HTTP endpoints of the messaging app (thin layer: rules live in ``services.py``).

- ``GET /conversations`` (``as=guest|host``, ``unread``, cursor page) and ``POST /conversations`` (find or create);
- ``GET /conversations/sync`` (polling with an opaque cursor, ADR-021);
- ``GET /conversations/{id}``, ``GET`` and ``POST /conversations/{id}/messages``, ``POST /conversations/{id}/read``.

A thread the caller may not see answers 404 (OWASP API1). ``as=host``
works on the active workspace (``X-Host-Account``) and needs ``messages.reply``.
"""

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.errors import DomainError
from apps.hosts.context import get_host_context
from apps.notifications.cursor import (
    CURSOR_PARAMETERS,
    cursor_body,
    cursor_page_schema,
    cursor_slice,
    read_bool,
    read_limit,
)

from . import selectors, services
from .models import ParticipantRole
from .serializers import (
    ConversationCreateSerializer,
    ConversationSerializer,
    MessageCreateSerializer,
    MessagePageSerializer,
    MessageSerializer,
    Presenter,
    ReadMarkerSerializer,
    SyncResponseSerializer,
)

AS_PARAMETER = OpenApiParameter("as", str, enum=["guest", "host"], default="guest",
                                description="guest = my own threads; host = threads of the active host account.")


def _side(request) -> tuple[str, object]:
    """``(role, host_account)`` from ``as``; the host side needs ``messages.reply`` in the active workspace."""
    side = request.query_params.get("as") or "guest"
    if side == "guest":
        return ParticipantRole.GUEST, None
    if side != "host":
        raise DomainError("Invalid query parameter.", code="invalid", errors={"as": ["guest or host."]})
    ctx = get_host_context(request)
    ctx.require(services.REPLY_PERMISSION)
    return ParticipantRole.HOST_MEMBER, ctx.host_account


class ConversationListView(APIView):
    """``GET /conversations`` and ``POST /conversations``."""

    serializer_class = ConversationSerializer

    @extend_schema(
        operation_id="listConversations",
        parameters=[AS_PARAMETER, OpenApiParameter("unread", bool, description="Only threads with unread messages."),
                    *CURSOR_PARAMETERS],
        responses=cursor_page_schema(ConversationSerializer, extra={"unread_total": serializers.IntegerField()}),
        tags=["messaging"],
    )
    def get(self, request):
        """My threads of one side, most recent activity first."""
        role, host_account = _side(request)
        conversations = selectors.inbox(request.user, role=role, host_account=host_account)
        qs = selectors.only_unread(request.user, conversations) if read_bool(request, "unread") else conversations
        rows, next_cursor, has_more = cursor_slice(request, qs, key="last_message_at")
        presenter = Presenter(request.user)
        data = [presenter.conversation(row, role) for row in rows]
        return Response(cursor_body(data, next_cursor, has_more,
                                    unread_total=selectors.unread_total(request.user, conversations)))

    @extend_schema(
        operation_id="startConversation", request=ConversationCreateSerializer,
        responses={201: ConversationSerializer, 200: OpenApiResponse(ConversationSerializer, "Already existed.")},
        tags=["messaging"],
    )
    def post(self, request):
        """Find or create; 201 when created, 200 when it already existed; 422 ``cannot_message_self``."""
        data = ConversationCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        conversation, role, created = services.start_conversation(
            user=request.user, listing_id=values.get("listing_id"), trip_id=values.get("trip_id"),
            booking_id=values.get("booking_id"), first_message=values.get("first_message"))
        conversation, role = services.resolve(request.user, conversation.id)
        body = Presenter(request.user).conversation(conversation, role)
        return Response(body, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ConversationSyncView(APIView):
    """``GET /conversations/sync``: what changed since the cursor (poll every ``poll_after_ms``)."""

    @extend_schema(
        operation_id="syncConversations",
        parameters=[OpenApiParameter("after", str, description="Cursor from the previous sync; omit on the first call."),
                    AS_PARAMETER],
        responses=SyncResponseSerializer, tags=["messaging"],
    )
    def get(self, request):
        """Changed threads and new messages of one side."""
        role, host_account = _side(request)
        conversations = selectors.inbox(request.user, role=role, host_account=host_account)
        result = selectors.sync(request.user, conversations, request.query_params.get("after"))
        presenter = Presenter(request.user)
        by_id = {c.pk: c for c in result["conversations"]}
        result["conversations"] = [presenter.conversation(c, role) for c in result["conversations"]]
        result["messages"] = [presenter.message(m, by_id.get(m.conversation_id)) for m in result["messages"]]
        return Response(result)


class ConversationDetailView(APIView):
    """``GET /conversations/{conversation_id}``."""

    serializer_class = ConversationSerializer

    @extend_schema(operation_id="getConversation", responses=ConversationSerializer, tags=["messaging"])
    def get(self, request, conversation_id):
        """One of my threads (either side), else 404."""
        conversation, role = services.resolve(request.user, conversation_id)
        return Response(Presenter(request.user).conversation(conversation, role))


class MessageListView(APIView):
    """``GET`` and ``POST /conversations/{conversation_id}/messages``."""

    serializer_class = MessageSerializer

    @extend_schema(
        operation_id="listMessages",
        parameters=[OpenApiParameter("after", str, description="Newer than this message id, oldest first."),
                    OpenApiParameter("before", str, description="Older than this message id, newest first."),
                    OpenApiParameter("limit", int, description="1 to 50, default 20.")],
        responses=MessagePageSerializer, tags=["messaging"],
    )
    def get(self, request, conversation_id):
        """A page of messages, masked for me where needed (BR-MSG-01)."""
        conversation, role = services.resolve(request.user, conversation_id)
        after = selectors.parse_message_id(request.query_params.get("after"), "after")
        before = selectors.parse_message_id(request.query_params.get("before"), "before")
        rows, has_more = selectors.messages_page(conversation, after=after, before=before, limit=read_limit(request))
        me = services.participant(conversation, request.user, role)
        presenter = Presenter(request.user)
        return Response({
            "results": [presenter.message(row, conversation) for row in rows], "has_more": has_more,
            "last_read_message_id": str(me.last_read_message_id) if me.last_read_message_id else None,
        })

    def get_throttles(self):
        """Count only sends against the ``messages`` limit (BR-MSG-01); reading messages is not limited by it."""
        self.throttle_scope = "messages" if self.request.method == "POST" else None
        return super().get_throttles()

    @extend_schema(operation_id="sendMessage", request=MessageCreateSerializer, responses={201: MessageSerializer},
                   tags=["messaging"])
    def post(self, request, conversation_id):
        """Send; a retry with the same ``client_message_id`` returns the first message."""
        data = MessageCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        conversation, role = services.resolve(request.user, conversation_id)
        message, _created = services.send_message(
            user=request.user, conversation=conversation, role=role, body=data.validated_data["body"],
            client_message_id=data.validated_data.get("client_message_id") or None)
        return Response(Presenter(request.user).message(message, conversation), status=status.HTTP_201_CREATED)


class ConversationReadView(APIView):
    """``POST /conversations/{conversation_id}/read``: move my read pointer (never backwards)."""

    @extend_schema(operation_id="markConversationRead", request=ReadMarkerSerializer, responses={204: None},
                   tags=["messaging"])
    def post(self, request, conversation_id):
        """422 ``unknown_message`` when the id is not a message of this thread."""
        data = ReadMarkerSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        conversation, role = services.resolve(request.user, conversation_id)
        services.mark_read(user=request.user, conversation=conversation, role=role,
                           last_read_message_id=data.validated_data["last_read_message_id"])
        return Response(status=status.HTTP_204_NO_CONTENT)
