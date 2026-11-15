"""
Upload services: slot, completion and checks, signed URLs (BR-MED-01, BR-MED-02).

Flow (06-api-design section 3.10):

1. :func:`create_upload` checks purpose, type and size, creates a
   ``quarantined`` row and returns a presigned upload URL valid 10 minutes.
2. The client sends the file straight to storage (quarantine area).
3. :func:`complete_upload` checks the stored file: size, SHA-256, real type
   (magic bytes), virus scan, then for photos re-encodes without metadata
   (GPS removed), measures it, computes a perceptual hash and writes the
   renditions. The file then moves to the public or private area and the
   row becomes ``ready``, or ``rejected`` with a ``rejection_code``.
4. :func:`private_url` hands out a 5-minute signed URL to the owner and
   announces it through :data:`apps.media.hooks.private_url_issued` so it is
   audited (BR-MED-02).

The checks run inline today (fast with the stub scanner); the plan moves
them to the ``media`` Celery queue later without changing this API.
"""

import hashlib
import io
import re
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.core.errors import ConflictError, DomainError, ForbiddenError, NotFoundError

from . import hooks
from .models import MediaAsset, MediaBucket, MediaPurpose, MediaStatus
from .scanning import CLEAN, get_scanner, sniff_mime
from .storage import QUARANTINE, get_storage

MB = 1024 * 1024
# BR-MED-01: photos JPEG, PNG, WebP, HEIC up to 15 MB.
PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
PHOTO_MAX_BYTES = 15 * MB
# BR-MED-02: documents PDF, JPEG, PNG up to 10 MB, private.
DOCUMENT_TYPES = {"application/pdf", "image/jpeg", "image/png"}
DOCUMENT_MAX_BYTES = 10 * MB

# purpose -> (allowed MIME types, max size, bucket)
PURPOSE_RULES: dict[str, tuple[set[str], int, str]] = {
    MediaPurpose.LISTING_PHOTO: (PHOTO_TYPES, PHOTO_MAX_BYTES, MediaBucket.PUBLIC),
    MediaPurpose.AVATAR: (PHOTO_TYPES, PHOTO_MAX_BYTES, MediaBucket.PUBLIC),
    MediaPurpose.LOGO: (PHOTO_TYPES, PHOTO_MAX_BYTES, MediaBucket.PUBLIC),
    MediaPurpose.DOCUMENT: (DOCUMENT_TYPES, DOCUMENT_MAX_BYTES, MediaBucket.PRIVATE),
    MediaPurpose.MESSAGE_ATTACHMENT: (DOCUMENT_TYPES | {"image/webp"}, DOCUMENT_MAX_BYTES, MediaBucket.PRIVATE),
}
# Spellings some clients send for the same type.
MIME_ALIASES = {"image/jpg": "image/jpeg", "image/heif": "image/heic"}
EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/pdf": "pdf"}

# 06-api-design 3.10: the presigned upload URL is valid 10 minutes.
UPLOAD_SLOT_MINUTES = 10
# BR-MED-02: signed URL of a private file valid 5 minutes.
PRIVATE_URL_MINUTES = 5
# Longest side of each rendition of a public photo, in pixels.
RENDITIONS = {"thumb": 320, "card": 800, "large": 1600}
# Refuse images bigger than this many pixels (decompression bombs).
MAX_IMAGE_PIXELS = 60_000_000


def _safe_filename(filename: str) -> str:
    """File name reduced to safe characters for a storage key."""
    name = re.sub(r"[^A-Za-z0-9._-]+", "-", filename).strip("-.")
    return (name or "file")[:80]


def normalize_mime(mime_type: str) -> str:
    """Lower-case MIME type with aliases folded (``image/jpg`` is ``image/jpeg``)."""
    mime = (mime_type or "").split(";")[0].strip().lower()
    return MIME_ALIASES.get(mime, mime)


