"""
Tables of the messaging app (see docs/backend/05b-data-dictionary.md, "Messaging And Notifications").

- ``conversation``: one thread between a guest and a host account, about a
  listing or a trip (``inquiry``) or about a booking (``booking``);
- ``conversation_participant``: each person's read pointer and mute switch;
- ``message``: UUIDv7 id, so the id orders messages and is the sync cursor
  (MSG-02, DEC-031). ``body_masked`` is what the other side sees before a
  booking is confirmed (BR-MSG-01).
"""

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.models import UUIDModel


class ConversationKind(models.TextChoices):
    """What a thread is about (``conversation_kind`` enum)."""

    INQUIRY = "inquiry", "Question about a listing or trip"
    BOOKING = "booking", "About a booking"
    SUPPORT = "support", "With BLADUS support"


class Conversation(UUIDModel):
    """
    A thread between a guest and a host account.

    Rules carried by this table:
    - one thread per booking (partial unique on ``booking``);
    - one inquiry thread per guest and listing, and per guest and trip
      (partial uniques), so "start" finds the existing thread;
    - ``contact_attempts`` and ``flagged_at`` record repeated attempts to
      share contact details before a booking (BR-MSG-01) for trust review.
    """

    kind = models.CharField(max_length=8, choices=ConversationKind.choices)
    guest = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name="guest_conversations")
    host_account = models.ForeignKey("hosts.HostAccount", on_delete=models.PROTECT, null=True, blank=True,
                                     related_name="conversations")
    listing = models.ForeignKey("catalog.Listing", on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    trip = models.ForeignKey("trips.Trip", on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    booking = models.ForeignKey("bookings.Booking", on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    last_message_at = models.DateTimeField(null=True, blank=True, help_text="Set to creation time until a message exists.")
    contact_attempts = models.PositiveSmallIntegerField(default=0, help_text="Messages with contact details before confirmation.")
    flagged_at = models.DateTimeField(null=True, blank=True, help_text="Flagged for trust review (BR-MSG-01).")
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        """Find-or-create keys and the inbox order."""

        constraints = [
            models.UniqueConstraint(fields=["booking"], condition=Q(booking__isnull=False),
                                    name="conversation_one_per_booking"),
            models.UniqueConstraint(fields=["guest", "listing"],
                                    condition=Q(kind="inquiry", listing__isnull=False, booking__isnull=True),
                                    name="conversation_one_inquiry_per_listing"),
            models.UniqueConstraint(fields=["guest", "trip"],
                                    condition=Q(kind="inquiry", trip__isnull=False, booking__isnull=True),
                                    name="conversation_one_inquiry_per_trip"),
        ]
        indexes = [
            models.Index(fields=["guest", "last_message_at"], name="conversation_guest_inbox_idx"),
            models.Index(fields=["host_account", "last_message_at"], name="conversation_host_inbox_idx"),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.kind} conversation {self.id}"


class ParticipantRole(models.TextChoices):
    """Side of a person in a thread."""

    GUEST = "guest", "Guest"
    HOST_MEMBER = "host_member", "Host or host team member"
    STAFF = "staff", "BLADUS staff"


class ConversationParticipant(models.Model):
    """
    One person in a thread: read pointer and mute switch (MSG-03).

    Host team members get a row the first time they open or write in the
    thread. ``updated_at`` lets the sync endpoint return threads whose read
    state changed.
    """

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversation_memberships")
    role = models.CharField(max_length=12, choices=ParticipantRole.choices)
    last_read_message_id = models.UUIDField(null=True, blank=True, help_text="Never moves backwards.")
    muted = models.BooleanField(default=False)
    joined_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        """One row per person and thread (the plan's composite key)."""

        constraints = [
            models.UniqueConstraint(fields=["conversation", "user"], name="conversation_participant_unique"),
        ]
        indexes = [models.Index(fields=["user", "updated_at"], name="participant_user_updated_idx")]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.user_id} in {self.conversation_id} ({self.role})"


class MessageKind(models.TextChoices):
    """Text written by a person, or a system line (booking confirmed...)."""

    TEXT = "text", "Text"
    SYSTEM = "system", "System"


class SenderRole(models.TextChoices):
    """Side of the sender, kept on the message (a person can change role later)."""

    GUEST = "guest", "Guest"
    HOST_MEMBER = "host_member", "Host member"
    STAFF = "staff", "Staff"
    SYSTEM = "system", "System"


class Message(UUIDModel):
    """
    One message. The UUIDv7 id orders messages and is the sync cursor (MSG-02).

    ``body`` is what the sender wrote; ``body_masked`` (set only when
    ``contains_contact_info``) is shown to the other side until a booking is
    confirmed (BR-MSG-01). ``client_message_id`` makes a retried send
    return the first message.
    """

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name="+", help_text="Null for system messages.")
    sender_role = models.CharField(max_length=12, choices=SenderRole.choices)
    kind = models.CharField(max_length=8, choices=MessageKind.choices, default=MessageKind.TEXT)
    body = models.TextField()
    body_masked = models.TextField(null=True, blank=True)
    contains_contact_info = models.BooleanField(default=False)
    client_message_id = models.CharField(max_length=64, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        """Messages of a thread are read by ``(conversation, id)``; one message per client id and sender."""

        ordering = ["id"]
        indexes = [models.Index(fields=["conversation", "id"], name="message_conversation_id_idx")]
        constraints = [
            models.UniqueConstraint(fields=["conversation", "sender", "client_message_id"],
                                    condition=Q(client_message_id__isnull=False),
                                    name="message_client_id_unique"),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"Message {self.id} in {self.conversation_id}"
