"""
Account services: every write of the accounts app goes through a function here.

Views stay thin (parse input, call a service, format output); the business
rules live in this file so they can be tested without HTTP.
"""

import logging
import re
import secrets
from datetime import time, timedelta

import pyotp
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from apps.audit import services as audit
from apps.core.errors import ConflictError, DomainError, NotFoundError
from apps.core.timeutils import business_datetime, business_today

from . import extensions
from .crypto import decrypt_secret, encrypt_secret
from .mailer import frontend_url, send_email
from .models import (
    ALGERIAN_MOBILE_RE,
    DSR_OPEN_STATUSES,
    AuthenticatorType,
    CodePurpose,
    ConsentRecord,
    DataSubjectRequest,
    DsrKind,
    DsrStatus,
    Favorite,
    MfaAuthenticator,
    OneTimeCode,
    OtpSendLog,
    SessionScope,
    SessionToken,
    StaffProfile,
    StaffRole,
    StaffStatus,
    User,
    UserStatus,
    hash_secret,
)
from .selectors import user_has_mfa
from .sms import get_sms_backend

logger = logging.getLogger("bladus.accounts")

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
    if email:
        # Starts the verify_email flow; sent after commit so a rolled back sign-up sends nothing.
        transaction.on_commit(lambda: send_email_verification(user))
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


def login_with_password(
    *, email: str, password: str, ip: str | None = None, user_agent: str = ""
) -> tuple[User, SessionToken, str]:
    """
    Sign in with email and password (ACC-02).

    Returns ``(user, session, raw_session_token)``; the session waits for the
    second factor when the user has one (BR-ACC-04). Every failure raises the same
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
    session, raw = open_login_session(user, ip=ip, user_agent=user_agent)
    return user, session, raw


def start_session(
    user: User, *, ip: str | None = None, user_agent: str = "", trusted_staff_session: bool = False
) -> str:
    """
    Create a complete session for ``user`` and return the raw token (shown once).

    Only for flows that already proved who the person is (sign-up). The
    session is always a ``web`` session, which the admin API refuses (STF-05),
    unless ``trusted_staff_session`` is passed: then a staff user gets a
    ``staff`` session already marked as second-factor verified. Only the test
    helper ``client_for`` passes it; real staff sign-ins go through
    :func:`staff_login`, which asks for the second factor (BR-ACC-04). Making
    the shortcut explicit means a future caller cannot open an admin session
    without the second factor by accident.
    """
    staff = trusted_staff_session and user.is_staff
    _, raw = SessionToken.issue(
        user,
        ip=ip,
        user_agent=user_agent,
        scope=SessionScope.STAFF if staff else SessionScope.WEB,
        mfa_verified=staff,
    )
    User.objects.filter(pk=user.pk).update(last_login=timezone.now())
    return raw


def open_login_session(user: User, *, ip: str | None = None, user_agent: str = "") -> tuple[SessionToken, str]:
    """
    Open a website session after a first factor (password, SMS code, reset key).

    When the user has a confirmed authenticator the session is created with
    ``mfa_pending`` and only works on ``/auth/2fa/authenticate`` until the
    second factor is checked (BR-ACC-04). Staff users get a ``web`` session
    here too, which the admin API refuses (STF-05).
    """
    pending = user_has_mfa(user)
    session, raw = SessionToken.issue(user, ip=ip, user_agent=user_agent, scope=SessionScope.WEB, mfa_pending=pending)
    if not pending:
        User.objects.filter(pk=user.pk).update(last_login=timezone.now())
    return session, raw


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


# Send log statuses that count against the limits: the code left (or the provider was paid to try).
_COUNTED_STATUSES = ("sent", "failed")


def _too_many(message: str) -> DomainError:
    """The 429 answer of every per destination and per IP limit (BR-ACC-02, R9)."""
    return DomainError(message, code="otp_rate_limited", status_code=429)


def _check_send_limits(*, destination_hash: str, ip: str | None, channel: str) -> tuple[str, DomainError] | None:
    """
    Apply the one-time code limits before anything is sent (BR-ACC-02, R9).

    Per destination: ``OTP_MAX_SENDS_PER_HOUR`` per hour and
    ``OTP_MAX_SENDS_PER_DAY`` per 24 hours. Per IP: ``OTP_MAX_SENDS_PER_IP_PER_HOUR``.
    SMS only: at most ``SMS_DAILY_BUDGET`` SMS per business day (Algiers time)
    for the whole platform, then ``sms_budget_exceeded`` (503). Returns
    ``(log_status, error)`` for the first limit reached, else ``None``.
    """
    now = timezone.now()
    counted = OtpSendLog.objects.filter(status__in=_COUNTED_STATUSES)
    per_destination = counted.filter(destination_hash=destination_hash)
    if per_destination.filter(created_at__gte=now - timedelta(hours=1)).count() >= settings.OTP_MAX_SENDS_PER_HOUR:
        return "blocked_rate_limit", _too_many("Too many codes requested. Try again later.")
    if per_destination.filter(created_at__gte=now - timedelta(days=1)).count() >= settings.OTP_MAX_SENDS_PER_DAY:
        return "blocked_rate_limit", _too_many("Too many codes requested today. Try again tomorrow.")
    if ip and counted.filter(ip=ip, created_at__gte=now - timedelta(hours=1)).count() >= settings.OTP_MAX_SENDS_PER_IP_PER_HOUR:
        return "blocked_rate_limit", _too_many("Too many codes requested from this network. Try again later.")
    if channel == "sms":
        day_start = business_datetime(business_today(), time.min)
        spent = counted.filter(channel="sms", created_at__gte=day_start).count()
        if spent >= settings.SMS_DAILY_BUDGET:
            logger.error("SMS daily budget of %s reached: one-time codes by SMS are paused.", settings.SMS_DAILY_BUDGET)
            return "blocked_budget", DomainError(
                "Codes by SMS are paused for today. Try again later.", code="sms_budget_exceeded", status_code=503
            )
    return None


def request_code(*, destination: str, purpose: str, ip: str | None = None) -> None:
    """
    Send a 6-digit code to a phone (SMS) or an email (BR-ACC-02, R9).

    Limits (settings, from the environment): per destination
    ``OTP_MAX_SENDS_PER_HOUR`` (3) per hour and ``OTP_MAX_SENDS_PER_DAY`` (10)
    per day, per IP ``OTP_MAX_SENDS_PER_IP_PER_HOUR`` (10) per hour, raising
    ``otp_rate_limited`` (429); for SMS a platform budget of
    ``SMS_DAILY_BUDGET`` (5,000) per day, raising ``sms_budget_exceeded``
    (503). A refused request sends nothing and is logged. The function never
    tells the caller whether the destination has an account.
    """
    destination_hash = hash_secret(destination.lower())
    channel = "email" if "@" in destination else "sms"
    refused = _check_send_limits(destination_hash=destination_hash, ip=ip, channel=channel)
    if refused is not None:
        log_status, error = refused
        OtpSendLog.objects.create(destination_hash=destination_hash, ip=ip, purpose=purpose, channel=channel, status=log_status)
        raise error

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
            send_email(destination, "BLADUS code", text)
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


def login_with_code(*, phone: str, code: str, ip: str | None = None, user_agent: str = "") -> tuple[User, SessionToken, str]:
    """
    Sign in with a phone one-time code. Also marks the phone as verified.

    Returns ``(user, session, raw_token)``; the session waits for the second
    factor when the user has one (BR-ACC-04).

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
    session, raw = open_login_session(user, ip=ip, user_agent=user_agent)
    return user, session, raw


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
    """
    Change the password after checking the current one, then sign out every other device (ACC-04, BR-ACC-03).

    A wrong current password raises 400 ``invalid_current_password`` (openapi ``authChangePassword``).
    """
    if not user.check_password(current_password):
        raise DomainError("The current password is wrong.", code="invalid_current_password")
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


