"""
Pluggable file storage for uploads (BR-MED-01, BR-MED-02, 07-architecture upload flow).

Two backends share one small interface:

- :class:`LocalStorage` (default, development and tests): files live under
  ``MEDIA_LOCAL_ROOT``; "presigned" URLs point at the dev-only route
  ``/api/v1/media/_local/<token>`` whose token is signed with ``SECRET_KEY``
  and carries its own expiry, so it behaves like a presigned S3 URL.
- :class:`S3Storage`: any S3 compatible store (AWS, Scaleway, MinIO).
  Presigned PUT for uploads, presigned GET for private reads. Three buckets:
  quarantine (uploads land here), public (photos, served by the CDN) and
  private (documents). Creating the client makes no network call; only
  ``exists``, ``read``, ``write``, ``move`` and ``delete`` talk to the store.

Choose with ``MEDIA_STORAGE_BACKEND`` (``local`` or ``s3``). The keys are
read from Django settings first, then from the environment, because the
settings module belongs to another builder for now.
# TODO(config): move the MEDIA_* keys to backend/settings.py.
"""

import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.core import signing
from django.utils import timezone

from .models import MediaBucket

# Name of the area where unchecked uploads wait (a prefix locally, a bucket on S3).
QUARANTINE = "quarantine"
# Salt of the signed tokens of the local backend, so they cannot be reused elsewhere.
LOCAL_TOKEN_SALT = "media.local"


def setting(name: str, default: str = "") -> str:
    """Read ``name`` from Django settings, then from the environment, else ``default``."""
    value = getattr(settings, name, None)
    if value in (None, ""):
        value = os.environ.get(name, default)
    return value


class StorageBackend:
    """Interface every storage backend implements. ``area`` is ``quarantine``, ``public`` or ``private``."""

    def presign_upload(self, key: str, *, mime_type: str, size_bytes: int, expires_at: datetime) -> dict:
        """Return ``{"method", "url", "headers", "expires_at"}`` for the client's direct upload into quarantine."""
        raise NotImplementedError

    def signed_url(self, area: str, key: str, *, expires_at: datetime | None) -> str:
        """URL that reads one object; ``expires_at=None`` means a stable public URL."""
        raise NotImplementedError

    def exists(self, area: str, key: str) -> int | None:
        """Size in bytes of the object, or ``None`` when it is missing."""
        raise NotImplementedError

    def read(self, area: str, key: str) -> bytes:
        """Whole content of the object (uploads are at most 15 MB, BR-MED-01)."""
        raise NotImplementedError

    def write(self, area: str, key: str, data: bytes, *, mime_type: str) -> None:
        """Store ``data`` at ``key`` (used for re-encoded photos and renditions)."""
        raise NotImplementedError

    def move(self, from_area: str, from_key: str, to_area: str, to_key: str) -> None:
        """Move an object out of quarantine into its final area."""
        raise NotImplementedError

    def delete(self, area: str, key: str) -> None:
        """Remove an object; missing objects are ignored."""
        raise NotImplementedError


class LocalStorage(StorageBackend):
    """Files on the local disk, for development and tests (no network)."""

    def __init__(self, root: str | None = None, base_url: str | None = None):
        """``root`` defaults to ``MEDIA_LOCAL_ROOT`` or ``<BASE_DIR>/var/media``."""
        default_root = str(Path(settings.BASE_DIR) / "var" / "media")
        self.root = Path(root or setting("MEDIA_LOCAL_ROOT", default_root))
        self.base_url = (base_url or setting("MEDIA_LOCAL_BASE_URL", "http://localhost:8000")).rstrip("/")

    def path(self, area: str, key: str) -> Path:
        """Disk path of an object; refuses keys that would escape the root folder."""
        target = (self.root / area / key).resolve()
        if not str(target).startswith(str(self.root.resolve())):
            raise ValueError("Invalid storage key.")
        return target

    def _token_url(self, payload: dict) -> str:
        """Absolute URL of the dev route carrying a signed ``payload``."""
        token = signing.dumps(payload, salt=LOCAL_TOKEN_SALT, compress=True)
        return f"{self.base_url}/api/v1/media/_local/{quote(token)}"

    def presign_upload(self, key, *, mime_type, size_bytes, expires_at):
        """Signed PUT URL valid until ``expires_at`` that accepts at most ``size_bytes`` bytes."""
        url = self._token_url({"op": "put", "a": QUARANTINE, "k": key, "n": size_bytes, "e": int(expires_at.timestamp())})
        return {"method": "PUT", "url": url, "headers": {"Content-Type": mime_type}, "expires_at": expires_at}

    def signed_url(self, area, key, *, expires_at):
        """Signed GET URL; ``expires_at=None`` gives a URL that never expires (public photos)."""
        return self._token_url({"op": "get", "a": area, "k": key, "e": int(expires_at.timestamp()) if expires_at else 0})

    def exists(self, area, key):
        """Size of the file, or ``None``."""
        path = self.path(area, key)
        return path.stat().st_size if path.is_file() else None

    def read(self, area, key):
        """File content."""
        return self.path(area, key).read_bytes()

    def write(self, area, key, data, *, mime_type):
        """Write the file, creating folders as needed."""
        path = self.path(area, key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def move(self, from_area, from_key, to_area, to_key):
        """Rename the file into the final area."""
        target = self.path(to_area, to_key)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(self.path(from_area, from_key)), str(target))

    def delete(self, area, key):
        """Delete the file if present."""
        path = self.path(area, key)
        if path.is_file():
            path.unlink()

    @staticmethod
    def read_token(token: str, op: str) -> dict | None:
        """Decode a token of the dev route; ``None`` when forged, for another operation or expired."""
        try:
            payload = signing.loads(token, salt=LOCAL_TOKEN_SALT)
        except signing.BadSignature:
            return None
        if payload.get("op") != op:
            return None
        if payload.get("e") and payload["e"] < int(timezone.now().timestamp()):
            return None
        return payload


