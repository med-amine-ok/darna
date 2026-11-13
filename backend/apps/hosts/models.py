"""
Hosts: who hosts on BLADUS.

Central idea (ADR-001): a **host account** is either one person (solo host)
or one organisation (agency, hotel, hostel). Listings, trips, the deposit
wallet and the commission rate all point to the host account, never directly
to a user. One person can be a solo host and also work in several
organisations (DEC-004).

Rules: BR-ORG-01 to BR-ORG-06, BR-HST-03 to BR-HST-06, DEC-014 (what each
host type may publish), DEC-017 (hotel system connection).
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import SoftDeleteModel, TimeStampedModel, UUIDModel


class HostAccountKind(models.TextChoices):
    """A host account belongs to one person or to one organisation."""

    INDIVIDUAL = "individual", "Individual"
    ORGANIZATION = "organization", "Organisation"


class BusinessCategory(models.TextChoices):
    """Kind of organisation. Never changes after creation (BR-ORG-02)."""

    AGENCY = "agency", "Travel agency"
    HOTEL = "hotel", "Hotel"
    HOSTEL = "hostel", "Hostel"


class VerificationStatus(models.TextChoices):
    """Verification life of a host account (BR-HST-04)."""

    APPLIED = "applied", "Applied"
    UNDER_REVIEW = "under_review", "Under review"
    CHANGES_REQUESTED = "changes_requested", "Changes requested"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    SUSPENDED = "suspended", "Suspended"
    BANNED = "banned", "Banned"


# Allowed moves between verification states: {from: {to, ...}} (BR-HST-04).
VERIFICATION_TRANSITIONS: dict[str, set[str]] = {
    VerificationStatus.APPLIED: {VerificationStatus.UNDER_REVIEW, VerificationStatus.BANNED},
    VerificationStatus.UNDER_REVIEW: {
        VerificationStatus.APPROVED, VerificationStatus.CHANGES_REQUESTED,
        VerificationStatus.REJECTED, VerificationStatus.BANNED,
    },
    VerificationStatus.CHANGES_REQUESTED: {
        VerificationStatus.UNDER_REVIEW, VerificationStatus.REJECTED, VerificationStatus.BANNED,
    },
    VerificationStatus.APPROVED: {
        VerificationStatus.UNDER_REVIEW, VerificationStatus.SUSPENDED, VerificationStatus.BANNED,
    },
    VerificationStatus.REJECTED: {VerificationStatus.APPLIED, VerificationStatus.BANNED},
    VerificationStatus.SUSPENDED: {VerificationStatus.APPROVED, VerificationStatus.BANNED},
    VerificationStatus.BANNED: set(),
}


class ApprovalMode(models.TextChoices):
    """How bookings are confirmed: at once, or after the host accepts."""

    INSTANT = "instant", "Instant booking"
    REQUEST = "request", "Request to book"


class MembershipRole(models.TextChoices):
    """Team roles inside an organisation."""

    OWNER = "owner", "Owner"
    ADMIN = "admin", "Admin"
    MANAGER = "manager", "Manager"
    AGENT = "agent", "Agent"
    GUIDE = "guide", "Guide"


# What each team role may do (BR-ORG-05). A solo host has every permission
# on their own host account.
ROLE_PERMISSIONS: dict[str, set[str]] = {
    MembershipRole.OWNER: {
        "org.edit", "org.delete", "members.manage", "listings.manage", "trips.manage", "calendar.manage",
        "bookings.view", "bookings.respond", "bookings.cancel", "messages.reply", "wallet.view", "payout_details.edit",
    },
    MembershipRole.ADMIN: {
        "org.edit", "members.manage", "listings.manage", "trips.manage", "calendar.manage",
        "bookings.view", "bookings.respond", "bookings.cancel", "messages.reply", "wallet.view",
    },
    MembershipRole.MANAGER: {
        "listings.manage", "trips.manage", "calendar.manage", "bookings.view", "bookings.respond", "messages.reply",
    },
    MembershipRole.AGENT: {"bookings.view", "messages.reply"},
    MembershipRole.GUIDE: {"bookings.view", "messages.reply"},
}
ALL_HOST_PERMISSIONS: set[str] = set().union(*ROLE_PERMISSIONS.values())

# What each host type may publish (DEC-014, BR-HST-05).
HOST_ALLOWED_OFFERS: dict[str, set[str]] = {
    "individual": {"home", "vehicle"},
    "agency": {"experience", "trip"},
    "hotel": {"hotel"},
    "hostel": {"hostel"},
}


class Organization(UUIDModel, TimeStampedModel, SoftDeleteModel):
    """An agency, hotel or hostel business."""

    business_category = models.CharField(max_length=8, choices=BusinessCategory.choices)
    display_name = models.CharField(max_length=120)
    legal_name = models.CharField(max_length=160, blank=True)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.TextField(blank=True)
    source_language = models.CharField(max_length=2, default="fr")
    business_email = models.EmailField(blank=True)
    business_phone_e164 = models.CharField(max_length=16, blank=True)
    commune = models.ForeignKey("geo.Commune", on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    address_line = models.CharField(max_length=255, blank=True)
    # Legal fields: changing one sends the host account back to review (BR-ORG-06).
    rc_number = models.CharField(max_length=32, blank=True, help_text="Registre du commerce.")
    nif = models.CharField(max_length=20, blank=True, help_text="Tax identification number.")
    nis = models.CharField(max_length=20, blank=True, help_text="Statistical identification number.")
    tourism_licence_number = models.CharField(max_length=40, blank=True, help_text="Agencies only.")
    star_rating = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Hotels, 1 to 5.")
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    policies = models.JSONField(default=dict, blank=True, help_text="Hostel age limits, curfew and similar.")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")

    LEGAL_FIELDS = ("legal_name", "rc_number", "nif", "nis", "tourism_licence_number")

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        constraints = [
            models.CheckConstraint(
                condition=models.Q(star_rating__isnull=True) | models.Q(star_rating__gte=1, star_rating__lte=5),
                name="organization_star_rating_range",
            ),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return self.display_name


class HostAccount(UUIDModel, TimeStampedModel, SoftDeleteModel):
    """The one who hosts: exactly one of ``user`` (solo host) or ``organization``."""

    kind = models.CharField(max_length=12, choices=HostAccountKind.choices)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="host_account"
    )
    organization = models.OneToOneField(
        Organization, on_delete=models.PROTECT, null=True, blank=True, related_name="host_account"
    )
    verification_status = models.CharField(
        max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.APPLIED
    )
    default_approval_mode = models.CharField(max_length=8, choices=ApprovalMode.choices, default=ApprovalMode.REQUEST)
    commission_rate_override_bp = models.PositiveIntegerField(
        null=True, blank=True, help_text="Empty = default rate of the host type. 1200 = 12 %."
    )
    credit_limit_override_minor = models.BigIntegerField(null=True, blank=True)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    review_count = models.PositiveIntegerField(default=0)
    submitted_at = models.DateTimeField(null=True, blank=True, help_text="Last time sent for review.")
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        constraints = [
            # ADR-001: a host account is one person or one organisation, never both, never none.
            models.CheckConstraint(
                condition=(
                    models.Q(kind="individual", user__isnull=False, organization__isnull=True)
                    | models.Q(kind="organization", organization__isnull=False, user__isnull=True)
                ),
                name="host_account_one_owner",
            ),
            models.CheckConstraint(
                condition=models.Q(commission_rate_override_bp__isnull=True)
                | models.Q(commission_rate_override_bp__lte=10000),
                name="host_account_commission_range",
            ),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return str(self.organization or self.user)

    @property
    def host_type(self) -> str:
        """``individual``, ``agency``, ``hotel`` or ``hostel``: drives commission and what may be published."""
        return self.organization.business_category if self.organization_id else "individual"

    @property
    def display_name(self) -> str:
        """Public name of the host."""
        return self.organization.display_name if self.organization_id else self.user.display_name

    @property
    def is_approved(self) -> bool:
        """True when the admin approved this host."""
        return self.verification_status == VerificationStatus.APPROVED

    def may_offer(self, offer: str) -> bool:
        """True when this host type may publish ``offer`` (home, vehicle, experience, trip, hotel, hostel)."""
        return offer in HOST_ALLOWED_OFFERS.get(self.host_type, set())

    def can_move_to(self, new_status: str) -> bool:
        """True when the verification state machine allows ``current -> new_status``."""
        return new_status in VERIFICATION_TRANSITIONS.get(self.verification_status, set())


class Membership(UUIDModel):
    """A person working in an organisation with a team role."""

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=8, choices=MembershipRole.choices)
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(default=timezone.now)
    removed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        constraints = [
            # One active membership per person and organisation.
            models.UniqueConstraint(
                fields=["organization", "user"], condition=models.Q(is_active=True), name="membership_active_unique"
            ),
            # BR-ORG-04: exactly one active owner per organisation.
            models.UniqueConstraint(
                fields=["organization"], condition=models.Q(role="owner", is_active=True), name="membership_one_owner"
            ),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.user} @ {self.organization} ({self.role})"

    @property
    def permissions(self) -> set[str]:
        """Permission codes of this member's role."""
        return ROLE_PERMISSIONS.get(self.role, set())


