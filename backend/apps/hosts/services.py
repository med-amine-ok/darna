"""
Host services: every write of the hosts app goes through a function here.

Covers becoming a host, the workspace switcher, the organisation and its
team (members, invitations, ownership), verification documents, the hotel
system connection and the admin review of hosts.

Rules: BR-ORG-01 to BR-ORG-06, BR-HST-03, BR-HST-04, BR-HST-06, DEC-014,
DEC-017. Team changes and admin actions write an audit row in the same
transaction (BR-STF-02).
"""

import json
import logging
import re
import secrets
from datetime import datetime, timedelta

from django.core import signing
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.dispatch import Signal
from django.utils import timezone
from django.utils.text import slugify

from apps.accounts.models import hash_secret
from apps.accounts.sms import get_sms_backend
from apps.audit.services import record
from apps.config import selectors as config_selectors
from apps.config.services import approval_field, flow_fields, require_host_type
from apps.core.errors import ConflictError, DomainError, ForbiddenError, NotFoundError
from apps.core.netguard import validate_public_url
from apps.core.timeutils import business_today

from .context import HostContext
from .crypto import encrypt_secret
from .integrations import run_adapter
from .models import (
    REQUIRED_DOCUMENTS,
    DocumentStatus,
    DocumentType,
    HostAccount,
    HostAccountKind,
    HostDocument,
    IntegrationSyncLog,
    IntegrationSyncStatus,
    Invitation,
    InvitationStatus,
    Membership,
    MembershipRole,
    OnboardingDraft,
    OnboardingDraftStatus,
    Organization,
    PayoutAccount,
    PropertyIntegration,
    VerificationStatus,
)
from .selectors import host_accounts_for

logger = logging.getLogger(__name__)

# Sent after a host account is soft-deleted (by its owner or an admin), inside
# the transaction, with ``host_account`` and ``actor``. Higher apps (catalog,
# trips) connect a receiver to archive the offers (BR-LST-03); hosts cannot
# import them (layer rule, 07-architecture section 2).
host_account_deleted = Signal()

# BR-ORG-03: an invitation is valid 7 days.
INVITATION_TTL = timedelta(days=7)
# BR-HST-04: reasons for reject, request changes, suspend and ban.
MIN_REASON_LENGTH = 10
# DEC-017: only these host types may connect their own hotel system.
INTEGRATION_HOST_TYPES = {"hotel", "hostel"}
# Table 3a lists "National ID or passport": an approved passport counts as the ID.
DOCUMENT_EQUIVALENTS: dict[str, set[str]] = {DocumentType.NATIONAL_ID: {DocumentType.PASSPORT}}


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------
def require_reason(reason: str | None) -> str:
    """Return the trimmed reason, or raise 422 ``reason_required`` when shorter than 10 characters (BR-HST-04)."""
    reason = (reason or "").strip()
    if len(reason) < MIN_REASON_LENGTH:
        raise DomainError(
            f"Give a reason of at least {MIN_REASON_LENGTH} characters.",
            code="reason_required",
            status_code=422,
            errors={"reason": [f"At least {MIN_REASON_LENGTH} characters."]},
        )
    return reason


def unique_org_slug(display_name: str) -> str:
    """
    Build a URL slug from the name that no other organisation uses.

    ``"Hotel El Djazair"`` gives ``hotel-el-djazair``, then ``hotel-el-djazair-2``
    and so on. Soft-deleted organisations keep their slug, so they are counted too.
    """
    base = slugify(display_name)[:120] or "organisation"
    slug, n = base, 1
    while Organization.objects.filter(slug=slug).exists():
        n += 1
        slug = f"{base}-{n}"
    return slug


def require_organization(ctx: HostContext) -> Organization:
    """The organisation of the active workspace, or 404 ``not_an_organization`` for a solo host."""
    org = ctx.host_account.organization
    if org is None:
        raise NotFoundError("The active workspace is not an organisation.", code="not_an_organization")
    return org


def _move_status(account: HostAccount, new_status: str) -> str:
    """
    Change the verification status after checking the state machine (BR-HST-04).

    Returns the old status. Raises 409 ``invalid_transition`` for a move that
    table 3b does not allow (for example approved to applied).
    """
    if not account.can_move_to(new_status):
        raise ConflictError(
            f"A host cannot go from {account.verification_status} to {new_status}.", code="invalid_transition"
        )
    old = account.verification_status
    account.verification_status = new_status
    return old


# ---------------------------------------------------------------------------
# Becoming a host (BR-ORG-01, BR-ORG-02)
# ---------------------------------------------------------------------------
@transaction.atomic
def become_individual_host(user) -> HostAccount:
    """
    Create the solo host account of ``user`` (status ``applied``).

    A verified phone is required first (guests reach hosts by phone,
    DEC-012). A person has at most one solo host account (the column is
    one-to-one); a second call answers 409 ``already_host``.
    """
    if not user.phone_ok:
        raise ForbiddenError("Verify your phone number first.", code="phone_not_verified")
    if HostAccount.objects.filter(user=user).exists():
        raise ConflictError("You already have a host account.", code="already_host")
    try:
        account = HostAccount.objects.create(kind=HostAccountKind.INDIVIDUAL, user=user)
    except IntegrityError as exc:  # two clicks at the same instant
        raise ConflictError("You already have a host account.", code="already_host") from exc
    record(actor=user, action="HOST_ACCOUNT_CREATE", obj=account, after={"kind": "individual"})
    return account


@transaction.atomic
def create_organization(user, *, business_category: str, display_name: str, **fields) -> HostAccount:
    """
    Create an agency, hotel or hostel in one transaction (BR-ORG-01).

    Writes the ``Organization`` (unique slug from the name), its
    ``HostAccount`` (kind organisation, status applied) and the creator's
    ``owner`` membership (BR-ORG-04). ``business_category`` can never change
    afterwards (BR-ORG-02). Returns the new host account.
    """
    org = Organization.objects.create(
        business_category=business_category,
        display_name=display_name,
        slug=unique_org_slug(display_name),
        created_by=user,
        **fields,
    )
    account = HostAccount.objects.create(kind=HostAccountKind.ORGANIZATION, organization=org)
    Membership.objects.create(organization=org, user=user, role=MembershipRole.OWNER)
    record(
        actor=user, action="ORGANIZATION_CREATE", obj=org,
        after={"business_category": business_category, "host_account_id": str(account.id)},
    )
    return account


# ---------------------------------------------------------------------------
# Workspace switcher (ORG-02, BR-ORG-01)
# ---------------------------------------------------------------------------
def switch_workspace(user, session, host_account_id) -> tuple[HostAccount, Membership | None]:
    """
    Remember the chosen workspace on the caller's session token.

    The user must own the host account or be an active member of its
    organisation; otherwise 404 (never 403, so ids cannot be probed).
    Returns the ``(host_account, membership)`` pair of the chosen workspace.
    The choice is checked again on every host request (``get_host_context``).
    """
    pair = next((p for p in host_accounts_for(user) if p[0].id == host_account_id), None)
    if pair is None:
        raise NotFoundError("Unknown workspace.", code="host_account_not_found")
    session.active_host_account_id = pair[0].id
    session.save(update_fields=["active_host_account_id"])
    return pair


