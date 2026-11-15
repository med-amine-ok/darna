"""
API authentication with opaque session tokens.

The Next.js servers keep the token in an httpOnly cookie and send it as
``Authorization: Bearer <token>`` (BFF pattern, 06-api-design.md). The token
is looked up by its hash; revoked or expired sessions are refused at once,
staff sessions also after 30 minutes without a request (BR-ACC-03), and a
session still waiting for its second factor only works on views that set
``allow_mfa_pending = True`` (BR-ACC-04).
"""

from datetime import timedelta

from django.utils import timezone
from rest_framework import authentication, exceptions

from .models import SessionToken, hash_secret


class SessionTokenAuthentication(authentication.BaseAuthentication):
    """DRF authentication class: ``Authorization: Bearer <session token>``."""

    keyword = "Bearer"

    def authenticate(self, request):
        """
        Return ``(user, session)`` for a valid token, ``None`` when no token
        was sent (anonymous request), and raise 401 for a bad token.
        """
        header = authentication.get_authorization_header(request).decode("latin-1")
        if not header:
            return None
        parts = header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            return None

        session = (
            SessionToken.objects.select_related("user", "user__staff_profile")
            .filter(token_hash=hash_secret(parts[1]))
            .first()
        )
        if session is None or not session.is_valid or session.is_idle:
            raise exceptions.AuthenticationFailed("Session expired. Sign in again.")
        if not session.user.is_active:
            raise exceptions.AuthenticationFailed("This account is not active.")
        if session.mfa_pending and not self._view_allows_pending(request):
            # BR-ACC-04: after the password step only the second-factor endpoints work.
            raise exceptions.AuthenticationFailed("Finish signing in with your second factor.")

        # Touch "last used" at most once a minute to avoid a write per request.
        now = timezone.now()
        if now - session.last_used_at > timedelta(minutes=1):
            SessionToken.objects.filter(pk=session.pk).update(last_used_at=now)
        return session.user, session

    @staticmethod
    def _view_allows_pending(request) -> bool:
        """True when the called view accepts a session still waiting for its second factor (TOTP enrolment)."""
        view = (getattr(request, "parser_context", None) or {}).get("view")
        return bool(getattr(view, "allow_mfa_pending", False))

    def authenticate_header(self, request):
        """Value of the ``WWW-Authenticate`` header on 401 responses."""
        return self.keyword


try:
    from drf_spectacular.extensions import OpenApiAuthenticationExtension

    class SessionTokenScheme(OpenApiAuthenticationExtension):
        """
        OpenAPI authentication extension for DRF Spectacular.
        Enables the 'Authorize' button in Swagger UI and documents the Bearer token scheme.
        """

        target_class = "apps.accounts.authentication.SessionTokenAuthentication"
        name = "SessionTokenAuth"

        def get_security_definition(self, auto_schema):
            """OpenAPI security scheme: HTTP Bearer with the opaque session token."""
            return {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "session_token",
                "description": (
                    "Opaque session token obtained from `/api/v1/auth/login` or "
                    "`/api/v1/auth/signup`. Pass token as: `Bearer <token>`."
                ),
            }

except ImportError:
    pass

