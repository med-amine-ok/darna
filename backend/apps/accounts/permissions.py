"""Permission classes shared by the API."""

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """
    Allows only active BLADUS admins (DEC-016: one staff role).

    Used on every ``/api/v1/admin/*`` endpoint, so a guest or host session can
    never reach admin functions (OWASP API5).
    """

    message = "Admin access required."

    def has_permission(self, request, view) -> bool:
        """True when the caller is signed in and is an active admin."""
        user = request.user
        return bool(user and user.is_authenticated and user.is_admin)


class IsPhoneVerified(BasePermission):
    """Allows only users whose phone was confirmed (needed before booking, DEC-012)."""

    message = "Verify your phone number first."

    def has_permission(self, request, view) -> bool:
        """True when the caller has a verified phone."""
        user = request.user
        return bool(user and user.is_authenticated and user.phone_verified)
