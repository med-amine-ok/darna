"""Tests of consents and data protection requests (BR-PRV-01, BR-PRV-02)."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.models import DataSubjectRequest, User
from apps.audit.models import AuditEvent
from conftest import client_for, make_user

pytestmark = pytest.mark.django_db
NOTES = {"outcome": "completed", "notes": "Identity checked, data erased."}


def test_br_prv_01_consents_are_append_only_and_latest_wins(user_client, user):
    """Each choice adds a row; the list shows the latest per document."""
    assert user_client.post("/api/v1/me/consents", {"document": "marketing", "version": "1", "accepted": True}).status_code == 201
    assert user_client.post("/api/v1/me/consents", {"document": "marketing", "version": "1", "accepted": False}).status_code == 201
    res = user_client.get("/api/v1/me/consents")
    assert res.status_code == 200 and res.data["results"] == [
        {**res.data["results"][0], "document": "marketing", "accepted": False}
    ]
    assert user.consents.count() == 2


def test_consent_document_must_be_known(user_client):
    """Unknown documents are refused."""
    assert user_client.post("/api/v1/me/consents", {"document": "cookies", "version": "1", "accepted": True}).status_code == 400


def test_br_prv_02_data_request_has_30_day_deadline_and_one_open_per_kind(user_client):
    """A request is due in 30 days; a second open request of the same kind is a conflict."""
    res = user_client.post("/api/v1/me/data-requests", {"kind": "access"})
    assert res.status_code == 201 and res.data["status"] == "open"
    row = DataSubjectRequest.objects.get(pk=res.data["id"])
    assert abs((row.due_at - row.created_at) - timedelta(days=30)) < timedelta(seconds=1)
    again = user_client.post("/api/v1/me/data-requests", {"kind": "access"})
    assert again.status_code == 409 and again.data["code"] == "data_request_open"
    assert user_client.post("/api/v1/me/data-requests", {"kind": "deletion"}).status_code == 201
    assert len(user_client.get("/api/v1/me/data-requests").data["results"]) == 2
    assert AuditEvent.objects.filter(action="DSR_CREATE").count() == 2


def test_data_requests_are_private(user_client):
    """Another user does not see my requests."""
    user_client.post("/api/v1/me/data-requests", {"kind": "access"})
    other = client_for(make_user(email="other@x.dz"))
    assert other.get("/api/v1/me/data-requests").data["results"] == []


def test_br_prv_02_completed_deletion_anonymises_the_user(admin_client, user_client, user):
    """Closing a deletion request erases personal data, keeps the id and signs the user out."""
    created = user_client.post("/api/v1/me/data-requests", {"kind": "deletion", "notes": "Please delete me."}).data
    listed = admin_client.get("/api/v1/admin/data-requests", {"kind": "deletion"})
    assert listed.status_code == 200 and listed.data["results"][0]["user"]["id"] == str(user.id)
    res = admin_client.post(f"/api/v1/admin/data-requests/{created['id']}/complete", NOTES)
    assert res.status_code == 200 and res.data["status"] == "completed" and res.data["handled_by"]
    user.refresh_from_db()
    assert user.anonymised_at and user.phone_e164 is None and user.email.endswith("@anonymised.invalid")
    assert User.objects.filter(pk=user.pk).exists()
    assert user_client.get("/api/v1/me").status_code == 401
    again = admin_client.post(f"/api/v1/admin/data-requests/{created['id']}/complete", NOTES)
    assert again.status_code == 409 and again.data["code"] == "data_request_closed"
    assert admin_client.post(f"/api/v1/admin/users/{user.id}/restore").data["code"] == "anonymised"


def test_rejected_request_keeps_the_user(admin_client, user_client, user):
    """A rejected deletion changes nothing on the profile."""
    created = user_client.post("/api/v1/me/data-requests", {"kind": "deletion"}).data
    res = admin_client.post(
        f"/api/v1/admin/data-requests/{created['id']}/complete", {"outcome": "rejected", "notes": "Open booking first."}
    )
    assert res.status_code == 200 and res.data["status"] == "rejected"
    user.refresh_from_db()
    assert user.anonymised_at is None and user.deleted_at is None and timezone.now()


def test_guest_cannot_handle_data_requests(user_client):
    """Only admins with privacy.handle_requests see the queue."""
    assert user_client.get("/api/v1/admin/data-requests").status_code == 403
