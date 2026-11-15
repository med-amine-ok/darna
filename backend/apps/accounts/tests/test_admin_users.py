"""Tests of the admin user screens: list, detail, suspend, ban, delete, restore (ACC-08, STF-03, BR-ACC-03, BR-STF-02)."""

import pytest

from apps.accounts import extensions
from apps.accounts.models import UserStatus
from apps.audit.models import AuditEvent
from conftest import client_for, make_user

pytestmark = pytest.mark.django_db
REASON = {"reason": "Repeated fake bookings reported."}


def test_admin_lists_users_without_staff(admin_client, user, admin_user):
    """Numbered page of people; staff are not in it; filters by status and search."""
    make_user(email="other@x.dz", status=UserStatus.SUSPENDED)
    res = admin_client.get("/api/v1/admin/users")
    assert res.status_code == 200 and res.data["count"] == 2
    assert str(admin_user.id) not in {row["id"] for row in res.data["results"]}
    suspended = admin_client.get("/api/v1/admin/users", {"status": "suspended"})
    assert [row["email"] for row in suspended.data["results"]] == ["other@x.dz"]
    assert admin_client.get("/api/v1/admin/users", {"q": "other@"}).data["count"] == 1
    row = res.data["results"][0]
    assert {"booking_count", "is_host", "host_account_ids", "open_flags", "email_verified"} <= set(row)


def test_filters_of_other_apps_need_their_hook(admin_client, user, monkeypatch):
    """min_bookings answers 400 filter_unavailable until the bookings app registers it."""
    res = admin_client.get("/api/v1/admin/users", {"min_bookings": 1})
    assert res.status_code == 400 and res.data["code"] == "filter_unavailable"
    monkeypatch.setitem(extensions._admin_user_filters, "min_bookings", lambda rows, value: rows.none())
    assert admin_client.get("/api/v1/admin/users", {"min_bookings": 1}).data["count"] == 0


def test_admin_gets_one_user(admin_client, user, admin_user):
    """Detail by id; staff and unknown ids are 404."""
    assert admin_client.get(f"/api/v1/admin/users/{user.id}").data["email"] == user.email
    assert admin_client.get(f"/api/v1/admin/users/{admin_user.id}").status_code == 404


def test_br_acc_03_suspend_revokes_sessions_and_is_audited(admin_client, user, user_client):
    """Suspending signs the user out at once; the audit row keeps statuses and the reason."""
    res = admin_client.post(f"/api/v1/admin/users/{user.id}/suspend", REASON)
    assert res.status_code == 200 and res.data["status"] == "suspended"
    assert user_client.get("/api/v1/me").status_code == 401
    event = AuditEvent.objects.get(action="USER_SUSPEND")
    assert event.after["status"] == "suspended" and event.note == REASON["reason"]
    assert admin_client.post(f"/api/v1/admin/users/{user.id}/suspend", REASON).status_code == 409
    assert admin_client.post(f"/api/v1/admin/users/{user.id}/unsuspend").data["status"] == "active"


def test_suspend_needs_a_reason(admin_client, user):
    """The reason is required (at least 10 characters)."""
    assert admin_client.post(f"/api/v1/admin/users/{user.id}/suspend", {"reason": "short"}).status_code == 400


def test_ban_then_cannot_unsuspend(admin_client, user):
    """A banned user cannot be unsuspended (409)."""
    assert admin_client.post(f"/api/v1/admin/users/{user.id}/ban", REASON).data["status"] == "banned"
    res = admin_client.post(f"/api/v1/admin/users/{user.id}/unsuspend")
    assert res.status_code == 409 and res.data["code"] == "invalid_status"


def test_soft_delete_and_restore(admin_client, user):
    """DELETE soft-deletes (204), restore brings the user back; both audited."""
    assert admin_client.delete(f"/api/v1/admin/users/{user.id}").status_code == 204
    detail = admin_client.get(f"/api/v1/admin/users/{user.id}").data
    assert detail["status"] == "deleted" and detail["deleted_at"]
    assert admin_client.delete(f"/api/v1/admin/users/{user.id}").status_code == 409
    restored = admin_client.post(f"/api/v1/admin/users/{user.id}/restore")
    assert restored.status_code == 200 and restored.data["status"] == "active" and restored.data["deleted_at"] is None
    assert AuditEvent.objects.filter(action__in=["USER_DELETE", "USER_RESTORE"]).count() == 2


def test_staff_accounts_are_not_managed_here(admin_client, admin_user):
    """Staff are managed under /admin/staff: suspending one here gives 409 staff_account."""
    second = make_user(email="admin2@bladus.dz", is_staff=True)
    res = admin_client.post(f"/api/v1/admin/users/{second.id}/suspend", REASON)
    assert res.status_code == 409 and res.data["code"] == "staff_account"


def test_guest_cannot_manage_users(user_client, user):
    """A website session gets 403."""
    other = make_user(email="other@x.dz")
    assert user_client.get("/api/v1/admin/users").status_code == 403
    assert user_client.post(f"/api/v1/admin/users/{other.id}/ban", REASON).status_code == 403
    assert client_for(other).get(f"/api/v1/admin/users/{user.id}").status_code == 403
