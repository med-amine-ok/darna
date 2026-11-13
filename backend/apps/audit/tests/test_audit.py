"""Tests of the audit log: append-only rows and the admin list endpoint (BR-STF-01, BR-STF-02)."""

import pytest

from apps.audit.models import AuditEvent
from apps.audit.services import record

pytestmark = pytest.mark.django_db


def test_br_stf_02_event_cannot_be_modified_or_deleted(admin_user):
    """Saving an existing row or deleting it raises; the row stays as written."""
    event = record(actor=admin_user, action="HOST_APPROVE", object_type="hostaccount", object_id="x1")
    event.note = "changed"
    with pytest.raises(RuntimeError):
        event.save()
    with pytest.raises(RuntimeError):
        event.delete()
    stored = AuditEvent.objects.get(pk=event.pk)
    assert stored.note == "" and stored.actor_kind == "admin"


def test_br_stf_01_audit_list_needs_admin(user_client, api):
    """Guests get 403, anonymous callers 401."""
    assert user_client.get("/api/v1/admin/audit-events").status_code == 403
    assert api.get("/api/v1/admin/audit-events").status_code == 401


def test_audit_list_filters_and_pagination(admin_client, admin_user, user):
    """Filters by action, object and actor; answer is paginated, newest first."""
    record(actor=admin_user, action="HOST_APPROVE", object_type="hostaccount", object_id="a")
    record(actor=user, action="MEMBER_REMOVE", object_type="membership", object_id="b")
    record(actor=None, action="HOST_APPROVE", object_type="hostaccount", object_id="c")

    res = admin_client.get("/api/v1/admin/audit-events")
    assert res.status_code == 200 and res.data["count"] == 3
    assert res.data["results"][0]["object_id"] == "c" and res.data["results"][0]["actor"] is None

    assert admin_client.get("/api/v1/admin/audit-events", {"action": "host_approve"}).data["count"] == 2
    assert admin_client.get("/api/v1/admin/audit-events", {"object_type": "membership"}).data["count"] == 1
    assert admin_client.get("/api/v1/admin/audit-events", {"object_id": "a"}).data["count"] == 1
    by_actor = admin_client.get("/api/v1/admin/audit-events", {"actor": str(user.id)}).data
    assert by_actor["count"] == 1 and by_actor["results"][0]["actor"]["id"] == str(user.id)
    assert admin_client.get("/api/v1/admin/audit-events", {"actor": "not-a-uuid"}).data["count"] == 0
    assert admin_client.get("/api/v1/admin/audit-events", {"page_size": 1}).data["page_size"] == 1


def test_audit_api_offers_no_write(admin_client):
    """POST, PATCH and DELETE are not allowed on the audit endpoint."""
    assert admin_client.post("/api/v1/admin/audit-events", {}).status_code == 405
    assert admin_client.delete("/api/v1/admin/audit-events").status_code == 405
