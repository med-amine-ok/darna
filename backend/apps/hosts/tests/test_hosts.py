"""
Tests of becoming a host, workspaces, the organisation profile, the team and
invitations (BR-ORG-01 to BR-ORG-06), documents and hotel connections.
"""

from datetime import timedelta

import pytest
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.accounts.models import hash_secret
from apps.audit.models import AuditEvent
from apps.hosts.crypto import IS_REAL_ENCRYPTION, PLACEHOLDER_PREFIX
from apps.hosts.models import (
    HostAccount,
    HostDocument,
    Invitation,
    InvitationStatus,
    Membership,
    PropertyIntegration,
    VerificationStatus,
)
from conftest import client_for, make_user

from .helpers import add_member, approved, make_org, new_user, owner_of

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Becoming a host
# ---------------------------------------------------------------------------
def test_become_individual_host_needs_verified_phone():
    """No verified phone: 403. Then 201 with status applied, and a second try is 409."""
    unverified = make_user(email="u@x.dz", verified=False)
    res = client_for(unverified).post("/api/v1/host/accounts/individual")
    assert res.status_code == 403 and res.data["code"] == "phone_not_verified"

    person = new_user()
    client = client_for(person)
    res = client.post("/api/v1/host/accounts/individual")
    assert res.status_code == 201, res.data
    assert res.data["kind"] == "individual" and res.data["verification_status"] == "applied"
    assert res.data["role"] is None and "listings.manage" in res.data["permissions"]
    assert client.post("/api/v1/host/accounts/individual").data["code"] == "already_host"


def test_br_org_01_create_organization_with_owner_and_unique_slug():
    """Organisation, host account and owner membership are created together; slugs never clash."""
    person = new_user()
    client = client_for(person)
    res = client.post("/api/v1/organizations", {"business_category": "hotel", "display_name": "Hotel El Djazair"})
    assert res.status_code == 201, res.data
    assert res.data["host_type"] == "hotel" and res.data["role"] == "owner"
    assert res.data["organization_slug"] == "hotel-el-djazair"
    assert Membership.objects.get(user=person).role == "owner"

    again = client_for(new_user()).post("/api/v1/organizations", {"business_category": "agency", "display_name": "Hotel El Djazair"})
    assert again.data["organization_slug"] == "hotel-el-djazair-2"
    assert client.post("/api/v1/organizations", {"business_category": "castle", "display_name": "X"}).status_code == 400


# ---------------------------------------------------------------------------
# Workspaces
# ---------------------------------------------------------------------------
def test_workspace_list_and_switch():
    """A solo host who also works in an agency sees both and can switch; the choice is used without header."""
    person = new_user()
    HostAccount.objects.create(kind="individual", user=person)
    agency = make_org(name="Sahara Tours")
    add_member(agency, "manager", user=person)
    client = client_for(person)

    listing = client.get("/api/v1/me/workspaces").data
    assert [w["host_type"] for w in listing["results"]] == ["individual", "agency"]
    assert listing["results"][1]["role"] == "manager" and listing["active_host_account_id"] is None

    res = client.put("/api/v1/me/workspaces/active", {"host_account_id": str(agency.id)})
    assert res.status_code == 200 and res.data["is_active"] is True
    assert client.get("/api/v1/host/account").data["host_account_id"] == str(agency.id)
    assert client.get("/api/v1/me/workspaces").data["active_host_account_id"] == str(agency.id)


def test_br_org_01_switch_to_foreign_workspace_is_404():
    """A workspace the user does not hold is answered 404, so ids cannot be probed."""
    other = make_org(name="Not Mine")
    res = client_for(new_user()).put("/api/v1/me/workspaces/active", {"host_account_id": str(other.id)})
    assert res.status_code == 404


def test_br_org_01_x_host_account_of_someone_else_is_403():
    """Naming another organisation's host account in the header is refused."""
    mine = make_org(name="Mine")
    theirs = make_org(name="Theirs")
    client = client_for(owner_of(mine), host_account=theirs)
    res = client.get("/api/v1/host/organization")
    assert res.status_code == 403 and res.data["code"] == "host_account_forbidden"


def test_guest_without_workspace_gets_not_a_host(user_client):
    """A plain guest calling a host endpoint gets 403 ``not_a_host``."""
    res = user_client.get("/api/v1/host/account")
    assert res.status_code == 403 and res.data["code"] == "not_a_host"


