"""
Writes of the notifications app (BR-NTF-01, BR-NTF-02, BR-PRV-03).

Public entry point for every other app::

    from apps.notifications.services import notify

    notify(booking.guest, "booking.confirmed",
           params={"reference": booking.reference, "title": booking.title},
           link=f"/trips/{booking.id}")

``notify`` must be called inside the transaction of the change it announces
(like ``audit.record``): the in-app row and the outbox messages for email or
SMS are rolled back with the change. The email and SMS are sent later by the
``notification.send`` outbox handler (``run_outbox``), once per channel.

Layer L1: this module imports only ``apps.core`` and Django. The user is
passed in by the caller.
"""

import hashlib
import hmac
import logging
import uuid

from django.conf import settings
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.module_loading import import_string

from apps.core import outbox
from apps.core.errors import DomainError, NotFoundError

from .catalogue import KINDS, render
from .models import Channel, DeliveryLog, DeliveryStatus, Notification, NotificationPreference

logger = logging.getLogger("bladus.notifications")

SEND_TOPIC = "notification.send"
EXTERNAL_CHANNELS = (Channel.EMAIL, Channel.SMS)


# ---------------------------------------------------------------------------
# Preferences (BR-NTF-02, BR-PRV-03)
# ---------------------------------------------------------------------------
def is_locked(kind: str, channel: str) -> bool:
    """True when this switch cannot be turned off: email and SMS of a critical kind (BR-PRV-03)."""
    entry = KINDS.get(kind)
    return bool(entry and entry.critical and channel in EXTERNAL_CHANNELS)


def channel_enabled(user, kind: str, channel: str) -> bool:
    """Effective switch for ``user``: locked switches are always on, else the stored choice or the default."""
    if is_locked(kind, channel):
        return True
    row = NotificationPreference.objects.filter(user=user, kind=kind, channel=channel).first()
    if row is not None:
        return row.enabled
    entry = KINDS.get(kind)
    return bool(entry and entry.defaults.get(channel, False))


@transaction.atomic
def replace_preferences(*, user, items: list[dict]) -> None:
    """
    Store the user's switches (``PUT /me/notification-preferences``).

    Each item is ``{"kind", "channel", "enabled"}``. Turning off a critical
    email or SMS switch is refused with 422 ``preference_locked``
    (BR-PRV-03); an unknown kind is a 400. Items not sent keep their value.
    """
    for item in items:
        kind, channel, enabled = item["kind"], item["channel"], bool(item["enabled"])
        if kind not in KINDS:
            raise DomainError("Unknown notification kind.", code="invalid", errors={"kind": [f"Unknown kind {kind}."]})
        if is_locked(kind, channel) and not enabled:
            raise DomainError("Critical messages cannot be switched off.", code="preference_locked", status_code=422,
                              errors={"kind": [kind]})
        if is_locked(kind, channel):
            continue  # always on, nothing to store
        NotificationPreference.objects.update_or_create(user=user, kind=kind, channel=channel,
                                                        defaults={"enabled": enabled})


# ---------------------------------------------------------------------------
# Creating notifications (BR-NTF-01)
# ---------------------------------------------------------------------------
def notify(user, kind: str, *, params: dict | None = None, link: str | None = None,
           external: bool = True) -> Notification:
    """
    Create one in-app notification for ``user`` and queue its email or SMS (BR-NTF-01, BR-NTF-02).

    - ``kind`` must be in ``catalogue.KINDS`` (a typo fails loudly in tests);
    - ``params`` fill the localized template (keep them free of secrets:
      never put one-time codes here, codes have their own SMS path);
    - ``link`` is a relative app path (``/trips/{id}``);
    - ``external=False`` skips email and SMS (in-app only).

    Critical kinds always go by email (when the user has an email) or else
    by SMS; other kinds follow the user's switches. Each channel is one
    ``notification.send`` outbox message, delivered once (``DeliveryLog``).
    """
    if kind not in KINDS:
        raise ValueError(f"Unknown notification kind {kind!r}; add it to apps/notifications/catalogue.py.")
    notification = Notification.objects.create(user=user, kind=kind, params=params or {}, link=link)
    if external:
        for channel in _external_channels(user, kind):
            outbox.enqueue(SEND_TOPIC, {"notification_id": str(notification.id), "channel": channel})
    return notification


