"""
Writes and access rules of the messaging app.

- Access (BR-ORG-01, OWASP API1): a guest sees their own threads; a host
  team member sees the threads of a host account they belong to, with the
  ``messages.reply`` permission. Anyone else gets 404, never 403, so ids
  cannot be probed.
- BR-MSG-01: before a booking between the two sides is confirmed, contact
  details are masked for the reader who did not write them; three messages
  with contact details flag the thread for trust review.
- MSG-02: message ids are UUIDv7, so ``id > cursor`` returns new messages.
- MSG-03: read pointers never move backwards.
"""

import uuid

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.audit import services as audit
from apps.bookings import selectors as booking_selectors
from apps.bookings.models import Booking, BookingStatus
from apps.catalog.selectors import get_public_listing
from apps.core.errors import DomainError, NotFoundError
from apps.hosts.models import HostAccount
from apps.hosts.selectors import host_accounts_for, members_of
from apps.notifications.services import notify_many
from apps.trips.selectors import get_public_trip

from .masking import contains_contact_info, mask
from .models import (
    Conversation,
    ConversationKind,
    ConversationParticipant,
    Message,
    MessageKind,
    ParticipantRole,
    SenderRole,
)

# BR-MSG-01: messages with contact details (before confirmation) that flag a thread for trust review.
FLAG_AFTER_CONTACT_ATTEMPTS = 3  # TODO(config): move to platform settings
# Booking states after which both sides may see each other's contact details.
UNLOCKING_STATUSES = (BookingStatus.CONFIRMED, BookingStatus.COMPLETED)
REPLY_PERMISSION = "messages.reply"


# ---------------------------------------------------------------------------
# Access
# ---------------------------------------------------------------------------
def replying_host_accounts(user) -> list[HostAccount]:
    """Host accounts whose threads ``user`` may read and answer (solo host, or a role with ``messages.reply``)."""
    accounts = []
    for account, membership in host_accounts_for(user):
        if membership is None or REPLY_PERMISSION in membership.permissions:
            accounts.append(account)
    return accounts


def _parse(value, what: str = "Conversation") -> uuid.UUID:
    """Parse a path id; a malformed id answers 404 like an unknown one."""
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise NotFoundError(f"{what} not found.") from exc


def resolve(user, conversation_id) -> tuple[Conversation, str]:
    """
    The conversation and the caller's side (``guest`` or ``host_member``), else 404.

    The guest side wins when the user is both (they cannot message
    themselves, so it never happens for new threads).
    """
    conversation = (Conversation.objects.select_related("guest", "host_account", "host_account__organization",
                                                        "host_account__user", "listing", "trip", "booking")
                    .filter(pk=_parse(conversation_id)).first())
    if conversation is None:
        raise NotFoundError("Conversation not found.")
    if conversation.guest_id == user.id:
        return conversation, ParticipantRole.GUEST
    if conversation.host_account_id and any(a.id == conversation.host_account_id for a in replying_host_accounts(user)):
        return conversation, ParticipantRole.HOST_MEMBER
    raise NotFoundError("Conversation not found.")


def participant(conversation: Conversation, user, role: str) -> ConversationParticipant:
    """The caller's participant row (created the first time a host member opens the thread)."""
    row, _ = ConversationParticipant.objects.get_or_create(conversation=conversation, user=user,
                                                           defaults={"role": role})
    return row


def contacts_unlocked(conversation: Conversation) -> bool:
    """
    True when contact details may be shown (BR-MSG-01).

    A booking thread unlocks when its booking is confirmed or completed; an
    inquiry unlocks when the guest has any confirmed or completed booking
    with the same host account.
    """
    if conversation.booking_id and conversation.booking.status in UNLOCKING_STATUSES:
        return True
    if not (conversation.guest_id and conversation.host_account_id):
        return False
    return Booking.objects.filter(guest_id=conversation.guest_id, host_account_id=conversation.host_account_id,
                                  status__in=UNLOCKING_STATUSES).exists()