def test_patch_host_account_approval_mode():
    """The owner changes the default approval mode; a guide may not."""
    agency = make_org()
    res = client_for(owner_of(agency), agency).patch("/api/v1/host/account", {"default_approval_mode": "instant"})
    assert res.status_code == 200 and res.data["default_approval_mode"] == "instant"
    assert res.data["required_documents"][0]["status"] == "missing"
    guide = add_member(agency, "guide")
    denied = client_for(guide.user, agency).patch("/api/v1/host/account", {"default_approval_mode": "request"})
    assert denied.status_code == 403


# ---------------------------------------------------------------------------
# Organisation profile (BR-ORG-02, BR-ORG-06)
# ---------------------------------------------------------------------------
def test_br_org_06_legal_field_change_sends_back_to_review():
    """Changing the NIF of an approved organisation moves it to under_review, with an audit row."""
    agency = approved(make_org(nif="000111222333444"))
    client = client_for(owner_of(agency), agency)

    assert client.patch("/api/v1/host/organization", {"description": "New text"}).status_code == 200
    agency.refresh_from_db()
    assert agency.verification_status == VerificationStatus.APPROVED  # not a legal field

    res = client.patch("/api/v1/host/organization", {"nif": "999888777666555"})
    assert res.status_code == 200 and res.data["verification_status"] == "under_review"
    agency.refresh_from_db()
    assert agency.verification_status == VerificationStatus.UNDER_REVIEW and agency.submitted_at
    event = AuditEvent.objects.get(action="ORGANIZATION_LEGAL_CHANGE")
    assert event.after == {"verification_status": "under_review", "fields": ["nif"]}


def test_br_org_02_business_category_cannot_change():
    """Sending a new business category is refused with 400."""
    agency = make_org()
    res = client_for(owner_of(agency), agency).patch("/api/v1/host/organization", {"business_category": "hotel"})
    assert res.status_code == 400
    agency.organization.refresh_from_db()
    assert agency.organization.business_category == "agency"


def test_solo_host_has_no_organization():
    """``/host/organization`` answers 404 ``not_an_organization`` for a solo host."""
    person = new_user()
    solo = HostAccount.objects.create(kind="individual", user=person)
    res = client_for(person, solo).get("/api/v1/host/organization")
    assert res.status_code == 404 and res.data["code"] == "not_an_organization"


def test_public_organization_hides_legal_and_contact_fields(api):
    """Only approved organisations are public, without legal numbers, email, phone or address."""
    agency = make_org(name="Atlas Voyages", nif="123456789012345", rc_number="16/00-1234567B21",
                      business_email="contact@atlas.dz", business_phone_e164="+213555000111",
                      address_line="12 rue Didouche Mourad", legal_name="SARL Atlas")
    assert api.get("/api/v1/organizations/atlas-voyages").status_code == 404  # not approved yet

    approved(agency)
    res = api.get("/api/v1/organizations/atlas-voyages")
    assert res.status_code == 200 and res.data["verified"] is True
    body = str(res.data)
    for secret in ("123456789012345", "16/00-1234567B21", "contact@atlas.dz", "+213555000111", "Didouche", "SARL"):
        assert secret not in body
    for field in ("nif", "nis", "rc_number", "legal_name", "tourism_licence_number", "business_email",
                  "business_phone_e164", "address_line"):
        assert field not in res.data


# ---------------------------------------------------------------------------
# Team (BR-ORG-04, BR-ORG-05)
# ---------------------------------------------------------------------------
def test_br_org_05_agent_cannot_manage_members():
    """An agent may list the team but not change roles, remove people or invite."""
    agency = make_org()
    agent = add_member(agency, "agent")
    manager = add_member(agency, "manager")
    client = client_for(agent.user, agency)
    assert client.get("/api/v1/host/organization/members").status_code == 200
    res = client.patch(f"/api/v1/host/organization/members/{manager.id}", {"role": "agent"})
    assert res.status_code == 403 and res.data["code"] == "host_permission_denied"
    assert client.delete(f"/api/v1/host/organization/members/{manager.id}").status_code == 403
    assert client.post("/api/v1/host/organization/invitations", {"email": "a@b.dz", "role": "agent"}).status_code == 403


def test_admin_member_changes_roles_and_removes_with_audit():
    """An org admin may change a role and remove a member; both are audited."""
    agency = make_org()
    admin = add_member(agency, "admin")
    agent = add_member(agency, "agent")
    client = client_for(admin.user, agency)
    res = client.patch(f"/api/v1/host/organization/members/{agent.id}", {"role": "manager"})
    assert res.status_code == 200 and res.data["role"] == "manager"
    assert client.delete(f"/api/v1/host/organization/members/{agent.id}").status_code == 204
    agent.refresh_from_db()
    assert agent.is_active is False and agent.removed_at
    assert {"MEMBER_ROLE_CHANGE", "MEMBER_REMOVE"} <= set(AuditEvent.objects.values_list("action", flat=True))
    # The removed person loses access to the workspace at once.
    assert client_for(agent.user, agency).get("/api/v1/host/account").status_code == 403


