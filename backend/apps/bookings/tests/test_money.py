"""
Tests of the money endpoints of the bookings app (push of 2026-11-15).

Rules covered: BR-CAN-01 to BR-CAN-05, BR-PAY-05, BR-PAY-11, BR-RPT-02,
BR-SYS-01, DEC-019, DEC-031. Prices follow example 8a: the Tipaza villa,
3 nights x 18,500 + 4,000 cleaning = 59,500 DZD, commission 6,660 DZD.
"""

from datetime import timedelta

import pytest

from apps.audit.models import AuditEvent
from apps.bookings import services
from apps.bookings.models import Booking, BookingStatus, Dispute, Refund, RefundObligation
from apps.core.money import dzd
from apps.core.timeutils import business_today
from apps.ledger import services as ledger

from .test_bookings import book, host_client, quote_stay, villa

pytestmark = pytest.mark.django_db


def _confirmed(user_client, start=3, end=6):
    """A confirmed (instant) villa booking; returns ``(listing, booking)``."""
    listing = villa()
    booking_id = book(user_client, quote_stay(listing, start, end)).data["id"]
    return listing, Booking.objects.get(pk=booking_id)


def _refund(client, booking, amount, key="refund-key-0001", reason="Broken heater during stay"):
    """``POST /admin/bookings/{id}/refunds`` with an Idempotency-Key."""
    return client.post(f"/api/v1/admin/bookings/{booking.id}/refunds",
                       {"amount": {"amount_minor": amount, "currency": "DZD"}, "reason": reason},
                       format="json", HTTP_IDEMPOTENCY_KEY=key)


# ---------------------------------------------------------------------------
# Cancellation previews
# ---------------------------------------------------------------------------
def test_br_can_02_guest_preview_matches_the_real_cancellation(user_client):
    """Moderate, 3 days before: the preview says 31,750 DZD back and the cancellation owes exactly that."""
    listing, booking = _confirmed(user_client)
    preview = user_client.get(f"/api/v1/me/bookings/{booking.id}/cancellation-preview")
    assert preview.status_code == 200
    assert preview.data["allowed"] is True and preview.data["policy_code"] == "moderate"
    assert preview.data["refund_percent_bp"] == 5000 and preview.data["days_before_check_in"] == 3
    assert preview.data["refund_amount"]["amount_minor"] == dzd(31_750)
    assert preview.data["kept_by_host"]["amount_minor"] == dzd(27_750)
    assert preview.data["commission_returned_to_host"]["amount_minor"] == 0  # never shown to guests
    terms = services.guest_cancellation_terms(booking)
    done = user_client.post(f"/api/v1/me/bookings/{booking.id}/cancel", {}, format="json")
    assert done.data["refund_due"]["amount_minor"] == preview.data["refund_amount"]["amount_minor"]
    assert ledger.commission_returned_minor(booking.id) == terms.commission_back_minor == dzd(3_330)


def test_br_can_03_host_preview_matches_the_real_cancellation(user_client):
    """The host sees full refund and full commission back, then the cancellation does exactly that."""
    listing, booking = _confirmed(user_client, 10, 13)
    host = host_client(listing)
    preview = host.get(f"/api/v1/host/bookings/{booking.id}/cancellation-preview").data
    assert preview["allowed"] is True and preview["refund_amount"]["amount_minor"] == dzd(59_500)
    assert preview["commission_returned_to_host"]["amount_minor"] == dzd(6_660)
    host.post(f"/api/v1/host/bookings/{booking.id}/cancel", {"reason": "Water leak"}, format="json")
    booking.refresh_from_db()
    assert booking.refund_due_minor == dzd(59_500)
    assert ledger.commission_returned_minor(booking.id) == dzd(6_660)
    after = host.get(f"/api/v1/host/bookings/{booking.id}/cancellation-preview").data
    assert after["allowed"] is False and after["not_allowed_code"] == "booking_not_cancellable"


def test_preview_is_scoped_to_the_owner(user_client, client_for_stranger):
    """Another guest gets 404, like for every booking path."""
    _, booking = _confirmed(user_client)
    assert client_for_stranger.get(f"/api/v1/me/bookings/{booking.id}/cancellation-preview").status_code == 404


@pytest.fixture
def client_for_stranger(db):
    """API client of another guest."""
    from conftest import client_for, make_user

    return client_for(make_user(email="stranger@example.dz"))