def shown_body(message: Message, reader_id, unlocked: bool) -> tuple[str, bool]:
    """``(body, is_masked)`` as ``reader_id`` sees the message (BR-MSG-01). The sender always sees their own text."""
    if message.contains_contact_info and not unlocked and message.sender_id != reader_id:
        return message.body_masked or mask(message.body), True
    return message.body, False


# ---------------------------------------------------------------------------
# Starting a conversation
# ---------------------------------------------------------------------------
@transaction.atomic
def start_conversation(*, user, listing_id=None, trip_id=None, booking_id=None,
                       first_message: str | None = None) -> tuple[Conversation, str, bool]:
    """
    Find or create the thread about a listing, a trip or a booking (``POST /conversations``).

    Exactly one subject. A booking thread may be started by its guest or by
    a member of its host account (``messages.reply``); a listing or trip
    inquiry by any signed-in user except the host itself (422
    ``cannot_message_self``). Returns ``(conversation, my_role, created)``.
    """
    subjects = [value for value in (listing_id, trip_id, booking_id) if value]
    if len(subjects) != 1:
        raise DomainError("Send exactly one of listing_id, trip_id, booking_id.", code="invalid",
                          errors={"non_field_errors": ["Exactly one of listing_id, trip_id, booking_id."]})
    my_accounts = {a.id for a, _ in host_accounts_for(user)}
    if booking_id:
        conversation, role, created = _booking_thread(user, booking_id)
    else:
        subject = get_public_listing(str(listing_id)) if listing_id else get_public_trip(str(trip_id))
        if subject.host_account_id in my_accounts:
            raise DomainError("You cannot message yourself.", code="cannot_message_self", status_code=422)
        field = "listing" if listing_id else "trip"
        lookup = {"kind": ConversationKind.INQUIRY, "guest": user, field: subject, "booking__isnull": True}
        conversation = Conversation.objects.filter(**lookup).first()
        created = conversation is None
        if created:
            try:
                with transaction.atomic():
                    now = timezone.now()
                    conversation = Conversation.objects.create(
                        kind=ConversationKind.INQUIRY, guest=user, host_account_id=subject.host_account_id,
                        created_at=now, last_message_at=now, **{field: subject})
            except IntegrityError:
                conversation, created = Conversation.objects.get(**lookup), False
        role = ParticipantRole.GUEST
    participant(conversation, user, role)
    if first_message and first_message.strip():
        send_message(user=user, conversation=conversation, role=role, body=first_message)
    return conversation, role, created


def _booking_thread(user, booking_id) -> tuple[Conversation, str, bool]:
    """Find or create the thread of a booking the caller is guest of, or hosts (else 404)."""
    booking = None
    role = ParticipantRole.GUEST
    try:
        booking = booking_selectors.get_guest_booking(user, booking_id)
    except NotFoundError:
        for account in replying_host_accounts(user):
            try:
                booking = booking_selectors.get_host_booking(account, booking_id)
                role = ParticipantRole.HOST_MEMBER
                break
            except NotFoundError:
                continue
    if booking is None:
        raise NotFoundError("Booking not found.")
    existing = Conversation.objects.filter(booking=booking).first()
    if existing is not None:
        return existing, role, False
    trip_id = booking.trip_departure.trip_id if booking.trip_departure_id else None
    now = timezone.now()
    try:
        with transaction.atomic():
            conversation = Conversation.objects.create(
                kind=ConversationKind.BOOKING, guest=booking.guest, host_account=booking.host_account,
                listing_id=booking.listing_id, trip_id=trip_id, booking=booking, created_at=now, last_message_at=now)
    except IntegrityError:
        return Conversation.objects.get(booking=booking), role, False
    ConversationParticipant.objects.get_or_create(conversation=conversation, user=booking.guest,
                                                  defaults={"role": ParticipantRole.GUEST})
    return conversation, role, True


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------
def _host_people(host_account: HostAccount) -> list:
    """People who answer for a host account: the solo host, or team members allowed to reply."""
    if host_account.user_id:
        return [host_account.user]
    if host_account.organization_id:
        return [m.user for m in members_of(host_account.organization) if REPLY_PERMISSION in m.permissions]
    return []


