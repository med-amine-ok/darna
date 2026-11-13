"""
Account services: every write of the accounts app goes through a function here.

Views stay thin (parse input, call a service, format output); the business
rules live in this file so they can be tested without HTTP.
"""

import re
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.core.errors import ConflictError, DomainError

from .models import (
    ALGERIAN_MOBILE_RE,
    CodePurpose,
    ConsentRecord,
    OneTimeCode,
    OtpSendLog,
    SessionToken,
    User,
    hash_secret,
)
from .sms import get_sms_backend

# BR-ACC-05: 5 failures within 15 minutes lock sign-in for 60 seconds.
LOGIN_MAX_FAILURES = 5
LOGIN_WINDOW_SECONDS = 15 * 60
LOGIN_LOCK_SECONDS = 60


class InvalidCredentials(DomainError):
    """Wrong email, password or code. The message never says which one was wrong."""

    status = 401
    code = "invalid_credentials"


# ---------------------------------------------------------------------------
# Sign-up
# ---------------------------------------------------------------------------
@transaction.atomic
def signup(
    *,
    email: str | None = None,
    phone: str | None = None,
    password: str | None = None,
    first_name: str = "",
    last_name: str = "",
    locale: str = "fr",
    accept_terms_version: str | None = None,
    ip: str | None = None,
    user_agent: str = "",
) -> User:
    """
    Create an account (ACC-01).

    Email or phone is required. A password is required with an email; a
    phone-only account signs in with one-time codes. Accepting the terms is
    recorded as a consent (BR-PRV-01).
    Raises ``ConflictError(code="email_taken" | "phone_taken")``.
    """
    if not email and not phone:
        raise DomainError("Give an email or a phone number.", code="email_or_phone_required")
    if email and not password:
        raise DomainError("Choose a password.", code="password_required")
    if password:
        validate_password(password)  # raises django ValidationError -> 400 with messages
    if email and User.objects.filter(email__iexact=email).exists():
        raise ConflictError("This email is already used.", code="email_taken")
    if phone and User.objects.filter(phone_e164=phone).exists():
        raise ConflictError("This phone number is already used.", code="phone_taken")

    try:
        user = User.objects.create_user(
            email=email,
            password=password,
            phone_e164=phone or None,
            first_name_latin=first_name,
            last_name_latin=last_name,
            preferred_locale=locale,
        )
    except IntegrityError as exc:  # two sign-ups at the same instant
        raise ConflictError("This account already exists.", code="account_exists") from exc

    if accept_terms_version:
        for document in ("terms", "privacy"):
            ConsentRecord.objects.create(
                user=user, document=document, version=accept_terms_version, accepted=True, ip=ip, user_agent=user_agent
            )
    return user


# ---------------------------------------------------------------------------
# Sign-in and sign-out
# ---------------------------------------------------------------------------
def _lock_keys(identifier: str, ip: str | None) -> list[str]:
    """Cache keys counting failed sign-ins for an account and for an IP address."""
    keys = [f"login-fail:id:{identifier.lower()}"]
    if ip:
        keys.append(f"login-fail:ip:{ip}")
    return keys


def _check_not_locked(identifier: str, ip: str | None) -> None:
    """Raise 429 when the account or the IP is temporarily locked (BR-ACC-05)."""
    for key in _lock_keys(identifier, ip):
        if cache.get(f"{key}:locked"):
            raise DomainError("Too many attempts. Wait a minute and try again.", code="login_locked", status_code=429)


def _record_failure(identifier: str, ip: str | None) -> None:
    """Count a failed sign-in and lock after too many."""
    for key in _lock_keys(identifier, ip):
        failures = cache.get(key, 0) + 1
        cache.set(key, failures, LOGIN_WINDOW_SECONDS)
        if failures >= LOGIN_MAX_FAILURES:
            cache.set(f"{key}:locked", True, LOGIN_LOCK_SECONDS)
            cache.delete(key)


def _clear_failures(identifier: str) -> None:
    """Forget failed attempts of an account after a successful sign-in."""
    cache.delete(f"login-fail:id:{identifier.lower()}")