# ---------------------------------------------------------------------------
# Email verification (ACC-01, ACC-06)
# ---------------------------------------------------------------------------
EMAIL_VERIFY_SALT = "accounts.verify_email"
# TODO(config): move to platform settings. Life of an emailed verification link.
EMAIL_VERIFY_MAX_AGE = timedelta(days=3)


def email_verification_key(user: User) -> str:
    """
    Signed key for the verification link: the user id and a hash of the email, never the email itself.

    The key stops working when the email changes (the hash no longer matches)
    or after :data:`EMAIL_VERIFY_MAX_AGE`.
    """
    return signing.dumps({"u": str(user.pk), "h": hash_secret((user.email or "").lower())[:24]}, salt=EMAIL_VERIFY_SALT)


def send_email_verification(user: User) -> None:
    """Email the verification link (verify_email flow). A provider error is logged, never raised."""
    if not user.email or user.email_verified_at is not None:
        return
    link = frontend_url(f"verify-email?key={email_verification_key(user)}")
    _send_quietly(user.email, "BLADUS: confirm your email", f"Confirm your email address: {link}")


def verify_email(key: str) -> User:
    """
    Mark the email as verified with the key from the emailed link (authVerifyEmail).

    Raises 400 ``invalid_key`` when the key is altered, expired, or was made
    for another email address.
    """
    invalid = DomainError("This link is invalid or expired.", code="invalid_key")
    try:
        data = signing.loads(key, salt=EMAIL_VERIFY_SALT, max_age=EMAIL_VERIFY_MAX_AGE)
    except signing.BadSignature as exc:
        raise invalid from exc
    user = User.objects.filter(pk=data.get("u")).first()
    if user is None or not user.is_active or not user.email:
        raise invalid
    if not secrets.compare_digest(hash_secret(user.email.lower())[:24], str(data.get("h", ""))):
        raise invalid
    if user.email_verified_at is None:
        user.email_verified_at = timezone.now()
        user.save(update_fields=["email_verified_at"])
    return user


def _send_quietly(to: str, subject: str, body: str) -> None:
    """Send an email; a provider error is logged, never raised (the person can ask again)."""
    try:
        send_email(to, subject, body)
    except Exception:
        logger.exception("Email %r could not be sent.", subject)


# ---------------------------------------------------------------------------
# Password reset (ACC-04)
# ---------------------------------------------------------------------------
RESET_KEY_SEPARATOR = ":"


def _reset_link_key(user: User) -> str:
    """Key of the emailed reset link: ``<user id base64>:<Django reset token>`` (single use)."""
    return f"{urlsafe_base64_encode(force_bytes(user.pk))}{RESET_KEY_SEPARATOR}{default_token_generator.make_token(user)}"


