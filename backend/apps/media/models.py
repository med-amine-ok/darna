"""
Tables of the media app (see docs/backend/05b-data-dictionary.md, ``media_asset``).

One row per uploaded file. The file itself lives in object storage (S3
compatible in production, a local folder in development); the row records
who uploaded it, why, where it is stored and whether it passed the checks
(BR-MED-01 for photos, BR-MED-02 for documents).
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import SoftDeleteModel, UUIDModel


class MediaPurpose(models.TextChoices):
    """Why a file was uploaded. Decides the allowed types, the size limit and the bucket."""

    LISTING_PHOTO = "listing_photo", "Listing photo"
    DOCUMENT = "document", "Verification document"
    AVATAR = "avatar", "Profile picture"
    LOGO = "logo", "Organisation logo"
    MESSAGE_ATTACHMENT = "message_attachment", "Message attachment"


class MediaBucket(models.TextChoices):
    """``public`` files may be shown to anyone; ``private`` ones only through 5-minute signed URLs (BR-MED-02)."""

    PUBLIC = "public", "Public"
    PRIVATE = "private", "Private"


class MediaStatus(models.TextChoices):
    """Life of an upload: quarantined until checked, then ready or rejected (BR-MED-01, BR-MED-02)."""

    QUARANTINED = "quarantined", "Quarantined (not checked yet)"
    READY = "ready", "Ready"
    REJECTED = "rejected", "Rejected"
    DELETED = "deleted", "Deleted"


class MediaAsset(UUIDModel, SoftDeleteModel):
    """
    One uploaded file and the result of its checks.

    ``host_account_id`` is a plain id, not a foreign key: ``media`` is a
    layer L1 app and must not depend on the ``hosts`` tables (07-architecture
    section 2). The upload slot (presigned URL) is valid until
    ``upload_expires_at``; the file stays in the quarantine area of storage
    until :func:`apps.media.services.complete_upload` accepts it.
    """

    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+",
        help_text="Who uploaded the file; only this user may read its private URL.",
    )
    host_account_id = models.UUIDField(null=True, blank=True, db_index=True, help_text="Workspace the file was uploaded for.")
    purpose = models.CharField(max_length=20, choices=MediaPurpose.choices)
    bucket = models.CharField(max_length=8, choices=MediaBucket.choices)
    storage_key = models.CharField(max_length=255, unique=True, help_text="Object key in storage (changes when the file leaves quarantine).")
    original_filename = models.CharField(max_length=200, blank=True)
    mime_type = models.CharField(max_length=64)
    size_bytes = models.BigIntegerField()
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    sha256 = models.CharField(max_length=64, help_text="Hash announced by the client, checked against the stored file.")
    phash = models.BigIntegerField(null=True, blank=True, db_index=True, help_text="Perceptual hash for duplicate photos (BR-MED-01).")
    status = models.CharField(max_length=12, choices=MediaStatus.choices, default=MediaStatus.QUARANTINED)
    scan_result = models.CharField(max_length=32, blank=True, help_text="Result of the virus scan: clean, infected, skipped.")
    rejection_code = models.CharField(max_length=32, blank=True, help_text="Why the file was rejected, e.g. virus_found.")
    renditions = models.JSONField(default=dict, blank=True, help_text="Storage keys of the resized copies of a public photo.")
    upload_expires_at = models.DateTimeField(help_text="End of the presigned upload slot.")
    completed_at = models.DateTimeField(null=True, blank=True, help_text="When the client said the upload finished.")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Owner lookups are the common read; status for the clean-up job."""

        indexes = [
            models.Index(fields=["owner_user", "created_at"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.purpose}:{self.id} ({self.status})"
