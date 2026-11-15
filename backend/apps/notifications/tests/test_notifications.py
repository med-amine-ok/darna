"""
Tests of the notifications app: in-app list, read state, preferences and delivery.

Rules covered: BR-NTF-01, BR-NTF-02, BR-PRV-03.
"""

import pytest
from django.core import mail

from apps.core import outbox
from apps.core.models import OutboxMessage
from apps.notifications import services
from apps.notifications.models import DeliveryLog, Notification
from conftest import client_for, make_user

pytestmark = pytest.mark.django_db

URL = "/api/v1/me/notifications"
PREFS = "/api/v1/me/notification-preferences"


def test_br_ntf_01_notify_creates_in_app_row_listed_newest_first(user, user_client):
    """``notify`` creates a row; the list shows it localized, newest first, with the unread count."""
    services.notify(user, "booking.completed", params={"title": "Villa Tipaza"})
    services.notify(user, "booking.confirmed", params={"reference": "BLD-2026-AAAAAA", "title": "Villa Tipaza"})
    response = user_client.get(URL, HTTP_ACCEPT_LANGUAGE="en")
    assert response.status_code == 200, response.data
    body = response.data
    assert body["unread_count"] == 2 and body["has_more"] is False and body["next_cursor"] is None
    assert [n["kind"] for n in body["results"]] == ["booking.confirmed", "booking.completed"]
    assert body["results"][0]["title"] == "Booking confirmed"
    assert "BLD-2026-AAAAAA" in body["results"][0]["body"]


def test_notifications_cursor_pages(user, user_client):
    """``limit`` and ``cursor`` walk the feed without repeating a row."""
    for _ in range(5):
        services.notify(user, "booking.completed", params={"title": "X"}, external=False)
    first = user_client.get(URL, {"limit": 2}).data
    assert len(first["results"]) == 2 and first["has_more"] is True
    second = user_client.get(URL, {"limit": 2, "cursor": first["next_cursor"]}).data
    ids = {n["id"] for n in first["results"]} | {n["id"] for n in second["results"]}
    assert len(ids) == 4
    assert user_client.get(URL, {"cursor": "not-a-cursor!"}).status_code == 400


def test_notifications_are_private(user, user_client):
    """Another user's notification is not listed and cannot be marked read (404)."""
    other = make_user(email="other@example.dz")
    notification = services.notify(other, "booking.completed", external=False)
    assert user_client.get(URL).data["results"] == []
    response = user_client.post(f"{URL}/{notification.id}/read")
    assert response.status_code == 404
    assert client_for(other).post(f"{URL}/{notification.id}/read").status_code == 204


def test_mark_read_and_read_all(user, user_client):
    """One read, then all read; the ``unread`` filter follows."""
    first = services.notify(user, "booking.completed", external=False)
    services.notify(user, "booking.completed", external=False)
    assert user_client.post(f"{URL}/{first.id}/read").status_code == 204
    assert user_client.get(URL, {"unread": "true"}).data["unread_count"] == 1
    assert user_client.post(f"{URL}/read-all").status_code == 204
    assert user_client.get(URL, {"unread": "true"}).data["results"] == []
    assert not Notification.objects.filter(read_at__isnull=True).exists()


def test_anonymous_refused(api):
    """Signed-out callers get 401."""
    assert api.get(URL).status_code == 401
    assert api.get(PREFS).status_code == 401


def test_br_prv_03_critical_switch_cannot_be_turned_off(user_client):
    """Email of a critical kind is locked: 422 ``preference_locked``."""
    prefs = user_client.get(PREFS).data["results"]
    locked = next(p for p in prefs if p["kind"] == "booking.confirmed" and p["channel"] == "email")
    assert locked["locked"] is True and locked["enabled"] is True
    response = user_client.put(PREFS, {"results": [{"kind": "booking.confirmed", "channel": "email", "enabled": False}]},
                               format="json")
    assert response.status_code == 422
    assert response.data["code"] == "preference_locked"


def test_br_ntf_02_non_critical_preference_is_respected(user, user_client):
    """Switching off email for ``booking.completed`` stops its email; in-app still created."""
    response = user_client.put(PREFS, {"results": [{"kind": "booking.completed", "channel": "email", "enabled": False}]},
                               format="json")
    assert response.status_code == 200
    row = next(p for p in response.data["results"] if p["kind"] == "booking.completed" and p["channel"] == "email")
    assert row["enabled"] is False
    services.notify(user, "booking.completed", params={"title": "Villa"})
    assert Notification.objects.filter(user=user).count() == 1
    assert not OutboxMessage.objects.filter(topic=services.SEND_TOPIC).exists()


def test_br_ntf_02_critical_email_sent_once(user):
    """A critical notification queues one email; delivering the message twice sends once."""
    services.notify(user, "booking.cancelled", params={"reference": "BLD-2026-BBBBBB"})
    message = OutboxMessage.objects.get(topic=services.SEND_TOPIC)
    services.deliver_handler(message.payload)
    services.deliver_handler(message.payload)
    assert len(mail.outbox) == 1
    assert DeliveryLog.objects.filter(channel="email", status="sent").count() == 1
    assert outbox.run_due()[1] == 0  # the registered handler accepts the message


def test_unknown_kind_is_a_programming_error(user):
    """A typo in a kind fails loudly instead of creating an empty notification."""
    with pytest.raises(ValueError):
        services.notify(user, "booking.typo")
