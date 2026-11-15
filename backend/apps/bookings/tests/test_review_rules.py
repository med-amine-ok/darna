"""
Tests of the rules added after the plan review of 2026-11-13.

- DEC-018 revised: the commission follows the refund (review R1);
- refund debts with a deadline, overdue refunds block the host (review R8);
- open bookings per guest are limited, reviews need a confirmed stay (review R13);
- blocked days and bookings never overlap (review R2);
- hotel sync never lowers a night below what is sold, room changes are
  pushed through the outbox (review R3, R14).
"""

from datetime import time, timedelta

import pytest
from django.utils import timezone

from apps.audit.models import AuditEvent
from apps.bookings import services
from apps.bookings.models import BookingStatus, RefundObligation, RefundStatus
from apps.catalog.tests import factories as f
from apps.config import services as config
from apps.core import outbox
from apps.core.errors import ConflictError
from apps.core.models import OutboxMessage, OutboxStatus
from apps.core.money import dzd
from apps.hosts.models import PropertyIntegration
from apps.inventory import services as inventory
from apps.inventory.models import InventoryConflict, RoomTypeNight
from apps.ledger import services as ledger
from apps.ledger.models import LedgerTransaction, TransactionKind
from apps.pricing import services as pricing

from .test_bookings import book, host_client, quote_stay, villa
from conftest import make_user

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# R1: commission follows the refund
# ---------------------------------------------------------------------------
def test_br_pay_05_commission_share_rounding():
    """Half of the base refunded gives half the commission back; clamped; rounded half up."""
    share = ledger.commission_share_to_return
    assert share(commission_minor=666_000, commission_base_minor=5_550_000, refund_of_base_minor=2_775_000) == 333_000
    assert share(commission_minor=666_000, commission_base_minor=5_550_000, refund_of_base_minor=9_999_999) == 666_000
    assert share(commission_minor=666_000, commission_base_minor=5_550_000, refund_of_base_minor=-5) == 0
    assert share(commission_minor=3, commission_base_minor=2, refund_of_base_minor=1) == 2  # 1.5 rounds up


def test_br_pay_05_guest_cancel_with_no_refund_keeps_all_commission(user):
    """On arrival day with no refund window reached, nothing comes back to the host."""
    listing = villa(check_in_time=time(23, 59))
    booking = services.create_booking(guest=user, quote_id=quote_stay(listing, 0, 2).id)
    services.cancel_by_guest(guest=user, booking_id=booking.id)
    assert not LedgerTransaction.objects.filter(booking_id=booking.id, kind=TransactionKind.COMMISSION_REVERSAL).exists()
    assert ledger.wallet_balance_minor(listing.host_account) == -booking.commission_minor


# ---------------------------------------------------------------------------
# R8: refund debts
# ---------------------------------------------------------------------------
def _cancelled_by_host(user):
    """A confirmed villa booking cancelled by its host; returns ``(listing, booking, refund)``."""
    listing = villa()
    booking = services.create_booking(guest=user, quote_id=quote_stay(listing, 10, 13).id)
    host_client(listing).post(f"/api/v1/host/bookings/{booking.id}/cancel", {"reason": "Water leak"}, format="json")
    booking.refresh_from_db()
    return listing, booking, RefundObligation.objects.get(booking=booking)


def test_br_can_06_cancellation_opens_refund_debt_with_deadline(user):
    """A refund owed opens a debt due 7 days later, with a balanced memo line in the ledger."""
    listing, booking, refund = _cancelled_by_host(user)
    assert refund.amount_minor == dzd(59_500) and refund.status == RefundStatus.OPEN
    assert refund.due_at == booking.cancelled_at + timedelta(days=config.get_value("refund_due_days"))
    assert LedgerTransaction.objects.filter(booking_id=booking.id, kind=TransactionKind.REFUND_DUE).count() == 1


def test_br_can_07_overdue_refund_blocks_instant_and_accept(user):
    """While a refund is overdue, new bookings are requests and the host cannot accept them."""
    listing, _, refund = _cancelled_by_host(user)
    RefundObligation.objects.filter(pk=refund.pk).update(due_at=timezone.now() - timedelta(minutes=1))
    other = make_user(email="other@example.dz", phone="+213551000111")
    pending = services.create_booking(guest=other, quote_id=quote_stay(listing, 20, 22).id)
    assert pending.status == BookingStatus.PENDING
    response = host_client(listing).post(f"/api/v1/host/bookings/{pending.id}/accept")
    assert response.status_code == 409 and response.data["code"] == "refund_overdue"


def test_br_can_06_declare_dispute_confirm_cycle(user, user_client):
    """Host declares, guest disputes, host declares again, guest confirms: settled with a memo reversal."""
    listing, booking, refund = _cancelled_by_host(user)
    host = host_client(listing)
    url = f"/api/v1/host/refunds/{refund.id}/declare-paid"
    assert host.post(url, {"payment_reference": "CCP-778"}, format="json").data["status"] == "declared"
    dispute = user_client.post(f"/api/v1/me/refunds/{refund.id}/dispute", {"note": "Nothing arrived"}, format="json")
    assert dispute.data["status"] == "disputed"
    assert host.post(url, {"payment_reference": "CCP-779"}, format="json").data["status"] == "declared"
    done = user_client.post(f"/api/v1/me/refunds/{refund.id}/confirm-received")
    assert done.status_code == 200 and done.data["status"] == "settled"
    assert LedgerTransaction.objects.filter(booking_id=booking.id, kind=TransactionKind.REFUND_SETTLED).count() == 1
    assert len(user_client.get("/api/v1/me/refunds").data["results"]) == 1


