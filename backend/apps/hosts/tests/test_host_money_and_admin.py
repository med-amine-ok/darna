"""
Tests of payout accounts (BR-PAY-09), organisation deletion (BR-ORG-04), hotel
sync runs (BR-HST-06), the organisation directory (BR-SRC-01) and the admin
host actions added on 2026-11-15 (delete, restore, credit limit, documents).
"""

from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone

from apps.accounts.models import SessionToken
from apps.audit.models import AuditEvent
from apps.hosts import integrations, services
from apps.hosts.crypto import decrypt_secret
from apps.hosts.models import HostAccount, HostDocument, Organization, PayoutAccount, PropertyIntegration
from conftest import client_for

from .helpers import add_member, approved, make_org, new_user, owner_of

pytestmark = pytest.mark.django_db
REASON = "Agreed with the host after a review call."
RIP = "00799999 0012345678 90"


def mfa_ok(user) -> None:
    """Mark the user's sessions as having just confirmed a second factor, when the column exists (BR-ACC-04)."""
    if "mfa_verified_at" in {f.name for f in SessionToken._meta.get_fields()}:
        SessionToken.objects.filter(user=user).update(mfa_verified_at=timezone.now())


def owner_client(account):
    """Client of the owner of ``account`` acting in it, with a fresh second factor."""
    owner = owner_of(account)
    client = client_for(owner, account)
    mfa_ok(owner)
    return client


# ---------------------------------------------------------------------------
# Payout accounts (BR-PAY-09)
# ---------------------------------------------------------------------------
def test_br_pay_09_add_payout_account_encrypted_held_and_notified():
    """The number is encrypted, only the last 4 are shown, payouts wait 72 h, the owner is told, audited."""
    agency = make_org()
    client = owner_client(agency)
    res = client.post("/api/v1/host/payout-accounts", {"kind": "ccp_rip", "holder_name": "Atlas", "number": RIP})
    assert res.status_code == 201, res.data
    assert res.data["number_last4"] == "7890" and res.data["is_default"] is True and "number" not in res.data
    payout = PayoutAccount.objects.get()
    assert decrypt_secret(payout.number_encrypted) == "00799999001234567890"
    assert payout.hold_until - timezone.now() > timedelta(hours=71)
    assert AuditEvent.objects.filter(action="PAYOUT_ACCOUNT_ADD").count() == 1
    listing = client.get("/api/v1/host/payout-accounts").data["results"]
    assert listing[0]["number_last4"] == "7890" and "number_encrypted" not in listing[0]


def test_br_pay_09_notification_sent_after_commit(django_capture_on_commit_callbacks):
    """The owner's email gets the change notice once the transaction commits."""
    agency = make_org()
    client = owner_client(agency)
    with django_capture_on_commit_callbacks(execute=True):
        client.post("/api/v1/host/payout-accounts", {"kind": "bank_rib", "holder_name": "Atlas", "number": RIP})
    assert len(mail.outbox) == 1 and "7890" in mail.outbox[0].body


def test_br_pay_09_only_payout_editors_and_valid_numbers():
    """A manager may not see or add payout accounts; a bad number is 422."""
    agency = make_org()
    manager = add_member(agency, "manager")
    assert client_for(manager.user, agency).get("/api/v1/host/payout-accounts").status_code == 403
    res = owner_client(agency).post("/api/v1/host/payout-accounts",
                                    {"kind": "ccp_rip", "holder_name": "Atlas", "number": "12AB"})
    assert res.status_code == 422 and res.data["code"] == "invalid_account_number"


def test_br_pay_09_remove_default_promotes_next_with_hold():
    """Removing the default makes the newest other account default, held 72 h; others' ids are 404."""
    agency = make_org()
    client = owner_client(agency)
    first = client.post("/api/v1/host/payout-accounts", {"kind": "ccp_rip", "holder_name": "A", "number": RIP}).data
    second = client.post("/api/v1/host/payout-accounts",
                         {"kind": "baridimob", "holder_name": "B", "number": "0079999900111122223333"}).data
    assert second["is_default"] is False
    PayoutAccount.objects.filter(pk=second["id"]).update(hold_until=None)
    assert client.delete(f"/api/v1/host/payout-accounts/{first['id']}").status_code == 204
    promoted = PayoutAccount.objects.get(pk=second["id"])
    assert promoted.is_default and promoted.hold_until is not None
    other = make_org(name="Other")
    assert owner_client(other).delete(f"/api/v1/host/payout-accounts/{second['id']}").status_code == 404


