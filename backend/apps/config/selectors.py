"""Read-only queries of the config app (BR-CFG-01, BR-CFG-02). Nothing here writes."""

from django.db.models import QuerySet

from .models import FlowStatus, OnboardingFlowVersion, OnboardingHostType, PlatformSettings
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


def settings_versions() -> QuerySet[PlatformSettings]:
    """Every settings version, newest first (``GET /admin/settings/versions``, BR-CFG-01)."""
    return PlatformSettings.objects.select_related("created_by").order_by("-version")


def published_flow(host_type: str) -> OnboardingFlowVersion | None:
    """The onboarding flow version in force for a host type, or ``None`` (BR-HST-01)."""
    return OnboardingFlowVersion.objects.filter(host_type=host_type, status=FlowStatus.PUBLISHED).first()


def flow_versions(host_type: str) -> QuerySet[OnboardingFlowVersion]:
    """Every version of one flow, draft included, newest number first (BR-CFG-02)."""
    return OnboardingFlowVersion.objects.filter(host_type=host_type).order_by("-version")


def flow_version(host_type: str, version: int) -> OnboardingFlowVersion | None:
    """One version of one flow, or ``None``."""
    return OnboardingFlowVersion.objects.filter(host_type=host_type, version=version).first()


def flow_by_id(flow_version_id) -> OnboardingFlowVersion | None:
    """A flow version by its id (host drafts point at it, BR-HST-02), or ``None``."""
    return OnboardingFlowVersion.objects.filter(pk=flow_version_id).first()


def flow_summaries() -> list[dict]:
    """
    One line per host type: published and draft version numbers and dates
    (``GET /admin/onboarding-flows``, BR-CFG-02).
    """
    rows = OnboardingFlowVersion.objects.filter(status__in=[FlowStatus.PUBLISHED, FlowStatus.DRAFT])
    by_type: dict[str, dict] = {
        host_type: {"host_type": host_type, "published_version": None, "draft_version": None,
                    "published_at": None, "draft_updated_at": None}
        for host_type in OnboardingHostType.values
    }
    for row in rows:
        line = by_type[row.host_type]
        if row.status == FlowStatus.PUBLISHED:
            line["published_version"], line["published_at"] = row.version, row.published_at
        else:
            line["draft_version"], line["draft_updated_at"] = row.version, row.updated_at
    return list(by_type.values())
