"""
Accounts: people, sign-in sessions, one-time codes, consents and admin staff.

One ``User`` table for everybody (guest, host, team member, admin). What a
person can do comes from other tables: a ``StaffProfile`` makes them an admin,
a host account or a membership (app ``hosts``) makes them a host.

Rules implemented here: BR-ACC-01 (unique email and phone), BR-ACC-02
(one-time codes), BR-ACC-03 (revocable sessions), BR-ACC-04 (second factor),
BR-STF-01 and DEC-016 (one staff role, permissions kept in the database),
BR-PRV-01 (consents), BR-PRV-02 (data subject requests) and ACC-09 (favourites).
"""

import hashlib
import hmac
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
    """
    HMAC-SHA256 of a secret, keyed by ``settings.HASH_PEPPER`` (R9). Only the hash is stored.

    Used for session tokens, one-time codes, invitation tokens and lookup
    hashes (OTP send log). A plain SHA-256 of a 6-digit code or a phone number
    can be reversed by trying every value; without the server pepper it
    cannot. Changing the pepper invalidates every stored hash.
    """
    return hmac.new(settings.HASH_PEPPER.encode(), value.encode(), hashlib.sha256).hexdigest()


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
    avatar_url = models.URLField(
        max_length=500, blank=True,
        help_text="Profile picture link (for now the Google account photo; uploads come later).",
    )
    avatar_source = models.CharField(
        max_length=16, blank=True,
        help_text="Where avatar_url came from: 'google' (refreshed at each Google sign-in) or empty.",
    )
    date_of_birth = models.DateField(
        null=True, blank=True, help_text="Private. Asked once after sign-up; bookings need an adult (ACC-11)."
    )
    profile_completed_at = models.DateTimeField(
        null=True, blank=True,
        help_text="When the person finished the 'complete your profile' steps after sign-up (ACC-11).",
    )
    handle = models.CharField(
        max_length=30, unique=True, null=True, blank=True,
        help_text="Public profile link name (/users/<handle>), made from the display name; see accounts.handles.",
    )
    status = models.CharField(max_length=12, choices=UserStatus.choices, default=UserStatus.ACTIVE)
    is_staff = models.BooleanField(default=False, help_text="True for BLADUS admins.")
    date_joined = models.DateTimeField(default=timezone.now)
    anonymised_at = models.DateTimeField(
        null=True, blank=True, help_text="Set when personal data was erased after a deletion request (BR-PRV-02)."
    )

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

    def save(self, *args, **kwargs):
        """Give every new user a public profile handle (ACC-06) before the first save."""
        if not self.handle:
            from .handles import unique_handle

            others = User.objects.exclude(pk=self.pk)
            self.handle = unique_handle(self.display_name, taken=lambda h: others.filter(handle=h).exists())
            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                kwargs["update_fields"] = {*update_fields, "handle"}
        super().save(*args, **kwargs)

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
    invitation_token_hash = models.CharField(
        max_length=64, blank=True, db_index=True, help_text="HMAC of the one-time invitation token (STF-02); empty once used."
    )
    invitation_expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.user} ({self.role})"