def notify_many(users, kind: str, **kwargs) -> list[Notification]:
    """:func:`notify` for several people (for example every member of a host team); duplicates are skipped."""
    seen, created = set(), []
    for user in users:
        if user is None or user.pk in seen:
            continue
        seen.add(user.pk)
        created.append(notify(user, kind, **kwargs))
    return created


def _external_channels(user, kind: str) -> list[str]:
    """
    Channels other than in-app for this user and kind.

    Critical (BR-NTF-02): email when the user has one, else SMS. Others: the
    email and SMS switches, each only when the address exists.
    """
    has_email = bool(getattr(user, "email", None))
    has_phone = bool(getattr(user, "phone_e164", None))
    entry = KINDS[kind]
    if entry.critical:
        if has_email:
            return [Channel.EMAIL]
        return [Channel.SMS] if has_phone else []
    channels = []
    if has_email and channel_enabled(user, kind, Channel.EMAIL):
        channels.append(Channel.EMAIL)
    if has_phone and channel_enabled(user, kind, Channel.SMS):
        channels.append(Channel.SMS)
    return channels


# ---------------------------------------------------------------------------
# Reading state
# ---------------------------------------------------------------------------
def mark_read(*, user, notification_id) -> None:
    """Mark one of the user's notifications as read; someone else's answers 404 (OWASP API1)."""
    try:
        notification_id = uuid.UUID(str(notification_id))
    except ValueError as exc:
        raise NotFoundError("Notification not found.") from exc
    updated = Notification.objects.filter(user=user, id=notification_id).first()
    if updated is None:
        raise NotFoundError("Notification not found.")
    if updated.read_at is None:
        updated.read_at = timezone.now()
        updated.save(update_fields=["read_at"])


def mark_all_read(*, user) -> int:
    """Mark every unread notification of the user as read; returns how many changed."""
    return Notification.objects.filter(user=user, read_at__isnull=True).update(read_at=timezone.now())


# ---------------------------------------------------------------------------
# Delivery (outbox handler, BR-NTF-02)
# ---------------------------------------------------------------------------
def _recipient_hash(value: str) -> str:
    """HMAC of the address with the server pepper: the log never stores the address itself (R9)."""
    pepper = getattr(settings, "HASH_PEPPER", settings.SECRET_KEY)
    return hmac.new(pepper.encode(), value.lower().encode(), hashlib.sha256).hexdigest()


def deliver_handler(payload: dict) -> None:
    """
    Outbox handler of ``notification.send``: send one email or SMS for one notification.

    Idempotent: a ``DeliveryLog`` row per ``(notification, channel)`` means
    a second delivery of the same message sends nothing. A provider error
    raises, so the outbox retries with backoff. Rendered in the user's
    preferred language (BR-NTF-02).
    """
    notification = Notification.objects.select_related("user").filter(id=payload.get("notification_id")).first()
    channel = payload.get("channel")
    if notification is None or channel not in EXTERNAL_CHANNELS:
        return  # the user was deleted, or a bad payload: nothing to send
    if DeliveryLog.objects.filter(notification=notification, channel=channel,
                                  status__in=[DeliveryStatus.SENT, DeliveryStatus.SKIPPED]).exists():
        return
    user = notification.user
    title, body = render(notification.kind, notification.params, getattr(user, "preferred_locale", "fr"))
    address = user.email if channel == Channel.EMAIL else user.phone_e164
    if not address:
        _log(notification, channel, "none", "", DeliveryStatus.SKIPPED)
        return
    if channel == Channel.EMAIL:
        send_mail(title, body, None, [address])
        provider = "django_mail"
    else:
        backend_path = getattr(settings, "SMS_BACKEND", "")
        if not backend_path:
            _log(notification, channel, "none", address, DeliveryStatus.SKIPPED)
            return
        import_string(backend_path)().send(address, f"{title}: {body}")
        provider = backend_path.rsplit(".", 1)[-1][:20]
    _log(notification, channel, provider, address, DeliveryStatus.SENT)


def _log(notification: Notification, channel: str, provider: str, address: str, status: str) -> None:
    """Record one send; a concurrent duplicate is ignored (the unique key already holds it)."""
    try:
        with transaction.atomic():
            DeliveryLog.objects.update_or_create(
                notification=notification, channel=channel,
                defaults={"provider": provider[:20], "recipient_hash": _recipient_hash(address) if address else "",
                          "status": status},
            )
    except IntegrityError:
        logger.info("Delivery of %s by %s already logged.", notification.id, channel)
