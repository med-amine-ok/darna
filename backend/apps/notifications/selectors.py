"""Read queries of the notifications app (BR-NTF-01, BR-PRV-03)."""

from django.db.models import QuerySet

from .catalogue import KINDS
from .models import Channel, Notification, NotificationPreference
from .services import is_locked


def notifications_for(user, *, unread: bool | None = None) -> QuerySet:
    """The user's own notifications, newest first; ``unread=True`` keeps only unread ones."""
    qs = Notification.objects.filter(user=user)
    if unread:
        qs = qs.filter(read_at__isnull=True)
    return qs.order_by("-id")


def unread_count(user) -> int:
    """Number of unread notifications (badge), one indexed count on ``(user, read_at)``."""
    return Notification.objects.filter(user=user, read_at__isnull=True).count()


def preferences_for(user) -> list[dict]:
    """
    Every switch of every kind and channel, with the user's choice or the default.

    ``locked`` is true for email and SMS of critical kinds (BR-PRV-03).
    """
    stored = {(p.kind, p.channel): p.enabled for p in NotificationPreference.objects.filter(user=user)}
    rows = []
    for kind, entry in KINDS.items():
        for channel in Channel.values:
            locked = is_locked(kind, channel)
            enabled = True if locked else stored.get((kind, channel), entry.defaults.get(channel, False))
            rows.append({"kind": kind, "channel": channel, "enabled": enabled, "locked": locked})
    return rows