# ---------------------------------------------------------------------------
# Active host account and organisation profile
# ---------------------------------------------------------------------------
def update_host_account(ctx: HostContext, *, default_approval_mode: str) -> HostAccount:
    """Change how new bookings are confirmed by default (instant or request). Needs ``org.edit``."""
    ctx.require("org.edit")
    account = ctx.host_account
    account.default_approval_mode = default_approval_mode
    account.save(update_fields=["default_approval_mode", "updated_at"])
    return account


@transaction.atomic
def update_organization(ctx: HostContext, actor, changes: dict, *, ip: str | None = None) -> Organization:
    """
    Edit the organisation profile (needs ``org.edit``).

    ``business_category`` is refused (BR-ORG-02). When a legal field
    (``Organization.LEGAL_FIELDS``) really changes, an approved host account
    goes back to ``under_review`` and the change is audited (BR-ORG-06);
    listings stay published meanwhile.
    """
    ctx.require("org.edit")
    if "business_category" in changes:
        raise DomainError("The business category cannot change.", code="business_category_locked")
    org = Organization.objects.select_for_update().get(pk=require_organization(ctx).pk)

    changed = [name for name, value in changes.items() if getattr(org, name) != value]
    for name in changed:
        setattr(org, name, changes[name])
    if changed:
        org.save(update_fields=[*changed, "updated_at"])

    legal_changed = [name for name in changed if name in Organization.LEGAL_FIELDS]
    if legal_changed:
        account = HostAccount.objects.select_for_update().get(pk=ctx.host_account.pk)
        before = account.verification_status
        if account.verification_status == VerificationStatus.APPROVED:
            _move_status(account, VerificationStatus.UNDER_REVIEW)
            account.submitted_at = timezone.now()
            account.save(update_fields=["verification_status", "submitted_at", "updated_at"])
        ctx.host_account.verification_status = account.verification_status
        # Only the names of the fields go to the log, not the numbers themselves.
        record(
            actor=actor, action="ORGANIZATION_LEGAL_CHANGE", obj=org, ip=ip,
            before={"verification_status": before},
            after={"verification_status": account.verification_status, "fields": legal_changed},
        )
    return org


# ---------------------------------------------------------------------------
# Team members (BR-ORG-04, BR-ORG-05)
# ---------------------------------------------------------------------------
def _get_member(org: Organization, membership_id) -> Membership:
    """An active membership of this organisation, read for update, or 404."""
    member = (
        Membership.objects.select_for_update()
        .filter(pk=membership_id, organization=org, is_active=True)
        .first()
    )
    if member is None:
        raise NotFoundError("Unknown team member.", code="member_not_found")
    return member


@transaction.atomic
def change_member_role(ctx: HostContext, actor, membership_id, role: str, *, ip: str | None = None) -> Membership:
    """
    Give a team member another role (needs ``members.manage``).

    Nobody becomes owner this way and the owner cannot be demoted: both go
    through :func:`transfer_ownership` (BR-ORG-04).
    """
    ctx.require("members.manage")
    org = require_organization(ctx)
    if role == MembershipRole.OWNER:
        raise DomainError("Use the ownership transfer to choose a new owner.", code="use_ownership_transfer")
    member = _get_member(org, membership_id)
    if member.role == MembershipRole.OWNER:
        raise ForbiddenError("The owner keeps the owner role until they transfer it.", code="owner_protected")
    before = member.role
    member.role = role
    member.save(update_fields=["role"])
    record(actor=actor, action="MEMBER_ROLE_CHANGE", obj=member, ip=ip, before={"role": before}, after={"role": role})
    return member


@transaction.atomic
def remove_member(ctx: HostContext, actor, membership_id, *, ip: str | None = None) -> None:
    """
    Remove a person from the team (needs ``members.manage``).

    The membership is deactivated, not deleted, so history keeps who did
    what. The owner can never be removed (BR-ORG-04).
    """
    ctx.require("members.manage")
    member = _get_member(require_organization(ctx), membership_id)
    if member.role == MembershipRole.OWNER:
        raise ForbiddenError("The owner cannot be removed.", code="owner_protected")
    member.is_active = False
    member.removed_at = timezone.now()
    member.save(update_fields=["is_active", "removed_at"])
    record(actor=actor, action="MEMBER_REMOVE", obj=member, ip=ip, before={"role": member.role, "is_active": True},
           after={"is_active": False})


@transaction.atomic
def transfer_ownership(ctx: HostContext, actor, membership_id, *, ip: str | None = None) -> Membership:
    """
    Make another active member the owner; the old owner becomes ``admin`` (BR-ORG-04).

    Only the current owner may do this. The old owner is demoted before the
    new one is promoted, so the database rule "exactly one active owner"
    holds at every step. Returns the new owner's membership.
    """
    org = require_organization(ctx)
    if ctx.role != MembershipRole.OWNER:
        raise ForbiddenError("Only the owner can transfer ownership.", code="owner_only")
    current = _get_member(org, ctx.membership.pk)
    target = _get_member(org, membership_id)
    if target.pk == current.pk:
        raise DomainError("You are already the owner.", code="already_owner")
    current.role = MembershipRole.ADMIN
    current.save(update_fields=["role"])
    previous_role = target.role
    target.role = MembershipRole.OWNER
    target.save(update_fields=["role"])
    record(
        actor=actor, action="ORGANIZATION_OWNER_TRANSFER", obj=org, ip=ip,
        before={"owner_membership_id": str(current.pk), "new_owner_role": previous_role},
        after={"owner_membership_id": str(target.pk), "old_owner_role": MembershipRole.ADMIN},
    )
    ctx.membership.role = MembershipRole.ADMIN  # keep the cached context truthful for this request
    return target


