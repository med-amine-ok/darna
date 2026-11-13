"""Small builders shared by the hosts tests (organisations, team members, approved hosts)."""

from apps.hosts import services
from apps.hosts.models import HostAccount, Membership, VerificationStatus
from conftest import make_user

_counter = {"n": 0}


def new_user(**extra):
    """A user with a unique email and a verified phone."""
    _counter["n"] += 1
    return make_user(email=f"person{_counter['n']}@example.dz", **extra)


def make_org(owner=None, category: str = "agency", name: str = "Atlas Voyages", **fields) -> HostAccount:
    """Create an organisation through the service; returns its host account (owner = ``owner``)."""
    owner = owner or new_user()
    return services.create_organization(owner, business_category=category, display_name=name, **fields)


def add_member(account: HostAccount, role: str, user=None) -> Membership:
    """Put a (new) user in the organisation of ``account`` with ``role``."""
    return Membership.objects.create(organization=account.organization, user=user or new_user(), role=role)


def owner_of(account: HostAccount):
    """The user who owns the organisation of ``account``."""
    return account.organization.memberships.get(role="owner", is_active=True).user


def set_status(account: HostAccount, status: str) -> HostAccount:
    """Force a verification status (test setup only; the API enforces the state machine)."""
    HostAccount.objects.filter(pk=account.pk).update(verification_status=status)
    account.refresh_from_db()
    return account


def approved(account: HostAccount) -> HostAccount:
    """Shortcut: mark the host account approved."""
    return set_status(account, VerificationStatus.APPROVED)
