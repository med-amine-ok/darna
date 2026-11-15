"""
Tests of the messaging app: start or find a thread, send, read pointer, sync, access and masking.

Rules covered: BR-MSG-01, BR-ORG-01 (scoping), MSG-02 (cursor sync), MSG-03 (read pointer).
"""

import pytest

from apps.bookings import services as booking_services
from apps.catalog.tests import factories as f
from apps.core.money import dzd
from apps.messaging.masking import mask
from apps.messaging.models import Conversation, Message
from apps.notifications.models import Notification
from apps.pricing import services as pricing
from conftest import client_for, make_user

pytestmark = pytest.mark.django_db

URL = "/api/v1/conversations"


def request_listing():
    """A published villa in request mode (bookings stay pending until the host accepts)."""
    return f.published_home(None, title="Villa Tipaza", base_price_minor=dzd(18_500), approval_mode="request")


def host_client(listing):
    """API client of the solo host of ``listing``, in that workspace."""
    account = listing.host_account
    return client_for(account.user, account)


def start(client, listing, text="Hello, is it free in July?"):
    """``POST /conversations`` about a listing."""
    return client.post(URL, {"listing_id": str(listing.id), "first_message": text}, format="json")


def test_start_or_find_inquiry(user_client):
    """First call 201 with the first message; second call 200 with the same thread."""
    listing = request_listing()
    first = start(user_client, listing)
    assert first.status_code == 201, first.data
    assert first.data["my_role"] == "guest" and first.data["subject"]["title"] == "Villa Tipaza"
    assert first.data["last_message"]["sender_is_me"] is True
    second = user_client.post(URL, {"listing_id": str(listing.id)}, format="json")
    assert second.status_code == 200 and second.data["id"] == first.data["id"]
    assert Conversation.objects.count() == 1


def test_exactly_one_subject_and_cannot_message_self(user_client):
    """No subject is a 400; the host messaging their own listing is 422 ``cannot_message_self``."""
    listing = request_listing()
    assert user_client.post(URL, {}, format="json").status_code == 400
    response = start(host_client(listing), listing)
    assert response.status_code == 422 and response.data["code"] == "cannot_message_self"


def test_host_sees_thread_and_unread_count(user_client):
    """The host lists the thread with ``as=host``, sees 1 unread, reads it, and is notified in-app."""
    listing = request_listing()
    conversation_id = start(user_client, listing).data["id"]
    host = host_client(listing)
    listed = host.get(URL, {"as": "host"}).data
    assert len(listed["results"]) == 1 and listed["unread_total"] == 1
    assert listed["results"][0]["unread_count"] == 1
    assert Notification.objects.filter(user=listing.host_account.user, kind="message.received").exists()
    messages = host.get(f"{URL}/{conversation_id}/messages").data["results"]
    response = host.post(f"{URL}/{conversation_id}/read", {"last_read_message_id": messages[0]["id"]}, format="json")
    assert response.status_code == 204
    assert host.get(URL, {"as": "host"}).data["unread_total"] == 0
    assert host.get(URL, {"as": "host", "unread": "true"}).data["results"] == []


def test_br_org_01_strangers_get_404(user_client):
    """Another user, or another host, cannot read or write the thread."""
    listing = request_listing()
    conversation_id = start(user_client, listing).data["id"]
    stranger = client_for(make_user(email="stranger@example.dz"))
    assert stranger.get(f"{URL}/{conversation_id}").status_code == 404
    assert stranger.post(f"{URL}/{conversation_id}/messages", {"body": "hi"}, format="json").status_code == 404
    other_account, other_user = f.approved_individual_host()
    assert client_for(other_user, other_account).get(f"{URL}/{conversation_id}").status_code == 404


def test_anonymous_refused(api):
    """Signed-out callers get 401."""
    assert api.get(URL).status_code == 401


def test_br_msg_01_phone_masked_for_other_side_before_confirmation(user, user_client):
    """``0555 12 34 56`` reaches the host as ``0555 ** ** **``; the sender sees the original; unmasked once confirmed."""
    listing = request_listing()
    conversation_id = start(user_client, listing, "Call me on 0555 12 34 56 please").data["id"]
    host = host_client(listing)
    seen = host.get(f"{URL}/{conversation_id}/messages").data["results"][0]
    assert seen["is_masked"] is True and seen["body"] == "Call me on 0555 ** ** ** please"
    mine = user_client.get(f"{URL}/{conversation_id}/messages").data["results"][0]
    assert mine["is_masked"] is False and "0555 12 34 56" in mine["body"]
    quote = pricing.build_quote(listing_id=listing.id, check_in=f.future(10), check_out=f.future(12), guests=2)
    booking = booking_services.create_booking(guest=user, quote_id=quote.id)
    booking.status = "confirmed"
    booking.save(update_fields=["status"])
    seen = host.get(f"{URL}/{conversation_id}/messages").data["results"][0]
    assert seen["is_masked"] is False