def test_br_org_04_owner_cannot_be_removed_or_demoted():
    """The owner is protected; nobody is made owner by a role change."""
    agency = make_org()
    owner_membership = agency.organization.memberships.get(role="owner")
    admin = add_member(agency, "admin")
    client = client_for(admin.user, agency)
    res = client.delete(f"/api/v1/host/organization/members/{owner_membership.id}")
    assert res.status_code == 403 and res.data["code"] == "owner_protected"
    assert client.patch(f"/api/v1/host/organization/members/{owner_membership.id}", {"role": "agent"}).status_code == 403
    assert client.patch(f"/api/v1/host/organization/members/{admin.id}", {"role": "owner"}).status_code == 400


def test_br_org_04_exactly_one_owner_in_database():
    """The database itself refuses a second active owner."""
    agency = make_org()
    with pytest.raises(IntegrityError), transaction.atomic():
        add_member(agency, "owner")


def test_br_org_04_transfer_ownership():
    """Only the owner transfers; the old owner becomes admin; still exactly one owner."""
    agency = make_org()
    owner = owner_of(agency)
    admin = add_member(agency, "admin")
    manager = add_member(agency, "manager")

    denied = client_for(admin.user, agency).post("/api/v1/host/organization/transfer-ownership", {"membership_id": str(manager.id)})
    assert denied.status_code == 403 and denied.data["code"] == "owner_only"

    res = client_for(owner, agency).post("/api/v1/host/organization/transfer-ownership", {"membership_id": str(manager.id)})
    assert res.status_code == 200 and res.data["role"] == "owner"
    roles = dict(Membership.objects.filter(organization=agency.organization, is_active=True).values_list("user", "role"))
    assert roles[owner.id] == "admin" and roles[manager.user_id] == "owner"
    assert list(roles.values()).count("owner") == 1
    assert AuditEvent.objects.filter(action="ORGANIZATION_OWNER_TRANSFER").count() == 1


# ---------------------------------------------------------------------------
# Invitations (BR-ORG-03)
# ---------------------------------------------------------------------------
def invite(account, **body):
    """Invite through the API as the owner; returns the response."""
    return client_for(owner_of(account), account).post("/api/v1/host/organization/invitations", body)


def test_br_org_03_invitation_accepted_once():
    """The invitee joins with the invited role; the same token then answers 409."""
    agency = make_org()
    invitee = new_user()
    res = invite(agency, phone=invitee.phone_e164, role="manager")
    assert res.status_code == 201, res.data
    token = res.data["token"]
    stored = Invitation.objects.get()
    assert stored.token_hash == hash_secret(token) and token not in str(stored.__dict__)
    assert stored.expires_at - timezone.now() > timedelta(days=6, hours=23)

    client = client_for(invitee)
    accepted = client.post("/api/v1/invitations/accept", {"token": token})
    assert accepted.status_code == 200 and accepted.data["role"] == "manager"
    assert Membership.objects.filter(user=invitee, organization=agency.organization, is_active=True).exists()
    again = client.post("/api/v1/me/invitations/accept", {"token": token})
    assert again.status_code == 409 and again.data["code"] == "invitation_used"
    # The list never shows the token again.
    listing = client_for(owner_of(agency), agency).get("/api/v1/host/organization/invitations").data["results"]
    assert listing[0]["status"] == "accepted" and "token" not in listing[0]


def test_br_org_03_invitation_for_someone_else_is_refused():
    """A signed-in user whose email and phone do not match gets 403."""
    agency = make_org()
    token = invite(agency, email="invited@example.dz", role="agent").data["token"]
    res = client_for(new_user()).post("/api/v1/invitations/accept", {"token": token})
    assert res.status_code == 403 and res.data["code"] == "invitation_contact_mismatch"
    # The right person (same email, any letter case) can still accept.
    invited = make_user(email="Invited@Example.dz")
    assert client_for(invited).post("/api/v1/invitations/accept", {"token": token}).status_code == 200


def test_br_org_03_unverified_phone_does_not_match():
    """A phone typed on a profile but never verified is not enough."""
    agency = make_org()
    person = make_user(email="p@x.dz", phone="+213661112233", verified=False)
    token = invite(agency, phone="+213661112233", role="agent").data["token"]
    assert client_for(person).post("/api/v1/invitations/accept", {"token": token}).status_code == 403