# ---------------------------------------------------------------------------
# Invitations (BR-ORG-03)
# ---------------------------------------------------------------------------
@transaction.atomic
def create_invitation(ctx: HostContext, actor, *, role: str, email: str = "", phone: str = "",
                      ip: str | None = None) -> tuple[Invitation, str]:
    """
    Invite one email or phone to join the organisation with one role (needs ``members.manage``).

    Returns ``(invitation, raw_token)``. Only the SHA-256 of the token is
    stored; the raw token is returned once (email and SMS sending are not
    built yet, so the caller passes it on). Never for the owner role, valid
    7 days, one pending invitation per contact.
    """
    ctx.require("members.manage")
    org = require_organization(ctx)
    email = (email or "").strip().lower()
    phone = (phone or "").strip()
    if role == MembershipRole.OWNER:
        raise DomainError("Nobody can be invited as owner.", code="invitation_owner_forbidden")
    if bool(email) == bool(phone):
        raise DomainError("Give an email or a phone number, not both.", code="email_or_phone_required")

    pending = Invitation.objects.filter(organization=org, status=InvitationStatus.PENDING, expires_at__gt=timezone.now())
    if pending.filter(email=email, phone_e164=phone).exists():
        raise ConflictError("This person already has a pending invitation.", code="invitation_exists")
    members = Membership.objects.filter(organization=org, is_active=True)
    if (email and members.filter(user__email__iexact=email).exists()) or (
        phone and members.filter(user__phone_e164=phone).exists()
    ):
        raise ConflictError("This person is already in the team.", code="already_member")

    raw = secrets.token_urlsafe(32)
    invitation = Invitation.objects.create(
        organization=org, email=email, phone_e164=phone, role=role, token_hash=hash_secret(raw),
        invited_by=actor, expires_at=timezone.now() + INVITATION_TTL,
    )
    record(actor=actor, action="INVITATION_CREATE", obj=invitation, ip=ip, after={"role": role})
    return invitation, raw


@transaction.atomic
def revoke_invitation(ctx: HostContext, actor, invitation_id, *, ip: str | None = None) -> Invitation:
    """Cancel a pending invitation of this organisation (needs ``members.manage``)."""
    ctx.require("members.manage")
    org = require_organization(ctx)
    invitation = Invitation.objects.select_for_update().filter(pk=invitation_id, organization=org).first()
    if invitation is None:
        raise NotFoundError("Unknown invitation.", code="invitation_not_found")
    if invitation.status != InvitationStatus.PENDING:
        raise ConflictError("Only a pending invitation can be revoked.", code="invitation_not_pending")
    invitation.status = InvitationStatus.REVOKED
    invitation.save(update_fields=["status"])
    record(actor=actor, action="INVITATION_REVOKE", obj=invitation, ip=ip,
           before={"status": "pending"}, after={"status": "revoked"})
    return invitation


def _contact_matches(user, invitation: Invitation) -> bool:
    """
    True when the signed-in user is the person invited (BR-ORG-03).

    A phone must be verified to match, because anyone can type a phone
    number on their profile. An email matches the account's sign-in email;
    the secret token itself only reached that mailbox.
    """
    if invitation.phone_e164:
        return bool(user.phone_e164 == invitation.phone_e164 and user.phone_verified)
    return bool(user.email and user.email.lower() == invitation.email.lower())


@transaction.atomic
def accept_invitation(user, token: str, *, ip: str | None = None) -> Membership:
    """
    Join the organisation with the role of the invitation (BR-ORG-03).

    The invitation is used once: 409 ``invitation_used`` the second time,
    409 ``invitation_revoked``, 422 ``invitation_expired`` after 7 days,
    403 ``invitation_contact_mismatch`` for somebody else, 404 for an
    unknown token. Returns the new membership.
    """
    invitation = (
        Invitation.objects.select_for_update().select_related("organization")
        .filter(token_hash=hash_secret(token or "")).first()
    )
    if invitation is None:
        raise NotFoundError("Unknown invitation.", code="invitation_not_found")
    if invitation.status == InvitationStatus.ACCEPTED:
        raise ConflictError("This invitation was already used.", code="invitation_used")
    if invitation.status == InvitationStatus.REVOKED:
        raise ConflictError("This invitation was cancelled.", code="invitation_revoked")
    # The status is not rewritten to "expired" here: the error rolls the
    # transaction back anyway, and readers compute expiry from the date.
    if invitation.status == InvitationStatus.EXPIRED or invitation.expires_at <= timezone.now():
        raise DomainError("This invitation has expired.", code="invitation_expired", status_code=422)
    if invitation.organization.deleted_at is not None:
        raise NotFoundError("Unknown invitation.", code="invitation_not_found")
    if not _contact_matches(user, invitation):
        raise ForbiddenError("This invitation is for somebody else.", code="invitation_contact_mismatch")
    if Membership.objects.filter(organization=invitation.organization, user=user, is_active=True).exists():
        raise ConflictError("You are already in this team.", code="already_member")

    membership = Membership.objects.create(organization=invitation.organization, user=user, role=invitation.role)
    invitation.status = InvitationStatus.ACCEPTED
    invitation.accepted_by = user
    invitation.accepted_at = timezone.now()
    invitation.save(update_fields=["status", "accepted_by", "accepted_at"])
    record(actor=user, action="MEMBER_JOIN", obj=membership, ip=ip,
           after={"role": membership.role, "invitation_id": str(invitation.pk)})
    return membership


# ---------------------------------------------------------------------------
# Verification documents and submission (BR-HST-03, BR-HST-04)
# ---------------------------------------------------------------------------
def add_document(ctx: HostContext, *, doc_type: str, file_url: str) -> HostDocument:
    """Attach a verification document to the active host account (needs ``org.edit``). It starts ``pending``."""
    ctx.require("org.edit")
    return HostDocument.objects.create(host_account=ctx.host_account, doc_type=doc_type, file_url=file_url)


def delete_document(ctx: HostContext, document_id) -> None:
    """
    Withdraw a document (soft delete, needs ``org.edit``).

    Only ``pending`` or ``rejected`` documents: an approved one is the proof
    the approval relied on and stays.
    """
    ctx.require("org.edit")
    document = HostDocument.objects.alive().filter(pk=document_id, host_account=ctx.host_account).first()
    if document is None:
        raise NotFoundError("Unknown document.", code="document_not_found")
    if document.status == DocumentStatus.APPROVED:
        raise ConflictError("An approved document cannot be deleted.", code="document_approved")
    document.soft_delete()


@transaction.atomic
def submit_for_verification(ctx: HostContext, actor) -> HostAccount:
    """
    Send the host account to the BLADUS team for review (needs ``org.edit``).

    Allowed from ``applied`` or ``changes_requested`` only (table 3b);
    records ``submitted_at``.
    """
    ctx.require("org.edit")
    account = HostAccount.objects.select_for_update().get(pk=ctx.host_account.pk)
    if account.verification_status not in (VerificationStatus.APPLIED, VerificationStatus.CHANGES_REQUESTED):
        raise ConflictError("This host account cannot be submitted now.", code="invalid_transition")
    before = _move_status(account, VerificationStatus.UNDER_REVIEW)
    account.submitted_at = timezone.now()
    account.save(update_fields=["verification_status", "submitted_at", "updated_at"])
    record(actor=actor, action="HOST_SUBMIT", obj=account, before={"verification_status": before},
           after={"verification_status": account.verification_status})
    ctx.host_account.verification_status = account.verification_status
    ctx.host_account.submitted_at = account.submitted_at
    return account