# Every staff permission code checked by an admin endpoint (BR-STF-01, 08-security-privacy.md 5.2).
# Migration 0004 seeds this list; when a code is added here, add a migration that inserts it too.
STAFF_PERMISSIONS: list[tuple[str, str]] = [
    ("hosts.view", "See host accounts and their files."),
    ("hosts.approve", "Approve a host account or a document."),
    ("hosts.reject", "Reject a host account or a document."),
    ("hosts.suspend", "Suspend or ban a host account."),
    ("hosts.delete", "Soft-delete or restore a host account."),
    ("hosts.commission_override", "Set a commission rate or credit floor for one host."),
    ("kyc.view_documents", "Open identity and business documents (every view audited)."),
    ("listings.view", "See listings and trips under review."),
    ("listings.approve", "Approve a listing or trip."),
    ("listings.reject", "Reject a listing or trip."),
    ("listings.suspend", "Suspend a listing or trip."),
    ("listings.feature", "Feature a listing."),
    ("listings.delete", "Soft-delete a listing."),
    ("reviews.view", "See reviews and reports."),
    ("reviews.moderate", "Publish or hide reviews."),
    ("reviews.delete", "Remove a review."),
    ("users.view", "See users."),
    ("users.suspend", "Suspend or lift a suspension."),
    ("users.ban", "Ban a user."),
    ("users.delete", "Soft-delete or restore a user."),
    ("privacy.handle_requests", "Handle data protection requests (BR-PRV-02)."),
    ("bookings.view", "See bookings."),
    ("bookings.cancel", "Cancel a booking."),
    ("bookings.dispute", "Resolve a dispute."),
    ("bookings.refund", "Record a refund."),
    ("wallets.view", "See host wallets and the ledger."),
    ("wallets.recharge", "Record or approve a wallet top-up."),
    ("commissions.manage", "Change default commission rates."),
    ("ledger.adjust", "Record a manual wallet adjustment."),
    ("payouts.approve", "Approve payouts (dormant, DEC-019)."),
    ("onboarding.edit", "Edit and publish onboarding flows."),
    ("team.manage", "Invite, change and deactivate staff."),
    ("settings.manage", "Change platform settings."),
    ("categories.manage", "Manage categories, amenities and property types."),
    ("promotions.manage", "Manage coupons."),
    ("reports.export", "Export datasets as CSV."),
    ("reports.view", "See reports and dashboards."),
    ("audit.view", "Read the audit log."),
]


class StaffPermission(models.Model):
    """One staff permission code, e.g. ``users.ban`` (BR-STF-01: the list lives in the database)."""

    code = models.CharField(max_length=64, primary_key=True)
    description = models.TextField(blank=True)

    def __str__(self) -> str:
        """The permission code."""
        return self.code


class StaffRolePermission(models.Model):
    """
    Grants a permission to a staff role (BR-STF-01).

    One role today (admin, every permission, DEC-016); the table stays so
    roles can be split later by data instead of code.
    """

    role = models.CharField(max_length=16, choices=StaffRole.choices)
    permission = models.ForeignKey(StaffPermission, on_delete=models.CASCADE, related_name="role_grants")

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        constraints = [models.UniqueConstraint(fields=["role", "permission"], name="staff_role_permission_unique")]

    def __str__(self) -> str:
        """``role: permission``."""
        return f"{self.role}: {self.permission_id}"


class SessionScope(models.TextChoices):
    """
    Which surface a session belongs to (STF-05).

    ``staff`` sessions are the only ones the admin API accepts; ``web``
    sessions are the website ones (guests and hosts).
    """

    WEB = "web", "Website"
    STAFF = "staff", "Staff"


# TODO(config): move to platform settings. Staff sessions end after 30 minutes without a request (BR-ACC-03).
STAFF_SESSION_IDLE_MINUTES = 30
# TODO(config): move to platform settings. Time allowed between the password step and the second factor.
MFA_PENDING_TTL_MINUTES = 10