def check_upload(purpose: str, mime_type: str, size_bytes: int) -> str:
    """
    Check type and size for a purpose and return the bucket (BR-MED-01, BR-MED-02).

    Raises 422 ``file_type_not_allowed`` or ``file_too_large``.
    """
    allowed, max_bytes, bucket = PURPOSE_RULES[purpose]
    if normalize_mime(mime_type) not in allowed:
        raise DomainError(
            "This file type is not allowed here.", code="file_type_not_allowed", status_code=422,
            errors={"mime_type": [f"Allowed: {', '.join(sorted(allowed))}."]},
        )
    if size_bytes > max_bytes:
        raise DomainError(
            "This file is too large.", code="file_too_large", status_code=422,
            errors={"size_bytes": [f"At most {max_bytes // MB} MB."]},
        )
    return bucket


@transaction.atomic
def create_upload(user, *, purpose: str, filename: str, mime_type: str, size_bytes: int, sha256: str,
                  host_account_id=None) -> tuple[MediaAsset, dict]:
    """
    Open an upload slot: a ``quarantined`` row and a presigned URL valid 10 minutes.

    Documents need a host workspace (``host_account_id``), else 403
    ``host_workspace_required``. Returns ``(asset, upload)`` where ``upload``
    is the ``UploadTicket.upload`` object of the API.
    """
    if purpose == MediaPurpose.DOCUMENT and host_account_id is None:
        raise ForbiddenError("Documents are uploaded from a host workspace.", code="host_workspace_required")
    bucket = check_upload(purpose, mime_type, size_bytes)
    asset = MediaAsset(
        owner_user=user, host_account_id=host_account_id, purpose=purpose, bucket=bucket,
        original_filename=filename[:200], mime_type=normalize_mime(mime_type), size_bytes=size_bytes,
        sha256=sha256.lower(), upload_expires_at=timezone.now() + timedelta(minutes=UPLOAD_SLOT_MINUTES),
    )
    asset.storage_key = f"{asset.id}/{_safe_filename(filename)}"
    asset.save()
    upload = get_storage().presign_upload(
        asset.storage_key, mime_type=asset.mime_type, size_bytes=size_bytes, expires_at=asset.upload_expires_at
    )
    return asset, upload


def get_owned(user, media_id, *, allow_admin: bool = False) -> MediaAsset:
    """
    A media row of ``user`` (or any row for an admin when ``allow_admin``), else 404.

    Someone else's file answers 404, not 403, so ids cannot be probed (BR-ORG-01 practice).
    """
    asset = MediaAsset.objects.alive().filter(pk=media_id).first()
    if asset is None or (asset.owner_user_id != user.id and not (allow_admin and getattr(user, "is_admin", False))):
        raise NotFoundError("Unknown file.", code="media_not_found")
    return asset


def _reject(asset: MediaAsset, code: str, storage) -> None:
    """Mark the upload rejected and remove the quarantined file."""
    asset.status = MediaStatus.REJECTED
    asset.rejection_code = code
    storage.delete(QUARANTINE, asset.storage_key)


def _average_hash(image) -> int:
    """64-bit average hash of a picture, stored as a signed integer (duplicate photos, BR-MED-01)."""
    small = image.convert("L").resize((8, 8))
    pixels = list(small.getdata())
    mean = sum(pixels) / len(pixels)
    value = 0
    for p in pixels:
        value = (value << 1) | (1 if p >= mean else 0)
    return value - (1 << 64) if value >= (1 << 63) else value


def _process_photo(asset: MediaAsset, data: bytes, storage, final_key: str) -> tuple[bytes, dict] | None:
    """
    Re-encode a photo without metadata and build its renditions (BR-MED-01).

    Returns ``(clean_bytes, renditions)``, or ``None`` when the image cannot
    be decoded (``invalid_image``). HEIC files are kept as sent (no decoder
    in the base image) and get no renditions.
    """
    from PIL import Image, ImageOps, UnidentifiedImageError

    if asset.mime_type == "image/heic":
        return data, {}
    Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, ValueError):
        return None
    fmt = image.format or "JPEG"
    image = ImageOps.exif_transpose(image)
    if fmt == "JPEG" and image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    asset.width, asset.height = image.size
    asset.phash = _average_hash(image)

    def encode(img) -> bytes:
        """Save without EXIF or text chunks: metadata, GPS included, is gone."""
        out = io.BytesIO()
        img.save(out, format=fmt, **({"quality": 85} if fmt in ("JPEG", "WEBP") else {}))
        return out.getvalue()

    clean = encode(image)
    renditions = {}
    base = final_key.rsplit(".", 1)[0]
    for name, side in RENDITIONS.items():
        copy = image.copy()
        copy.thumbnail((side, side))
        key = f"{base}-{name}.{EXTENSIONS[asset.mime_type]}"
        storage.write(asset.bucket, key, encode(copy), mime_type=asset.mime_type)
        renditions[name] = key
    return clean, renditions