def missing_required_documents(account: HostAccount) -> list[str]:
    """
    Required document types (table 3a) that have no approved document yet (BR-HST-03).

    An approved passport counts as the national ID.
    """
    approved = set(
        HostDocument.objects.alive()
        .filter(host_account=account, status=DocumentStatus.APPROVED)
        .values_list("doc_type", flat=True)
    )
    missing = []
    for doc_type in sorted(REQUIRED_DOCUMENTS.get(account.host_type, set())):
        accepted = {doc_type, *DOCUMENT_EQUIVALENTS.get(doc_type, set())}
        if not accepted & approved:
            missing.append(str(doc_type))
    return missing


# ---------------------------------------------------------------------------
# Hotel system connection (DEC-017, BR-HST-06)
# ---------------------------------------------------------------------------
def _require_integration_rights(ctx: HostContext) -> Organization:
    """Hotels and hostels only, with ``listings.manage``; returns the organisation."""
    if ctx.host_type not in INTEGRATION_HOST_TYPES:
        raise ForbiddenError("Only hotels and hostels can connect their own system.", code="host_type_not_allowed")
    ctx.require("listings.manage")
    return require_organization(ctx)


def list_integrations(ctx: HostContext):
    """Connections of the active hotel or hostel, newest first."""
    org = _require_integration_rights(ctx)
    return PropertyIntegration.objects.filter(organization=org).order_by("-created_at")


def create_integration(ctx: HostContext, actor, *, kind: str, system_name: str, base_url: str = "",
                       credentials: dict | None = None) -> PropertyIntegration:
    """
    Declare a connection to the hotel's own system; it stays ``pending`` (no sync yet).

    ``base_url`` (system address or iCal link) must be a public https URL
    (R9 SSRF rule, :func:`apps.core.netguard.validate_public_url`, error
    ``unsafe_url``); it is checked again by the adapters before each fetch.
    Credentials go only through :func:`apps.hosts.crypto.encrypt_secret`
    (Fernet under ``INTEGRATION_KEYS``) and never come back in a response.
    """
    org = _require_integration_rights(ctx)
    base_url = (base_url or "").strip()
    if base_url:
        validate_public_url(base_url)
    return PropertyIntegration.objects.create(
        organization=org, kind=kind, system_name=system_name, base_url=base_url,
        credentials_encrypted=encrypt_secret(json.dumps(credentials, sort_keys=True)) if credentials else None,
        created_by=actor,
    )


def delete_integration(ctx: HostContext, integration_id) -> None:
    """Remove a connection of the active hotel or hostel (its stored credentials go with it)."""
    org = _require_integration_rights(ctx)
    deleted, _ = PropertyIntegration.objects.filter(pk=integration_id, organization=org).delete()
    if not deleted:
        raise NotFoundError("Unknown connection.", code="integration_not_found")


# ---------------------------------------------------------------------------
# Admin review of hosts (BR-HST-03, BR-HST-04)
# ---------------------------------------------------------------------------
# action name -> (new status, statuses it may start from or None for "any allowed by
# table 3b", reason required, audit action)
ADMIN_HOST_ACTIONS: dict[str, tuple[str, set[str] | None, bool, str]] = {
    "approve": (VerificationStatus.APPROVED, {VerificationStatus.UNDER_REVIEW}, False, "HOST_APPROVE"),
    "reject": (VerificationStatus.REJECTED, None, True, "HOST_REJECT"),
    "request-changes": (VerificationStatus.CHANGES_REQUESTED, None, True, "HOST_REQUEST_CHANGES"),
    "suspend": (VerificationStatus.SUSPENDED, None, True, "HOST_SUSPEND"),
    "unsuspend": (VerificationStatus.APPROVED, {VerificationStatus.SUSPENDED}, False, "HOST_UNSUSPEND"),
    "ban": (VerificationStatus.BANNED, None, True, "HOST_BAN"),
}


@transaction.atomic
def admin_host_action(admin, host_account_id, action: str, *, reason: str = "", ip: str | None = None) -> HostAccount:
    """
    Run one admin decision on a host account (BR-HST-04) and audit it.

    ``action`` is a key of :data:`ADMIN_HOST_ACTIONS`. Reject, request
    changes, suspend and ban need a reason of at least 10 characters.
    Approve needs every required document of the host type approved
    (BR-HST-03), otherwise 409 ``documents_missing``.
    """
    new_status, allowed_from, needs_reason, audit_action = ADMIN_HOST_ACTIONS[action]
    reason = require_reason(reason) if needs_reason else (reason or "").strip()
    account = HostAccount.objects.select_for_update().filter(pk=host_account_id, deleted_at__isnull=True).first()
    if account is None:
        raise NotFoundError("Unknown host account.", code="host_account_not_found")
    if allowed_from is not None and account.verification_status not in allowed_from:
        raise ConflictError(
            f"Cannot {action} a host that is {account.verification_status}.", code="invalid_transition"
        )
    if action == "approve":
        missing = missing_required_documents(account)
        if missing:
            raise ConflictError(
                "Every required document must be approved first.", code="documents_missing",
                errors={"missing_documents": missing},
            )
    before = _move_status(account, new_status)
    update = ["verification_status", "updated_at"]
    if action == "approve":
        account.approved_at = timezone.now()
        update.append("approved_at")
    account.save(update_fields=update)
    record(actor=admin, action=audit_action, obj=account, ip=ip, note=reason,
           before={"verification_status": before}, after={"verification_status": new_status})
    return account


@transaction.atomic
def admin_review_document(admin, document_id, *, approve: bool, reason: str = "", ip: str | None = None) -> HostDocument:
    """
    Approve or reject one verification document (BR-HST-03: each is reviewed on its own).

    Rejecting needs a reason of at least 10 characters (422
    ``reason_required``); it is shown to the host. Only a ``pending``
    document can be reviewed: 409 ``document_already_reviewed`` otherwise
    (the host uploads a new document instead).
    """
    reason = "" if approve else require_reason(reason)
    document = HostDocument.objects.select_for_update().alive().filter(pk=document_id).first()
    if document is None:
        raise NotFoundError("Unknown document.", code="document_not_found")
    if document.status != DocumentStatus.PENDING:
        raise ConflictError("This document was already reviewed.", code="document_already_reviewed")
    before = document.status
    document.status = DocumentStatus.APPROVED if approve else DocumentStatus.REJECTED
    document.rejection_reason = reason
    document.reviewed_by = admin
    document.reviewed_at = timezone.now()
    document.save(update_fields=["status", "rejection_reason", "reviewed_by", "reviewed_at"])
    record(actor=admin, action="DOCUMENT_APPROVE" if approve else "DOCUMENT_REJECT", obj=document, ip=ip,
           note=reason, before={"status": before}, after={"status": document.status})
    return document


