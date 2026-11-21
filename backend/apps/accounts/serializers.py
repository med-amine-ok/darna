"""Input and output shapes of the accounts API."""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.geo.models import Commune

from . import extensions
from .models import (
    ConsentDocument,
    ConsentRecord,
    DataSubjectRequest,
    DsrKind,
    DsrStatus,
    FavoriteTarget,
    MfaAuthenticator,
    StaffProfile,
    StaffRole,
    User,
    phone_validator,
)
from .selectors import user_has_mfa


class SignupSerializer(serializers.Serializer):
    """Body of ``POST /auth/signup``."""

    email = serializers.EmailField(required=False, allow_null=True)
    phone = serializers.CharField(required=False, allow_null=True, validators=[phone_validator])
    password = serializers.CharField(required=False, allow_null=True, write_only=True, min_length=8, max_length=128)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=80)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=80)
    locale = serializers.ChoiceField(choices=["en", "fr", "ar"], default="fr")
    accept_terms_version = serializers.CharField(max_length=32, help_text="Version of the terms the person accepted.")


class LoginSerializer(serializers.Serializer):
    """Body of ``POST /auth/login`` (email and password)."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, max_length=128)


class CodeRequestSerializer(serializers.Serializer):
    """Body of ``POST /auth/code/request``: ask for a sign-in code by SMS."""

    phone = serializers.CharField(validators=[phone_validator])


class CodeConfirmSerializer(serializers.Serializer):
    """Body of ``POST /auth/code/confirm``: sign in with the code received."""

    phone = serializers.CharField(validators=[phone_validator])
    code = serializers.RegexField(r"^[0-9]{6}$")


class PhoneSerializer(serializers.Serializer):
    """Body of ``PUT /me/phone``."""

    phone = serializers.CharField(validators=[phone_validator])


class PhoneVerifySerializer(serializers.Serializer):
    """Body of ``POST /auth/phone/verify``."""

    code = serializers.RegexField(r"^[0-9]{6}$")


class PasswordChangeSerializer(serializers.Serializer):
    """Body of ``POST /auth/password/change`` and ``POST /admin/auth/password/change`` (ACC-04)."""

    current_password = serializers.CharField(write_only=True, max_length=256)
    new_password = serializers.CharField(write_only=True, min_length=8, max_length=256)


class MeSerializer(serializers.ModelSerializer):
    """The signed-in user's own profile (private view)."""

    display_name = serializers.CharField(read_only=True)
    email_verified = serializers.SerializerMethodField()
    phone = serializers.CharField(source="phone_e164", read_only=True)
    phone_verified = serializers.BooleanField(read_only=True)
    is_admin = serializers.BooleanField(read_only=True)
    is_host = serializers.SerializerMethodField()
    has_mfa = serializers.SerializerMethodField()
    profile_missing = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads or writes."""
        model = User
        fields = [
            "id", "email", "email_verified", "phone", "phone_verified",
            "first_name_latin", "last_name_latin", "full_name_ar", "display_name",
            "bio", "spoken_languages", "home_commune", "address_line",
            "preferred_locale", "status", "is_admin", "is_host", "has_mfa", "date_joined", "handle",
            "date_of_birth", "profile_completed_at", "profile_missing", "avatar_url",
        ]
        read_only_fields = fields

    def get_email_verified(self, user: User) -> bool:
        """True when the email was confirmed."""
        return user.email_verified_at is not None

    def get_is_host(self, user: User) -> bool:
        """True when the user hosts alone or belongs to an organisation."""
        from apps.hosts.selectors import user_is_host  # local import: hosts is a higher layer

        return user_is_host(user)

    def get_profile_missing(self, user: User) -> list[str]:
        """Required steps of 'complete your profile' still to do: ``name``, ``phone``, ``date_of_birth`` (ACC-11)."""
        from .services import profile_missing_steps

        return profile_missing_steps(user)

    def get_has_mfa(self, user: User) -> bool:
        """True when an authenticator app is enrolled (BR-ACC-04)."""
        return user_has_mfa(user)


class MeUpdateSerializer(serializers.Serializer):
    """Body of ``PATCH /me``. Only these fields can be edited; email and phone have their own endpoints."""

    first_name_latin = serializers.CharField(required=False, allow_blank=True, max_length=80)
    last_name_latin = serializers.CharField(required=False, allow_blank=True, max_length=80)
    full_name_ar = serializers.CharField(required=False, allow_blank=True, max_length=160)
    bio = serializers.CharField(required=False, allow_blank=True, max_length=500)
    spoken_languages = serializers.ListField(child=serializers.RegexField(r"^[a-z]{2}$"), required=False, max_length=10)
    home_commune = serializers.PrimaryKeyRelatedField(queryset=Commune.objects.all(), required=False, allow_null=True)
    address_line = serializers.CharField(required=False, allow_blank=True, max_length=255)
    preferred_locale = serializers.ChoiceField(choices=["en", "fr", "ar"], required=False)
    date_of_birth = serializers.DateField(required=False, help_text="Must make the person an adult (ACC-11).")
    handle = serializers.CharField(
        required=False, max_length=30,
        help_text="Public profile link name: 3 to 30 lower-case letters, digits or hyphens (ACC-06).",
    )


class OrganizationRefSerializer(serializers.Serializer):
    """An organisation on a public profile: slug, name and the person's role."""

    slug = serializers.CharField()
    display_name = serializers.CharField()
    role = serializers.CharField(required=False)


