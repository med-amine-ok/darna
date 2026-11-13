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
import secrets
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.accounts.models import hash_secret
from apps.audit.services import record
from apps.core.errors import ConflictError, DomainError, ForbiddenError, NotFoundError

from .context import HostContext
from .crypto import encrypt_secret
from .models import (
    REQUIRED_DOCUMENTS,
    DocumentStatus,
    DocumentType,
    HostAccount,
    HostAccountKind,
    HostDocument,
    Invitation,
    InvitationStatus,
    Membership,
    MembershipRole,
    Organization,
    PropertyIntegration,
    VerificationStatus,
)
from .selectors import host_accounts_for

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
    """Return the trimmed reason, or raise 400 ``reason_required`` when shorter than 10 characters (BR-HST-04)."""
    reason = (reason or "").strip()
    if len(reason) < MIN_REASON_LENGTH:
        raise DomainError(
            f"Give a reason of at least {MIN_REASON_LENGTH} characters.",
            code="reason_required",
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
    if not user.phone_verified:
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

    Credentials go only through :func:`apps.hosts.crypto.encrypt_secret`
    (a documented placeholder, see that module) and never come back in a response.
    """
    org = _require_integration_rights(ctx)
    return PropertyIntegration.objects.create(
        organization=org, kind=kind, system_name=system_name, base_url=base_url or "",
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

    Rejecting needs a reason of at least 10 characters; it is shown to the host.
    """
    reason = "" if approve else require_reason(reason)
    document = HostDocument.objects.select_for_update().alive().filter(pk=document_id).first()
    if document is None:
        raise NotFoundError("Unknown document.", code="document_not_found")
    before = document.status
    document.status = DocumentStatus.APPROVED if approve else DocumentStatus.REJECTED
    document.rejection_reason = reason
    document.reviewed_by = admin
    document.reviewed_at = timezone.now()
    document.save(update_fields=["status", "rejection_reason", "reviewed_by", "reviewed_at"])
    record(actor=admin, action="DOCUMENT_APPROVE" if approve else "DOCUMENT_REJECT", obj=document, ip=ip,
           note=reason, before={"status": before}, after={"status": document.status})
    return document


@transaction.atomic
def admin_set_commission(admin, host_account_id, rate_bp: int | None, *, ip: str | None = None) -> HostAccount:
    """
    Set (0 to 10,000 bp) or clear (``None``) the host's own commission rate (BR-PAY-06), audited.

    ``None`` means the host pays the default rate of its host type again.
    """
    if rate_bp is not None and not 0 <= rate_bp <= 10_000:
        raise DomainError("The rate must be between 0 and 10000 basis points.", code="invalid_rate")
    account = HostAccount.objects.select_for_update().filter(pk=host_account_id, deleted_at__isnull=True).first()
    if account is None:
        raise NotFoundError("Unknown host account.", code="host_account_not_found")
    before = account.commission_rate_override_bp
    account.commission_rate_override_bp = rate_bp
    account.save(update_fields=["commission_rate_override_bp", "updated_at"])
    record(actor=admin, action="HOST_COMMISSION_OVERRIDE", obj=account, ip=ip,
           before={"commission_rate_override_bp": before}, after={"commission_rate_override_bp": rate_bp})
    return account