def _admin_host_for_update(host_account_id) -> HostAccount:
    """A host account that is not deleted, locked for this transaction, or 404 ``host_account_not_found``."""
    account = HostAccount.objects.select_for_update().filter(pk=host_account_id, deleted_at__isnull=True).first()
    if account is None:
        raise NotFoundError("Unknown host account.", code="host_account_not_found")
    return account


@transaction.atomic
def admin_set_commission(admin, host_account_id, rate_bp: int | None, *, reason: str = "",
                         ip: str | None = None) -> HostAccount:
    """
    Set (0 to 10,000 bp, with a reason) or clear (``None``) the host's own commission rate (BR-PAY-06).

    ``PUT /admin/hosts/{id}/commission-override`` sets it and needs a reason
    of at least 10 characters (422 ``reason_required``); ``DELETE`` clears
    it, so the host pays the default rate of its host type again. New
    bookings only: a booking keeps the rate copied on it. Audited (BR-STF-02).
    """
    if rate_bp is not None:
        if not 0 <= rate_bp <= 10_000:
            raise DomainError("The rate must be between 0 and 10000 basis points.", code="invalid_rate",
                              status_code=422)
        reason = require_reason(reason)
    account = _admin_host_for_update(host_account_id)
    before = account.commission_rate_override_bp
    account.commission_rate_override_bp = rate_bp
    account.save(update_fields=["commission_rate_override_bp", "updated_at"])
    record(actor=admin, action="HOST_COMMISSION_OVERRIDE", obj=account, ip=ip, note=(reason or "").strip(),
           before={"commission_rate_override_bp": before}, after={"commission_rate_override_bp": rate_bp})
    return account


@transaction.atomic
def admin_set_credit_limit(admin, host_account_id, *, amount_minor: int, currency: str, reason: str,
                           ip: str | None = None) -> HostAccount:
    """
    Set the credit floor of one host: how far below zero its deposit may go (BR-PAY-10).

    ``amount_minor`` is positive (the floor is ``-amount_minor``); only DZD
    exists (422 ``currency_not_supported``). Needs a reason of at least 10
    characters (422 ``reason_required``). Audited (BR-STF-02).
    """
    reason = require_reason(reason)
    if currency != "DZD":
        raise DomainError("Only DZD is supported.", code="currency_not_supported", status_code=422)
    if amount_minor < 1:
        raise DomainError("The credit limit must be a positive amount.", code="validation_failed", status_code=422)
    account = _admin_host_for_update(host_account_id)
    before = account.credit_limit_override_minor
    account.credit_limit_override_minor = amount_minor
    account.save(update_fields=["credit_limit_override_minor", "updated_at"])
    record(actor=admin, action="HOST_CREDIT_LIMIT_OVERRIDE", obj=account, ip=ip, note=reason,
           before={"credit_limit_override_minor": before}, after={"credit_limit_override_minor": amount_minor})
    return account


# ---------------------------------------------------------------------------
# Deleting and restoring host accounts (BR-HST-04, BR-ORG-04, BR-LST-03)
# ---------------------------------------------------------------------------
def has_future_bookings(account: HostAccount) -> bool:
    """
    True while the host still has a pending or confirmed booking that is not over.

    Reads the bookings through the reverse relation ``host_account.bookings``
    (no import of the higher ``bookings`` app, 07-architecture section 2).
    """
    related = getattr(account, "bookings", None)
    if related is None:
        return False
    return related.filter(status__in=["pending", "confirmed"], check_out__gte=business_today()).exists()


def _soft_delete_account(account: HostAccount, actor) -> None:
    """Soft-delete a host account and its organisation, then send ``host_account_deleted``."""
    now = timezone.now()
    account.deleted_at = now
    account.save(update_fields=["deleted_at", "updated_at"])
    if account.organization_id:
        Organization.objects.filter(pk=account.organization_id).update(deleted_at=now, updated_at=now)
    host_account_deleted.send(sender=HostAccount, host_account=account, actor=actor)


@transaction.atomic
def admin_delete_host(admin, host_account_id, *, ip: str | None = None) -> HostAccount:
    """
    Soft-delete a host account (and its organisation) as an admin (BR-HST-04).

    Its offers leave search at once (catalog and trips only show hosts that
    are not deleted). 409 ``has_future_bookings`` while a pending or
    confirmed booking is not over. Audited (BR-STF-02).
    """
    account = _admin_host_for_update(host_account_id)
    if has_future_bookings(account):
        raise ConflictError("This host still has upcoming bookings.", code="has_future_bookings")
    _soft_delete_account(account, admin)
    record(actor=admin, action="HOST_DELETE", obj=account, ip=ip,
           before={"deleted_at": None}, after={"deleted_at": account.deleted_at.isoformat()})
    return account


@transaction.atomic
def admin_restore_host(admin, host_account_id, *, ip: str | None = None) -> HostAccount:
    """
    Undo the soft delete of a host account and of its organisation (BR-HST-04).

    The verification status stays as it was. 404 for an unknown id, 409
    ``host_not_deleted`` when the account is not deleted. Audited (BR-STF-02).
    """
    account = HostAccount.objects.select_for_update().filter(pk=host_account_id).first()
    if account is None:
        raise NotFoundError("Unknown host account.", code="host_account_not_found")
    if account.deleted_at is None:
        raise ConflictError("This host account is not deleted.", code="host_not_deleted")
    before = account.deleted_at.isoformat()
    account.deleted_at = None
    account.save(update_fields=["deleted_at", "updated_at"])
    if account.organization_id:
        Organization.objects.filter(pk=account.organization_id).update(deleted_at=None, updated_at=timezone.now())
    record(actor=admin, action="HOST_RESTORE", obj=account, ip=ip,
           before={"deleted_at": before}, after={"deleted_at": None})
    return account


@transaction.atomic
def delete_organization(ctx: HostContext, actor, *, confirm_name: str, ip: str | None = None) -> None:
    """
    The owner deletes the active organisation (soft delete, BR-ORG-04).

    Needs ``org.delete`` (owner only). ``confirm_name`` must equal the
    display name exactly (400 ``confirm_name_mismatch``). 409
    ``has_future_bookings`` while a pending or confirmed booking is not
    over. The host account goes with it; its offers leave search at once and
    ``host_account_deleted`` lets catalog and trips archive them (BR-LST-03).
    Audited (BR-STF-02).
    """
    ctx.require("org.delete")
    org = require_organization(ctx)
    if (confirm_name or "") != org.display_name:
        raise DomainError("Type the exact name of the organisation to confirm.", code="confirm_name_mismatch",
                          errors={"confirm_name": ["Must equal the display name exactly."]})
    account = HostAccount.objects.select_for_update().get(pk=ctx.host_account.pk)
    if has_future_bookings(account):
        raise ConflictError("Upcoming bookings must end or be cancelled first.", code="has_future_bookings")
    _soft_delete_account(account, actor)
    record(actor=actor, action="ORGANIZATION_DELETE", obj=org, ip=ip,
           before={"deleted_at": None}, after={"host_account_id": str(account.pk), "deleted": True})