class S3Storage(StorageBackend):
    """S3 compatible object storage with presigned URLs (boto3)."""

    def __init__(self, client=None):
        """Build the boto3 client from ``MEDIA_S3_*`` keys (no network call happens here)."""
        if client is None:
            import boto3
            from botocore.config import Config

            client = boto3.client(
                "s3",
                endpoint_url=setting("MEDIA_S3_ENDPOINT_URL") or None,
                region_name=setting("MEDIA_S3_REGION", "fr-par"),
                aws_access_key_id=setting("MEDIA_S3_ACCESS_KEY_ID") or None,
                aws_secret_access_key=setting("MEDIA_S3_SECRET_ACCESS_KEY") or None,
                config=Config(signature_version="s3v4"),
            )
        self.client = client
        self.buckets = {
            QUARANTINE: setting("MEDIA_S3_BUCKET_QUARANTINE", "bladus-quarantine"),
            MediaBucket.PUBLIC: setting("MEDIA_S3_BUCKET_PUBLIC", "bladus-public"),
            MediaBucket.PRIVATE: setting("MEDIA_S3_BUCKET_PRIVATE", "bladus-private"),
        }
        self.public_base_url = setting("MEDIA_PUBLIC_BASE_URL").rstrip("/")

    def _seconds(self, expires_at: datetime) -> int:
        """Seconds from now to ``expires_at`` (at least 1)."""
        return max(1, int((expires_at - timezone.now()).total_seconds()))

    def presign_upload(self, key, *, mime_type, size_bytes, expires_at):
        """Presigned PUT into the quarantine bucket; the signed headers pin the type and length."""
        params = {"Bucket": self.buckets[QUARANTINE], "Key": key, "ContentType": mime_type, "ContentLength": size_bytes}
        url = self.client.generate_presigned_url("put_object", Params=params, ExpiresIn=self._seconds(expires_at))
        return {"method": "PUT", "url": url, "headers": {"Content-Type": mime_type}, "expires_at": expires_at}

    def signed_url(self, area, key, *, expires_at):
        """Presigned GET, or the CDN URL of a public object when ``expires_at`` is ``None``."""
        if expires_at is None and self.public_base_url:
            return f"{self.public_base_url}/{quote(key)}"
        seconds = self._seconds(expires_at) if expires_at else 7 * 24 * 3600
        return self.client.generate_presigned_url(
            "get_object", Params={"Bucket": self.buckets[area], "Key": key}, ExpiresIn=seconds
        )

    def exists(self, area, key):
        """``HeadObject``: size or ``None`` when missing."""
        from botocore.exceptions import ClientError

        try:
            return int(self.client.head_object(Bucket=self.buckets[area], Key=key)["ContentLength"])
        except ClientError:
            return None

    def read(self, area, key):
        """``GetObject`` body."""
        return self.client.get_object(Bucket=self.buckets[area], Key=key)["Body"].read()

    def write(self, area, key, data, *, mime_type):
        """``PutObject``."""
        self.client.put_object(Bucket=self.buckets[area], Key=key, Body=data, ContentType=mime_type)

    def move(self, from_area, from_key, to_area, to_key):
        """Server-side copy then delete of the quarantined object."""
        self.client.copy_object(
            Bucket=self.buckets[to_area], Key=to_key,
            CopySource={"Bucket": self.buckets[from_area], "Key": from_key},
        )
        self.delete(from_area, from_key)

    def delete(self, area, key):
        """``DeleteObject`` (idempotent on S3)."""
        self.client.delete_object(Bucket=self.buckets[area], Key=key)


_BACKENDS = {"local": LocalStorage, "s3": S3Storage}


def get_storage() -> StorageBackend:
    """The configured backend (``MEDIA_STORAGE_BACKEND``, default ``local``)."""
    name = setting("MEDIA_STORAGE_BACKEND", "local").lower()
    return _BACKENDS.get(name, LocalStorage)()


def expiry(minutes: int) -> datetime:
    """``now + minutes``, used for upload slots and signed URLs."""
    return timezone.now() + timedelta(minutes=minutes)