def _log_send(destination_hash: str, ip: str | None, channel: str, status: str) -> None:
    """One row of the code send log for a password reset request (BR-ACC-02, R9)."""
    OtpSendLog.objects.create(
        destination_hash=destination_hash, ip=ip, purpose=CodePurpose.RESET_PASSWORD, channel=channel, status=status
    )


def request_password_reset(*, email: str | None = None, phone: str | None = None, ip: str | None = None) -> None:
    """
    Send a reset link by email or a 6-digit code by SMS (authRequestPasswordReset, ACC-04, BR-ACC-02).

    Same answer whether the account exists or not. The one-time code limits
    apply to both channels (429 ``otp_rate_limited``); an unknown phone is
    logged without sending, so it costs no SMS but counts against the limits.
    Django's reset token embeds the password hash and last login, so a link
    stops working once used.
    """
    if not email and not phone:
        raise DomainError("Give an email or a phone number.", code="email_or_phone_required")
    if phone and not email and User.objects.filter(phone_e164=phone, status=UserStatus.ACTIVE, deleted_at__isnull=True).exists():
        request_code(destination=phone, purpose=CodePurpose.RESET_PASSWORD, ip=ip)
        return
    destination = (email or phone).lower()
    channel = "email" if email else "none"
    destination_hash = hash_secret(destination)
    refused = _check_send_limits(destination_hash=destination_hash, ip=ip, channel=channel)
    if refused is not None:
        _log_send(destination_hash, ip, channel, refused[0])
        raise refused[1]
    user = User.objects.filter(email__iexact=email).first() if email else None
    if user is not None and user.is_active:
        link = frontend_url(f"reset-password?key={_reset_link_key(user)}")
        _send_quietly(user.email, "BLADUS: reset your password", f"Choose a new password: {link}")
    _log_send(destination_hash, ip, channel, "sent")


def _user_from_reset_code(code: str, phone: str | None) -> User | None:
    """
    Find the user of a 6-digit SMS reset code.

    With ``phone`` the normal code check runs (5 tries per code). Without it,
    the code must match exactly one live reset code; guessing is slowed by
    the lock of :func:`reset_password`.
    """
    if phone:
        try:
            confirm_code(destination=phone, purpose=CodePurpose.RESET_PASSWORD, code=code)
        except InvalidCredentials:
            return None
        return User.objects.filter(phone_e164=phone).first()
    rows = list(
        OneTimeCode.objects.filter(
            purpose=CodePurpose.RESET_PASSWORD,
            code_hash=hash_secret(code),
            used_at__isnull=True,
            expires_at__gt=timezone.now(),
            attempts__lt=settings.OTP_MAX_ATTEMPTS,
        )[:2]
    )
    if len(rows) != 1:
        return None
    OneTimeCode.objects.filter(pk=rows[0].pk).update(used_at=timezone.now())
    return User.objects.filter(phone_e164=rows[0].destination).first()


def _user_from_reset_link(key: str) -> User | None:
    """Find the user of an emailed reset key, or ``None`` when it is wrong, used or expired."""
    uid_b64, _, token = key.partition(RESET_KEY_SEPARATOR)
    try:
        user = User.objects.filter(pk=force_str(urlsafe_base64_decode(uid_b64))).first()
    except (ValueError, ValidationError, UnicodeDecodeError):
        return None
    if user is None or not default_token_generator.check_token(user, token):
        return None
    return user


def reset_password(
    *, key: str, password: str, phone: str | None = None, ip: str | None = None, user_agent: str = ""
) -> tuple[User, SessionToken, str]:
    """
    Set a new password with the reset key or SMS code, revoke every session and sign in (authResetPassword, BR-ACC-03).

    Returns ``(user, session, raw_token)``; the session waits for the second
    factor when the user has one (BR-ACC-04). Wrong keys raise 400
    ``invalid_key`` and count towards the lock of BR-ACC-05.
    """
    lock_id = f"reset:{phone or ''}"
    _check_not_locked(lock_id, ip)
    validate_password(password)
    user = _user_from_reset_code(key, phone) if re.fullmatch(r"[0-9]{6}", key) else _user_from_reset_link(key)
    if user is None or not user.is_active:
        _record_failure(lock_id, ip)
        raise DomainError("This reset key is invalid or expired.", code="invalid_key")
    validate_password(password, user)
    with transaction.atomic():
        user.set_password(password)
        user.save(update_fields=["password"])
        revoke_all_sessions(user)
    session, raw = open_login_session(user, ip=ip, user_agent=user_agent)
    return user, session, raw


# ---------------------------------------------------------------------------
# Second factor: TOTP and recovery codes (BR-ACC-04, ACC-05)
# ---------------------------------------------------------------------------
TOTP_ISSUER = "BLADUS"
RECOVERY_CODE_COUNT = 10


def _totp_label(user: User) -> str:
    """Account name shown in the authenticator app."""
    return user.email or user.phone_e164 or str(user.pk)


