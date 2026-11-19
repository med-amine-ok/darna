"""
Talking to Google for "Continue with Google" (ACC-10).

The website sends Google's one-time ``code`` (with its PKCE verifier). This
module trades it for tokens at Google's token endpoint, using the client
secret that never leaves the backend, then checks the returned ID token:
signature (Google's published keys), audience (our client id), issuer and
expiry. Only then are the identity claims trusted.

Network calls are isolated in ``exchange_code`` and ``verify_id_token`` so
tests can replace them; nothing here touches the database.
"""

import logging
from dataclasses import dataclass

import jwt
import requests
from django.conf import settings

from apps.core.errors import DomainError

TOKEN_URL = "https://oauth2.googleapis.com/token"
CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
ISSUERS = ("accounts.google.com", "https://accounts.google.com")
TIMEOUT_SECONDS = 10

logger = logging.getLogger("bladus.google")

# Google's signing keys, cached by PyJWT between requests.
_jwks_client = jwt.PyJWKClient(CERTS_URL, cache_keys=True, lifespan=3600)


@dataclass(frozen=True)
class GoogleIdentity:
    """The claims we use from a verified Google ID token."""

    subject: str
    email: str
    email_verified: bool
    given_name: str
    family_name: str
    locale: str
    picture: str = ""


def is_configured() -> bool:
    """True when the client id and secret are set (otherwise the feature is off)."""
    return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)


def _fail(message: str, code: str = "google_failed") -> DomainError:
    """The one error shape every Google problem answers with (no details leak to the client)."""
    return DomainError(message, code=code)


def exchange_code(*, code: str, code_verifier: str, redirect_uri: str) -> str:
    """Trade the one-time code for tokens at Google; returns the ID token (JWT)."""
    try:
        response = requests.post(
            TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
                "code_verifier": code_verifier,
            },
            timeout=TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise _fail("Google cannot be reached right now.", "google_unavailable") from exc
    if response.status_code != 200:
        # Google's own reason (never contains a secret): invalid_client = wrong
        # client id or secret on this server; redirect_uri_mismatch = the
        # address is not registered; invalid_grant = code expired or reused.
        try:
            reason = (response.json() or {}).get("error", "")
        except ValueError:
            reason = ""
        logger.warning("Google token exchange refused: status=%s error=%s redirect_uri=%s",
                       response.status_code, reason or "?", redirect_uri)
        if reason in ("invalid_client", "unauthorized_client"):
            raise _fail("Google sign-in is not set up correctly on the server.", "google_client_rejected")
        if reason == "redirect_uri_mismatch":
            raise _fail("This sign-in address is not registered with Google.", "invalid_redirect_uri")
        raise _fail("Google did not accept this sign-in. Please try again.")
    id_token = (response.json() or {}).get("id_token")
    if not id_token:
        raise _fail("Google did not return an identity.")
    return id_token


def verify_id_token(id_token: str) -> GoogleIdentity:
    """Check the ID token's signature, audience, issuer and expiry, and read its claims."""
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(id_token)
        claims = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.GOOGLE_CLIENT_ID,
            issuer=ISSUERS,
            options={"require": ["exp", "iat", "iss", "aud", "sub"]},
            leeway=30,
        )
    except jwt.PyJWKClientError as exc:
        raise _fail("Google cannot be reached right now.", "google_unavailable") from exc
    except jwt.InvalidTokenError as exc:
        raise _fail("This Google sign-in could not be verified.") from exc
    return GoogleIdentity(
        subject=str(claims["sub"]),
        email=str(claims.get("email") or "").strip().lower(),
        email_verified=claims.get("email_verified") is True,
        given_name=str(claims.get("given_name") or "")[:80],
        family_name=str(claims.get("family_name") or "")[:80],
        locale=str(claims.get("locale") or "")[:2].lower(),
        picture=str(claims.get("picture") or "")[:500],
    )
