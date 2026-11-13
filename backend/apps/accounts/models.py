"""
Accounts: people, sign-in sessions, one-time codes, consents and admin staff.

One ``User`` table for everybody (guest, host, team member, admin). What a
person can do comes from other tables: a ``StaffProfile`` makes them an admin,
a host account or a membership (app ``hosts``) makes them a host.

Rules implemented here: BR-ACC-01 (unique email and phone), BR-ACC-02
(one-time codes), BR-ACC-03 (revocable sessions), DEC-016 (one staff role).
"""

import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

from apps.core.models import SoftDeleteModel, UUIDModel

# International phone format (E.164): "+" then 7 to 15 digits.
phone_validator = RegexValidator(r"^\+[1-9][0-9]{6,14}$", "Enter the phone in international format, e.g. +213551234567.")
# Algerian mobile numbers: +213 then 5, 6 or 7 and 8 more digits.
ALGERIAN_MOBILE_RE = r"^\+213[5-7][0-9]{8}$"


def hash_secret(value: str) -> str:
    """SHA-256 of a secret (session token, one-time code). Only the hash is stored."""
    return hashlib.sha256(value.encode()).hexdigest()


class UserStatus(models.TextChoices):
    """Account states an admin can set."""

    ACTIVE = "active", "Active"
    SUSPENDED = "suspended", "Suspended"
    BANNED = "banned", "Banned"
    DELETED = "deleted", "Deleted"


class UserManager(BaseUserManager):
    """Creates users with a normalised email and a hashed password."""

    use_in_migrations = True

    def create_user(self, email: str | None = None, password: str | None = None, **extra):
        """
        Create a normal user. Email or phone is required.

        The password is hashed with Argon2; ``None`` creates a phone-only
        account that signs in with one-time codes.
        """
        if not email and not extra.get("phone_e164"):
            raise ValueError("A user needs an email or a phone number.")
        email = self.normalize_email(email).lower() if email else None
        user = self.model(email=email, **extra)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra):
        """Create an admin with access to the Django admin site and the admin API."""
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        user = self.create_user(email=email, password=password, **extra)
        StaffProfile.objects.get_or_create(user=user, defaults={"status": StaffStatus.ACTIVE, "activated_at": timezone.now()})
        return user