def test_br_can_06_admin_settles_and_lists_overdue(user, admin_client):
    """The admin sees overdue refunds and can settle one with a note (audited)."""
    _, _, refund = _cancelled_by_host(user)
    RefundObligation.objects.filter(pk=refund.pk).update(due_at=timezone.now() - timedelta(days=1))
    listed = admin_client.get("/api/v1/admin/refunds?overdue=true").data["results"]
    assert [row["id"] for row in listed] == [str(refund.id)] and listed[0]["is_overdue"] is True
    assert admin_client.post(f"/api/v1/admin/refunds/{refund.id}/settle", {"note": "Receipt checked"},
                             format="json").data["status"] == "settled"
    assert AuditEvent.objects.filter(action="REFUND_SETTLE_BY_ADMIN").exists()


# ---------------------------------------------------------------------------
# R13: booking abuse and stay confirmation
# ---------------------------------------------------------------------------
def test_br_bkg_08_pending_requests_per_guest_are_limited(user):
    """A guest can hold at most 3 waiting requests at a time (``too_many_open_bookings``)."""
    for start in (5, 10, 15):
        listing = villa(approval_mode="request")
        services.create_booking(guest=user, quote_id=quote_stay(listing, start, start + 2).id)
    with pytest.raises(ConflictError) as exc:
        services.create_booking(guest=user, quote_id=quote_stay(villa(approval_mode="request"), 30, 32).id)
    assert exc.value.code == "too_many_open_bookings"


def test_br_bkg_09_host_confirms_stay_with_check_in_code(user, user_client):
    """The guest sees a code once confirmed; the host enters it on arrival; then a review is allowed."""
    listing = villa()
    booking = services.create_booking(guest=user, quote_id=quote_stay(listing, 0, 2).id)
    code = user_client.get(f"/api/v1/me/bookings/{booking.id}").data["check_in_code"]
    assert len(code) == 6
    host = host_client(listing)
    wrong = "000000" if code != "000000" else "111111"
    bad = host.post(f"/api/v1/host/bookings/{booking.id}/confirm-stay", {"code": wrong}, format="json")
    assert bad.status_code == 400 and bad.data["code"] == "invalid_code"
    ok = host.post(f"/api/v1/host/bookings/{booking.id}/confirm-stay", {"code": code}, format="json")
    assert ok.status_code == 200 and ok.data["stay_confirmed_via"] == "host_code"
    booking.refresh_from_db()
    assert not booking.review_eligible  # still confirmed, not completed
    booking.status = BookingStatus.COMPLETED
    assert booking.review_eligible


def test_br_bkg_09_auto_complete_without_confirmation_gives_no_review(user):
    """A stay completed by the job alone does not allow a review; the guest can confirm it afterwards."""
    listing = villa(check_in_time=time(0, 0))
    booking = services.create_booking(guest=user, quote_id=quote_stay(listing, 0, 1).id)
    services.complete_finished_stays(now=timezone.now() + timedelta(days=3))
    booking.refresh_from_db()
    assert booking.status == BookingStatus.COMPLETED and not booking.review_eligible
    services.confirm_stay_by_guest(guest=user, booking_id=booking.id)
    booking.refresh_from_db()
    assert booking.review_eligible and booking.stay_confirmed_via == "guest"


def test_br_bkg_09_guest_cannot_confirm_before_check_in(user):
    """Confirming a stay that has not started is refused (``stay_not_started``)."""
    booking = services.create_booking(guest=user, quote_id=quote_stay(villa(), 10, 12).id)
    with pytest.raises(ConflictError) as exc:
        services.confirm_stay_by_guest(guest=user, booking_id=booking.id)
    assert exc.value.code == "stay_not_started"


# ---------------------------------------------------------------------------
# R2: blocked days and bookings
# ---------------------------------------------------------------------------
def test_br_avl_01_cannot_block_a_booked_day(user):
    """Blocking a day inside a booking is refused with the list of booked days."""
    listing = villa()
    services.create_booking(guest=user, quote_id=quote_stay(listing, 10, 13).id)
    with pytest.raises(ConflictError) as exc:
        inventory.set_days_blocked(listing, [f.future(9), f.future(11)], True)
    assert exc.value.code == "dates_booked" and exc.value.errors["dates"] == [f.future(11).isoformat()]
    inventory.set_days_blocked(listing, [f.future(13)], True)  # check-out day is free