def totp_setup(user: User) -> dict:
    """
    Return ``{"secret", "totp_url"}`` to enrol an authenticator app (authGetTotpSetup).

    The secret is kept encrypted on an unconfirmed authenticator row until
    the first good code (:func:`enrol_totp`); asking again returns the same
    secret. 400 ``totp_already_enrolled`` once an app is enrolled.
    """
    if user_has_mfa(user):
        raise DomainError("An authenticator app is already enrolled.", code="totp_already_enrolled")
    row = MfaAuthenticator.objects.filter(user=user, type=AuthenticatorType.TOTP).first()
    if row is None:
        secret = pyotp.random_base32()
        MfaAuthenticator.objects.create(user=user, type=AuthenticatorType.TOTP, secret_encrypted=encrypt_secret(secret))
    else:
        secret = decrypt_secret(row.secret_encrypted)
    url = pyotp.TOTP(secret).provisioning_uri(name=_totp_label(user), issuer_name=TOTP_ISSUER)
    return {"secret": secret, "totp_url": url}


def _check_totp(row: MfaAuthenticator, code: str) -> bool:
    """
    True when ``code`` is the TOTP of the current, previous or next 30 s step.

    A step already accepted once is refused (no replay); the accepted step is
    stored on ``row`` (the caller saves it).
    """
    totp = pyotp.TOTP(decrypt_secret(row.secret_encrypted))
    now = timezone.now()
    for offset in (0, -1, 1):
        moment = now + timedelta(seconds=30 * offset)
        step = totp.timecode(moment)
        if row.last_totp_step is not None and step <= row.last_totp_step:
            continue
        if secrets.compare_digest(totp.at(moment), code):
            row.last_totp_step = step
            return True
    return False


def _normalise_recovery_code(code: str) -> str:
    """Recovery codes are compared without case, spaces or dashes."""
    return re.sub(r"[\s-]", "", code).lower()


def _new_recovery_codes(user: User) -> list[str]:
    """Replace the user's recovery codes with :data:`RECOVERY_CODE_COUNT` new ones; returns them once, in clear."""
    codes = []
    for _ in range(RECOVERY_CODE_COUNT):
        raw = secrets.token_hex(5)
        codes.append(f"{raw[:5]}-{raw[5:]}")
    now = timezone.now()
    MfaAuthenticator.objects.update_or_create(
        user=user,
        type=AuthenticatorType.RECOVERY_CODES,
        defaults={
            "recovery_code_hashes": [hash_secret(_normalise_recovery_code(code)) for code in codes],
            "confirmed_at": now,
            "created_at": now,
            "last_used_at": None,
        },
    )
    return codes


def _complete_session(session: SessionToken) -> None:
    """Mark a session second-factor verified and give it its full life (BR-ACC-03, BR-ACC-04)."""
    now = timezone.now()
    session.mfa_pending = False
    session.mfa_verified_at = now
    session.last_used_at = now
    session.expires_at = now + SessionToken.full_ttl(session.user, session.scope)
    session.save(update_fields=["mfa_pending", "mfa_verified_at", "last_used_at", "expires_at"])
    User.objects.filter(pk=session.user_id).update(last_login=now)


@transaction.atomic
def enrol_totp(
    user: User, code: str, *, session: SessionToken | None = None, ip: str | None = None
) -> tuple[MfaAuthenticator, list[str]]:
    """
    Confirm the authenticator app with its first code (authEnrolTotp, adminEnrolTotp, BR-ACC-04).

    Creates 10 single-use recovery codes, returned once. When called from a
    session still waiting for its second factor (first staff sign-in, or
    after a reset), that session becomes verified, and an invited staff
    member becomes active (staff_profile: MFA before active). Audited.
    Errors: 409 ``totp_already_enrolled``, 400 ``totp_setup_missing``, 400 ``invalid_code``.
    """
    row = MfaAuthenticator.objects.select_for_update().filter(user=user, type=AuthenticatorType.TOTP).first()
    if row is not None and row.confirmed_at is not None:
        raise ConflictError("An authenticator app is already enrolled.", code="totp_already_enrolled")
    if row is None:
        raise DomainError("Ask for a TOTP secret first.", code="totp_setup_missing")
    if not _check_totp(row, code):
        raise DomainError("Wrong or expired code.", code="invalid_code")
    now = timezone.now()
    row.confirmed_at = now
    row.last_used_at = now
    row.save(update_fields=["confirmed_at", "last_used_at", "last_totp_step"])
    codes = _new_recovery_codes(user)
    if session is not None and session.mfa_pending:
        _complete_session(session)
    profile = StaffProfile.objects.filter(user=user).first() if user.is_staff else None
    if profile is not None and profile.status == StaffStatus.INVITED and not profile.invitation_token_hash:
        profile.status = StaffStatus.ACTIVE
        profile.activated_at = now
        profile.save(update_fields=["status", "activated_at"])
    audit.record(actor=user, action="MFA_ENROL", obj=row, after={"type": AuthenticatorType.TOTP}, ip=ip)
    return row, codes