class PublicUserSerializer(serializers.ModelSerializer):
    """
    What other people may see of a user (getPublicUser): no email, phone, address or family name.

    Host facts (rating, organisations, identity check) come from the apps that
    own them through :func:`apps.accounts.extensions.public_profile_facts`.
    """

    display_name = serializers.CharField(read_only=True)
    joined_year = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    is_host = serializers.SerializerMethodField()
    identity_verified = serializers.SerializerMethodField()
    host_rating_avg = serializers.SerializerMethodField()
    host_review_count = serializers.SerializerMethodField()
    organizations = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads or writes."""
        model = User
        fields = [
            "id", "handle", "display_name", "avatar_url", "bio", "spoken_languages", "joined_year", "is_host",
            "identity_verified", "host_rating_avg", "host_review_count", "organizations",
        ]

    def _facts(self, user: User) -> dict:
        """Fields provided by higher apps, computed once per user."""
        cache = self.context.setdefault("_public_facts", {})
        if user.pk not in cache:
            cache[user.pk] = extensions.public_profile_facts(user)
        return cache[user.pk]

    def get_joined_year(self, user: User) -> int:
        """Year the account was created."""
        return user.date_joined.year

    def get_avatar_url(self, user: User) -> str | None:
        """The profile picture: the user's own (Google photo for now), else one a provider registered."""
        return user.avatar_url or self._facts(user).get("avatar_url")

    def get_is_host(self, user: User) -> bool:
        """True when the user hosts alone or belongs to an organisation."""
        from apps.hosts.selectors import user_is_host  # local import, as in MeSerializer

        return user_is_host(user)

    def get_identity_verified(self, user: User) -> bool:
        """True when a host identity check was approved (hosts app)."""
        return bool(self._facts(user).get("identity_verified", False))

    def get_host_rating_avg(self, user: User) -> float | None:
        """Average rating received as a host (reviews app)."""
        return self._facts(user).get("host_rating_avg")

    def get_host_review_count(self, user: User) -> int:
        """Number of reviews received as a host (reviews app)."""
        return int(self._facts(user).get("host_review_count", 0))

    @extend_schema_field(OrganizationRefSerializer(many=True))
    def get_organizations(self, user: User) -> list[dict]:
        """Organisations the person belongs to: ``[{slug, display_name, role}]`` (hosts app)."""
        return list(self._facts(user).get("organizations", []))


# ---------------------------------------------------------------------------
# Session answers (allauth-like envelope of openapi ``Session``)
# ---------------------------------------------------------------------------
class PendingFlowSerializer(serializers.Serializer):
    """A step still needed before the session is complete."""

    id = serializers.ChoiceField(
        choices=["verify_email", "verify_phone", "login_by_code", "mfa_authenticate", "password_reset_by_code"]
    )
    is_pending = serializers.BooleanField()