def test_br_org_03_expired_invitation():
    """After 7 days the invitation answers 422 and shows as expired."""
    agency = make_org()
    invitee = new_user()
    token = invite(agency, phone=invitee.phone_e164, role="agent").data["token"]
    Invitation.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
    res = client_for(invitee).post("/api/v1/invitations/accept", {"token": token})
    assert res.status_code == 422 and res.data["code"] == "invitation_expired"
    listing = client_for(owner_of(agency), agency).get("/api/v1/host/organization/invitations").data["results"]
    assert listing[0]["status"] == "expired"


def test_br_org_03_revoked_invitation_and_rules():
    """Revoked tokens stop working; owner role, both contacts and duplicates are refused."""
    agency = make_org()
    invitee = new_user()
    created = invite(agency, phone=invitee.phone_e164, role="agent").data
    assert invite(agency, phone=invitee.phone_e164, role="agent").data["code"] == "invitation_exists"
    assert invite(agency, email="x@x.dz", role="owner").status_code == 400
    assert invite(agency, email="x@x.dz", phone="+213661112299", role="agent").status_code == 400
    assert invite(agency, email=owner_of(agency).email, role="agent").data["code"] == "already_member"

    owner_client = client_for(owner_of(agency), agency)
    assert owner_client.delete(f"/api/v1/host/organization/invitations/{created['id']}").status_code == 204
    assert Invitation.objects.get(pk=created["id"]).status == InvitationStatus.REVOKED
    res = client_for(invitee).post("/api/v1/invitations/accept", {"token": created["token"]})
    assert res.status_code == 409 and res.data["code"] == "invitation_revoked"
    assert client_for(invitee).post("/api/v1/invitations/accept", {"token": "nope"}).status_code == 404


# ---------------------------------------------------------------------------
# Documents and submission
# ---------------------------------------------------------------------------
def test_documents_and_submit_for_review():
    """Add documents, withdraw a pending one, submit; an approved document cannot be withdrawn."""
    agency = make_org()
    client = client_for(owner_of(agency), agency)
    doc = client.post("/api/v1/host/documents", {"doc_type": "commercial_register", "file_url": "uploads/rc.pdf"})
    assert doc.status_code == 201 and doc.data["status"] == "pending"
    other = client.post("/api/v1/host/documents", {"doc_type": "tax_card_nif", "file_url": "uploads/nif.pdf"}).data
    assert client.delete(f"/api/v1/host/documents/{other['id']}").status_code == 204
    assert [d["id"] for d in client.get("/api/v1/host/documents").data["results"]] == [doc.data["id"]]

    HostDocument.objects.filter(pk=doc.data["id"]).update(status="approved")
    assert client.delete(f"/api/v1/host/documents/{doc.data['id']}").status_code == 409

    res = client.post("/api/v1/host/verification/submit")
    assert res.status_code == 200 and res.data["verification_status"] == "under_review" and res.data["submitted_at"]
    assert client.post("/api/v1/host/verification/submit").status_code == 409  # already under review


def test_documents_are_scoped_to_the_workspace():
    """A document of another host cannot be deleted (404)."""
    mine, theirs = make_org(name="A"), make_org(name="B")
    doc = HostDocument.objects.create(host_account=theirs, doc_type="other", file_url="x")
    res = client_for(owner_of(mine), mine).delete(f"/api/v1/host/documents/{doc.id}")
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# Hotel system connection (DEC-017)
# ---------------------------------------------------------------------------
def test_integrations_for_hotels_only_and_secret_never_returned():
    """Agencies are refused; a hotel's credentials are stored apart and never sent back."""
    agency = make_org()
    res = client_for(owner_of(agency), agency).get("/api/v1/host/integrations")
    assert res.status_code == 403 and res.data["code"] == "host_type_not_allowed"

    hotel = make_org(category="hotel", name="Hotel Cirta")
    client = client_for(owner_of(hotel), hotel)
    body = {"kind": "channel_manager", "system_name": "SiteMinder", "credentials": {"api_key": "s3cr3t-key"}}
    created = client.post("/api/v1/host/integrations", body)
    assert created.status_code == 201 and created.data["status"] == "pending" and created.data["has_credentials"]
    assert "s3cr3t-key" not in str(created.data) and "s3cr3t-key" not in str(client.get("/api/v1/host/integrations").data)
    stored = bytes(PropertyIntegration.objects.get().credentials_encrypted)
    assert stored.startswith(PLACEHOLDER_PREFIX) and IS_REAL_ENCRYPTION is False  # placeholder, see crypto.py

    agent = add_member(hotel, "agent")
    assert client_for(agent.user, hotel).get("/api/v1/host/integrations").status_code == 403
    assert client.delete(f"/api/v1/host/integrations/{created.data['id']}").status_code == 204
    assert not PropertyIntegration.objects.exists()
