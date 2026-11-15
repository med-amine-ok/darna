"""Django console views of messaging (support reads threads flagged for trust review, BR-MSG-01)."""

from django.contrib import admin

from .models import Conversation, ConversationParticipant, Message


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    """Threads; the flagged ones show repeated contact sharing."""

    list_display = ("id", "kind", "contact_attempts", "flagged_at", "last_message_at")
    list_filter = ("kind",)
    raw_id_fields = ("guest", "host_account", "listing", "trip", "booking")


@admin.register(ConversationParticipant)
class ConversationParticipantAdmin(admin.ModelAdmin):
    """Read pointers and mute switches."""

    list_display = ("conversation", "user", "role", "muted")
    raw_id_fields = ("conversation", "user")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    """Messages (the original text, for trust review)."""

    list_display = ("id", "conversation", "sender_role", "contains_contact_info", "created_at")
    list_filter = ("contains_contact_info", "kind")
    raw_id_fields = ("conversation", "sender")