def verify_second_factor(user: User, code: str) -> bool:
    """
    Check a TOTP code (6 digits) or a recovery code; a recovery code works once (BR-ACC-04).

    Updates ``last_used_at`` of the authenticator that matched. Call inside a transaction.
    """
    code = (code or "").strip()
    now = timezone.now()
    if re.fullmatch(r"[0-9]{6}", code):
        row = MfaAuthenticator.objects.select_for_update().filter(
            user=user, type=AuthenticatorType.TOTP, confirmed_at__isnull=False
        ).first()
        if row is None or not _check_totp(row, code):
            return False
        row.last_used_at = now
        row.save(update_fields=["last_used_at", "last_totp_step"])
        return True
    row = MfaAuthenticator.objects.select_for_update().filter(user=user, type=AuthenticatorType.RECOVERY_CODES).first()
    hashed = hash_secret(_normalise_recovery_code(code))
    if row is None or hashed not in row.recovery_code_hashes:
        return False
    row.recovery_code_hashes = [h for h in row.recovery_code_hashes if h != hashed]
    row.last_used_at = now
    row.save(update_fields=["recovery_code_hashes", "last_used_at"])
    return True


def pending_session(raw_token: str | None, *, scope: str) -> SessionToken:
    """
    The session waiting for its second factor, from the token of step 1.

    Raises 400 ``invalid_session`` when the token is unknown, expired,
    already complete, of the other surface, or its user can no longer sign in.
    """
    session = None
    if raw_token:
        session = (
            SessionToken.objects.select_related("user", "user__staff_profile")
            .filter(token_hash=hash_secret(raw_token))
            .first()
        )
    if (
        session is None
        or not session.is_valid
        or not session.mfa_pending
        or session.scope != scope
        or not session.user.is_active
        or (scope == SessionScope.STAFF and not staff_can_sign_in(session.user))
    ):
        raise DomainError("This sign-in expired. Sign in again.", code="invalid_session")
    return session


def complete_mfa(raw_token: str | None, code: str, *, scope: str, ip: str | None = None) -> SessionToken:
    """
    Second step of sign-in: check the TOTP or recovery code and complete the session (BR-ACC-04).

    Wrong codes raise 400 ``invalid_code`` and count towards the lock of
    BR-ACC-05 (5 failures lock 60 s). A staff sign-in is audited.
    """
    session = pending_session(raw_token, scope=scope)
    lock_id = f"mfa:{session.pk}"
    _check_not_locked(lock_id, ip)
    with transaction.atomic():
        ok = verify_second_factor(session.user, code)
        if ok:
            _complete_session(session)
            if scope == SessionScope.STAFF:
                audit.record(actor=session.user, action="STAFF_LOGIN", obj=session.user, object_type="user", ip=ip)
    if not ok:
        _record_failure(lock_id, ip)
        raise DomainError("Wrong or expired code.", code="invalid_code")
    _clear_failures(lock_id)
    return session


# ---------------------------------------------------------------------------
# Staff sign-in and invitations (STF-02, STF-05, BR-ACC-04)
# ---------------------------------------------------------------------------
# TODO(config): move to platform settings. openapi says 72 h; 08-security-privacy.md 4.3 says 48 h.
STAFF_INVITATION_TTL_HOURS = 72
# Staff deactivation keeps at least this many active admins (08-security-privacy.md 5.2).
MIN_ACTIVE_ADMINS = 2


def staff_can_sign_in(user: User) -> bool:
    """True for a staff user whose profile is active, or invited with the invitation already accepted."""
    profile = StaffProfile.objects.filter(user=user).first()
    if not user.is_staff or profile is None or not user.is_active:
        return False
    if profile.status == StaffStatus.ACTIVE:
        return True
    return profile.status == StaffStatus.INVITED and not profile.invitation_token_hash and user.has_usable_password()


def staff_login(
    *, password: str, email: str | None = None, phone: str | None = None, ip: str | None = None, user_agent: str = ""
) -> tuple[User, SessionToken, str]:
    """
    Staff sign-in, step 1: the password (adminLogin, STF-05).

    Always opens a ``staff`` session waiting for the second factor: the
    authenticator code, or the enrolment of one when the staff member has
    none yet (BR-ACC-04). Non-staff accounts and every other failure get the
    same 400 ``invalid_credentials``; failures count towards BR-ACC-05.
    """
    identifier = email or phone or ""
    _check_not_locked(identifier, ip)
    lookup = {"email__iexact": email} if email else {"phone_e164": phone}
    user = User.objects.filter(**lookup).first() if identifier else None
    if user is None:
        User().set_password(password)  # same response time for unknown accounts
    if user is None or not user.check_password(password) or not staff_can_sign_in(user):
        _record_failure(identifier, ip)
        raise DomainError("Wrong email or password.", code="invalid_credentials")
    _clear_failures(identifier)
    session, raw = SessionToken.issue(user, ip=ip, user_agent=user_agent, scope=SessionScope.STAFF, mfa_pending=True)
    return user, session, raw


def _staff_profile_for_update(staff_id) -> StaffProfile:
    """Lock and return a staff profile, or raise 404."""
    profile = StaffProfile.objects.select_for_update().select_related("user").filter(user_id=staff_id).first()
    if profile is None:
        raise NotFoundError("Staff member not found.")
    return profile


