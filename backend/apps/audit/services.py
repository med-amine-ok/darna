"""Write to the audit log."""

from .models import AuditEvent


def record(*, actor, action: str, obj=None, object_type: str = "", object_id: str = "",
           before: dict | None = None, after: dict | None = None, note: str = "", ip: str | None = None) -> AuditEvent:
    """
    Add one line to the audit log.

    Call it inside the same database transaction as the change it describes,
    so the log and the data can never disagree. Pass either ``obj`` (a model
    instance) or ``object_type`` + ``object_id``. Keep ``before``/``after``
    small and free of personal data (statuses, amounts, ids).

    Example::

        audit.record(actor=request.user, action="LISTING_APPROVE", obj=listing,
                     before={"status": "pending_review"}, after={"status": "published"})
    """
    if obj is not None:
        object_type = object_type or obj._meta.model_name
        object_id = object_id or str(obj.pk)
    if actor is None:
        actor_kind = "system"
    elif getattr(actor, "is_admin", False):
        actor_kind = "admin"
    else:
        actor_kind = "user"
    return AuditEvent.objects.create(
        actor=actor, actor_kind=actor_kind, action=action, object_type=object_type, object_id=str(object_id),
        before=before, after=after, note=note, ip=ip,
    )