class SessionSerializer(serializers.Serializer):
    """
    Answer of sign-up, sign-in, email verification and password reset (openapi ``Session``).

    ``status`` is ``pending_flow`` while the second factor is due (BR-ACC-04);
    then ``user`` is null. ``token`` repeats ``session_token`` for older
    clients. ``mfa_enrolled`` tells the admin app whether to ask for a code
    or for the enrolment (staff sign-in).
    """

    status = serializers.ChoiceField(choices=["authenticated", "pending_flow"])
    user = MeSerializer(allow_null=True)
    pending_flows = PendingFlowSerializer(many=True)
    session_token = serializers.CharField(required=False)
    token = serializers.CharField(required=False)
    expires_at = serializers.DateTimeField(allow_null=True)
    mfa_enrolled = serializers.BooleanField(required=False)


# ---------------------------------------------------------------------------
# Email verification, password reset (ACC-01, ACC-04)
# ---------------------------------------------------------------------------
class EmailVerifySerializer(serializers.Serializer):
    """
    Body of ``POST /auth/email/verify``: ``email`` + ``code`` (the 6-digit
    sign-up code, ACC-01), or ``key`` (the link sent after an email change).
    """

    email = serializers.EmailField(required=False)
    code = serializers.RegexField(r"^\s*[0-9]{6}\s*$", required=False)
    key = serializers.CharField(max_length=512, required=False)

    def validate(self, attrs):
        """Exactly one way: email and code together, or a key."""
        has_code = bool(attrs.get("email")) and bool(attrs.get("code"))
        if has_code == bool(attrs.get("key")):
            raise serializers.ValidationError("Send email and code, or key.", code="invalid")
        if has_code:
            attrs["code"] = attrs["code"].strip()
        return attrs


class EmailResendSerializer(serializers.Serializer):
    """Body of ``POST /auth/email/resend`` when not signed in: the sign-up email and password (ACC-01)."""

    email = serializers.EmailField()
    password = serializers.CharField(max_length=128, trim_whitespace=False)


class SignupPendingSerializer(serializers.Serializer):
    """Answer of an email sign-up: no session until the emailed code is confirmed (ACC-01)."""

    status = serializers.CharField(default="pending_flow")
    user = serializers.JSONField(allow_null=True, default=None)
    pending_flows = serializers.ListField(child=serializers.DictField())
    email = serializers.EmailField()


class PasswordResetRequestSerializer(serializers.Serializer):
    """Body of ``POST /auth/password/request``: an email (link) or a phone (SMS code)."""

    email = serializers.EmailField(required=False)
    phone = serializers.CharField(required=False, validators=[phone_validator])

    def validate(self, attrs):
        """One of email or phone is needed."""
        if not attrs.get("email") and not attrs.get("phone"):
            raise serializers.ValidationError({"email": ["Give an email or a phone number."]})
        return attrs


class PasswordResetSerializer(serializers.Serializer):
    """
    Body of ``POST /auth/password/reset``.

    ``key``: the key of the emailed link, or the 6-digit SMS code. ``phone``
    (optional, not in openapi) lets the SMS code be checked against one number.
    """

    key = serializers.CharField(max_length=512)
    password = serializers.CharField(write_only=True, min_length=8, max_length=256)
    phone = serializers.CharField(required=False, validators=[phone_validator])


# ---------------------------------------------------------------------------
# Second factor (BR-ACC-04)
# ---------------------------------------------------------------------------
class MfaAuthenticateSerializer(serializers.Serializer):
    """Body of ``POST /auth/2fa/authenticate`` and ``POST /admin/auth/2fa/authenticate``."""

    code = serializers.CharField(max_length=32, help_text="6-digit TOTP code or a recovery code.")


class TotpCodeSerializer(serializers.Serializer):
    """Body of the TOTP enrolment (openapi ``CodeConfirm``)."""

    code = serializers.RegexField(r"^[0-9]{6}$")


class TotpSetupSerializer(serializers.Serializer):
    """Secret to enrol, shown as a QR code by the app (openapi ``TotpSetup``)."""

    secret = serializers.CharField()
    totp_url = serializers.CharField()


