"""
Audit log: who did what, when (BR-STF-02).

Rows are only added (R9, R11). The model refuses updates and deletes in
Python; on PostgreSQL a trigger (migration ``audit.0002``) also refuses
UPDATE, DELETE and TRUNCATE on the table, and in production the database role
of the application gets no UPDATE or DELETE right on it.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel


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


class ExportStatus(models.TextChoices):
    """Life of a CSV export (BR-STF-04)."""

    QUEUED = "queued", "Queued"
    RUNNING = "running", "Running"
    DONE = "done", "Done"
    FAILED = "failed", "Failed"


class ExportJob(UUIDModel):
    """
    One CSV export asked by an admin (BR-STF-04, STF-06).

    The file is written privately (``file_name`` under the export folder, see
    ``apps.audit.exports``) and downloaded only through a link that works 5
    minutes. Each export is audited with its filters and row count. Unlike
    audit rows, a job row changes while it runs.
    """

    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    dataset = models.CharField(max_length=32)
    filters = models.JSONField(default=dict)
    format = models.CharField(max_length=8, default="csv")
    status = models.CharField(max_length=12, choices=ExportStatus.choices, default=ExportStatus.QUEUED)
    row_count = models.PositiveIntegerField(null=True, blank=True)
    file_name = models.CharField(max_length=120, blank=True, help_text="File in the private export folder.")
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        """Database options: an admin's recent exports first."""
        indexes = [models.Index(fields=["requested_by", "-created_at"])]