def login_with_password(*, email: str, password: str, ip: str | None = None, user_agent: str = "") -> tuple[User, str]:
    """
    Sign in with email and password (ACC-02).

    Returns ``(user, raw_session_token)``. Every failure raises the same
    ``InvalidCredentials`` so an attacker cannot learn which emails exist.
    """
    _check_not_locked(email, ip)
    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        # Hash anyway so the response time does not reveal that the email is unknown.
        User().set_password(password)
        _record_failure(email, ip)
        raise InvalidCredentials("Wrong email or password.")
    if not user.check_password(password) or not user.is_active:
        _record_failure(email, ip)
        raise InvalidCredentials("Wrong email or password.")

    _clear_failures(email)
    return user, start_session(user, ip=ip, user_agent=user_agent)


def start_session(user: User, *, ip: str | None = None, user_agent: str = "") -> str:
    """Create a session for ``user`` and return the raw token (shown once)."""
    _, raw = SessionToken.issue(user, ip=ip, user_agent=user_agent)
    User.objects.filter(pk=user.pk).update(last_login=timezone.now())
    return raw


def logout(session: SessionToken) -> None:
    """Revoke the current session; the token stops working immediately (BR-ACC-03)."""
    session.revoke()


def revoke_all_sessions(user: User, *, keep: SessionToken | None = None) -> int:
    """Sign the user out everywhere (after a password change). Returns the number of sessions revoked."""
    sessions = SessionToken.objects.filter(user=user, revoked_at__isnull=True)
    if keep is not None:
        sessions = sessions.exclude(pk=keep.pk)
    return sessions.update(revoked_at=timezone.now())


# ---------------------------------------------------------------------------
# One-time codes (BR-ACC-02)
# ---------------------------------------------------------------------------
def is_algerian_mobile(phone: str) -> bool:
    """True for ``+213`` followed by 5, 6 or 7 and eight digits."""
    return bool(re.match(ALGERIAN_MOBILE_RE, phone))


def request_code(*, destination: str, purpose: str, ip: str | None = None) -> None:
    """
    Send a 6-digit code to a phone (SMS) or an email.

    At most ``OTP_MAX_SENDS_PER_HOUR`` codes per destination per hour. The
    function never tells the caller whether the destination has an account.
    """
    since = timezone.now() - timedelta(hours=1)
    destination_hash = hash_secret(destination.lower())
    sent = OtpSendLog.objects.filter(destination_hash=destination_hash, created_at__gte=since, status="sent").count()
    channel = "email" if "@" in destination else "sms"
    if sent >= settings.OTP_MAX_SENDS_PER_HOUR:
        OtpSendLog.objects.create(
            destination_hash=destination_hash, ip=ip, purpose=purpose, channel=channel, status="blocked_rate_limit"
        )
        raise DomainError("Too many codes requested. Try again later.", code="otp_rate_limited", status_code=429)

    code = f"{secrets.randbelow(1_000_000):06d}"
    # A new code replaces older unused ones for the same destination and purpose.
    OneTimeCode.objects.filter(destination=destination, purpose=purpose, used_at__isnull=True).update(used_at=timezone.now())
    OneTimeCode.objects.create(
        destination=destination,
        purpose=purpose,
        code_hash=hash_secret(code),
        expires_at=timezone.now() + timedelta(minutes=settings.OTP_TTL_MINUTES),
    )

    status = "sent"
    try:
        text = f"BLADUS: {code} est votre code. Il expire dans {settings.OTP_TTL_MINUTES} minutes."
        if channel == "sms":
            get_sms_backend().send(destination, text)
        else:
            from django.core.mail import send_mail

            send_mail("BLADUS code", text, None, [destination], fail_silently=False)
    except Exception:  # provider down: log it, the user can ask again
        status = "failed"
    OtpSendLog.objects.create(destination_hash=destination_hash, ip=ip, purpose=purpose, channel=channel, status=status)
    if status == "failed":
        raise DomainError("The code could not be sent. Try again.", code="otp_send_failed", status_code=503)