class AuthenticatorSerializer(serializers.ModelSerializer):
    """One second factor (openapi ``Authenticator``). Never shows a secret."""

    class Meta:
        """Model and fields this serializer reads."""
        model = MfaAuthenticator
        fields = ["id", "type", "created_at", "last_used_at"]
        read_only_fields = fields


class AuthenticatorCreatedSerializer(serializers.Serializer):
    """Enrolment answer: the authenticator plus the 10 recovery codes, shown this one time only."""

    id = serializers.UUIDField()
    type = serializers.CharField()
    created_at = serializers.DateTimeField()
    last_used_at = serializers.DateTimeField(allow_null=True)
    recovery_codes = serializers.ListField(child=serializers.CharField())


# ---------------------------------------------------------------------------
# Staff (STF-01, STF-02, STF-05)
# ---------------------------------------------------------------------------
class AdminLoginSerializer(serializers.Serializer):
    """Body of ``POST /admin/auth/login`` (openapi ``LoginRequest``): email or phone, and password."""

    email = serializers.EmailField(required=False, max_length=254)
    phone = serializers.CharField(required=False, validators=[phone_validator])
    password = serializers.CharField(write_only=True, max_length=256)

    def validate(self, attrs):
        """One of email or phone is needed."""
        if not attrs.get("email") and not attrs.get("phone"):
            raise serializers.ValidationError({"email": ["Give an email or a phone number."]})
        return attrs


class StaffInviteAcceptSerializer(serializers.Serializer):
    """Body of ``POST /admin/auth/invitations/accept``."""

    token = serializers.CharField(max_length=128)
    password = serializers.CharField(write_only=True, min_length=12, max_length=256)