# ---------------------------------------------------------------------------
# Organisation deletion (BR-ORG-04)
# ---------------------------------------------------------------------------
def test_br_org_04_owner_deletes_organisation_with_exact_name(monkeypatch):
    """Owner only, exact name, 409 with upcoming bookings; then the organisation is gone (soft)."""
    agency = approved(make_org(name="Atlas Voyages"))
    admin_member = add_member(agency, "admin")
    assert client_for(admin_member.user, agency).delete(
        "/api/v1/host/organization?confirm_name=Atlas Voyages").status_code == 403
    client = owner_client(agency)
    res = client.delete("/api/v1/host/organization?confirm_name=atlas voyages")
    assert res.status_code == 400 and res.data["code"] == "confirm_name_mismatch"
    monkeypatch.setattr(services, "has_future_bookings", lambda account: True)
    res = client.delete("/api/v1/host/organization?confirm_name=Atlas%20Voyages")
    assert res.status_code == 409 and res.data["code"] == "has_future_bookings"
    monkeypatch.undo()
    assert client.delete("/api/v1/host/organization?confirm_name=Atlas%20Voyages").status_code == 204
    assert Organization.objects.get(pk=agency.organization_id).deleted_at is not None
    assert HostAccount.objects.get(pk=agency.pk).deleted_at is not None
    assert AuditEvent.objects.filter(action="ORGANIZATION_DELETE").exists()


# ---------------------------------------------------------------------------
# Hotel system sync (BR-HST-06)
# ---------------------------------------------------------------------------
def test_br_hst_06_sync_without_adapter_fails_and_flags_connection():
    """No adapter yet: the run is failed with a reason, nothing else changes; the history lists it."""
    hotel = make_org(category="hotel", name="Hotel")
    integration = PropertyIntegration.objects.create(
        organization=hotel.organization, kind="pms", system_name="Opera", created_by=owner_of(hotel)
    )
    client = owner_client(hotel)
    res = client.post(f"/api/v1/host/integrations/{integration.id}/sync")
    assert res.status_code == 202 and res.data["status"] == "failed" and res.data["error"]
    integration.refresh_from_db()
    assert integration.status == "error" and integration.last_error
    runs = client.get(f"/api/v1/host/integrations/{integration.id}/runs").data["results"]
    assert len(runs) == 1 and runs[0]["id"] == res.data["id"]


def test_br_hst_06_sync_with_adapter_records_counters(monkeypatch):
    """A working adapter: run ok with its counters; the connection becomes active."""
    monkeypatch.setitem(integrations.SYNC_ADAPTERS, "ical",
                        lambda integration: {"status": "ok", "rooms_changed": 2, "nights_changed": 30})
    hotel = make_org(category="hotel", name="Hotel")
    integration = PropertyIntegration.objects.create(
        organization=hotel.organization, kind="ical", system_name="Feed", created_by=owner_of(hotel)
    )
    res = owner_client(hotel).post(f"/api/v1/host/integrations/{integration.id}/sync")
    assert res.data["status"] == "ok" and res.data["nights_changed"] == 30 and res.data["error"] is None
    integration.refresh_from_db()
    assert integration.status == "active" and integration.last_synced_at is not None


def test_sync_refused_for_agencies_and_other_hotels():
    """Agencies cannot sync (403); another hotel's connection is 404."""
    hotel = make_org(category="hotel", name="Hotel")
    integration = PropertyIntegration.objects.create(
        organization=hotel.organization, kind="pms", system_name="Opera", created_by=owner_of(hotel)
    )
    agency = make_org()
    assert owner_client(agency).post(f"/api/v1/host/integrations/{integration.id}/sync").status_code == 403
    other = make_org(category="hotel", name="Other hotel")
    assert owner_client(other).get(f"/api/v1/host/integrations/{integration.id}/runs").status_code == 404


# ---------------------------------------------------------------------------
# Organisation directory (BR-SRC-01)
# ---------------------------------------------------------------------------
def test_br_src_01_directory_lists_approved_organisations_with_cursor(api):
    """Only approved, not deleted organisations; category filter; cursor pages."""
    first = approved(make_org(name="A1"))
    approved(make_org(name="A2"))
    approved(make_org(category="hotel", name="H1"))
    make_org(name="Pending")
    res = api.get("/api/v1/organizations", {"limit": 2})
    assert res.status_code == 200 and len(res.data["results"]) == 2 and res.data["has_more"] is True
    rest = api.get("/api/v1/organizations", {"limit": 2, "cursor": res.data["next_cursor"]})
    assert len(rest.data["results"]) == 1 and rest.data["has_more"] is False and rest.data["next_cursor"] is None
    hotels = api.get("/api/v1/organizations", {"business_category": "hotel"}).data["results"]
    assert [o["display_name"] for o in hotels] == ["H1"]
    assert "rc_number" not in res.data["results"][0]
    assert api.get("/api/v1/organizations", {"business_category": "castle"}).status_code == 400
    assert api.get("/api/v1/organizations", {"limit": 51}).status_code == 400
    HostAccount.objects.filter(pk=first.pk).update(deleted_at=timezone.now())
    assert len(api.get("/api/v1/organizations").data["results"]) == 2