def confirm_code(*, destination: str, purpose: str, code: str) -> None:
    """
    Check a one-time code. Raises ``InvalidCredentials`` when it is wrong,
    expired, already used, or was tried too many times.
    """
    otp = (
        OneTimeCode.objects.filter(destination=destination, purpose=purpose, used_at__isnull=True)
        .order_by("-created_at")
        .first()
    )
    if otp is None or otp.expires_at <= timezone.now() or otp.attempts >= settings.OTP_MAX_ATTEMPTS:
        raise InvalidCredentials("Wrong or expired code.", code="invalid_code")
    if not secrets.compare_digest(otp.code_hash, hash_secret(code)):
        OneTimeCode.objects.filter(pk=otp.pk).update(attempts=otp.attempts + 1)
        raise InvalidCredentials("Wrong or expired code.", code="invalid_code")
    otp.used_at = timezone.now()
    otp.save(update_fields=["used_at"])


def login_with_code(*, phone: str, code: str, ip: str | None = None, user_agent: str = "") -> tuple[User, str]:
    """
    Sign in with a phone one-time code. Also marks the phone as verified.

    A phone that has no account yet gets one (phone-only account).
    """
    confirm_code(destination=phone, purpose=CodePurpose.LOGIN, code=code)
    user = User.objects.filter(phone_e164=phone).first()
    if user is None:
        user = User.objects.create_user(phone_e164=phone)
    if not user.is_active:
        raise InvalidCredentials("This account is not active.")
    if user.phone_verified_at is None:
        user.phone_verified_at = timezone.now()
        user.save(update_fields=["phone_verified_at"])
    return user, start_session(user, ip=ip, user_agent=user_agent)


def set_phone(user: User, phone: str, *, ip: str | None = None) -> None:
    """
    Store a new (unverified) phone on the account and send the verification code.

    Raises ``ConflictError(code="phone_taken")`` if another account has it.
    """
    if User.objects.filter(phone_e164=phone).exclude(pk=user.pk).exists():
        raise ConflictError("This phone number is already used.", code="phone_taken")
    user.phone_e164 = phone
    user.phone_verified_at = None
    user.save(update_fields=["phone_e164", "phone_verified_at"])
    request_code(destination=phone, purpose=CodePurpose.VERIFY_PHONE, ip=ip)


def verify_phone(user: User, code: str) -> None:
    """Confirm the code sent to the user's phone and mark the phone as verified (DEC-012)."""
    if not user.phone_e164:
        raise DomainError("Add a phone number first.", code="phone_missing")
    confirm_code(destination=user.phone_e164, purpose=CodePurpose.VERIFY_PHONE, code=code)
    user.phone_verified_at = timezone.now()
    user.save(update_fields=["phone_verified_at"])


# ---------------------------------------------------------------------------
# Password and profile
# ---------------------------------------------------------------------------
def change_password(user: User, *, current_password: str, new_password: str, keep_session: SessionToken | None = None) -> None:
    """Change the password after checking the current one, then sign out every other device (ACC-04)."""
    if not user.check_password(current_password):
        raise InvalidCredentials("The current password is wrong.", code="wrong_password")
    validate_password(new_password, user)
    user.set_password(new_password)
    user.save(update_fields=["password"])
    revoke_all_sessions(user, keep=keep_session)


def update_profile(user: User, **fields) -> User:
    """
    Update the editable profile fields (ACC-06).

    Email and phone are not changed here: they need verification and have
    their own functions. Unknown field names are ignored on purpose
    (protection against mass assignment, OWASP API3).
    """
    allowed = {
        "first_name_latin", "last_name_latin", "full_name_ar", "bio",
        "spoken_languages", "home_commune", "address_line", "preferred_locale",
    }
    changed = []
    for name, value in fields.items():
        if name in allowed:
            setattr(user, name, value)
            changed.append(name)
    if changed:
        user.save(update_fields=changed)
    return user
