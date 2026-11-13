"""Tests of the admin review of hosts (BR-HST-03, BR-HST-04, BR-PAY-06, BR-STF-01)."""

import pytest

from apps.audit.models import AuditEvent
from apps.hosts.models import HostAccount, HostDocument, VerificationStatus

from .helpers import make_org, new_user, set_status

pytestmark = pytest.mark.django_db
REASON = "Documents are not readable, please send them again."


def host_url(account, action: str = "") -> str:
    """Admin URL of a host account, optionally with an action."""
    return f"/api/v1/admin/hosts/{account.id}" + (f"/{action}" if action else "")


def add_docs(account, *doc_types, status="approved"):
    """Attach documents of the given types and status."""
    for doc_type in doc_types:
        HostDocument.objects.create(host_account=account, doc_type=doc_type, file_url=f"{doc_type}.pdf", status=status)


def test_br_stf_01_admin_endpoints_refuse_non_admins(user_client):
    """A guest gets 403 on every admin host endpoint."""
    agency = make_org()
    assert user_client.get("/api/v1/admin/hosts").status_code == 403
    assert user_client.get(host_url(agency)).status_code == 403
    assert user_client.post(host_url(agency, "approve")).status_code == 403


def test_br_hst_03_approve_blocked_without_required_approved_documents(admin_client, admin_user):
    """An agency needs RC, NIF and licence approved; a pending one blocks approval."""
    agency = set_status(make_org(), VerificationStatus.UNDER_REVIEW)
    add_docs(agency, "commercial_register", "tax_card_nif")
    add_docs(agency, "tourism_licence", status="pending")
    res = admin_client.post(host_url(agency, "approve"))
    assert res.status_code == 409 and res.data["code"] == "documents_missing"
    assert res.data["errors"]["missing_documents"] == ["tourism_licence"]

    licence = HostDocument.objects.get(doc_type="tourism_licence")
    assert admin_client.post(f"/api/v1/admin/host-documents/{licence.id}/approve").status_code == 200
    res = admin_client.post(host_url(agency, "approve"))
    assert res.status_code == 200 and res.data["verification_status"] == "approved"
    agency.refresh_from_db()
    assert agency.approved_at is not None
    event = AuditEvent.objects.get(action="HOST_APPROVE")
    assert event.actor == admin_user and event.before == {"verification_status": "under_review"}


def test_br_hst_03_passport_counts_as_national_id(admin_client):
    """Table 3a: an individual may prove identity with a passport."""
    account = HostAccount.objects.create(kind="individual", user=new_user(), verification_status="under_review")
    add_docs(account, "passport")
    assert admin_client.post(host_url(account, "approve")).status_code == 200


@pytest.mark.parametrize("action", ["reject", "request-changes", "suspend", "ban"])
def test_br_hst_04_reason_required(admin_client, action):
    """These decisions need a reason of at least 10 characters."""
    agency = set_status(make_org(), VerificationStatus.APPROVED if action == "suspend" else VerificationStatus.UNDER_REVIEW)
    res = admin_client.post(host_url(agency, action), {"reason": "too short"})
    assert res.status_code == 400 and res.data["code"] == "reason_required"
    res = admin_client.post(host_url(agency, action), {"reason": REASON})
    assert res.status_code == 200, res.data
    assert AuditEvent.objects.get(object_id=str(agency.id), note=REASON)


def test_br_hst_04_state_machine(admin_client):
    """Approve only from under review; suspend then unsuspend; banned is final."""
    agency = make_org()  # applied
    res = admin_client.post(host_url(agency, "approve"))
    assert res.status_code == 409 and res.data["code"] == "invalid_transition"
    assert admin_client.post(host_url(agency, "unsuspend")).status_code == 409

    set_status(agency, VerificationStatus.APPROVED)
    assert admin_client.post(host_url(agency, "suspend"), {"reason": REASON}).data["verification_status"] == "suspended"
    assert admin_client.post(host_url(agency, "approve")).status_code == 409  # use unsuspend instead
    assert admin_client.post(host_url(agency, "unsuspend")).data["verification_status"] == "approved"
    assert admin_client.post(host_url(agency, "ban"), {"reason": REASON}).data["verification_status"] == "banned"
    assert admin_client.post(host_url(agency, "unsuspend")).status_code == 409


def test_admin_document_reject_needs_reason(admin_client):
    """Rejecting a document needs a reason, which the host then sees."""
    agency = make_org()
    add_docs(agency, "commercial_register", status="pending")
    doc = HostDocument.objects.get()
    assert admin_client.post(f"/api/v1/admin/host-documents/{doc.id}/reject").status_code == 400
    res = admin_client.post(f"/api/v1/admin/host-documents/{doc.id}/reject", {"reason": REASON})
    assert res.status_code == 200 and res.data["status"] == "rejected" and res.data["rejection_reason"] == REASON
    assert AuditEvent.objects.filter(action="DOCUMENT_REJECT").count() == 1


def test_admin_host_list_filters_and_detail(admin_client):
    """Filter by verification status and host type; paginated; detail shows documents and checklist."""
    agency = set_status(make_org(name="Agency"), VerificationStatus.UNDER_REVIEW)
    make_org(category="hotel", name="Hotel")
    HostAccount.objects.create(kind="individual", user=new_user())

    res = admin_client.get("/api/v1/admin/hosts")
    assert res.status_code == 200 and res.data["count"] == 3
    assert admin_client.get("/api/v1/admin/hosts", {"verification_status": "under_review"}).data["count"] == 1
    assert admin_client.get("/api/v1/admin/hosts", {"host_type": "hotel"}).data["results"][0]["host_type"] == "hotel"
    assert admin_client.get("/api/v1/admin/hosts", {"host_type": "individual"}).data["count"] == 1
    assert admin_client.get("/api/v1/admin/hosts", {"host_type": "castle"}).status_code == 400

    add_docs(agency, "commercial_register")
    detail = admin_client.get(host_url(agency)).data
    assert detail["organization"]["slug"] == "agency" and len(detail["documents"]) == 1
    checklist = {row["doc_type"]: row["status"] for row in detail["required_documents"]}
    assert checklist == {"commercial_register": "approved", "tax_card_nif": "missing", "tourism_licence": "missing"}


def test_br_pay_06_admin_commission_override(admin_client):
    """Set, then clear, the host's own rate; out of range is 400; each change is audited."""
    hotel = make_org(category="hotel", name="Hotel")
    url = host_url(hotel, "commission")
    res = admin_client.patch(url, {"commission_rate_override_bp": 950})
    assert res.status_code == 200 and res.data["commission_rate_bp"] == 950
    assert admin_client.patch(url, {"commission_rate_override_bp": 10001}).status_code == 400
    res = admin_client.patch(url, {"commission_rate_override_bp": None})
    assert res.data["commission_rate_override_bp"] is None and res.data["commission_rate_bp"] == 1800
    events = AuditEvent.objects.filter(action="HOST_COMMISSION_OVERRIDE").order_by("occurred_at", "id")
    assert [e.after["commission_rate_override_bp"] for e in events] == [950, None]