@transaction.atomic
def invite_staff(*, actor: User, email: str, display_name: str, role: str, ip: str | None = None) -> StaffProfile:
    """
    Invite a staff member: create the account and email a one-time link (adminInviteStaff, STF-02, BR-STF-01).

    The link is valid :data:`STAFF_INVITATION_TTL_HOURS`; only its HMAC is
    stored. Staff accounts are separate from website accounts, so an email
    already used by any account gives 409 ``email_taken``. Audited.
    """
    if User.objects.filter(email__iexact=email).exists():
        raise ConflictError("This email is already used by an account.", code="email_taken")
    first, _, last = display_name.strip().partition(" ")
    user = User.objects.create_user(email=email, password=None, first_name_latin=first[:80], last_name_latin=last.strip()[:80])
    user.is_staff = True
    user.save(update_fields=["is_staff"])
    token = secrets.token_urlsafe(32)
    now = timezone.now()
    profile = StaffProfile.objects.create(
        user=user,
        role=role,
        status=StaffStatus.INVITED,
        invited_by=actor,
        invited_at=now,
        invitation_token_hash=hash_secret(token),
        invitation_expires_at=now + timedelta(hours=STAFF_INVITATION_TTL_HOURS),
    )
    audit.record(actor=actor, action="STAFF_INVITE", obj=profile, object_type="staff_profile", after={"role": role}, ip=ip)
    link = frontend_url(f"admin/invitations/accept?token={token}")
    body = f"Set your BLADUS staff password within {STAFF_INVITATION_TTL_HOURS} hours: {link}"
    transaction.on_commit(lambda: _send_quietly(user.email, "BLADUS: your staff invitation", body))
    return profile


@transaction.atomic
def accept_staff_invitation(
    *, token: str, password: str, ip: str | None = None, user_agent: str = ""
) -> tuple[User, SessionToken, str]:
    """
    Accept a staff invitation and set the password (adminAcceptInvitation, STF-02).

    Opens a ``staff`` session waiting for the second factor: the next step is
    the TOTP enrolment, which activates the account (BR-ACC-04). Errors: 400
    ``invalid_token`` (unknown or expired), 409 ``invitation_used``.
    """
    profile = None
    if token:
        profile = (
            StaffProfile.objects.select_for_update()
            .select_related("user")
            .filter(invitation_token_hash=hash_secret(token))
            .first()
        )
    if profile is None:
        raise DomainError("This invitation link is invalid or expired.", code="invalid_token")
    if profile.status != StaffStatus.INVITED or profile.user.has_usable_password():
        raise ConflictError("This invitation was already used.", code="invitation_used")
    if profile.invitation_expires_at is None or profile.invitation_expires_at <= timezone.now():
        raise DomainError("This invitation link is invalid or expired.", code="invalid_token")
    user = profile.user
    validate_password(password, user)
    user.set_password(password)
    user.save(update_fields=["password"])
    profile.invitation_token_hash = ""
    profile.invitation_expires_at = None
    profile.save(update_fields=["invitation_token_hash", "invitation_expires_at"])
    audit.record(actor=user, action="STAFF_INVITE_ACCEPT", obj=profile, object_type="staff_profile", ip=ip)
    session, raw = SessionToken.issue(user, ip=ip, user_agent=user_agent, scope=SessionScope.STAFF, mfa_pending=True)
    return user, session, raw


def _active_admin_count(*, excluding=()) -> int:
    """Number of active admins, leaving out the given user ids."""
    return (
        StaffProfile.objects.filter(status=StaffStatus.ACTIVE, role=StaffRole.ADMIN, user__is_staff=True)
        .exclude(user_id__in=list(excluding))
        .count()
    )


@transaction.atomic
def change_staff_role(*, actor: User, staff_id, role: str, ip: str | None = None) -> StaffProfile:
    """
    Change a staff role (adminUpdateStaffRole, BR-STF-01). Audited.

    409 ``last_super_admin`` when it would leave no active admin. With one
    role today (DEC-016) only ``admin`` is accepted by the serializer.
    """
    profile = _staff_profile_for_update(staff_id)
    before = profile.role
    if before == StaffRole.ADMIN and role != StaffRole.ADMIN and profile.status == StaffStatus.ACTIVE:
        if _active_admin_count(excluding=[profile.user_id]) == 0:
            raise ConflictError("BLADUS needs at least one admin.", code="last_super_admin")
    profile.role = role
    profile.save(update_fields=["role"])
    audit.record(actor=actor, action="STAFF_ROLE_CHANGE", obj=profile, object_type="staff_profile",
                 before={"role": before}, after={"role": role}, ip=ip)
    return profile


@transaction.atomic
def deactivate_staff(*, actor: User, staff_id, ip: str | None = None) -> StaffProfile:
    """
    Deactivate a staff member and revoke their sessions at once (adminDeactivateStaff, BR-ACC-03). Audited.

    409 ``cannot_deactivate_self``, ``already_deactivated``, or ``last_admin``
    when fewer than :data:`MIN_ACTIVE_ADMINS` active admins would remain
    (08-security-privacy.md 5.2: an admin cannot deactivate the last other admin).
    """
    profile = _staff_profile_for_update(staff_id)
    if profile.user_id == actor.pk:
        raise ConflictError("You cannot deactivate yourself.", code="cannot_deactivate_self")
    if profile.status == StaffStatus.DEACTIVATED:
        raise ConflictError("This staff member is already deactivated.", code="already_deactivated")
    if profile.status == StaffStatus.ACTIVE and _active_admin_count(excluding=[profile.user_id]) < MIN_ACTIVE_ADMINS:
        raise ConflictError("BLADUS must keep at least two active admins.", code="last_admin")
    before = profile.status
    profile.status = StaffStatus.DEACTIVATED
    profile.deactivated_at = timezone.now()
    profile.invitation_token_hash = ""
    profile.invitation_expires_at = None
    profile.save(update_fields=["status", "deactivated_at", "invitation_token_hash", "invitation_expires_at"])
    revoke_all_sessions(profile.user)
    audit.record(actor=actor, action="STAFF_DEACTIVATE", obj=profile, object_type="staff_profile",
                 before={"status": before}, after={"status": profile.status}, ip=ip)
    return profile