# ---------------------------------------------------------------------------
# KYC document viewing (BR-MED-02)
# ---------------------------------------------------------------------------
DOCUMENT_URL_TTL = timedelta(minutes=5)  # BR-MED-02: a signed document URL works 5 minutes
DOCUMENT_URL_SALT = "hosts.document-view"


def admin_document_view_token(admin, document_id, *, ip: str | None = None) -> tuple[HostDocument, str, datetime]:
    """
    Give an admin a 5-minute token to open one KYC document and audit the view (BR-MED-02, BR-STF-02).

    Returns ``(document, token, expires_at)``; the view turns the token into
    the signed URL. Writes ``KYC_DOCUMENT_VIEW`` every time.
    """
    document = HostDocument.objects.alive().filter(pk=document_id).first()
    if document is None:
        raise NotFoundError("Unknown document.", code="document_not_found")
    token = signing.dumps({"d": str(document.pk)}, salt=DOCUMENT_URL_SALT)
    record(actor=admin, action="KYC_DOCUMENT_VIEW", obj=document, ip=ip,
           after={"doc_type": document.doc_type, "host_account_id": str(document.host_account_id)})
    return document, token, timezone.now() + DOCUMENT_URL_TTL


def document_for_token(document_id, token: str) -> HostDocument:
    """
    The document a signed URL points at, or 404 ``link_expired`` (BR-MED-02).

    The token must be younger than 5 minutes and made for this document.
    """
    try:
        payload = signing.loads(token or "", salt=DOCUMENT_URL_SALT, max_age=DOCUMENT_URL_TTL.total_seconds())
    except signing.BadSignature as exc:  # SignatureExpired is a BadSignature
        raise NotFoundError("This link is invalid or has expired.", code="link_expired") from exc
    document = HostDocument.objects.alive().filter(pk=document_id).first()
    if document is None or payload.get("d") != str(document.pk):
        raise NotFoundError("This link is invalid or has expired.", code="link_expired")
    return document


# ---------------------------------------------------------------------------
# Hotel system sync (DEC-017, BR-HST-06)
# ---------------------------------------------------------------------------
def _integration_of(ctx: HostContext, integration_id) -> PropertyIntegration:
    """A connection of the active hotel or hostel, or 404 ``integration_not_found``."""
    org = _require_integration_rights(ctx)
    integration = PropertyIntegration.objects.filter(pk=integration_id, organization=org).first()
    if integration is None:
        raise NotFoundError("Unknown connection.", code="integration_not_found")
    return integration


def sync_integration(ctx: HostContext, actor, integration_id) -> IntegrationSyncLog:
    """
    Run one sync of a hotel system connection now (BR-HST-06) and log it.

    The adapter of the connection kind (``apps.hosts.integrations``) does
    the import. The address is checked again before any fetch (BR-SYS-06).
    A failed run changes no data: the run is logged ``failed`` and the
    connection is flagged ``error`` with the message (BR-HST-06). A
    connection with no adapter yet fails the same way.
    """
    integration = _integration_of(ctx, integration_id)
    run = IntegrationSyncLog.objects.create(
        integration=integration, status=IntegrationSyncStatus.FAILED, requested_by=actor
    )
    try:
        if integration.base_url:
            validate_public_url(integration.base_url)
        result = run_adapter(integration)
    except Exception as exc:  # noqa: BLE001  any adapter failure is logged, never raised (BR-HST-06)
        logger.warning("Sync of integration %s failed: %s", integration.pk, exc)
        result = {"status": IntegrationSyncStatus.FAILED, "error": str(exc)[:2000] or exc.__class__.__name__}
    now = timezone.now()
    run.status = result.get("status", IntegrationSyncStatus.OK)
    run.rooms_changed = int(result.get("rooms_changed", 0))
    run.nights_changed = int(result.get("nights_changed", 0))
    run.services_changed = int(result.get("services_changed", 0))
    run.error = result.get("error") or ""
    run.finished_at = now
    run.save()
    if run.status == IntegrationSyncStatus.FAILED:
        integration.status, integration.last_error = "error", run.error
        integration.save(update_fields=["status", "last_error"])
    else:
        integration.status, integration.last_error, integration.last_synced_at = "active", run.error, now
        integration.save(update_fields=["status", "last_error", "last_synced_at"])
    return run


def list_sync_runs(ctx: HostContext, integration_id, *, limit: int = 50):
    """The last ``limit`` sync runs of one connection, newest first (BR-HST-06)."""
    integration = _integration_of(ctx, integration_id)
    return IntegrationSyncLog.objects.filter(integration=integration).order_by("-started_at")[:limit]


# ---------------------------------------------------------------------------
# Payout and refund accounts (BR-PAY-09, BR-ACC-04)
# ---------------------------------------------------------------------------
PAYOUT_HOLD = timedelta(hours=72)  # BR-PAY-09: payouts wait 72 hours after any change
MFA_WINDOW = timedelta(minutes=5)  # BR-ACC-04: second factor confirmed in the last 5 minutes
ACCOUNT_NUMBER_RE = re.compile(r"^\d{10,34}$")


def require_recent_mfa(session) -> None:
    """Refuse with 403 ``mfa_required`` unless the session confirmed a second factor in the last 5 minutes (BR-ACC-04)."""
    verified_at = getattr(session, "mfa_verified_at", None)
    if verified_at is None or timezone.now() - verified_at > MFA_WINDOW:
        raise ForbiddenError("Confirm your second factor first.", code="mfa_required")


def _payout_contacts(account: HostAccount):
    """The person told about payout account changes: the solo host, or the organisation's owner (BR-PAY-09)."""
    if account.user_id:
        return account.user
    owner = account.organization.memberships.filter(role=MembershipRole.OWNER, is_active=True).select_related("user").first()
    return owner.user if owner else None


def _notify_payout_change(account: HostAccount, text: str) -> None:
    """
    After the commit, email and text the host's existing contacts about a payout change (BR-PAY-09).

    Uses the configured email and SMS backends (console in development).
    A sending failure is logged and never undoes the change.
    """
    person = _payout_contacts(account)
    if person is None:
        return
    email, phone, phone_ok = person.email, person.phone_e164, bool(person.phone_verified)

    def send() -> None:
        """Send the email and the SMS; log failures."""
        try:
            if email:
                send_mail("BLADUS: payout details changed", text, None, [email], fail_silently=False)
            if phone and phone_ok:
                get_sms_backend().send(phone, text)
        except Exception:  # noqa: BLE001  notification must not break the request
            logger.exception("Payout change notification failed for host account %s", account.pk)

    transaction.on_commit(send)


def list_payout_accounts(ctx: HostContext):
    """Payout and refund accounts of the active host (needs ``payout_details.edit``), default first."""
    ctx.require("payout_details.edit")
    return PayoutAccount.objects.alive().filter(host_account=ctx.host_account).order_by("-is_default", "-created_at")