class StaffMemberSerializer(serializers.ModelSerializer):
    """A staff member (openapi ``StaffMember``)."""

    user_id = serializers.UUIDField(read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    display_name = serializers.CharField(source="user.display_name", read_only=True)
    mfa_enrolled = serializers.SerializerMethodField()
    last_login_at = serializers.DateTimeField(source="user.last_login", read_only=True)

    class Meta:
        """Model and fields this serializer reads."""
        model = StaffProfile
        fields = [
            "user_id", "email", "display_name", "role", "status", "mfa_enrolled",
            "invited_at", "activated_at", "last_login_at",
        ]
        read_only_fields = fields

    def get_mfa_enrolled(self, profile: StaffProfile) -> bool:
        """True when the staff member has an authenticator app (``mfa_user_ids`` in context saves a query per row)."""
        known = self.context.get("mfa_user_ids")
        if known is not None:
            return profile.user_id in known
        return user_has_mfa(profile.user)


class StaffRoleSerializer(serializers.Serializer):
    """A role and its permissions (openapi ``StaffRole``)."""

    role = serializers.ChoiceField(choices=StaffRole.choices)
    label = serializers.CharField()
    permissions = serializers.ListField(child=serializers.CharField())


class StaffInviteSerializer(serializers.Serializer):
    """Body of ``POST /admin/staff/invitations``."""

    email = serializers.EmailField()
    display_name = serializers.CharField(max_length=160)
    role = serializers.ChoiceField(choices=StaffRole.choices)


class StaffUpdateSerializer(serializers.Serializer):
    """Body of ``PATCH /admin/staff/{staff_id}``."""

    role = serializers.ChoiceField(choices=StaffRole.choices)


class StaffSessionSerializer(serializers.Serializer):
    """Answer of ``GET /admin/auth/session`` and of the staff second step (openapi ``StaffSession``)."""

    user = StaffMemberSerializer()
    permissions = serializers.ListField(child=serializers.CharField())
    mfa_verified = serializers.BooleanField()
    expires_at = serializers.DateTimeField()
    session_token = serializers.CharField(required=False)


# ---------------------------------------------------------------------------
# Admin users (ACC-08, STF-03)
# ---------------------------------------------------------------------------
class AdminUserMoneySerializer(serializers.Serializer):
    """An amount in centimes and its currency (BR-PAY-01)."""

    amount_minor = serializers.IntegerField()
    currency = serializers.CharField()


class AdminUserSerializer(serializers.ModelSerializer):
    """
    A user as admins see it (openapi ``AdminUser``).

    Booking count, total booked and open flags come from the apps that own
    them (:func:`apps.accounts.extensions.admin_user_facts`, given in the
    context as ``facts`` by the view); without them the defaults are 0 and null.
    """

    display_name = serializers.CharField(read_only=True)
    email_verified = serializers.SerializerMethodField()
    phone_verified = serializers.BooleanField(read_only=True)
    is_host = serializers.SerializerMethodField()
    host_account_ids = serializers.SerializerMethodField()
    booking_count = serializers.SerializerMethodField()
    total_booked = serializers.SerializerMethodField()
    open_flags = serializers.SerializerMethodField()
    last_login_at = serializers.DateTimeField(source="last_login", read_only=True)

    class Meta:
        """Model and fields this serializer reads."""
        model = User
        fields = [
            "id", "display_name", "email", "phone_e164", "email_verified", "phone_verified", "status",
            "is_host", "host_account_ids", "booking_count", "total_booked", "open_flags",
            "date_joined", "last_login_at", "deleted_at",
        ]
        read_only_fields = fields

    def _facts(self, user: User) -> dict:
        """Fields from higher apps for this user (empty when none registered)."""
        facts = self.context.setdefault("facts", {})
        if user.pk not in facts:
            facts.update(extensions.admin_user_facts([user.pk]))
        return facts.get(user.pk, {})

    def get_email_verified(self, user: User) -> bool:
        """True when the email was confirmed."""
        return user.email_verified_at is not None

    def get_is_host(self, user: User) -> bool:
        """True when the user hosts alone or belongs to an organisation."""
        facts = self._facts(user)
        if "is_host" in facts:
            return bool(facts["is_host"])
        from apps.hosts.selectors import user_is_host  # local import, as in MeSerializer

        return user_is_host(user)

    def get_host_account_ids(self, user: User) -> list[str]:
        """Host accounts the user holds (own or through a membership)."""
        facts = self._facts(user)
        if "host_account_ids" in facts:
            return [str(value) for value in facts["host_account_ids"]]
        from apps.hosts.selectors import host_accounts_for  # local import, as in MeSerializer

        return [str(account.id) for account, _ in host_accounts_for(user)]

    def get_booking_count(self, user: User) -> int:
        """Bookings made as a guest (bookings app)."""
        return int(self._facts(user).get("booking_count", 0))

    @extend_schema_field(AdminUserMoneySerializer(allow_null=True))
    def get_total_booked(self, user: User) -> dict | None:
        """Total booked as a guest, ``{"amount_minor", "currency"}`` (bookings app)."""
        return self._facts(user).get("total_booked")

    def get_open_flags(self, user: User) -> int:
        """Open risk flags (trust app)."""
        return int(self._facts(user).get("open_flags", 0))


class UserActionReasonSerializer(serializers.Serializer):
    """Body of the admin user actions (openapi ``Reason``)."""

    reason_code = serializers.CharField(required=False, allow_null=True, max_length=64)
    reason = serializers.CharField(min_length=10, max_length=2000)


# ---------------------------------------------------------------------------
# Privacy (BR-PRV-01, BR-PRV-02)
# ---------------------------------------------------------------------------
class ConsentSerializer(serializers.ModelSerializer):
    """One consent row (openapi ``Consent``)."""

    class Meta:
        """Model and fields this serializer reads."""
        model = ConsentRecord
        fields = ["document", "version", "accepted", "created_at"]
        read_only_fields = fields


class ConsentCreateSerializer(serializers.Serializer):
    """Body of ``POST /me/consents``."""

    document = serializers.ChoiceField(choices=ConsentDocument.choices)
    version = serializers.CharField(max_length=32)
    accepted = serializers.BooleanField()


class DataSubjectRequestSerializer(serializers.ModelSerializer):
    """A data protection request as its author sees it (openapi ``DataSubjectRequest``)."""

    export_url = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads."""
        model = DataSubjectRequest
        fields = ["id", "kind", "status", "due_at", "created_at", "completed_at", "export_url"]
        read_only_fields = fields

    def get_export_url(self, request: DataSubjectRequest) -> str | None:
        """Download link of an access export; the export job does not exist yet, so always null."""
        return None


class DsrUserRefSerializer(serializers.Serializer):
    """A person as shown to others: id and display name only (openapi ``UserRef``)."""

    id = serializers.UUIDField()
    display_name = serializers.CharField()
    avatar_url = serializers.SerializerMethodField()

    def get_avatar_url(self, user) -> str | None:
        """The person's profile picture, when they have one."""
        return getattr(user, "avatar_url", "") or None


class DataSubjectRequestAdminSerializer(DataSubjectRequestSerializer):
    """A data protection request as admins see it (openapi ``DataSubjectRequestAdmin``)."""

    user = DsrUserRefSerializer(read_only=True)
    handled_by = DsrUserRefSerializer(read_only=True, allow_null=True)
    notes = serializers.SerializerMethodField()

    class Meta(DataSubjectRequestSerializer.Meta):
        """Adds the person, the handler and the notes."""
        fields = [*DataSubjectRequestSerializer.Meta.fields, "user", "notes", "handled_by"]
        read_only_fields = fields

    def get_notes(self, request: DataSubjectRequest) -> str | None:
        """The person's notes, then the admin's closing notes."""
        parts = [part for part in (request.notes, request.resolution_notes) if part]
        return "\n\n".join(parts) or None


class DataSubjectRequestCreateSerializer(serializers.Serializer):
    """Body of ``POST /me/data-requests``."""

    kind = serializers.ChoiceField(choices=DsrKind.choices)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class DataSubjectRequestCompleteSerializer(serializers.Serializer):
    """Body of ``POST /admin/data-requests/{id}/complete``."""

    outcome = serializers.ChoiceField(choices=[DsrStatus.COMPLETED.value, DsrStatus.REJECTED.value])
    notes = serializers.CharField(min_length=10, max_length=5000)


# ---------------------------------------------------------------------------
# Favourites (ACC-09)
# ---------------------------------------------------------------------------
class FavoriteSerializer(serializers.Serializer):
    """
    One favourite (openapi ``Favorite``).

    ``listing`` or ``trip`` holds the card from the owning app, or null when
    that app has not registered its card hook yet (:mod:`apps.accounts.extensions`).
    """

    target_type = serializers.ChoiceField(choices=FavoriteTarget.choices)
    target_id = serializers.UUIDField()
    listing = serializers.DictField(allow_null=True)
    trip = serializers.DictField(allow_null=True)
    is_available = serializers.BooleanField()
    created_at = serializers.DateTimeField()


class FavoritePageSerializer(serializers.Serializer):
    """Cursor page of favourites (``next_cursor`` goes back as ``cursor``)."""

    results = FavoriteSerializer(many=True)
    next_cursor = serializers.CharField(allow_null=True)
    has_more = serializers.BooleanField()


class GoogleSignInSerializer(serializers.Serializer):
    """Body of ``POST /auth/google`` (ACC-10): what Google returned to the website, plus the PKCE verifier."""

    code = serializers.CharField(max_length=2048)
    code_verifier = serializers.CharField(min_length=43, max_length=128)
    redirect_uri = serializers.URLField(max_length=255)
    accept_terms_version = serializers.CharField(required=False, allow_blank=True, max_length=32)
    locale = serializers.ChoiceField(choices=["en", "fr", "ar"], default="fr")


class AuthProvidersSerializer(serializers.Serializer):
    """``GET /auth/providers``: which outside sign-ins are on, the public Google client id, and whether phones need an SMS code."""

    google_enabled = serializers.BooleanField()
    google_client_id = serializers.CharField(allow_blank=True)
    phone_otp_required = serializers.BooleanField()


class SocialAccountSerializer(serializers.Serializer):
    """A connected sign-in account shown in Settings (ACC-10)."""

    id = serializers.UUIDField()
    provider = serializers.CharField()
    email = serializers.EmailField()
    created_at = serializers.DateTimeField()
    last_login_at = serializers.DateTimeField(allow_null=True)