# ---------------------------------------------------------------------------
# Admin host actions
# ---------------------------------------------------------------------------
def test_br_hst_04_admin_delete_and_restore(admin_client, monkeypatch):
    """Delete (409 with upcoming bookings), then restore; both audited; restore twice is 409."""
    agency = make_org()
    url = f"/api/v1/admin/hosts/{agency.id}"
    monkeypatch.setattr(services, "has_future_bookings", lambda account: True)
    assert admin_client.delete(url).data["code"] == "has_future_bookings"
    monkeypatch.undo()
    assert admin_client.delete(url).status_code == 204
    assert admin_client.get(url).status_code == 404
    res = admin_client.post(f"{url}/restore")
    assert res.status_code == 200 and res.data["deleted_at"] is None
    assert Organization.objects.get(pk=agency.organization_id).deleted_at is None
    assert admin_client.post(f"{url}/restore").data["code"] == "host_not_deleted"
    assert {e.action for e in AuditEvent.objects.filter(object_id=str(agency.id))} >= {"HOST_DELETE", "HOST_RESTORE"}


def test_admin_host_actions_refuse_non_admins(user_client):
    """Guests get 403 on the new admin host endpoints."""
    agency = make_org()
    url = f"/api/v1/admin/hosts/{agency.id}"
    assert user_client.delete(url).status_code == 403
    assert user_client.post(f"{url}/restore").status_code == 403
    assert user_client.put(f"{url}/credit-limit-override", {}).status_code == 403


def test_br_pay_10_admin_sets_credit_limit(admin_client):
    """The host's own credit floor, DZD only, with a reason; audited and shown as Money."""
    agency = make_org()
    url = f"/api/v1/admin/hosts/{agency.id}/credit-limit-override"
    body = {"credit_limit": {"amount_minor": 5_000_000, "currency": "DZD"}, "reason": REASON}
    res = admin_client.put(url, body, format="json")
    assert res.status_code == 200, res.data
    assert res.data["credit_limit"] == {"amount_minor": 5_000_000, "currency": "DZD"}
    res = admin_client.put(url, {**body, "credit_limit": {"amount_minor": 1, "currency": "EUR"}}, format="json")
    assert res.status_code == 422 and res.data["code"] == "currency_not_supported"
    assert admin_client.put(url, {**body, "reason": "short"}, format="json").data["code"] == "reason_required"
    assert AuditEvent.objects.filter(action="HOST_CREDIT_LIMIT_OVERRIDE").count() == 1


def test_br_hst_03_document_reviewed_once(admin_client):
    """A reviewed document cannot be reviewed again (409)."""
    agency = make_org()
    doc = HostDocument.objects.create(host_account=agency, doc_type="commercial_register", file_url="https://f/x.pdf")
    assert admin_client.post(f"/api/v1/admin/documents/{doc.id}/approve").status_code == 200
    res = admin_client.post(f"/api/v1/admin/documents/{doc.id}/reject", {"reason": REASON})
    assert res.status_code == 409 and res.data["code"] == "document_already_reviewed"


def test_br_med_02_document_signed_url_audited_and_short_lived(admin_client, api, user_client):
    """The URL works without a session for 5 minutes and every view is audited."""
    agency = make_org()
    doc = HostDocument.objects.create(host_account=agency, doc_type="commercial_register",
                                      file_url="https://files.example.dz/rc.pdf")
    assert user_client.get(f"/api/v1/admin/documents/{doc.id}/url").status_code == 403
    res = admin_client.get(f"/api/v1/admin/documents/{doc.id}/url")
    assert res.status_code == 200 and res.data["expires_at"]
    assert AuditEvent.objects.filter(action="KYC_DOCUMENT_VIEW", object_id=str(doc.id)).count() == 1
    path = res.data["url"].split("testserver", 1)[1]
    opened = api.get(path)
    assert opened.status_code == 302 and opened["Location"] == "https://files.example.dz/rc.pdf"
    other = HostDocument.objects.create(host_account=agency, doc_type="tax_card_nif", file_url="https://f/n.pdf")
    token = path.split("token=", 1)[1]
    assert api.get(f"/api/v1/admin/documents/{other.id}/file?token={token}").status_code == 404
    assert api.get(f"/api/v1/admin/documents/{doc.id}/file?token=forged").status_code == 404
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(services, "DOCUMENT_URL_TTL", timedelta(seconds=-1))
        assert api.get(path).status_code == 404