class SessionToken(UUIDModel):
    """
    A sign-in session (BR-ACC-03).

    The client receives a random token once; the database keeps only its
    HMAC-SHA256 hash (:func:`hash_secret`, R9), so a database leak does not
    let anyone sign in. Deleting or revoking the row signs the device out
    immediately.
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
    scope = models.CharField(max_length=8, choices=SessionScope.choices, default=SessionScope.WEB)
    mfa_pending = models.BooleanField(
        default=False, help_text="True after the password step while the second factor is still due (BR-ACC-04)."
    )
    mfa_verified_at = models.DateTimeField(null=True, blank=True, help_text="When the second factor was checked.")

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        indexes = [models.Index(fields=["user", "revoked_at"])]

    @classmethod
    def full_ttl(cls, user: User, scope: str) -> timedelta:
        """Life of a complete session: staff 8 hours absolute, website 30 days (BR-ACC-03)."""
        if user.is_staff or scope == SessionScope.STAFF:
            return timedelta(hours=settings.STAFF_SESSION_TTL_HOURS)
        return timedelta(days=settings.SESSION_TOKEN_TTL_DAYS)

    @classmethod
    def issue(
        cls,
        user: User,
        *,
        ip: str | None = None,
        user_agent: str = "",
        scope: str | None = None,
        mfa_pending: bool = False,
        mfa_verified: bool = False,
    ) -> tuple["SessionToken", str]:
        """
        Create a session and return ``(row, raw_token)``.

        The raw token is shown to the client once and never stored. Admin
        sessions are shorter than guest sessions. ``scope`` defaults to
        ``staff`` for staff users and ``web`` for everybody else. A session
        with ``mfa_pending`` lives :data:`MFA_PENDING_TTL_MINUTES` until the
        second factor is checked (BR-ACC-04).
        """
        raw = secrets.token_urlsafe(40)
        scope = scope or (SessionScope.STAFF if user.is_staff else SessionScope.WEB)
        ttl = timedelta(minutes=MFA_PENDING_TTL_MINUTES) if mfa_pending else cls.full_ttl(user, scope)
        now = timezone.now()
        row = cls.objects.create(
            user=user,
            token_hash=hash_secret(raw),
            expires_at=now + ttl,
            ip=ip,
            user_agent=user_agent[:255],
            scope=scope,
            mfa_pending=mfa_pending,
            mfa_verified_at=now if mfa_verified else None,
        )
        return row, raw

    @property
    def is_idle(self) -> bool:
        """True for a staff session unused for :data:`STAFF_SESSION_IDLE_MINUTES` (BR-ACC-03)."""
        if self.scope != SessionScope.STAFF:
            return False
        return timezone.now() - self.last_used_at > timedelta(minutes=STAFF_SESSION_IDLE_MINUTES)

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
    """
    One row per code request: used for the send limits, the SMS budget and fraud detection (BR-ACC-02, R9).

    ``status`` is ``sent``, ``failed`` (provider error), ``blocked_rate_limit``
    (a per destination or per IP limit refused it) or ``blocked_budget`` (the
    daily SMS budget was spent). Sent and failed rows count against the limits.
    """

    destination_hash = models.CharField(max_length=64, help_text="HMAC-SHA256 of the phone or email (R9).")
    ip = models.GenericIPAddressField(null=True, blank=True)
    purpose = models.CharField(max_length=16, choices=CodePurpose.choices)
    channel = models.CharField(max_length=8, default="sms")
    status = models.CharField(
        max_length=20, default="sent", help_text="sent, failed, blocked_rate_limit or blocked_budget."
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        indexes = [
            models.Index(fields=["destination_hash", "created_at"]),
            models.Index(fields=["ip", "created_at"]),
            # R9: the daily SMS budget counts sms rows of the day.
            models.Index(fields=["channel", "created_at"], name="otpsendlog_channel_created"),
        ]


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


class ConsentDocument(models.TextChoices):
    """Documents a person accepts or withdraws (BR-PRV-01)."""

    TERMS = "terms", "Terms of use"
    PRIVACY = "privacy", "Privacy notice"
    MARKETING = "marketing", "Marketing messages"


class AuthenticatorType(models.TextChoices):
    """Kinds of second factor (BR-ACC-04). Passkeys (webauthn) come later."""

    TOTP = "totp", "Authenticator app"
    RECOVERY_CODES = "recovery_codes", "Recovery codes"


class MfaAuthenticator(UUIDModel):
    """
    A second factor of a user (BR-ACC-04, ACC-05).

    ``totp``: the shared secret, encrypted with :mod:`apps.accounts.crypto`;
    the row exists unconfirmed between the setup and the first good code.
    ``recovery_codes``: HMAC hashes (:func:`hash_secret`) of the unused
    single-use codes. Plain secrets are never stored.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="authenticators")
    type = models.CharField(max_length=16, choices=AuthenticatorType.choices)
    secret_encrypted = models.BinaryField(null=True, blank=True, editable=False)
    recovery_code_hashes = models.JSONField(default=list, blank=True, editable=False)
    last_totp_step = models.BigIntegerField(null=True, blank=True, help_text="Last accepted TOTP time step (no replay).")
    confirmed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        constraints = [models.UniqueConstraint(fields=["user", "type"], name="mfa_authenticator_user_type_unique")]

    def __str__(self) -> str:
        """``user: type``."""
        return f"{self.user_id}: {self.type}"


