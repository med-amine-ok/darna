"""Read-only queries of the config app (BR-CFG-01). Nothing here writes."""

from .models import PlatformSettings
from .services import get_settings

# Keys any visitor may read: nothing about money limits or internal thresholds.
PUBLIC_KEYS = ("commission_bp", "request_ttl_hours", "instant_booking_enabled", "maintenance_mode")


def current_version() -> PlatformSettings | None:
    """The settings row in force, or ``None`` while only the defaults exist."""
    return PlatformSettings.objects.select_related("created_by").filter(is_current=True).first()


def public_settings() -> dict:
    """The subset of the current settings the apps may show to anyone (``GET /settings/public``)."""
    values = get_settings()
    return {key: values[key] for key in PUBLIC_KEYS}
