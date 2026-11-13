"""Read-only queries of the hosts app (no writes here)."""

from django.db.models import Case, F, QuerySet, When

from .models import (
    HostAccount,
    HostDocument,
    Invitation,
    Membership,
    MembershipRole,
    Organization,
    VerificationStatus,
)


def user_is_host(user) -> bool:
    """True when the user has a solo host account or an active membership."""
    if not user or not user.is_authenticated:
        return False
    return (
        HostAccount.objects.alive().filter(user=user).exists()
        or Membership.objects.filter(user=user, is_active=True).exists()
    )


def host_accounts_for(user) -> list[tuple[HostAccount, Membership | None]]:
    """
    Every workspace the user can act for (workspace switcher, ORG-02).

    Returns ``(host_account, membership)`` pairs; ``membership`` is ``None``
    for the user's own solo host account.
    """
    result: list[tuple[HostAccount, Membership | None]] = []
    solo = HostAccount.objects.alive().filter(user=user).first()
    if solo:
        result.append((solo, None))
    memberships = (
        Membership.objects.filter(user=user, is_active=True, organization__deleted_at__isnull=True)
        .select_related("organization", "organization__host_account")
        .order_by("joined_at")
    )
    for membership in memberships:
        account = getattr(membership.organization, "host_account", None)
        if account and account.deleted_at is None:
            result.append((account, membership))
    return result


def public_organization(slug: str) -> Organization | None:
    """
    An organisation visitors may see, by slug, or ``None``.

    Only organisations that are not deleted and whose host account is
    approved (BR-SRC-01: unapproved or suspended hosts are hidden).
    """
    return (
        Organization.objects.alive()
        .select_related("host_account", "commune", "commune__wilaya")
        .filter(slug=slug, host_account__verification_status=VerificationStatus.APPROVED,
                host_account__deleted_at__isnull=True)
        .first()
    )


def members_of(org: Organization) -> QuerySet[Membership]:
    """Active team members of an organisation, owner first then by join date."""
    return (
        Membership.objects.filter(organization=org, is_active=True)
        .select_related("user")
        .order_by(Case(When(role=MembershipRole.OWNER, then=0), default=1), "joined_at")
    )


def invitations_of(org: Organization) -> QuerySet[Invitation]:
    """Every invitation of an organisation, newest first."""
    return Invitation.objects.filter(organization=org).order_by("-created_at")


def documents_of(account: HostAccount) -> QuerySet[HostDocument]:
    """Verification documents of a host account that were not withdrawn, newest first."""
    return HostDocument.objects.alive().filter(host_account=account).order_by("-created_at")


def admin_host_accounts(*, verification_status: str = "", host_type: str = "") -> QuerySet[HostAccount]:
    """
    Host accounts for the admin list, newest submissions first.

    ``host_type`` is ``individual``, ``agency``, ``hotel`` or ``hostel``.
    """
    accounts = HostAccount.objects.alive().select_related("user", "organization")
    if verification_status:
        accounts = accounts.filter(verification_status=verification_status)
    if host_type == "individual":
        accounts = accounts.filter(kind="individual")
    elif host_type:
        accounts = accounts.filter(organization__business_category=host_type)
    return accounts.order_by(F("submitted_at").desc(nulls_last=True), "-created_at")


def admin_host_account(host_account_id) -> HostAccount | None:
    """One host account (not deleted) for the admin detail page, or ``None``."""
    return HostAccount.objects.alive().select_related("user", "organization").filter(pk=host_account_id).first()