@transaction.atomic
def complete_upload(user, media_id) -> MediaAsset:
    """
    Check an uploaded file and move it out of quarantine (BR-MED-01, BR-MED-02).

    409 ``upload_already_completed`` when called twice, 409 ``upload_missing``
    when nothing was uploaded. Otherwise the row ends ``ready`` or
    ``rejected`` (``size_mismatch``, ``hash_mismatch``, ``file_type_mismatch``,
    ``virus_found``, ``invalid_image``).
    """
    asset = get_owned(user, media_id)
    asset = MediaAsset.objects.select_for_update().get(pk=asset.pk)
    if asset.status != MediaStatus.QUARANTINED or asset.completed_at is not None:
        raise ConflictError("This upload was already completed.", code="upload_already_completed")
    storage = get_storage()
    size = storage.exists(QUARANTINE, asset.storage_key)
    if size is None:
        raise ConflictError("The file was not uploaded yet.", code="upload_missing")
    asset.completed_at = timezone.now()
    if size != asset.size_bytes:
        # Checked before reading so an oversized object is never loaded in memory.
        _reject(asset, "size_mismatch", storage)
        asset.save()
        return asset
    data = storage.read(QUARANTINE, asset.storage_key)
    if hashlib.sha256(data).hexdigest() != asset.sha256:
        _reject(asset, "hash_mismatch", storage)
    elif sniff_mime(data[:32]) != asset.mime_type:
        _reject(asset, "file_type_mismatch", storage)
    else:
        asset.scan_result = get_scanner().scan(data)
        if asset.scan_result != CLEAN:
            _reject(asset, "virus_found" if asset.scan_result == "infected" else "scan_failed", storage)
        else:
            _accept(asset, data, storage)
    asset.save()
    return asset


def _accept(asset: MediaAsset, data: bytes, storage) -> None:
    """Move a clean file to its final area; photos are re-encoded and get renditions first."""
    final_key = f"{asset.purpose}/{asset.id}.{EXTENSIONS[asset.mime_type]}"
    if asset.bucket == MediaBucket.PUBLIC:
        processed = _process_photo(asset, data, storage, final_key)
        if processed is None:
            _reject(asset, "invalid_image", storage)
            return
        clean, asset.renditions = processed
        storage.write(asset.bucket, final_key, clean, mime_type=asset.mime_type)
        storage.delete(QUARANTINE, asset.storage_key)
        asset.size_bytes = len(clean)
    else:
        storage.move(QUARANTINE, asset.storage_key, asset.bucket, final_key)
    asset.storage_key = final_key
    asset.status = MediaStatus.READY


def rendition_urls(asset: MediaAsset) -> dict[str, str]:
    """Public URLs of the renditions of a ready public photo (empty for private files)."""
    if asset.bucket != MediaBucket.PUBLIC or asset.status != MediaStatus.READY:
        return {}
    storage = get_storage()
    keys = asset.renditions or {name: asset.storage_key for name in RENDITIONS}
    return {name: storage.signed_url(asset.bucket, key, expires_at=None) for name, key in keys.items()}


@transaction.atomic
def private_url(user, media_id, *, request=None) -> tuple[str, object]:
    """
    Signed URL valid 5 minutes for the owner of a ready file (BR-MED-02).

    Staff use the admin endpoint instead. The issue is announced through
    :data:`hooks.private_url_issued` inside this transaction so it is
    audited. A file that is not ready answers 404 ``media_not_ready``.
    """
    asset = get_owned(user, media_id)
    if asset.status != MediaStatus.READY:
        raise NotFoundError("This file is not available.", code="media_not_ready")
    expires_at = timezone.now() + timedelta(minutes=PRIVATE_URL_MINUTES)
    url = get_storage().signed_url(asset.bucket, asset.storage_key, expires_at=expires_at)
    hooks.private_url_issued.send(sender=MediaAsset, media=asset, user=user, request=request)
    return url, expires_at