@transaction.atomic
def add_payout_account(ctx: HostContext, actor, session, *, kind: str, holder_name: str, number: str,
                       is_default: bool = False, ip: str | None = None) -> PayoutAccount:
    """
    Add a CCP (RIP), bank (RIB) or BaridiMob account (BR-PAY-09, BR-ACC-04).

    Needs ``payout_details.edit`` and a second factor confirmed in the last
    5 minutes. The number (digits only, spaces allowed) is encrypted with
    :func:`apps.hosts.crypto.encrypt_secret`; only its last 4 digits are
    kept in clear. Payouts to it wait 72 hours (``hold_until``). The first
    account is the default. The host's contacts are told; audited.
    """
    ctx.require("payout_details.edit")
    require_recent_mfa(session)
    digits = re.sub(r"[\s-]", "", number or "")
    if not ACCOUNT_NUMBER_RE.match(digits):
        raise DomainError("The account number must have 10 to 34 digits.", code="invalid_account_number",
                          status_code=422, errors={"number": ["10 to 34 digits."]})
    account = HostAccount.objects.select_for_update().get(pk=ctx.host_account.pk)
    existing = PayoutAccount.objects.alive().filter(host_account=account)
    make_default = is_default or not existing.exists()
    if make_default:
        existing.filter(is_default=True).update(is_default=False)
    payout = PayoutAccount.objects.create(
        host_account=account, kind=kind, holder_name=holder_name.strip(), number_encrypted=encrypt_secret(digits),
        number_last4=digits[-4:], is_default=make_default, hold_until=timezone.now() + PAYOUT_HOLD,
    )
    record(actor=actor, action="PAYOUT_ACCOUNT_ADD", obj=payout, ip=ip,
           after={"kind": kind, "number_last4": payout.number_last4, "is_default": make_default,
                  "host_account_id": str(account.pk)})
    _notify_payout_change(account, (
        f"A {payout.get_kind_display()} account ending in {payout.number_last4} was added to "
        f"{account.display_name} on BLADUS. Payouts are on hold for 72 hours. If this was not you, contact BLADUS."
    ))
    return payout


@transaction.atomic
def remove_payout_account(ctx: HostContext, actor, session, payout_account_id, *, ip: str | None = None) -> None:
    """
    Remove one payout account (soft delete, BR-PAY-09, BR-ACC-04).

    Same checks as adding one. When it was the default, the newest remaining
    account becomes the default and is held 72 hours, because the place money
    goes to changed. The host's contacts are told; audited.
    """
    ctx.require("payout_details.edit")
    require_recent_mfa(session)
    HostAccount.objects.select_for_update().get(pk=ctx.host_account.pk)
    payout = PayoutAccount.objects.alive().filter(pk=payout_account_id, host_account=ctx.host_account).first()
    if payout is None:
        raise NotFoundError("Unknown payout account.", code="payout_account_not_found")
    payout.soft_delete()
    promoted = None
    if payout.is_default:
        payout.is_default = False
        payout.save(update_fields=["is_default"])
        promoted = PayoutAccount.objects.alive().filter(host_account=ctx.host_account).order_by("-created_at").first()
        if promoted:
            promoted.is_default = True
            promoted.hold_until = timezone.now() + PAYOUT_HOLD
            promoted.save(update_fields=["is_default", "hold_until"])
    record(actor=actor, action="PAYOUT_ACCOUNT_REMOVE", obj=payout, ip=ip,
           before={"kind": payout.kind, "number_last4": payout.number_last4},
           after={"deleted": True, "new_default_id": str(promoted.pk) if promoted else None})
    _notify_payout_change(ctx.host_account, (
        f"The account ending in {payout.number_last4} was removed from {ctx.host_account.display_name} on BLADUS. "
        "If this was not you, contact BLADUS."
    ))


# ---------------------------------------------------------------------------
# Onboarding drafts and submission (HST-01, HST-02, BR-HST-01, BR-HST-02)
# ---------------------------------------------------------------------------
# Answers of the seeded flows that fill organisation columns (field id -> column).
ORGANIZATION_ANSWER_FIELDS: dict[str, str] = {
    "businessName": "display_name", "hotelName": "display_name", "hostelName": "display_name",
    "regNumber": "rc_number", "hotelRegNumber": "rc_number", "hostelRegNumber": "rc_number",
    "hotelTaxId": "nif",
    "businessEmail": "business_email",
    "businessPhone": "business_phone_e164",
    "headquarters": "address_line", "hotelAddress": "address_line", "hostelAddress": "address_line",
    "hotelStarRating": "star_rating",
    "checkInTime": "check_in_time", "checkOutTime": "check_out_time",
}
# Answers kept in ``Organization.policies`` (hostel rules).
ORGANIZATION_POLICY_FIELDS: dict[str, str] = {"curfewPolicy": "curfew", "agePolicy": "age"}


def _empty(value) -> bool:
    """True for an answer that counts as not given (missing, blank text, empty list)."""
    return value is None or (isinstance(value, str) and not value.strip()) or value == [] or value == {}


def _unprocessable(code: str, message: str, errors: dict | None = None) -> DomainError:
    """A 422 refusal of onboarding answers with a stable code (BR-HST-02)."""
    return DomainError(message, code=code, status_code=422, errors=errors)


def validate_answers(steps: list[dict], current_step: str, answers: dict) -> None:
    """
    Check draft answers against the flow version the draft started from (BR-HST-02).

    Unknown field ids: 422 ``unknown_field``. ``current_step`` must be a
    step of the flow; a ``select`` answer must be one of its options, a
    ``multi_select`` answer a list of them, a ``number`` a number, a
    ``toggle`` a boolean (422 ``validation_failed``). Empty answers are
    allowed while the draft is in progress.
    """
    fields = flow_fields(steps)
    unknown = sorted(set(answers) - set(fields))
    if unknown:
        raise _unprocessable("unknown_field", "Some answers are not questions of this flow version.",
                             {field_id: ["Unknown field."] for field_id in unknown})
    if current_step not in {step["id"] for step in steps}:
        raise _unprocessable("validation_failed", "Unknown step.", {"current_step": ["Not a step of this flow."]})
    errors: dict[str, list[str]] = {}
    for field_id, value in answers.items():
        if _empty(value):
            continue
        field = fields[field_id]
        options = {str(option.get("value")) for option in field.get("options") or []}
        kind = field.get("type")
        if kind == "select" and options and str(value) not in options:
            errors[field_id] = ["Not one of the choices."]
        elif kind == "multi_select" and (not isinstance(value, list) or (options and not {str(v) for v in value} <= options)):
            errors[field_id] = ["A list of the choices."]
        elif kind == "number" and (isinstance(value, bool) or not isinstance(value, (int, float))):
            errors[field_id] = ["A number."]
        elif kind == "toggle" and not isinstance(value, bool):
            errors[field_id] = ["true or false."]
    if errors:
        raise _unprocessable("validation_failed", "Some answers are not valid.", errors)