class FavoriteTarget(models.TextChoices):
    """What can be favourited (ACC-09)."""

    LISTING = "listing", "Listing"
    TRIP = "trip", "Trip"


class Favorite(UUIDModel):
    """
    A listing or trip a guest saved (ACC-09).

    The plan has two foreign keys (listing, trip), but ``catalog`` and
    ``trips`` sit above ``accounts`` (07-architecture.md section 3), so the
    target is stored as ``target_type`` + ``target_id`` and checked through
    the hooks of :mod:`apps.accounts.extensions`.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favorites")
    target_type = models.CharField(max_length=8, choices=FavoriteTarget.choices)
    target_id = models.UUIDField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        constraints = [
            models.UniqueConstraint(fields=["user", "target_type", "target_id"], name="favorite_user_target_unique"),
        ]
        indexes = [models.Index(fields=["user", "created_at"], name="favorite_user_created")]


class DsrKind(models.TextChoices):
    """Kinds of data protection request (BR-PRV-02, 08-security-privacy.md 12.5)."""

    ACCESS = "access", "Access to my data"
    RECTIFICATION = "rectification", "Correction"
    DELETION = "deletion", "Deletion"
    OPPOSITION = "opposition", "Opposition"


class DsrStatus(models.TextChoices):
    """Life of a data protection request."""

    OPEN = "open", "Open"
    IN_PROGRESS = "in_progress", "In progress"
    COMPLETED = "completed", "Completed"
    REJECTED = "rejected", "Rejected"


# Statuses of a request still being handled: one per user and kind (409 otherwise).
DSR_OPEN_STATUSES = (DsrStatus.OPEN, DsrStatus.IN_PROGRESS)


class DataSubjectRequest(UUIDModel):
    """
    A person's data protection request (BR-PRV-02, PRV-02).

    ``due_at`` is the legal deadline (30 days, 08-security-privacy.md 12.5).
    A completed deletion request anonymises the profile and keeps bookings,
    ledger lines and invoices under the pseudonymous user id.
    """

    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="data_requests")
    kind = models.CharField(max_length=16, choices=DsrKind.choices)
    status = models.CharField(max_length=12, choices=DsrStatus.choices, default=DsrStatus.OPEN)
    due_at = models.DateTimeField()
    handled_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, help_text="What the person wrote.")
    resolution_notes = models.TextField(blank=True, help_text="What the admin wrote when closing it.")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        ordering = ["due_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "kind"],
                condition=models.Q(status__in=["open", "in_progress"]),
                name="dsr_one_open_per_kind",
            ),
        ]
        indexes = [models.Index(fields=["status", "due_at"], name="dsr_status_due")]


class SocialProvider(models.TextChoices):
    """Outside sign-in providers (ACC-10). Only Google for now."""

    GOOGLE = "google", "Google"


class SocialAccount(UUIDModel):
    """
    A Google (or later other) account linked to a BLADUS user (ACC-10).

    ``subject`` is the provider's stable account id (Google ``sub``), never the
    email: an email can change hands, the subject cannot. One provider account
    links to one BLADUS user only.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="social_accounts")
    provider = models.CharField(max_length=16, choices=SocialProvider.choices)
    subject = models.CharField(max_length=255)
    email = models.EmailField(max_length=254, blank=True, help_text="Email the provider gave at the last sign-in.")
    created_at = models.DateTimeField(default=timezone.now)
    last_login_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        """Database options: one link per provider account, one per provider and user."""
        constraints = [
            models.UniqueConstraint(fields=["provider", "subject"], name="social_account_provider_subject_unique"),
            models.UniqueConstraint(fields=["user", "provider"], name="social_account_user_provider_unique"),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.provider}:{self.email or self.subject}"
