"""Tests of the upload flow: slot, direct upload, checks, signed URLs (BR-MED-01, BR-MED-02)."""

import hashlib
import io
from datetime import timedelta
from unittest import mock
from urllib.parse import urlparse

import pytest
from django.test import Client
from django.utils import timezone
from PIL import Image

from apps.audit.models import AuditEvent
from apps.catalog.tests.factories import individual_host
from apps.media.models import MediaAsset, MediaStatus
from apps.media.scanning import EICAR
from apps.media.storage import LocalStorage, S3Storage
from conftest import client_for, make_user

pytestmark = pytest.mark.django_db

PDF = b"%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n"


@pytest.fixture(autouse=True)
def _local_media(settings, tmp_path):
    """Every test writes files into its own temporary folder with the local backend."""
    settings.MEDIA_STORAGE_BACKEND = "local"
    settings.MEDIA_LOCAL_ROOT = str(tmp_path)
    settings.MEDIA_SCANNER = "apps.media.scanning.StubScanner"


def jpeg_with_gps(size=(1200, 900)) -> bytes:
    """A JPEG carrying EXIF with a GPS block (what BR-MED-01 must strip)."""
    image = Image.new("RGB", size, (200, 120, 40))
    exif = Image.Exif()
    exif[0x010F] = "PhoneMaker"  # Make
    exif[0x8825] = {1: "N", 2: (36.0, 45.0, 13.0)}  # GPSInfo
    out = io.BytesIO()
    image.save(out, format="JPEG", exif=exif)
    return out.getvalue()


