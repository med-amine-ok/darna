"""Read-only queries of the audit log (BR-STF-02). Nothing here writes."""

import uuid

from django.db.models import QuerySet

from .models import AuditEvent


def list_events(*, action: str = "", object_type: str = "", object_id: str = "", actor: str = "") -> QuerySet[AuditEvent]:
    """
    Audit events, newest first, narrowed by the filters that were given.

    ``action`` and ``object_type`` match exactly (case-insensitive for the
    action, which is stored in upper case); ``actor`` is a user id. A
    malformed actor id matches nothing instead of failing.
    """
    events = AuditEvent.objects.select_related("actor")
    if action:
        events = events.filter(action__iexact=action)
    if object_type:
        events = events.filter(object_type=object_type)
    if object_id:
        events = events.filter(object_id=object_id)
    if actor:
        try:
            events = events.filter(actor_id=uuid.UUID(actor))
        except ValueError:
            return events.none()
    return events.order_by("-occurred_at", "-id")
