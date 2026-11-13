"""
Status changes of listings and trips (BR-LST-03, table 4a).

Listings (``catalog.Listing``) and trips (``trips.Trip``) share the same
state machine and the same status columns (``status``,
``status_before_delete``, ``moderation_note``, ``submitted_at``,
``published_at``, ``deleted_at``). The functions here work on either object,
so the rule is written once:

- :func:`change_status` makes one move of ``states.TRANSITIONS``;
- :func:`soft_delete` and :func:`restore` handle the special "deleted" state;
- :func:`admin_moderate` is the single entry point of the admin buttons
  (approve, reject, request changes, suspend, unsuspend), with the reason
  rule and the audit line.
"""

from django.db import transaction
from django.utils import timezone

from apps.audit import services as audit
from apps.core.errors import ConflictError, DomainError

from .states import ADMIN, HOST, ListingStatus, can_transition

# Minimum length of the reason an admin must give (BR-HST-04 / table 4a practice).
MIN_REASON_LENGTH = 10

# Admin buttons: action name -> (target status, reason required).
ADMIN_ACTIONS: dict[str, tuple[str, bool]] = {
    "approve": (ListingStatus.PUBLISHED, False),
    "reject": (ListingStatus.REJECTED, True),
    "request_changes": (ListingStatus.CHANGES_REQUESTED, True),
    "suspend": (ListingStatus.SUSPENDED, True),
    "unsuspend": (ListingStatus.PUBLISHED, False),
}


def _audit_prefix(obj) -> str:
    """``LISTING`` or ``TRIP``: first word of the audit action names."""
    return obj._meta.model_name.upper()


def change_status(obj, new_status: str, *, actor_kind: str, note: str | None = None) -> None:
    """
    Move a listing or trip to ``new_status`` if table 4a allows it (BR-LST-03).

    ``actor_kind`` is ``"host"`` or ``"admin"``: some moves are reserved to
    one of them. Raises ``ConflictError`` with code ``invalid_status_change``
    otherwise. Side effects: ``submitted_at`` is set when the object goes to
    review (the moderation queue counts from the last submission, BR-MOD-01),
    ``published_at`` the first time it is published, ``moderation_note``
    keeps the last admin reason. Saves only the touched columns.
    """
    if obj.deleted_at is not None:
        raise ConflictError("This item was deleted.", code="invalid_status_change")
    if not can_transition(obj.status, new_status, actor_kind):
        raise ConflictError(
            f"Cannot move from {obj.status} to {new_status}.", code="invalid_status_change"
        )
    now = timezone.now()
    fields = ["status", "updated_at"]
    obj.status = new_status
    if new_status == ListingStatus.PENDING_REVIEW:
        obj.submitted_at = now
        fields.append("submitted_at")
    if new_status == ListingStatus.PUBLISHED and obj.published_at is None:
        obj.published_at = now
        fields.append("published_at")
    if note is not None:
        obj.moderation_note = note
        fields.append("moderation_note")
    obj.save(update_fields=fields)


@transaction.atomic
def soft_delete(obj) -> None:
    """
    Soft-delete a listing or trip (table 4a: "any except deleted -> deleted").

    The previous state is kept in ``status_before_delete`` so an admin can
    restore it. Nothing is removed from the database. Existing bookings are
    the bookings app's concern (they keep their own snapshot).
    """
    if obj.status == ListingStatus.DELETED or obj.deleted_at is not None:
        raise ConflictError("Already deleted.", code="invalid_status_change")
    obj.status_before_delete = obj.status
    obj.status = ListingStatus.DELETED
    obj.deleted_at = timezone.now()
    obj.save(update_fields=["status_before_delete", "status", "deleted_at", "updated_at"])


@transaction.atomic
def restore(obj, *, actor) -> None:
    """
    Admin undo of a soft delete: back to the state before deletion (table 4a). Audited.
    """
    if obj.deleted_at is None:
        raise ConflictError("This item is not deleted.", code="invalid_status_change")
    before = {"status": obj.status}
    obj.status = obj.status_before_delete or ListingStatus.DRAFT
    obj.status_before_delete = ""
    obj.deleted_at = None
    obj.save(update_fields=["status_before_delete", "status", "deleted_at", "updated_at"])
    audit.record(actor=actor, action=f"{_audit_prefix(obj)}_RESTORE", obj=obj, before=before, after={"status": obj.status})


def check_reason(reason: str | None) -> str:
    """Return the cleaned reason, or raise ``reason_required`` when it is shorter than 10 characters."""
    reason = (reason or "").strip()
    if len(reason) < MIN_REASON_LENGTH:
        raise DomainError(
            f"Give a reason of at least {MIN_REASON_LENGTH} characters.",
            code="reason_required",
            errors={"reason": [f"At least {MIN_REASON_LENGTH} characters."]},
        )
    return reason


@transaction.atomic
def admin_moderate(obj, action: str, *, actor, reason: str | None = None) -> None:
    """
    Apply one admin decision to a listing or trip and write the audit line.

    ``action`` is a key of ``ADMIN_ACTIONS``. Reject, request changes and
    suspend need a reason of at least 10 characters (code ``reason_required``);
    the reason is stored in ``moderation_note`` so the host sees it. The row
    is locked while it changes so two admins cannot decide at the same time.
    """
    if action not in ADMIN_ACTIONS:
        raise DomainError("Unknown action.", code="invalid_action")
    target, needs_reason = ADMIN_ACTIONS[action]
    clean_reason = check_reason(reason) if needs_reason else (reason or "").strip()
    # Lock the row: the second of two simultaneous decisions sees the new status.
    locked = type(obj).objects.select_for_update().get(pk=obj.pk)
    before = {"status": locked.status}
    change_status(locked, target, actor_kind=ADMIN, note=clean_reason if needs_reason else None)
    audit.record(
        actor=actor, action=f"{_audit_prefix(obj)}_{action.upper()}", obj=locked,
        before=before, after={"status": locked.status}, note=clean_reason,
    )
    # Keep the caller's instance in sync with the saved row.
    obj.refresh_from_db()


__all__ = ["ADMIN", "HOST", "ADMIN_ACTIONS", "change_status", "soft_delete", "restore", "admin_moderate", "check_reason"]
