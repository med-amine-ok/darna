"""Permission classes shared by the API."""

from django.conf import settings
from rest_framework.permissions import BasePermission

from .models import SessionScope, SessionToken, StaffStatus


def _staff_session_ok(request) -> bool:
    """
    True when the request uses a complete staff session (STF-05, BR-ACC-04).

    Sessions opened by ``/admin/auth/login`` are ``staff`` sessions and only
    count once the second factor is checked. Website sessions of a staff user
    (from ``/auth/login``) are refused on the admin API.
    """
    session = request.auth
    if not isinstance(session, SessionToken):
        return False
    return session.scope == SessionScope.STAFF and staff_session_complete(session)


def staff_session_complete(session: SessionToken) -> bool:
    """
    The staff session passed every sign-in step in force: the password, plus
    the authenticator code when ``settings.STAFF_MFA_REQUIRED`` is on (BR-ACC-04).
    """
    if session.mfa_pending:
        return False
    return session.mfa_verified_at is not None or not getattr(settings, "STAFF_MFA_REQUIRED", True)


class IsAdmin(BasePermission):
    """
    Allows only active BLADUS admins with a complete staff session (DEC-016, BR-ACC-04, STF-05).

    Used on every ``/api/v1/admin/*`` endpoint, so a guest or host session can
    never reach admin functions (OWASP API5). A view may also name the staff
    permission it needs (BR-STF-01, deny by default), either one code for
    every method (``staff_permission = "users.view"``) or one per method
    (``staff_permissions = {"GET": "users.view", "DELETE": "users.delete"}``);
    permissions are read from the database on every request.
    """

    message = "Admin access required."

    def has_permission(self, request, view) -> bool:
        """True when the caller is an active admin on a verified staff session holding the view's permission."""
        user = request.user
        if not (user and user.is_authenticated and user.is_admin and _staff_session_ok(request)):
            return False
        required = (getattr(view, "staff_permissions", None) or {}).get(request.method) or getattr(
            view, "staff_permission", None
        )
        if not required:
            return True
        from .selectors import staff_permission_codes  # local import: selectors import models only

        return required in staff_permission_codes(user)


class IsStaffSession(BasePermission):
    """
    Allows a staff member on a ``staff`` session, even before the second factor (adminEnrolTotp).

    Only for the enrolment endpoint: staff must enrol before any other admin
    endpoint works (BR-ACC-04). Deactivated staff are refused.
    """

    message = "Staff session required."

    def has_permission(self, request, view) -> bool:
        """True for a staff user (active or invited) on a staff-scope session."""
        user, session = request.user, request.auth
        if not (user and user.is_authenticated and user.is_staff and isinstance(session, SessionToken)):
            return False
        profile = getattr(user, "staff_profile", None)
        return session.scope == SessionScope.STAFF and profile is not None and profile.status != StaffStatus.DEACTIVATED


class IsPhoneVerified(BasePermission):
    """Allows only users whose phone was confirmed (needed before booking, DEC-012)."""

    message = "Verify your phone number first."

    def has_permission(self, request, view) -> bool:
        """True when the caller has a verified phone."""
        user = request.user
        return bool(user and user.is_authenticated and user.phone_verified)