# ---------------------------------------------------------------------------
# Admin refunds (BR-CAN-04, BR-PAY-05)
# ---------------------------------------------------------------------------
def test_br_can_04_partial_refunds_add_up_and_commission_follows(user_client, admin_client):
    """Two partial refunds add up, each opens a debt, the commission follows; over the total is refused."""
    listing, booking = _confirmed(user_client)
    first = _refund(admin_client, booking, dzd(4_000))  # the cleaning fee only: no commission back
    assert first.status_code == 201 and first.data["refund_due"]["amount_minor"] == dzd(4_000)
    assert ledger.commission_returned_minor(booking.id) == 0
    second = _refund(admin_client, booking, dzd(27_750), key="refund-key-0002")  # half of the base
    assert second.status_code == 201
    assert ledger.commission_returned_minor(booking.id) == dzd(3_330)
    assert RefundObligation.objects.filter(booking=booking).count() == 2
    assert Refund.objects.filter(booking=booking, kind="staff").count() == 2
    too_much = _refund(admin_client, booking, dzd(30_000), key="refund-key-0003")
    assert too_much.status_code == 422 and too_much.data["code"] == "refund_exceeds_total"
    rest = _refund(admin_client, booking, dzd(27_750), key="refund-key-0004")
    assert rest.data["refund_due"]["amount_minor"] == dzd(59_500)
    assert ledger.commission_returned_minor(booking.id) == dzd(6_660)
    assert AuditEvent.objects.filter(action="BOOKING_REFUND").count() == 3


def test_br_sys_01_refund_retry_is_replayed_once(user_client, admin_client):
    """The same Idempotency-Key does not refund twice; no key is refused."""
    _, booking = _confirmed(user_client)
    _refund(admin_client, booking, dzd(1_000))
    again = _refund(admin_client, booking, dzd(1_000))
    assert again["Idempotency-Replayed"] == "true"
    booking.refresh_from_db()
    assert booking.refund_due_minor == dzd(1_000)
    no_key = admin_client.post(f"/api/v1/admin/bookings/{booking.id}/refunds",
                               {"amount": {"amount_minor": 100, "currency": "DZD"}, "reason": "Small gesture ok"},
                               format="json")
    assert no_key.status_code == 400 and no_key.data["code"] == "idempotency_key_required"


def test_refund_after_guest_cancellation_only_adds_the_rest(user_client, admin_client):
    """A refund after a policy cancellation can only give the part not refunded yet."""
    _, booking = _confirmed(user_client)
    user_client.post(f"/api/v1/me/bookings/{booking.id}/cancel", {}, format="json")
    assert _refund(admin_client, booking, dzd(27_751)).status_code == 422
    assert _refund(admin_client, booking, dzd(27_750), key="refund-key-0002").status_code == 201
    assert ledger.commission_returned_minor(booking.id) == dzd(6_660)


def test_refund_is_admin_only(user_client):
    """A guest cannot record refunds."""
    _, booking = _confirmed(user_client)
    assert _refund(user_client, booking, dzd(1_000)).status_code == 403


# ---------------------------------------------------------------------------
# Disputes (BR-CAN-05)
# ---------------------------------------------------------------------------
STATEMENT = "The heating did not work for the whole stay."


def test_br_can_05_dispute_open_both_sides_and_resolve(user_client, admin_client):
    """Guest opens, host adds a statement, support resolves with a partial refund; resolving twice is refused."""
    listing, booking = _confirmed(user_client)
    body = {"reason_code": "property_issue", "statement": STATEMENT}
    opened = user_client.post(f"/api/v1/me/bookings/{booking.id}/dispute", body, format="json")
    assert opened.status_code == 201 and opened.data["opened_by_role"] == "guest"
    assert user_client.post(f"/api/v1/me/bookings/{booking.id}/dispute", body, format="json").data["code"] == "dispute_exists"
    host_side = host_client(listing).post(f"/api/v1/host/bookings/{booking.id}/dispute",
                                          {"reason_code": "guest_claim", "statement": "The heater was fixed on day one."},
                                          format="json")
    assert host_side.status_code == 201 and host_side.data["host_statement"]
    url = f"/api/v1/admin/bookings/{booking.id}/dispute/resolve"
    missing = admin_client.post(url, {"outcome": "refund_partial", "note": "Partial refund agreed"}, format="json")
    assert missing.status_code == 400 and missing.data["code"] == "refund_amount_required"
    resolved = admin_client.post(url, {"outcome": "refund_partial", "note": "Partial refund agreed",
                                       "refund_amount": {"amount_minor": dzd(5_000), "currency": "DZD"}}, format="json")
    assert resolved.status_code == 200
    assert resolved.data["dispute"]["outcome"] == "refund_partial"
    assert resolved.data["refund_due"]["amount_minor"] == dzd(5_000)
    assert Refund.objects.get(booking=booking).kind == "dispute"
    again = admin_client.post(url, {"outcome": "declined", "note": "Second try at it"}, format="json")
    assert again.status_code == 409 and again.data["code"] == "dispute_already_resolved"