@transaction.atomic
def activate_staff(*, actor: User, staff_id, ip: str | None = None) -> StaffProfile:
    """
    Reactivate a deactivated staff member (adminActivateStaff). Audited.

    Without an enrolled second factor the profile goes back to ``invited``
    and becomes active after the enrolment (BR-ACC-04). 409 ``not_deactivated``.
    """
    profile = _staff_profile_for_update(staff_id)
    if profile.status != StaffStatus.DEACTIVATED:
        raise ConflictError("This staff member is not deactivated.", code="not_deactivated")
    profile.status = StaffStatus.ACTIVE if user_has_mfa(profile.user) else StaffStatus.INVITED
    profile.deactivated_at = None
    if profile.status == StaffStatus.ACTIVE:
        profile.activated_at = timezone.now()
    profile.save(update_fields=["status", "deactivated_at", "activated_at"])
    audit.record(actor=actor, action="STAFF_ACTIVATE", obj=profile, object_type="staff_profile",
                 before={"status": StaffStatus.DEACTIVATED}, after={"status": profile.status}, ip=ip)
    return profile


@transaction.atomic
def reset_staff_mfa(*, actor: User, staff_id, ip: str | None = None) -> StaffProfile:
    """
    Remove a staff member's second factors and sessions (adminResetStaffMfa, BR-ACC-04). Audited.

    They enrol again at the next sign-in, before any admin endpoint works.
    """
    profile = _staff_profile_for_update(staff_id)
    removed = MfaAuthenticator.objects.filter(user=profile.user).delete()[0]
    revoke_all_sessions(profile.user)
    audit.record(actor=actor, action="STAFF_RESET_MFA", obj=profile, object_type="staff_profile",
                 after={"authenticators_removed": removed}, ip=ip)
    return profile


# ---------------------------------------------------------------------------
# Admin actions on users (ACC-03, STF-03, BR-STF-02)
# ---------------------------------------------------------------------------
# Admin user actions: action -> (allowed when, new status). See admin_set_user_status.
USER_ACTIONS = ("suspend", "unsuspend", "ban", "delete", "restore")


def _user_for_update(user_id) -> User:
    """Lock and return a user for an admin action; 404 when unknown, 409 for staff (managed under /admin/staff)."""
    user = User.objects.select_for_update().filter(pk=user_id).first()
    if user is None:
        raise NotFoundError("User not found.")
    if user.is_staff:
        raise ConflictError("Staff accounts are managed under /admin/staff.", code="staff_account")
    return user


@transaction.atomic
def admin_set_user_status(
    *, actor: User, user_id, action: str, reason: str = "", reason_code: str | None = None, ip: str | None = None
) -> User:
    """
    Suspend, unsuspend, ban, delete (soft) or restore a user (STF-03, BR-STF-02).

    Suspend, ban and delete revoke every session at once (BR-ACC-03).
    ``suspend`` needs an active user, ``unsuspend`` a suspended one, ``ban``
    an active or suspended one, ``delete`` one not yet deleted (personal data
    is erased by the deletion request flow, BR-PRV-02), ``restore`` a deleted
    one not yet anonymised. Otherwise 409 ``invalid_status`` (or
    ``anonymised``). The audit row keeps ids and statuses; the reason is the note.
    """
    user = _user_for_update(user_id)
    deleted = user.deleted_at is not None
    before = {"status": user.status, "deleted": deleted}
    rules = {
        "suspend": (not deleted and user.status == UserStatus.ACTIVE, UserStatus.SUSPENDED),
        "unsuspend": (not deleted and user.status == UserStatus.SUSPENDED, UserStatus.ACTIVE),
        "ban": (not deleted and user.status in (UserStatus.ACTIVE, UserStatus.SUSPENDED), UserStatus.BANNED),
        "delete": (not deleted, UserStatus.DELETED),
        "restore": (deleted and user.anonymised_at is None, UserStatus.ACTIVE),
    }
    allowed, new_status = rules[action]
    if not allowed:
        if action == "restore" and user.anonymised_at:
            raise ConflictError("This user was anonymised and cannot be restored.", code="anonymised")
        raise ConflictError("This action is not possible in the user's current state.", code="invalid_status")
    user.status = new_status
    fields = ["status"]
    if action == "delete":
        user.deleted_at = timezone.now()
        fields.append("deleted_at")
    elif action == "restore":
        user.deleted_at = None
        fields.append("deleted_at")
    user.save(update_fields=fields)
    if action in ("suspend", "ban", "delete"):
        revoke_all_sessions(user)
    after = {"status": user.status, "deleted": user.deleted_at is not None}
    if reason_code:
        after["reason_code"] = reason_code
    audit.record(actor=actor, action=f"USER_{action.upper()}", obj=user, object_type="user",
                 before=before, after=after, note=reason, ip=ip)
    return user


