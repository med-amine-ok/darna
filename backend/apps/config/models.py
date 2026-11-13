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