def test_br_can_05_dispute_window_closes_14_days_after_check_out(user_client):
    """Fifteen days after check-out the dispute is refused (422 ``dispute_window_closed``)."""
    _, booking = _confirmed(user_client)
    today = business_today()
    Booking.objects.filter(pk=booking.pk).update(status=BookingStatus.COMPLETED, check_in=today - timedelta(days=18),
                                                 check_out=today - timedelta(days=15))
    res = user_client.post(f"/api/v1/me/bookings/{booking.id}/dispute",
                           {"reason_code": "property_issue", "statement": STATEMENT}, format="json")
    assert res.status_code == 422 and res.data["code"] == "dispute_window_closed"
    assert not Dispute.objects.exists()


def test_resolve_without_dispute_is_404_and_admin_only(user_client, admin_client):
    """No dispute: 404; a guest cannot resolve."""
    _, booking = _confirmed(user_client)
    url = f"/api/v1/admin/bookings/{booking.id}/dispute/resolve"
    assert admin_client.post(url, {"outcome": "declined", "note": "Nothing to see here"}, format="json").status_code == 404
    assert user_client.post(url, {"outcome": "declined", "note": "Nothing to see here"}, format="json").status_code == 403


# ---------------------------------------------------------------------------
# Online payment (dormant) and earnings
# ---------------------------------------------------------------------------
def test_br_pay_11_guest_payment_answers_404_while_off(user_client):
    """DEC-019: no online payment in v1."""
    _, booking = _confirmed(user_client)
    res = user_client.post(f"/api/v1/me/bookings/{booking.id}/payments", HTTP_IDEMPOTENCY_KEY="pay-key-0001")
    assert res.status_code == 404


def test_br_pay_11_guest_payment_with_local_gateway(user_client, monkeypatch):
    """Switched on with the local backend: one checkout per booking, retries replayed."""
    from apps.ledger import gateways

    monkeypatch.setattr(gateways, "GUEST_PAYMENTS_ENABLED", True)
    monkeypatch.setattr(gateways, "GATEWAY_BACKEND", "apps.ledger.gateways.LocalGateway")
    _, booking = _confirmed(user_client)
    url = f"/api/v1/me/bookings/{booking.id}/payments"
    first = user_client.post(url, HTTP_IDEMPOTENCY_KEY="pay-key-0001")
    assert first.status_code == 201 and first.data["amount"]["amount_minor"] == dzd(59_500)
    assert user_client.post(url, HTTP_IDEMPOTENCY_KEY="pay-key-0001").data["id"] == first.data["id"]
    assert user_client.post(url, HTTP_IDEMPOTENCY_KEY="pay-key-0002").data["code"] == "payment_exists"


def test_br_rpt_02_host_earnings(user_client):
    """Upcoming = 59,500 - 6,660 commission; completed counts at completion; guests are refused."""
    listing, booking = _confirmed(user_client, 10, 13)
    host = host_client(listing)
    data = host.get("/api/v1/host/earnings").data
    assert data["upcoming"]["amount_minor"] == dzd(59_500 - 6_660)
    assert data["completed"]["amount_minor"] == 0
    assert data["commission_paid"]["amount_minor"] == dzd(6_660)
    assert data["by_month"][-1]["commission"]["amount_minor"] == dzd(6_660)
    assert host.get("/api/v1/host/earnings?from=2026-05-01&to=2026-04-01").status_code == 400
    assert user_client.get("/api/v1/host/earnings").status_code == 403