# ---------------------------------------------------------------------------
# Privacy: consents and data subject requests (BR-PRV-01, BR-PRV-02)
# ---------------------------------------------------------------------------
# TODO(config): move to platform settings. Legal answer time of a request (08-security-privacy.md 12.5, VERIFY).
DSR_DEADLINE_DAYS = 30


def record_consent(
    user: User, *, document: str, version: str, accepted: bool, ip: str | None = None, user_agent: str = ""
) -> ConsentRecord:
    """Append a consent row with time and IP; rows are never changed (recordMyConsent, BR-PRV-01)."""
    return ConsentRecord.objects.create(
        user=user, document=document, version=version, accepted=accepted, ip=ip, user_agent=user_agent
    )


@transaction.atomic
def create_data_request(user: User, *, kind: str, notes: str = "", ip: str | None = None) -> DataSubjectRequest:
    """
    Open a data protection request due in :data:`DSR_DEADLINE_DAYS` days (createMyDataRequest, BR-PRV-02). Audited.

    409 ``data_request_open`` when a request of the same kind is still open.
    """
    if DataSubjectRequest.objects.filter(user=user, kind=kind, status__in=DSR_OPEN_STATUSES).exists():
        raise ConflictError("A request of this kind is already open.", code="data_request_open")
    now = timezone.now()
    try:
        with transaction.atomic():
            request = DataSubjectRequest.objects.create(
                user=user, kind=kind, notes=notes, created_at=now, due_at=now + timedelta(days=DSR_DEADLINE_DAYS)
            )
    except IntegrityError as exc:  # two requests at the same instant
        raise ConflictError("A request of this kind is already open.", code="data_request_open") from exc
    audit.record(actor=user, action="DSR_CREATE", obj=request, object_type="data_subject_request",
                 after={"kind": kind}, ip=ip)
    return request


def anonymise_user(user: User) -> None:
    """
    Erase a user's personal data and keep the row as a pseudonymous id (BR-PRV-02).

    Bookings, ledger lines and invoices keep pointing at the same id. The
    email becomes a non-routable placeholder (the table needs an email or a
    phone). Sessions, second factors and favourites are removed.
    """
    now = timezone.now()
    user.email = f"deleted-{user.pk.hex}@anonymised.invalid"
    user.email_verified_at = None
    user.phone_e164 = None
    user.phone_verified_at = None
    user.first_name_latin = ""
    user.last_name_latin = ""
    user.full_name_ar = ""
    user.bio = ""
    user.spoken_languages = []
    user.home_commune = None
    user.address_line = ""
    user.set_unusable_password()
    user.status = UserStatus.DELETED
    user.deleted_at = user.deleted_at or now
    user.anonymised_at = now
    user.save()
    revoke_all_sessions(user)
    MfaAuthenticator.objects.filter(user=user).delete()
    Favorite.objects.filter(user=user).delete()


@transaction.atomic
def complete_data_request(*, actor: User, request_id, outcome: str, notes: str, ip: str | None = None) -> DataSubjectRequest:
    """
    Close a data protection request as completed or rejected (adminCompleteDataRequest, BR-PRV-02). Audited.

    A completed deletion request anonymises the person at once
    (:func:`anonymise_user`). 409 ``data_request_closed`` when already closed.
    """
    request = DataSubjectRequest.objects.select_for_update().select_related("user").filter(pk=request_id).first()
    if request is None:
        raise NotFoundError("Request not found.")
    if request.status not in DSR_OPEN_STATUSES:
        raise ConflictError("This request is already closed.", code="data_request_closed")
    before = {"status": request.status}
    request.status = outcome
    request.handled_by = actor
    request.completed_at = timezone.now()
    request.resolution_notes = notes
    request.save(update_fields=["status", "handled_by", "completed_at", "resolution_notes"])
    if request.kind == DsrKind.DELETION and outcome == DsrStatus.COMPLETED:
        anonymise_user(request.user)
    audit.record(actor=actor, action="DSR_COMPLETE", obj=request, object_type="data_subject_request",
                 before=before, after={"status": outcome, "kind": request.kind}, ip=ip)
    return request


# ---------------------------------------------------------------------------
# Favourites (ACC-09)
# ---------------------------------------------------------------------------
def add_favorite(user: User, *, target_type: str, target_id) -> None:
    """
    Save a listing or trip; adding twice is fine (addMyFavorite).

    404 when the app owning the target type registered a check
    (:mod:`apps.accounts.extensions`) and the target does not exist.
    Without a registered check any id is accepted.
    """
    hooks = extensions.favorite_target(target_type)
    if hooks is not None and not hooks.exists(target_id):
        raise NotFoundError("This item does not exist.")
    try:
        with transaction.atomic():
            Favorite.objects.get_or_create(user=user, target_type=target_type, target_id=target_id)
    except IntegrityError:  # the same favourite added twice at the same instant
        pass


def remove_favorite(user: User, *, target_type: str, target_id) -> None:
    """Remove a favourite; removing a missing one is fine (removeMyFavorite)."""
    Favorite.objects.filter(user=user, target_type=target_type, target_id=target_id).delete()