def test_br_avl_01_block_after_quote_wins_over_booking(user):
    """The host closes a day after the guest got a price: the booking is refused under the lock."""
    listing = villa()
    quote = quote_stay(listing, 10, 13)
    inventory.set_days_blocked(listing, [f.future(11)], True)
    with pytest.raises(ConflictError) as exc:
        services.create_booking(guest=user, quote_id=quote.id)
    assert exc.value.code == "dates_unavailable"


# ---------------------------------------------------------------------------
# R3 / R14: hotel sync and outbox
# ---------------------------------------------------------------------------
def _connected_hotel(units=2):
    """A published hotel with an active integration to a system called ``testpms``."""
    hotel, room = f.published_hotel(units=units)
    owner = hotel.host_account.organization.memberships.get().user
    integration = PropertyIntegration.objects.create(organization=hotel.host_account.organization, kind="pms",
                                                     system_name="TestPMS", status="active", created_by=owner)
    return hotel, room, integration


def test_br_hst_07_sync_never_lowers_total_below_sold(user):
    """The hotel says 0 rooms but 1 is sold: total stays 1 and a conflict is opened for the admin."""
    hotel, room, _ = _connected_hotel()
    quote = pricing.build_quote(listing_id=hotel.id, room_type_id=room.id, check_in=f.future(10),
                                check_out=f.future(11), guests=2)
    services.create_booking(guest=user, quote_id=quote.id)
    conflicts = inventory.apply_external_totals(room, {f.future(10): 0, f.future(11): 1}, source="TestPMS")
    assert len(conflicts) == 1 and conflicts[0].sold == 1 and conflicts[0].external_total == 0
    rows = {r.night: r for r in RoomTypeNight.objects.filter(room_type=room)}
    assert rows[f.future(10)].total == 1 and rows[f.future(11)].total == 1


def test_br_hst_07_admin_resolves_conflict(admin_client):
    """Open conflicts are listed and resolved with a note."""
    _, room, _ = _connected_hotel()
    RoomTypeNight.objects.create(room_type=room, night=f.future(5), total=2, booked=2)
    inventory.apply_external_totals(room, {f.future(5): 1}, source="TestPMS")
    conflict = InventoryConflict.objects.get()
    assert admin_client.get("/api/v1/admin/inventory-conflicts?status=open").data["results"][0]["id"] == str(conflict.id)
    done = admin_client.post(f"/api/v1/admin/inventory-conflicts/{conflict.id}/resolve",
                             {"note": "Hotel moved the guest"}, format="json")
    assert done.status_code == 200 and done.data["status"] == "resolved"


def test_br_sys_03_booking_pushes_rooms_through_outbox(user):
    """A hotel booking queues an ``inventory.push``; the worker calls the system's adapter."""
    hotel, room, integration = _connected_hotel()
    calls = []
    inventory.register_push_adapter("testpms", lambda integ, rt, nights: calls.append((integ.id, rt.id, nights)))
    quote = pricing.build_quote(listing_id=hotel.id, room_type_id=room.id, check_in=f.future(10),
                                check_out=f.future(12), guests=2)
    services.create_booking(guest=user, quote_id=quote.id)
    message = OutboxMessage.objects.get(topic="inventory.push")
    assert message.payload["nights"] == [f.future(10).isoformat(), f.future(11).isoformat()]
    assert outbox.run_due() == (1, 0)
    assert calls == [(integration.id, room.id, [f.future(10), f.future(11)])]


def test_br_sys_03_outbox_retries_with_backoff_then_dead(admin_client):
    """A failing handler is retried later; after 8 attempts the message is dead; an admin can retry it."""
    outbox.register_handler("test.fail", lambda payload: (_ for _ in ()).throw(RuntimeError("down")))
    message = outbox.enqueue("test.fail", {})
    now = timezone.now()
    assert outbox.run_due(now) == (0, 1)
    message.refresh_from_db()
    assert message.attempts == 1 and message.next_attempt_at == now + timedelta(minutes=1)
    for _ in range(7):
        now += timedelta(days=2)
        outbox.run_due(now)
    message.refresh_from_db()
    assert message.status == OutboxStatus.DEAD and message.attempts == 8
    listed = admin_client.get("/api/v1/admin/outbox?status=dead").data["results"]
    assert listed[0]["id"] == str(message.id)
    assert admin_client.post(f"/api/v1/admin/outbox/{message.id}/retry").data["status"] == "pending"


# ---------------------------------------------------------------------------
# R7: deposit floor under the wallet lock
# ---------------------------------------------------------------------------
def test_br_pay_14_second_booking_sees_first_commission(user):
    """Two instant bookings of a host near the floor: the second one becomes a request."""
    listing = villa()
    first = services.create_booking(guest=user, quote_id=quote_stay(listing, 10, 13).id)
    assert first.status == BookingStatus.CONFIRMED
    # The first commission (6,660) plus this setting puts the deposit below the floor.
    listing.host_account.credit_limit_override_minor = dzd(5_000)
    listing.host_account.save(update_fields=["credit_limit_override_minor"])
    other = make_user(email="second@example.dz", phone="+213551000222")
    second = services.create_booking(guest=other, quote_id=quote_stay(listing, 20, 22).id)
    assert second.status == BookingStatus.PENDING
