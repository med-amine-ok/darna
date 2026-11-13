"""
The "active workspace" of a host request.

A host endpoint always acts for one host account. The client says which one
with the ``X-Host-Account`` header (or it was stored in the session by the
workspace switcher). The server never trusts that value: it checks on every
call that the user really owns the account or is an active member of its
organisation (BR-ORG-01, OWASP API1).

Usage in a view::

    ctx = get_host_context(request)            # 403 if the user is not a host
    ctx.require("listings.manage")             # 403 if the role may not do this
    listing.host_account == ctx.host_account   # scope every query with it
"""

import uuid
from dataclasses import dataclass, field

from rest_framework.permissions import BasePermission

from apps.core.errors import ForbiddenError

from .models import ALL_HOST_PERMISSIONS, HostAccount, Membership
from .selectors import host_accounts_for


@dataclass
class HostContext:
    """The host account a request acts for, and what the caller may do in it."""

    host_account: HostAccount
    membership: Membership | None = None
    permissions: set[str] = field(default_factory=set)

    @property
    def host_type(self) -> str:
        """``individual``, ``agency``, ``hotel`` or ``hostel``."""
        return self.host_account.host_type

    @property
    def role(self) -> str:
        """Team role of the caller, or ``solo`` for a person hosting alone."""
        return self.membership.role if self.membership else "solo"

    def can(self, permission: str) -> bool:
        """True when the caller's role includes ``permission``."""
        return permission in self.permissions

    def require(self, permission: str) -> None:
        """Raise 403 unless the caller's role includes ``permission`` (BR-ORG-05)."""
        if not self.can(permission):
            raise ForbiddenError("Your role does not allow this.", code="host_permission_denied")


def get_host_context(request) -> HostContext:
    """
    Resolve and check the active host account of a request.

    Order: ``X-Host-Account`` header, then the workspace stored in the
    session, then the user's first workspace. Raises ``ForbiddenError`` with
    code ``not_a_host`` (no workspace at all) or ``host_account_forbidden``
    (asked for a workspace the user does not belong to).
    The result is cached on the request.
    """
    cached = getattr(request, "_host_context", None)
    if cached is not None:
        return cached

    workspaces = host_accounts_for(request.user)
    if not workspaces:
        raise ForbiddenError("Become a host first.", code="not_a_host")

    wanted = request.headers.get("X-Host-Account") or getattr(request.auth, "active_host_account_id", None)
    chosen = None
    if wanted:
        try:
            wanted_id = uuid.UUID(str(wanted))
        except ValueError as exc:
            raise ForbiddenError("Unknown workspace.", code="host_account_forbidden") from exc
        chosen = next((pair for pair in workspaces if pair[0].id == wanted_id), None)
        if chosen is None:
            raise ForbiddenError("You do not belong to this workspace.", code="host_account_forbidden")
    else:
        chosen = workspaces[0]

    account, membership = chosen
    permissions = set(membership.permissions) if membership else set(ALL_HOST_PERMISSIONS)
    context = HostContext(host_account=account, membership=membership, permissions=permissions)
    request._host_context = context
    return context


class IsHost(BasePermission):
    """DRF permission: the caller is signed in and has at least one workspace."""

    message = "Become a host first."

    def has_permission(self, request, view) -> bool:
        """Resolve the host context; refuse when there is none."""
        if not (request.user and request.user.is_authenticated):
            return False
        get_host_context(request)  # raises ForbiddenError with a precise code
        return True