def test_br_msg_01_masking_rules():
    """Emails, messaging links and account numbers are hidden; dates and prices stay."""
    assert mask("write to karim@gmail.com") == "write to [email hidden]"
    assert mask("wa.me/213555123456") == "[link hidden]"
    assert mask("+213 555 12 34 56") == "+213 5** ** ** **"
    assert mask("from 2026-07-14, 18 500 DZD") == "from 2026-07-14, 18 500 DZD"


def test_br_msg_01_repeated_attempts_flag_thread(user_client):
    """The third message with contact details flags the thread for trust review."""
    listing = request_listing()
    conversation_id = start(user_client, listing, "0555 12 34 56").data["id"]
    for text in ("my mail is a@b.dz", "t.me/karim"):
        user_client.post(f"{URL}/{conversation_id}/messages", {"body": text}, format="json")
    conversation = Conversation.objects.get(id=conversation_id)
    assert conversation.contact_attempts == 3 and conversation.flagged_at is not None


def test_send_is_idempotent_with_client_message_id(user_client):
    """A retry with the same ``client_message_id`` returns the first message."""
    listing = request_listing()
    conversation_id = start(user_client, listing).data["id"]
    url = f"{URL}/{conversation_id}/messages"
    first = user_client.post(url, {"body": "Second question", "client_message_id": "abc-1"}, format="json")
    again = user_client.post(url, {"body": "Second question", "client_message_id": "abc-1"}, format="json")
    assert first.status_code == again.status_code == 201
    assert first.data["id"] == again.data["id"]
    assert Message.objects.filter(conversation_id=conversation_id).count() == 2


def test_msg_03_read_pointer_never_moves_back_and_unknown_id_refused(user_client):
    """Older id keeps the pointer; a random id is 422 ``unknown_message``."""
    listing = request_listing()
    conversation_id = start(user_client, listing).data["id"]
    user_client.post(f"{URL}/{conversation_id}/messages", {"body": "Another"}, format="json")
    ids = [m["id"] for m in user_client.get(f"{URL}/{conversation_id}/messages").data["results"]]  # newest first
    user_client.post(f"{URL}/{conversation_id}/read", {"last_read_message_id": ids[1]}, format="json")
    assert user_client.get(f"{URL}/{conversation_id}").data["last_read_message_id"] == ids[0]
    response = user_client.post(f"{URL}/{conversation_id}/read",
                                {"last_read_message_id": "00000000-0000-7000-8000-000000000000"}, format="json")
    assert response.status_code == 422 and response.data["code"] == "unknown_message"


def test_msg_02_sync_returns_only_new_messages(user_client):
    """First sync gives a cursor and no rows; after a host reply the next sync has exactly that message."""
    listing = request_listing()
    conversation_id = start(user_client, listing).data["id"]
    first = user_client.get(f"{URL}/sync").data
    assert first["messages"] == [] and first["conversations"] == [] and first["poll_after_ms"] >= 2000
    host_client(listing).post(f"{URL}/{conversation_id}/messages", {"body": "Yes, it is free."}, format="json")
    second = user_client.get(f"{URL}/sync", {"after": first["next_cursor"]}).data
    assert [m["body"] for m in second["messages"]] == ["Yes, it is free."]
    assert second["messages"][0]["sender_role"] == "host_member"
    assert second["unread_total"] == 1 and len(second["conversations"]) == 1
    third = user_client.get(f"{URL}/sync", {"after": second["next_cursor"]}).data
    assert third["messages"] == []
    assert user_client.get(f"{URL}/sync", {"after": "garbage"}).status_code == 400


def test_booking_thread_started_by_host(user):
    """The host can open the thread of a booking of their workspace; the guest then finds the same thread."""
    listing = request_listing()
    quote = pricing.build_quote(listing_id=listing.id, check_in=f.future(10), check_out=f.future(12), guests=2)
    booking = booking_services.create_booking(guest=user, quote_id=quote.id)
    created = host_client(listing).post(URL, {"booking_id": str(booking.id)}, format="json")
    assert created.status_code == 201 and created.data["my_role"] == "host_member"
    assert created.data["subject"]["booking_reference"] == booking.reference
    found = client_for(user).post(URL, {"booking_id": str(booking.id)}, format="json")
    assert found.status_code == 200 and found.data["id"] == created.data["id"]
