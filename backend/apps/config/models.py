"""
Platform settings kept in the database (BR-CFG-01).

Each change creates a new version, so we always know who changed what and
when, and old bookings keep the values they were created with.
"""

from django.conf import settings as django_settings
from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel

# Keys an admin may set, with the default used when a key is missing.
DEFAULTS: dict = {
    # Commission by host type, in basis points (1200 = 12 %). BR-PAY-06.
    "commission_bp": dict(django_settings.DEFAULT_COMMISSION_BP),
    # Hours a host has to answer a booking request. BR-BKG-04.
    "request_ttl_hours": django_settings.DEFAULT_REQUEST_TTL_HOURS,
    # How far below zero a host deposit may go, in centimes. BR-PAY-10.
    "credit_limit_minor": django_settings.DEFAULT_CREDIT_LIMIT_MINOR,
    # Top-ups above this amount need a second admin. BR-PAY-07.
    "topup_four_eyes_minor": django_settings.TOPUP_FOUR_EYES_MINOR,
    # Manual ledger adjustments: largest absolute amount of one adjustment, in centimes (review R6).
    "adjustment_max_minor": 1_000_000 * 100,
    # Days a host has to pay back a guest after a cancellation (review R8).
    "refund_due_days": 7,
    # Booking abuse limits per guest (review R13).
    "max_pending_requests_per_guest": 3,
    "max_upcoming_bookings_per_guest": 6,
    # False forces every booking to be a request, whatever the listing says. BR-BKG-02.
    "instant_booking_enabled": True,
    # True closes the public API for maintenance.
    "maintenance_mode": False,
}


class PlatformSettings(UUIDModel):
    """One version of the platform settings. Exactly one row has ``is_current=True``."""

    version = models.PositiveIntegerField(unique=True)
    data = models.JSONField(default=dict, help_text="Only keys listed in config.models.DEFAULTS.")
    is_current = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        constraints = [
            models.UniqueConstraint(fields=["is_current"], condition=models.Q(is_current=True), name="settings_one_current"),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"settings v{self.version}"


class FlowStatus(models.TextChoices):
    """Life of one onboarding flow version (BR-CFG-02); matches the ``flow_status`` enum of the plan."""

    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    ARCHIVED = "archived", "Archived"


class OnboardingHostType(models.TextChoices):
    """The four host types that have their own become-a-host wizard (BR-HST-01, DEC-007)."""

    INDIVIDUAL = "individual", "Individual"
    AGENCY = "agency", "Travel agency"
    HOTEL = "hotel", "Hotel"
    HOSTEL = "hostel", "Hostel"


# Canonical field types of an onboarding flow (BR-CFG-03).
ONBOARDING_FIELD_TYPES = (
    "text", "textarea", "number", "select", "multi_select", "image_upload", "file_upload", "toggle", "location",
    "amenities",
)


class OnboardingFlowVersion(UUIDModel):
    """
    One version of the become-a-host wizard of a host type (BR-CFG-02, BR-HST-01).

    Per host type there is at most one ``draft`` (edited by admins) and one
    ``published`` version (served to the website); older published versions
    become ``archived``. A published or archived row never changes again:
    host drafts keep pointing at the version they started from (BR-HST-02).
    ``schema`` is ``{"steps": [...]}`` with canonical field types (BR-CFG-03).
    """

    host_type = models.CharField(max_length=12, choices=OnboardingHostType.choices)
    version = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=FlowStatus.choices, default=FlowStatus.DRAFT)
    schema = models.JSONField(default=dict, help_text='{"steps": [...]}: steps and fields (BR-CFG-03).')
    published_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now, help_text="Last save of a draft (ETag of the draft).")

    class Meta:
        """Database options: one row per (host type, version), one draft and one published version per host type."""
        constraints = [
            models.UniqueConstraint(fields=["host_type", "version"], name="onboarding_flow_version_unique"),
            models.UniqueConstraint(
                fields=["host_type"], condition=models.Q(status="draft"), name="onboarding_flow_one_draft"
            ),
            models.UniqueConstraint(
                fields=["host_type"], condition=models.Q(status="published"), name="onboarding_flow_one_published"
            ),
        ]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.host_type} onboarding v{self.version} ({self.status})"

    @property
    def steps(self) -> list[dict]:
        """The steps of this version (empty list when the schema holds none)."""
        return list((self.schema or {}).get("steps") or [])
