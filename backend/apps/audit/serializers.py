"""Output shape of the audit log API."""

from rest_framework import serializers

from .models import AuditEvent


class AuditEventSerializer(serializers.ModelSerializer):
    """One audit row as shown to admins. ``actor`` is an id plus a display name (BR-STF-03)."""

    actor = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads or writes."""
        model = AuditEvent
        fields = [
            "id", "occurred_at", "actor", "actor_kind", "action",
            "object_type", "object_id", "before", "after", "note", "ip",
        ]
        read_only_fields = fields

    def get_actor(self, event: AuditEvent) -> dict | None:
        """Who acted, or ``None`` for the system."""
        if event.actor_id is None:
            return None
        return {"id": str(event.actor_id), "display_name": event.actor.display_name}
