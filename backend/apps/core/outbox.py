"""
Transactional outbox (review R14).

Write side::

    outbox.enqueue("inventory.push", {"room_type_id": "...", "nights": [...]})

Call it inside the same ``transaction.atomic`` block as the change it
announces. A worker (management command ``run_outbox``, every minute)
delivers due messages through the handler registered for their topic.

Retry policy: after a failure the next attempt waits 1 min, 5 min, 15 min,
1 h, 6 h, 24 h, 24 h; after the 8th failed attempt the message is ``dead``
and shows in the admin queue (``GET /admin/outbox?status=dead``), where an
admin can retry it. Handlers must be idempotent.
"""

import logging
from collections.abc import Callable
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import OutboxMessage, OutboxStatus

logger = logging.getLogger(__name__)

# Waiting time before attempt n + 1, after n failed attempts.
BACKOFF = [timedelta(minutes=1), timedelta(minutes=5), timedelta(minutes=15), timedelta(hours=1),
           timedelta(hours=6), timedelta(hours=24), timedelta(hours=24)]
MAX_ATTEMPTS = len(BACKOFF) + 1  # 8

_handlers: dict[str, Callable[[dict], None]] = {}


def register_handler(topic: str, handler: Callable[[dict], None]) -> None:
    """Say which function delivers messages of ``topic`` (called from an app's ``ready()``)."""
    _handlers[topic] = handler


def enqueue(topic: str, payload: dict) -> OutboxMessage:
    """Store a message to deliver after the current transaction commits."""
    return OutboxMessage.objects.create(topic=topic, payload=payload)


def next_delay(attempts: int) -> timedelta | None:
    """Delay before the next try after ``attempts`` failures, or ``None`` when it is time to give up."""
    if attempts >= MAX_ATTEMPTS:
        return None
    return BACKOFF[min(attempts - 1, len(BACKOFF) - 1)]


def deliver(message: OutboxMessage, now=None) -> bool:
    """
    Try one message under a row lock. Returns True when it was delivered.

    A missing handler counts as a failure (a configuration bug must be seen,
    not silently dropped).
    """
    now = now or timezone.now()
    with transaction.atomic():
        msg = OutboxMessage.objects.select_for_update().get(pk=message.pk)
        if msg.status != OutboxStatus.PENDING:
            return msg.status == OutboxStatus.SENT
        handler = _handlers.get(msg.topic)
        try:
            if handler is None:
                raise LookupError(f"No outbox handler for topic {msg.topic}.")
            handler(msg.payload)
        except Exception as exc:  # any failure is retried later
            msg.attempts += 1
            msg.last_error = f"{type(exc).__name__}: {exc}"[:2000]
            delay = next_delay(msg.attempts)
            if delay is None:
                msg.status = OutboxStatus.DEAD
                logger.error("Outbox message %s is dead: %s", msg.pk, msg.last_error)
            else:
                msg.next_attempt_at = now + delay
            msg.save(update_fields=["attempts", "last_error", "status", "next_attempt_at"])
            return False
        msg.attempts += 1
        msg.status, msg.sent_at, msg.last_error = OutboxStatus.SENT, now, ""
        msg.save(update_fields=["attempts", "status", "sent_at", "last_error"])
        return True


def run_due(now=None, limit: int = 200) -> tuple[int, int]:
    """Deliver due pending messages, oldest first. Returns ``(sent, failed)``."""
    now = now or timezone.now()
    due = list(OutboxMessage.objects.filter(status=OutboxStatus.PENDING, next_attempt_at__lte=now)[:limit])
    sent = failed = 0
    for message in due:
        if deliver(message, now):
            sent += 1
        else:
            failed += 1
    return sent, failed


@transaction.atomic
def retry(message_id) -> OutboxMessage:
    """Put a dead (or pending) message back in the queue for an immediate attempt (admin action)."""
    msg = OutboxMessage.objects.select_for_update().get(pk=message_id)
    if msg.status != OutboxStatus.SENT:
        msg.status, msg.next_attempt_at, msg.attempts = OutboxStatus.PENDING, timezone.now(), 0
        msg.save(update_fields=["status", "next_attempt_at", "attempts"])
    return msg
