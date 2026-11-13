"""
Audit log: who did what, when (BR-STF-02).

Rows are only added. The model refuses updates and deletes in Python; in
production the database role of the application also gets no UPDATE or
DELETE right on this table.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone


class AuditEvent(models.Model):
    """One recorded action."""

    occurred_at = models.DateTimeField(default=timezone.now, db_index=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    actor_kind = models.CharField(max_length=8, default="user", help_text="admin, user or system.")
    action = models.CharField(max_length=48, help_text="Upper-case verb, e.g. LISTING_APPROVE, WALLET_TOPUP.")
    object_type = models.CharField(max_length=24)
    object_id = models.CharField(max_length=64)
    before = models.JSONField(null=True, blank=True, help_text="Relevant values before the action.")
    after = models.JSONField(null=True, blank=True, help_text="Relevant values after the action.")
    note = models.TextField(blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        ordering = ["-occurred_at", "-id"]
        indexes = [models.Index(fields=["object_type", "object_id"]), models.Index(fields=["action"])]

    def save(self, *args, **kwargs):
        """Allow inserts only: an existing audit row can never be changed."""
        if self.pk is not None and AuditEvent.objects.filter(pk=self.pk).exists():
            raise RuntimeError("Audit events cannot be modified.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Audit rows are never deleted."""
        raise RuntimeError("Audit events cannot be deleted.")