def list_onboarding_drafts(user):
    """The caller's drafts that were not abandoned, newest first (HST-02)."""
    return (
        OnboardingDraft.objects.filter(user=user).exclude(status=OnboardingDraftStatus.ABANDONED)
        .select_related("flow_version").order_by("-updated_at")
    )


def get_onboarding_draft(user, host_type: str) -> OnboardingDraft:
    """
    The caller's draft for one host type: the one in progress, else the last submitted one.

    404 ``draft_not_found`` when there is none.
    """
    require_host_type(host_type)
    drafts = OnboardingDraft.objects.filter(user=user, host_type=host_type).select_related("flow_version")
    draft = (
        drafts.filter(status=OnboardingDraftStatus.IN_PROGRESS).first()
        or drafts.filter(status=OnboardingDraftStatus.SUBMITTED).order_by("-updated_at").first()
    )
    if draft is None:
        raise NotFoundError("No draft for this host type.", code="draft_not_found")
    return draft


@transaction.atomic
def save_onboarding_draft(user, host_type: str, *, current_step: str, answers: dict) -> OnboardingDraft:
    """
    Create or replace the caller's draft for one host type (HST-02, BR-HST-02).

    The first save starts from the published flow version and keeps it; the
    answers are always checked against that version (:func:`validate_answers`).
    409 ``draft_submitted`` when the person already finished the individual
    onboarding (one solo host account per person). 404
    ``flow_not_published`` when the host type has no published flow.
    """
    require_host_type(host_type)
    draft = (
        OnboardingDraft.objects.select_for_update().select_related("flow_version")
        .filter(user=user, host_type=host_type, status=OnboardingDraftStatus.IN_PROGRESS).first()
    )
    if draft is None:
        if host_type == "individual" and HostAccount.objects.filter(user=user).exists():
            raise ConflictError("You already finished this onboarding.", code="draft_submitted")
        flow = config_selectors.published_flow(host_type)
        if flow is None:
            raise NotFoundError("No published flow for this host type.", code="flow_not_published")
        draft = OnboardingDraft(user=user, host_type=host_type, flow_version=flow)
    validate_answers(draft.flow_version.steps, current_step, answers)
    draft.current_step = current_step
    draft.answers = answers
    try:
        with transaction.atomic():
            draft.save()
    except IntegrityError as exc:  # two first saves at the same instant
        raise ConflictError("Your draft was saved from another window; reload it.", code="draft_conflict") from exc
    return draft


@transaction.atomic
def abandon_onboarding_draft(user, host_type: str) -> None:
    """Mark the caller's draft in progress as abandoned (HST-02); 404 ``draft_not_found`` when there is none."""
    require_host_type(host_type)
    updated = OnboardingDraft.objects.filter(
        user=user, host_type=host_type, status=OnboardingDraftStatus.IN_PROGRESS
    ).update(status=OnboardingDraftStatus.ABANDONED, updated_at=timezone.now())
    if not updated:
        raise NotFoundError("No draft in progress for this host type.", code="draft_not_found")


def _organization_fields(answers: dict) -> dict:
    """
    Organisation columns from the answers of an agency, hotel or hostel flow.

    Validated with the same serializer as ``PATCH /host/organization``, so
    a bad email or phone answers 422 ``validation_failed`` with the field ids.
    """
    from .serializers import OrganizationWriteSerializer  # serializers import config; local import keeps services light

    raw: dict = {}
    for field_id, column in ORGANIZATION_ANSWER_FIELDS.items():
        if not _empty(answers.get(field_id)):
            raw[column] = answers[field_id]
    policies = {key: answers[field_id] for field_id, key in ORGANIZATION_POLICY_FIELDS.items()
                if not _empty(answers.get(field_id))}
    if policies:
        raw["policies"] = policies
    data = OrganizationWriteSerializer(data=raw, partial=True)
    if not data.is_valid():
        by_column = {column: field_id for field_id, column in ORGANIZATION_ANSWER_FIELDS.items() if field_id in answers}
        raise _unprocessable("validation_failed", "Some answers are not valid.",
                             {by_column.get(key, key): value for key, value in data.errors.items()})
    fields = dict(data.validated_data)
    if not fields.get("display_name"):
        raise _unprocessable("onboarding_incomplete", "The business name is required.",
                             {"display_name": ["Required."]})
    return fields


@transaction.atomic
def submit_onboarding(user, host_type: str, *, ip: str | None = None) -> tuple[HostAccount, Membership | None, OnboardingDraft]:
    """
    Finish onboarding: create the host account from the draft (HST-01, BR-HST-01, BR-HST-02).

    Every required question of the draft's flow version must be answered,
    including the booking approval mode (422 ``onboarding_incomplete``).
    Individual: the solo host account (verified phone needed, 409
    ``already_host`` for a second one). Agency, hotel, hostel: organisation,
    host account and owner membership in one transaction (BR-ORG-01); the
    category is the host type and never changes (BR-ORG-02). Verification
    starts at ``applied``. The draft becomes ``submitted``. Returns
    ``(host_account, membership or None, draft)``.
    """
    require_host_type(host_type)
    draft = (
        OnboardingDraft.objects.select_for_update().select_related("flow_version")
        .filter(user=user, host_type=host_type, status=OnboardingDraftStatus.IN_PROGRESS).first()
    )
    if draft is None:
        raise NotFoundError("No draft in progress for this host type.", code="draft_not_found")
    steps = draft.flow_version.steps
    validate_answers(steps, draft.current_step, draft.answers)
    approval = approval_field(steps)
    missing = {
        field_id: ["Required."] for field_id, field in flow_fields(steps).items()
        if (field.get("required") or (approval and field_id == approval["id"])) and _empty(draft.answers.get(field_id))
    }
    if approval is None:
        missing["approval_mode"] = ["This flow has no approval-mode question."]
    if missing:
        raise _unprocessable("onboarding_incomplete", "Answer every required question first.", missing)
    approval_mode = str(draft.answers[approval["id"]])

    membership = None
    if host_type == "individual":
        account = become_individual_host(user)
    else:
        account = create_organization(user, business_category=host_type, **_organization_fields(draft.answers))
        membership = account.organization.memberships.get(user=user, is_active=True)
    account.default_approval_mode = approval_mode
    account.save(update_fields=["default_approval_mode", "updated_at"])

    draft.status = OnboardingDraftStatus.SUBMITTED
    draft.host_account = account
    draft.save(update_fields=["status", "host_account", "updated_at"])
    record(actor=user, action="ONBOARDING_SUBMIT", obj=draft, ip=ip,
           after={"host_type": host_type, "flow_version": draft.flow_version.version,
                  "host_account_id": str(account.pk)})
    return account, membership, draft