@transaction.atomic
def send_message(*, user, conversation: Conversation, role: str, body: str,
                 client_message_id: str | None = None) -> tuple[Message, bool]:
    """
    Add a message (``POST /conversations/{id}/messages``). Returns ``(message, created)``.

    - a retry with the same ``client_message_id`` returns the first message;
    - contact details are stored masked too; before confirmation each such
      message counts as an attempt and the third flags the thread (BR-MSG-01);
    - the sender's read pointer moves to their own message; the other side
      gets an in-app ``message.received`` notification unless muted.
    """
    body = body.strip()
    if not body:
        raise DomainError("Write a message.", code="invalid", errors={"body": ["This field may not be blank."]})
    if client_message_id:
        existing = Message.objects.filter(conversation=conversation, sender=user,
                                          client_message_id=client_message_id).first()
        if existing is not None:
            return existing, False
    has_contact = contains_contact_info(body)
    try:
        with transaction.atomic():
            message = Message.objects.create(
                conversation=conversation, sender=user, sender_role=role, kind=MessageKind.TEXT, body=body,
                body_masked=mask(body) if has_contact else None, contains_contact_info=has_contact,
                client_message_id=client_message_id or None)
    except IntegrityError:
        return Message.objects.get(conversation=conversation, sender=user, client_message_id=client_message_id), False
    conversation = Conversation.objects.select_for_update(of=("self",)).get(pk=conversation.pk)
    conversation.last_message_at = message.created_at
    fields = ["last_message_at"]
    if has_contact and not contacts_unlocked(conversation):
        conversation.contact_attempts += 1
        fields.append("contact_attempts")
        if conversation.contact_attempts >= FLAG_AFTER_CONTACT_ATTEMPTS and conversation.flagged_at is None:
            conversation.flagged_at = timezone.now()
            fields.append("flagged_at")
            audit.record(actor=None, action="CONVERSATION_FLAGGED", obj=conversation,
                         after={"contact_attempts": conversation.contact_attempts})
    conversation.save(update_fields=fields)
    me = participant(conversation, user, role)
    _move_pointer(me, message.id)
    _notify_other_side(conversation, user, role)
    return message, True


def _notify_other_side(conversation: Conversation, sender, role: str) -> None:
    """In-app notice to the other side (not muted ones), BR-NTF-01 style; email follows preferences."""
    if role == ParticipantRole.GUEST:
        people = _host_people(conversation.host_account) if conversation.host_account_id else []
    else:
        people = [conversation.guest] if conversation.guest_id else []
    muted = set(ConversationParticipant.objects.filter(conversation=conversation, muted=True)
                .values_list("user_id", flat=True))
    people = [p for p in people if p.id not in muted and p.id != sender.id]
    title = (conversation.booking.title if conversation.booking_id else
             conversation.listing.title if conversation.listing_id else
             conversation.trip.title if conversation.trip_id else "")
    notify_many(people, "message.received", params={"sender_name": sender.display_name, "title": title},
                link=f"/messages/{conversation.id}")


def _move_pointer(row: ConversationParticipant, message_id) -> None:
    """Move a read pointer forward only (MSG-03)."""
    if row.last_read_message_id is None or message_id > row.last_read_message_id:
        row.last_read_message_id = message_id
        row.save(update_fields=["last_read_message_id", "updated_at"])


@transaction.atomic
def mark_read(*, user, conversation: Conversation, role: str, last_read_message_id) -> None:
    """
    Move my read pointer (``POST /conversations/{id}/read``); it never moves backwards.

    The id must be a message of this thread (422 ``unknown_message``).
    """
    try:
        message_id = uuid.UUID(str(last_read_message_id))
    except ValueError as exc:
        raise DomainError("Unknown message.", code="unknown_message", status_code=422) from exc
    if not Message.objects.filter(conversation=conversation, id=message_id).exists():
        raise DomainError("Unknown message.", code="unknown_message", status_code=422)
    row = ConversationParticipant.objects.select_for_update().filter(
        pk=participant(conversation, user, role).pk).first()
    _move_pointer(row, message_id)