def request_slot(client, data: bytes, *, purpose="listing_photo", mime="image/jpeg", filename="photo.jpg", **headers):
    """``POST /media/uploads`` for ``data``; returns the response."""
    body = {"purpose": purpose, "filename": filename, "mime_type": mime, "size_bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest()}
    return client.post("/api/v1/media/uploads", body, format="json", **headers)


def upload(ticket: dict, data: bytes, mime: str = "image/jpeg") -> int:
    """Send the file to the presigned URL like a browser would (no session); returns the status code."""
    path = urlparse(ticket["upload"]["url"]).path
    return Client().generic("PUT", path, data, content_type=mime).status_code


def full_upload(client, data: bytes, **kwargs) -> dict:
    """Slot, upload and complete; returns the ``Media`` answer of the completion."""
    slot = request_slot(client, data, **kwargs)
    assert slot.status_code == 201, slot.json()
    assert upload(slot.json(), data, kwargs.get("mime", "image/jpeg")) == 200
    done = client.post(f"/api/v1/media/{slot.json()['media_id']}/complete")
    assert done.status_code == 202, done.json()
    return done.json()


def test_photo_upload_happy_path(user_client):
    """A clean photo becomes ready, public, measured, with three renditions."""
    media = full_upload(user_client, jpeg_with_gps())
    assert media["status"] == "ready"
    assert media["bucket"] == "public"
    assert (media["width"], media["height"]) == (1200, 900)
    assert set(media["renditions"]) == {"thumb", "card", "large"}
    assert media["rejection_code"] is None
    again = user_client.get(f"/api/v1/media/{media['id']}")
    assert again.status_code == 200 and again.json()["status"] == "ready"


def test_br_med_01_gps_and_metadata_removed(user_client, settings):
    """The stored photo is re-encoded without EXIF: no GPS left (BR-MED-01)."""
    media = full_upload(user_client, jpeg_with_gps())
    asset = MediaAsset.objects.get(pk=media["id"])
    stored = LocalStorage().read(asset.bucket, asset.storage_key)
    assert not Image.open(io.BytesIO(stored)).getexif()
    assert asset.phash is not None


def test_br_med_01_type_and_size_limits(user_client):
    """GIF is not an allowed photo type; documents above 10 MB are refused (422)."""
    gif = request_slot(user_client, b"GIF89a....", mime="image/gif", filename="a.gif")
    assert gif.status_code == 422 and gif.json()["code"] == "file_type_not_allowed"
    host, owner = individual_host()
    client = client_for(owner, host)
    body = {"purpose": "document", "filename": "id.pdf", "mime_type": "application/pdf",
            "size_bytes": 11 * 1024 * 1024, "sha256": "a" * 64}
    big = client.post("/api/v1/media/uploads", body, format="json")
    assert big.status_code == 422 and big.json()["code"] == "file_too_large"


def test_br_med_01_renamed_file_rejected(user_client):
    """A PDF announced as a JPEG is caught by the type sniffing."""
    media = full_upload(user_client, PDF, mime="image/jpeg")
    assert media["status"] == "rejected" and media["rejection_code"] == "file_type_mismatch"


def test_br_med_02_document_needs_host_workspace(user_client):
    """A guest without a host workspace cannot upload documents (403)."""
    response = request_slot(user_client, PDF, purpose="document", mime="application/pdf", filename="id.pdf")
    assert response.status_code == 403


def test_br_med_02_private_document_signed_url_audited_and_short_lived():
    """A document is private; its URL lasts 5 minutes, works once issued, fails after, and is audited."""
    host, owner = individual_host()
    client = client_for(owner, host)
    media = full_upload(client, PDF, purpose="document", mime="application/pdf", filename="id.pdf")
    assert media["status"] == "ready" and media["bucket"] == "private" and media["renditions"] == {}
    assert MediaAsset.objects.get(pk=media["id"]).host_account_id == host.id

    signed = client.get(f"/api/v1/media/{media['id']}/url")
    assert signed.status_code == 200
    expires = timezone.datetime.fromisoformat(signed.json()["expires_at"].replace("Z", "+00:00"))
    assert timedelta(minutes=4) < expires - timezone.now() <= timedelta(minutes=5)
    assert AuditEvent.objects.filter(action="MEDIA_PRIVATE_URL", object_id=media["id"]).count() == 1

    path = urlparse(signed.json()["url"]).path
    assert Client().get(path).status_code == 200
    later = timezone.now() + timedelta(minutes=6)
    with mock.patch("apps.media.storage.timezone.now", return_value=later):
        assert Client().get(path).status_code == 403


def test_br_med_02_private_url_owner_only(user_client):
    """Another user (even with the id) gets 404 for the file and its URL."""
    media = full_upload(user_client, jpeg_with_gps())
    other = client_for(make_user(email="other@example.dz"))
    assert other.get(f"/api/v1/media/{media['id']}").status_code == 404
    assert other.get(f"/api/v1/media/{media['id']}/url").status_code == 404


def test_br_med_02_virus_rejected(user_client):
    """The EICAR test file is rejected with ``virus_found`` by the stub scanner."""
    data = PDF + EICAR
    host, owner = individual_host()
    client = client_for(owner, host)
    media = full_upload(client, data, purpose="document", mime="application/pdf", filename="bad.pdf")
    assert media["status"] == "rejected" and media["rejection_code"] == "virus_found"


def test_complete_errors(user_client):
    """Completing before uploading is 409 ``upload_missing``; completing twice is 409 too."""
    data = jpeg_with_gps()
    slot = request_slot(user_client, data).json()
    early = user_client.post(f"/api/v1/media/{slot['media_id']}/complete")
    assert early.status_code == 409 and early.json()["code"] == "upload_missing"
    upload(slot, data)
    assert user_client.post(f"/api/v1/media/{slot['media_id']}/complete").status_code == 202
    twice = user_client.post(f"/api/v1/media/{slot['media_id']}/complete")
    assert twice.status_code == 409 and twice.json()["code"] == "upload_already_completed"


def test_upload_larger_than_slot_refused(user_client):
    """The local store refuses a body bigger than the announced size (like a signed Content-Length)."""
    data = jpeg_with_gps()
    slot = request_slot(user_client, data).json()
    assert upload(slot, data + b"extra") == 413
    assert MediaAsset.objects.get(pk=slot["media_id"]).status == MediaStatus.QUARANTINED


def test_anonymous_refused(api):
    """Uploads need a session (401)."""
    assert request_slot(api, b"x").status_code == 401


def test_s3_presigned_upload_url_without_network():
    """The S3 backend signs URLs locally (no call to the store)."""
    import boto3

    client = boto3.client("s3", region_name="fr-par", endpoint_url="https://s3.fr-par.scw.cloud",
                          aws_access_key_id="test", aws_secret_access_key="test")
    storage = S3Storage(client=client)
    ticket = storage.presign_upload("abc/photo.jpg", mime_type="image/jpeg", size_bytes=10,
                                    expires_at=timezone.now() + timedelta(minutes=10))
    assert ticket["method"] == "PUT"
    assert "X-Amz-Signature" in ticket["url"] and "bladus-quarantine" in ticket["url"]
    url = storage.signed_url("private", "document/x.pdf", expires_at=timezone.now() + timedelta(minutes=5))
    assert "X-Amz-Expires=" in url