class InvitationStatus(models.TextChoices):
    """Life of a team invitation."""

    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    REVOKED = "revoked", "Revoked"
    EXPIRED = "expired", "Expired"


class Invitation(UUIDModel):
    """Invitation to join an organisation (BR-ORG-03). Expires after 7 days; accepted once."""

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="invitations")
    email = models.EmailField(blank=True)
    phone_e164 = models.CharField(max_length=16, blank=True)
    role = models.CharField(max_length=8, choices=MembershipRole.choices)
    token_hash = models.CharField(max_length=64, unique=True, help_text="SHA-256 of the one-time token sent to the invitee.")
    status = models.CharField(max_length=8, choices=InvitationStatus.choices, default=InvitationStatus.PENDING)
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    expires_at = models.DateTimeField()
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        constraints = [
            models.CheckConstraint(condition=~models.Q(role="owner"), name="invitation_not_owner"),
            models.CheckConstraint(
                condition=~models.Q(email="") | ~models.Q(phone_e164=""), name="invitation_email_or_phone"
            ),
        ]


class DocumentType(models.TextChoices):
    """Kinds of verification documents (BR-HST-03)."""

    NATIONAL_ID = "national_id", "National ID"
    PASSPORT = "passport", "Passport"
    PROPERTY_PROOF = "property_proof", "Proof of ownership or lease"
    COMMERCIAL_REGISTER = "commercial_register", "Commerce register (RC)"
    TAX_CARD_NIF = "tax_card_nif", "Tax card (NIF)"
    STATISTICS_NIS = "statistics_nis", "Statistics number (NIS)"
    TOURISM_LICENCE = "tourism_licence", "Tourism licence"
    HOTEL_CLASSIFICATION = "hotel_classification", "Hotel classification"
    OPERATING_AUTHORISATION = "operating_authorisation", "Operating authorisation"
    VEHICLE_REGISTRATION = "vehicle_registration", "Vehicle registration"
    VEHICLE_INSURANCE = "vehicle_insurance", "Vehicle insurance"
    OTHER = "other", "Other"