class User(UUIDModel, SoftDeleteModel, AbstractBaseUser, PermissionsMixin):
    """A person. Signs in with email + password, or with a phone one-time code."""

    email = models.EmailField(max_length=254, null=True, blank=True, unique=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    phone_e164 = models.CharField(max_length=16, null=True, blank=True, validators=[phone_validator])
    phone_verified_at = models.DateTimeField(
        null=True, blank=True, help_text="Must be set before the first booking (DEC-012)."
    )
    first_name_latin = models.CharField(max_length=80, blank=True)
    last_name_latin = models.CharField(max_length=80, blank=True)
    full_name_ar = models.CharField(max_length=160, blank=True, help_text="Name in Arabic script.")
    bio = models.TextField(blank=True, max_length=500)
    spoken_languages = models.JSONField(default=list, blank=True, help_text='List of language codes, e.g. ["ar", "fr"].')
    home_commune = models.ForeignKey("geo.Commune", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    address_line = models.CharField(max_length=255, blank=True, help_text="Private; never shown publicly.")
    preferred_locale = models.CharField(max_length=2, default="fr", choices=[("en", "English"), ("fr", "French"), ("ar", "Arabic")])
    status = models.CharField(max_length=12, choices=UserStatus.choices, default=UserStatus.ACTIVE)
    is_staff = models.BooleanField(default=False, help_text="True for BLADUS admins.")
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        constraints = [
            # BR-ACC-01: "A@x.dz" and "a@x.dz" are the same account.
            models.UniqueConstraint(Lower("email"), name="user_email_ci_unique", condition=models.Q(email__isnull=False)),
            models.UniqueConstraint(fields=["phone_e164"], name="user_phone_unique", condition=models.Q(phone_e164__isnull=False)),
            models.CheckConstraint(
                condition=models.Q(email__isnull=False) | models.Q(phone_e164__isnull=False),
                name="user_email_or_phone",
            ),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return self.email or self.phone_e164 or str(self.id)

    @property
    def display_name(self) -> str:
        """Name shown to other people: first name + last initial, never the full family name."""
        if self.first_name_latin:
            initial = f" {self.last_name_latin[0]}." if self.last_name_latin else ""
            return f"{self.first_name_latin}{initial}"
        return self.full_name_ar or "BLADUS user"

    @property
    def is_active(self) -> bool:
        """Django asks this before letting someone sign in."""
        return self.status == UserStatus.ACTIVE and self.deleted_at is None

    @property
    def phone_verified(self) -> bool:
        """True when the phone was confirmed with a one-time code."""
        return self.phone_verified_at is not None

    @property
    def is_admin(self) -> bool:
        """True for an active BLADUS admin (DEC-016: one staff role)."""
        profile = getattr(self, "staff_profile", None)
        return bool(self.is_staff and profile and profile.status == StaffStatus.ACTIVE)


class StaffRole(models.TextChoices):
    """Staff roles. One today (DEC-016); the field stays so roles can be split later."""

    ADMIN = "admin", "Admin"


class StaffStatus(models.TextChoices):
    """Life of a staff account."""

    INVITED = "invited", "Invited"
    ACTIVE = "active", "Active"
    DEACTIVATED = "deactivated", "Deactivated"


class StaffProfile(models.Model):
    """Marks a user as BLADUS staff."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name="staff_profile")
    role = models.CharField(max_length=16, choices=StaffRole.choices, default=StaffRole.ADMIN)
    status = models.CharField(max_length=12, choices=StaffStatus.choices, default=StaffStatus.INVITED)
    invited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    invited_at = models.DateTimeField(null=True, blank=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    deactivated_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.user} ({self.role})"


class SessionToken(UUIDModel):
    """
    A sign-in session (BR-ACC-03).

    The client receives a random token once; the database keeps only its
    SHA-256 hash, so a database leak does not let anyone sign in. Deleting or
    revoking the row signs the device out immediately.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    token_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(default=timezone.now)
    last_used_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    active_host_account_id = models.UUIDField(
        null=True, blank=True, help_text="Workspace chosen in the host menu (ORG-02); checked again on every host call."
    )

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        indexes = [models.Index(fields=["user", "revoked_at"])]

    @classmethod
    def issue(cls, user: User, *, ip: str | None = None, user_agent: str = "") -> tuple["SessionToken", str]:
        """
        Create a session and return ``(row, raw_token)``.

        The raw token is shown to the client once and never stored. Admin
        sessions are shorter than guest sessions.
        """
        raw = secrets.token_urlsafe(40)
        ttl = (
            timedelta(hours=settings.STAFF_SESSION_TTL_HOURS)
            if user.is_staff
            else timedelta(days=settings.SESSION_TOKEN_TTL_DAYS)
        )
        row = cls.objects.create(
            user=user,
            token_hash=hash_secret(raw),
            expires_at=timezone.now() + ttl,
            ip=ip,
            user_agent=user_agent[:255],
        )
        return row, raw

    @property
    def is_valid(self) -> bool:
        """True while the session is neither revoked nor expired."""
        return self.revoked_at is None and self.expires_at > timezone.now()

    def revoke(self) -> None:
        """Sign this device out."""
        if self.revoked_at is None:
            self.revoked_at = timezone.now()
            self.save(update_fields=["revoked_at"])


class CodePurpose(models.TextChoices):
    """Why a one-time code was sent."""

    LOGIN = "login", "Sign in"
    VERIFY_PHONE = "verify_phone", "Verify phone"
    VERIFY_EMAIL = "verify_email", "Verify email"
    RESET_PASSWORD = "reset_password", "Reset password"


class OneTimeCode(UUIDModel):
    """
    A 6-digit code sent by SMS or email (BR-ACC-02).

    Valid 10 minutes, at most 5 wrong attempts, stored hashed. The blueprint
    keeps codes in Redis; this first version uses a table so it runs without
    Redis. Old rows can be purged by a scheduled job.
    """

    destination = models.CharField(max_length=254, help_text="Phone (E.164) or email the code was sent to.")
    purpose = models.CharField(max_length=16, choices=CodePurpose.choices)
    code_hash = models.CharField(max_length=64)
    attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        indexes = [models.Index(fields=["destination", "purpose", "created_at"])]


class OtpSendLog(models.Model):
    """One row per code sent: used for the hourly limit, cost control and fraud detection."""

    destination_hash = models.CharField(max_length=64, help_text="SHA-256 of the phone or email.")
    ip = models.GenericIPAddressField(null=True, blank=True)
    purpose = models.CharField(max_length=16, choices=CodePurpose.choices)
    channel = models.CharField(max_length=8, default="sms")
    status = models.CharField(max_length=20, default="sent", help_text="sent, failed or blocked_rate_limit.")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        indexes = [models.Index(fields=["destination_hash", "created_at"]), models.Index(fields=["ip", "created_at"])]


class ConsentRecord(UUIDModel):
    """History of accepted terms, privacy notice and marketing opt-in (BR-PRV-01). Rows are only added."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="consents")
    document = models.CharField(max_length=32, help_text="terms, privacy or marketing.")
    version = models.CharField(max_length=32)
    accepted = models.BooleanField()
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        ordering = ["-created_at"]
