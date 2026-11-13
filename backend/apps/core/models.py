"""
Abstract base models shared by every app, plus the idempotency table.

Conventions (docs/backend/05-database-schema.md section 2):
- primary keys are UUIDv7;
- ``created_at`` / ``updated_at`` are UTC timestamps;
- "soft delete" means setting ``deleted_at`` instead of removing the row, so
  an admin can restore it.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from .ids import uuid7


class UUIDModel(models.Model):
    """Base model whose primary key is a time-ordered UUID (version 7)."""

    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        abstract = True


class TimeStampedModel(models.Model):
    """Adds ``created_at`` (set once) and ``updated_at`` (set on every save)."""

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    """Query helpers for models that are soft-deleted."""

    def alive(self):
        """Rows that are not deleted."""
        return self.filter(deleted_at__isnull=True)

    def dead(self):
        """Rows that were soft-deleted."""
        return self.filter(deleted_at__isnull=False)


class SoftDeleteModel(models.Model):
    """
    Adds ``deleted_at``. Call :meth:`soft_delete` instead of ``delete()``.

    The default manager still returns every row; use ``.alive()`` in
    selectors so deleted rows never reach the public API.
    """

    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteQuerySet.as_manager()

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        abstract = True

    @property
    def is_deleted(self) -> bool:
        """True when the row was soft-deleted."""
        return self.deleted_at is not None

    def soft_delete(self, save: bool = True) -> None:
        """Mark the row as deleted now (no data is removed)."""
        self.deleted_at = timezone.now()
        if save:
            self.save(update_fields=["deleted_at"])

    def restore(self, save: bool = True) -> None:
        """Undo a soft delete."""
        self.deleted_at = None
        if save:
            self.save(update_fields=["deleted_at"])


class IdempotencyRecord(UUIDModel):
    """
    Remembers the answer given to a request that carried an ``Idempotency-Key``.

    If the client retries the same request (same user, endpoint and key) we
    return the stored answer instead of doing the work twice (BR-SYS-01).
    Used for booking creation and money operations.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    endpoint = models.CharField(max_length=80, help_text="Logical name of the operation, e.g. 'bookings.create'.")
    key = models.CharField(max_length=80, help_text="Value of the Idempotency-Key header.")
    request_hash = models.CharField(max_length=64, help_text="SHA-256 of the request body, to detect a reused key with different data.")
    response_code = models.PositiveSmallIntegerField(null=True, blank=True)
    response_body = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(help_text="Records are kept 24 hours.")

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        constraints = [
            models.UniqueConstraint(fields=["user", "endpoint", "key"], name="idempotency_unique_key"),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.endpoint}:{self.key}"