# Documents a host type must have approved before the host can be approved.
REQUIRED_DOCUMENTS: dict[str, set[str]] = {
    "individual": {DocumentType.NATIONAL_ID},
    "agency": {DocumentType.COMMERCIAL_REGISTER, DocumentType.TAX_CARD_NIF, DocumentType.TOURISM_LICENCE},
    "hotel": {DocumentType.COMMERCIAL_REGISTER, DocumentType.TAX_CARD_NIF},
    "hostel": {DocumentType.COMMERCIAL_REGISTER},
}


class DocumentStatus(models.TextChoices):
    """Review state of one document."""

    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class HostDocument(UUIDModel, SoftDeleteModel):
    """
    A verification document. Each one is reviewed on its own (BR-HST-03).

    File storage with private buckets is not built yet: this version stores
    the location given by the client in ``file_url``.
    """

    host_account = models.ForeignKey(HostAccount, on_delete=models.CASCADE, related_name="documents")
    doc_type = models.CharField(max_length=32, choices=DocumentType.choices)
    file_url = models.CharField(max_length=500)
    status = models.CharField(max_length=8, choices=DocumentStatus.choices, default=DocumentStatus.PENDING)
    rejection_reason = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)


class PropertyIntegration(UUIDModel):
    """
    Connection to a hotel's own system (DEC-017, BR-HST-06).

    This version stores the connection and lets a hotel declare it; the
    adapters that actually pull rooms and availability from each system are
    the next step (one small adapter per system).
    """

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="integrations")
    kind = models.CharField(
        max_length=20,
        choices=[("channel_manager", "Channel manager"), ("pms", "Hotel management system"), ("ical", "iCal link"), ("csv_import", "CSV import")],
    )
    system_name = models.CharField(max_length=60)
    base_url = models.CharField(max_length=255, blank=True)
    credentials_encrypted = models.BinaryField(null=True, blank=True, help_text="Access key, encrypted before storage.")
    status = models.CharField(max_length=12, default="pending", help_text="pending, active, error or disabled.")
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(default=timezone.now)
