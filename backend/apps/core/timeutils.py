"""
Time helpers.

Timestamps are stored in UTC, but business rules ("today", "days before
check-in", "24 hours to answer") are evaluated in Algerian time (BR-SYS-05).
"""

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from django.conf import settings
from django.utils import timezone


def business_tz() -> ZoneInfo:
    """Time zone used for business dates (Africa/Algiers, UTC+1, no summer time)."""
    return ZoneInfo(settings.BUSINESS_TIME_ZONE)


def business_today() -> date:
    """Today's date in Algeria."""
    return timezone.now().astimezone(business_tz()).date()


def business_datetime(day: date, at: time) -> datetime:
    """Combine a stay date and a local time (for example check-in 15:00) into an aware datetime."""
    return datetime.combine(day, at, tzinfo=business_tz())


def nights_between(check_in: date, check_out: date) -> int:
    """Number of nights of a stay. The check-out day itself is not a night (half-open range)."""
    return (check_out - check_in).days


def ranges_overlap(start_a: date, end_a: date, start_b: date, end_b: date) -> bool:
    """
    True when two half-open date ranges ``[start, end)`` share at least one night.

    Back-to-back stays do not overlap: ``[10, 13)`` and ``[13, 15)`` is fine.
    """
    return start_a < end_b and start_b < end_a
