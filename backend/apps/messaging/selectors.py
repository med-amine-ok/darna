"""
Read queries of the messaging app: inboxes, unread counts, message pages and polling sync (MSG-01 to MSG-03).

Unread = messages of the thread written by someone else, not deleted, with
an id above my read pointer (UUIDv7 ids sort by time, DEC-031).
"""

import uuid
from datetime import datetime

from django.db.models import Exists, F, OuterRef, QuerySet, Subquery, UUIDField, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.core.errors import DomainError
from apps.notifications.cursor import decode_cursor, encode_cursor

from .models import Conversation, ConversationParticipant, Message, ParticipantRole

ZERO_UUID = uuid.UUID(int=0)
SYNC_MAX_MESSAGES = 200
POLL_AFTER_MS = 10_000

_RELATED = ("guest", "host_account", "host_account__organization", "host_account__user", "listing", "trip", "booking")


def inbox(user, *, role: str, host_account=None) -> QuerySet:
    """Threads of my side: as guest my own; as host those of the active host account (already checked by the caller)."""
    qs = Conversation.objects.select_related(*_RELATED)
    if role == ParticipantRole.HOST_MEMBER:
        return qs.filter(host_account=host_account)
    return qs.filter(guest=user)


def _my_pointer(user, conversation_ref="pk"):
    """Subquery: my read pointer in the outer conversation (zero UUID when I never read)."""
    pointer = ConversationParticipant.objects.filter(conversation=OuterRef(conversation_ref), user=user).values(
        "last_read_message_id")[:1]
    return Coalesce(Subquery(pointer, output_field=UUIDField()), Value(ZERO_UUID, output_field=UUIDField()))


def unread_total(user, conversations: QuerySet) -> int:
    """Number of unread messages across ``conversations`` (one query)."""
    return (Message.objects.filter(conversation__in=conversations.values("pk"), deleted_at__isnull=True)
            .exclude(sender=user).annotate(my_pointer=_my_pointer(user, "conversation"))
            .filter(id__gt=F("my_pointer")).count())


def unread_count(user, conversation: Conversation, pointer) -> int:
    """Unread messages of one thread for ``user`` given their pointer."""
    qs = Message.objects.filter(conversation=conversation, deleted_at__isnull=True).exclude(sender=user)
    if pointer:
        qs = qs.filter(id__gt=pointer)
    return qs.count()


def only_unread(user, conversations: QuerySet) -> QuerySet:
    """Keep threads with at least one unread message (``?unread=true``)."""
    pointer = ConversationParticipant.objects.filter(conversation=OuterRef(OuterRef("pk")), user=user).values(
        "last_read_message_id")[:1]
    floor = Coalesce(Subquery(pointer, output_field=UUIDField()), Value(ZERO_UUID, output_field=UUIDField()))
    newer = (Message.objects.filter(conversation=OuterRef("pk"), deleted_at__isnull=True).exclude(sender=user)
             .filter(id__gt=floor))
    return conversations.filter(Exists(newer))


def messages_page(conversation: Conversation, *, after=None, before=None, limit: int = 20) -> tuple[list, bool]:
    """
    One page of a thread (``GET /conversations/{id}/messages``).

    ``after``: newer than this id, oldest first. ``before``: older than this
    id, newest first. Neither: the latest messages, newest first.
    """
    qs = Message.objects.filter(conversation=conversation, deleted_at__isnull=True).select_related("sender")
    if after:
        qs = qs.filter(id__gt=after).order_by("id")
    else:
        if before:
            qs = qs.filter(id__lt=before)
        qs = qs.order_by("-id")
    rows = list(qs[: limit + 1])
    return rows[:limit], len(rows) > limit


def parse_message_id(value, name: str):
    """A message id from the query string (UUID); anything else is a 400."""
    if value in (None, ""):
        return None
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise DomainError("Invalid query parameter.", code="invalid", errors={name: ["A message id."]}) from exc


# ---------------------------------------------------------------------------
# Sync (MSG-02, ADR-021 polling)
# ---------------------------------------------------------------------------
def _read_sync_cursor(raw: str | None) -> tuple[uuid.UUID | None, datetime | None]:
    """``(last message id seen, time of the previous sync)`` from an opaque cursor."""
    if not raw:
        return None, None
    values = decode_cursor(raw, name="after")
    try:
        last_id, at = values
        return (uuid.UUID(last_id) if last_id else None), datetime.fromisoformat(at)
    except (TypeError, ValueError) as exc:
        raise DomainError("Invalid query parameter.", code="invalid", errors={"after": ["Unknown cursor."]}) from exc


def sync(user, conversations: QuerySet, after: str | None) -> dict:
    """
    Changes since the cursor across my threads of one side.

    First call (no cursor): no rows, just the current cursor and unread
    total. Later calls: new messages (oldest first, at most 200, ``has_more``
    when more wait) and the threads that changed (new message, or my read or
    mute state changed). Cheap when nothing changed: indexed ``message.id``.
    Returns plain objects; the view serializes them.
    """
    now = timezone.now()
    last_id, since = _read_sync_cursor(after)
    messages, changed, has_more = [], [], False
    if since is None:
        latest = (Message.objects.filter(conversation__in=conversations.values("pk")).order_by("-id")
                  .values_list("id", flat=True).first())
        next_id = latest
    else:
        qs = Message.objects.filter(conversation__in=conversations.values("pk"), deleted_at__isnull=True)
        if last_id:
            qs = qs.filter(id__gt=last_id)
        rows = list(qs.select_related("sender").order_by("id")[: SYNC_MAX_MESSAGES + 1])
        has_more = len(rows) > SYNC_MAX_MESSAGES
        messages = rows[:SYNC_MAX_MESSAGES]
        next_id = messages[-1].id if messages else last_id
        touched = {m.conversation_id for m in messages}
        touched |= set(ConversationParticipant.objects.filter(user=user, updated_at__gt=since,
                                                              conversation__in=conversations.values("pk"))
                       .values_list("conversation_id", flat=True))
        changed = list(conversations.filter(pk__in=touched).order_by("-last_message_at", "-id"))
    return {
        "conversations": changed,
        "messages": messages,
        "unread_total": unread_total(user, conversations),
        "next_cursor": encode_cursor([str(next_id) if next_id else None, now.isoformat()]),
        "has_more": has_more,
        "poll_after_ms": POLL_AFTER_MS,
    }
