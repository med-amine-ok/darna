"""
Tests of the admin finance endpoints, invoices and the dormant money models.

Rules covered: BR-PAY-02, BR-PAY-03, BR-PAY-09, BR-PAY-10, BR-PAY-11, BR-PAY-12,
BR-SYS-02, DEC-019.
"""

import hashlib
import hmac
import json
import uuid
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.core.money import dzd
from apps.core.timeutils import business_today
from apps.hosts.models import HostAccount, HostAccountKind, PayoutAccount, VerificationStatus
from apps.ledger import gateways, services
from apps.ledger.models import GatewayEvent, Invoice, Payment, PayoutStatus
from conftest import client_for, make_user

pytestmark = pytest.mark.django_db


@pytest.fixture
def host():
    """An approved solo host and their host account."""
    owner = make_user(email="host@example.dz", first_name_latin="Karim")
    account = HostAccount.objects.create(kind=HostAccountKind.INDIVIDUAL, user=owner,
                                         verification_status=VerificationStatus.APPROVED)
    return owner, account


def _topup(admin, account, amount=dzd(50_000), receipt="CCP-001"):
    """Record an immediate CCP top-up."""
    return services.create_topup(host_account=account, method="ccp_transfer", amount_minor=amount,
                                 receipt_reference=receipt, actor=admin)


def _second_admin():
    """Another active admin, for four-eyes checks."""
    from apps.accounts.models import StaffProfile, StaffStatus

    second = make_user(email="admin2@bladus.dz", is_staff=True)
    StaffProfile.objects.create(user=second, status=StaffStatus.ACTIVE)
    return second


# ---------------------------------------------------------------------------
# Wallets and overview
# ---------------------------------------------------------------------------
def test_br_pay_10_admin_wallets_list_states_and_detail(host, admin_user, admin_client):
    """The wallet table shows balance, floor and state; filters and the detail work."""
    _, rich = host
    _topup(admin_user, rich)
    poor_owner = make_user(email="poor@example.dz")
    poor = HostAccount.objects.create(kind=HostAccountKind.INDIVIDUAL, user=poor_owner)
    services.post_commission(host_account=poor, booking_id=uuid.uuid4(), amount_minor=dzd(25_000))
    rows = admin_client.get("/api/v1/admin/wallets").data["results"]
    states = {row["host_account_id"]: row["state"] for row in rows}
    assert states == {str(rich.id): "ok", str(poor.id): "below_floor"}
    assert rows[0]["host_account_id"] == str(poor.id)  # most negative first
    below = admin_client.get("/api/v1/admin/wallets?state=below_floor,negative").data["results"]
    assert [row["host_account_id"] for row in below] == [str(poor.id)]
    detail = admin_client.get(f"/api/v1/admin/wallets/{rich.id}")
    assert detail.status_code == 200
    assert detail.data["balance"]["amount_minor"] == dzd(50_000)
    assert detail.data["total_topups"]["amount_minor"] == dzd(50_000)
    assert detail.data["commission_rate_source"] == "default"
    assert detail.data["host"]["display_name"].startswith("Karim")
    assert admin_client.get(f"/api/v1/admin/wallets/{uuid.uuid4()}").status_code == 404


def test_br_pay_03_finance_summary(host, admin_user, admin_client):
    """The overview adds up wallets, commission of the month and pending approvals from ledger lines."""
    _, account = host
    _topup(admin_user, account)
    booking = uuid.uuid4()
    services.post_commission(host_account=account, booking_id=booking, amount_minor=dzd(6_000))
    services.reverse_commission(host_account=account, booking_id=booking, amount_minor=dzd(1_000))
    _topup(admin_user, account, amount=dzd(600_000), receipt="BANK-9")
    data = admin_client.get("/api/v1/admin/finance/summary").data
    assert data["wallets_total"]["amount_minor"] == dzd(45_000)
    assert data["commission_this_month"]["amount_minor"] == dzd(6_000)
    assert data["commission_reversed_this_month"]["amount_minor"] == dzd(1_000)
    assert data["topups_this_month"]["amount_minor"] == dzd(50_000)
    assert data["pending_topup_approvals"] == 1
    assert data["negative_wallets"] == 0


def test_br_pay_02_admin_ledger_transactions_with_lines(host, admin_user, admin_client):
    """Each transaction comes with lines that sum to zero; filters by host, kind and booking reference."""
    _, account = host
    _topup(admin_user, account)
    booking = uuid.uuid4()
    services.post_commission(host_account=account, booking_id=booking, amount_minor=dzd(6_000), reference="BLD-2026-ABC123")
    rows = admin_client.get(f"/api/v1/admin/ledger/transactions?host_account={account.id}").data["results"]
    assert {row["kind"] for row in rows} == {"wallet_topup", "commission"}
    for row in rows:
        assert sum(line["amount"]["amount_minor"] for line in row["entries"]) == 0
    by_ref = admin_client.get("/api/v1/admin/ledger/transactions?booking=BLD-2026-ABC123").data["results"]
    assert [row["booking_id"] for row in by_ref] == [str(booking)]
    assert admin_client.get("/api/v1/admin/ledger/transactions?kind=wallet_topup").data["count"] == 1


def test_finance_endpoints_are_admin_only(host, user_client):
    """A guest gets 403 on every admin finance endpoint."""
    _, account = host
    for url in ("/api/v1/admin/finance/summary", "/api/v1/admin/wallets", f"/api/v1/admin/wallets/{account.id}",
                "/api/v1/admin/ledger/transactions", "/api/v1/admin/topups", "/api/v1/admin/invoices"):
        assert user_client.get(url).status_code == 403, url


# ---------------------------------------------------------------------------
# Invoices (R2, BR-PAY-12)
# ---------------------------------------------------------------------------
def test_br_pay_12_invoices_numbered_without_gaps_and_listed(host, admin_client):
    """Monthly invoices get consecutive numbers per year, are issued once, and each host sees only its own."""
    owner, account = host
    other = HostAccount.objects.create(kind=HostAccountKind.INDIVIDUAL, user=make_user(email="o@example.dz"))
    services.post_commission(host_account=account, booking_id=uuid.uuid4(), amount_minor=dzd(11_900))
    services.post_commission(host_account=other, booking_id=uuid.uuid4(), amount_minor=dzd(2_380))
    today = business_today()
    issued = services.issue_monthly_invoices(today.year, today.month)
    assert sorted(inv.number for inv in issued) == [1, 2]
    assert services.issue_monthly_invoices(today.year, today.month) == []
    mine = Invoice.objects.get(host_account=account)
    assert (mine.amount_ht_minor, mine.vat_minor, mine.amount_ttc_minor) == (dzd(10_000), dzd(1_900), dzd(11_900))
    rows = client_for(owner, account).get("/api/v1/host/invoices").data["results"]
    assert [row["id"] for row in rows] == [str(mine.id)] and rows[0]["number"].startswith(f"{today.year}-")
    assert admin_client.get(f"/api/v1/admin/invoices?host_account={other.id}").data["count"] == 1


# ---------------------------------------------------------------------------
# Payouts: dormant (BR-PAY-09, BR-PAY-11)
# ---------------------------------------------------------------------------
def _payout_account(account, hold_until=None):
    """A CCP payout account of the host."""
    return PayoutAccount.objects.create(host_account=account, kind="ccp_rip", holder_name="Karim B",
                                        number_encrypted=b"x", number_last4="1234", hold_until=hold_until)


def test_br_pay_11_payouts_answer_404_while_switched_off(host, admin_client):
    """Payout endpoints do not exist while the switch is off."""
    owner, account = host
    client = client_for(owner, account)
    assert client.get("/api/v1/host/payouts").status_code == 404
    assert client.post("/api/v1/host/payouts", {}, format="json", HTTP_IDEMPOTENCY_KEY="payout-key-1").status_code == 404
    assert admin_client.get("/api/v1/admin/payouts").status_code == 404
    assert admin_client.post(f"/api/v1/admin/payouts/{uuid.uuid4()}/approve").status_code == 404


def test_br_pay_09_payout_flow_and_hold(host, admin_user, admin_client, monkeypatch):
    """With payouts on: hold refused, request, approve (wallet debited), mark sent; reject needs a reason."""
    monkeypatch.setattr(gateways, "PAYOUTS_ENABLED", True)
    owner, account = host
    _topup(admin_user, account)
    client = client_for(owner, account)
    held = _payout_account(account, hold_until=timezone.now() + timedelta(hours=72))
    body = {"amount": {"amount_minor": dzd(10_000), "currency": "DZD"}, "payout_account_id": str(held.id)}
    res = client.post("/api/v1/host/payouts", body, format="json", HTTP_IDEMPOTENCY_KEY="payout-key-1")
    assert res.status_code == 409 and res.data["code"] == "payout_account_on_hold"
    ok = _payout_account(account)
    too_much = {"amount": {"amount_minor": dzd(60_000), "currency": "DZD"}, "payout_account_id": str(ok.id)}
    res = client.post("/api/v1/host/payouts", too_much, format="json", HTTP_IDEMPOTENCY_KEY="payout-key-2")
    assert res.status_code == 422 and res.data["code"] == "insufficient_balance"
    body["payout_account_id"] = str(ok.id)
    created = client.post("/api/v1/host/payouts", body, format="json", HTTP_IDEMPOTENCY_KEY="payout-key-3")
    assert created.status_code == 201 and created.data["status"] == PayoutStatus.REQUESTED
    payout_id = created.data["id"]
    assert client.get("/api/v1/host/payouts").data["count"] == 1
    approved = admin_client.post(f"/api/v1/admin/payouts/{payout_id}/approve")
    assert approved.status_code == 200 and approved.data["status"] == "approved"
    assert services.wallet_balance_minor(account) == dzd(40_000)
    assert admin_client.post(f"/api/v1/admin/payouts/{payout_id}/mark-sent", {}, format="json").status_code == 400
    sent = admin_client.post(f"/api/v1/admin/payouts/{payout_id}/mark-sent", {"bank_reference": "VIR-778"}, format="json")
    assert sent.status_code == 200 and sent.data["status"] == "sent"
    second = client.post("/api/v1/host/payouts", body, format="json", HTTP_IDEMPOTENCY_KEY="payout-key-4")
    rejected = admin_client.post(f"/api/v1/admin/payouts/{second.data['id']}/reject",
                                 {"reason": "Account name mismatch"}, format="json")
    assert rejected.status_code == 200 and rejected.data["status"] == "rejected"
    assert services.wallet_balance_minor(account) == dzd(40_000)


# ---------------------------------------------------------------------------
# Gateway webhook: dormant (DEC-019, BR-SYS-02)
# ---------------------------------------------------------------------------
def test_dec_019_webhook_answers_404_while_payment_is_off(api):
    """No online payment in v1: the webhook does not exist yet."""
    assert api.post("/api/v1/webhooks/gateway/chargily", {"id": "evt_1"}, format="json").status_code == 404


def test_br_sys_02_webhook_signature_and_deduplication(api, settings, monkeypatch):
    """Raw body stored first, bad signature 401, valid event processed once, duplicate acknowledged."""
    monkeypatch.setattr(gateways, "GUEST_PAYMENTS_ENABLED", True)
    monkeypatch.setattr(gateways, "GATEWAY_BACKEND", "apps.ledger.gateways.LocalGateway")
    settings.GATEWAY_WEBHOOK_SECRETS = {"chargily": "s3cret"}
    payment = Payment.objects.create(provider="chargily", provider_checkout_id="chk_1", amount_minor=1000)
    raw = json.dumps({"id": "evt_1", "type": "checkout.paid", "data": {"id": "chk_1"}}).encode()
    good = hmac.new(b"s3cret", raw, hashlib.sha256).hexdigest()
    url = "/api/v1/webhooks/gateway/chargily"
    bad = api.post(url, raw, content_type="application/json", HTTP_SIGNATURE="nope")
    assert bad.status_code == 401 and GatewayEvent.objects.filter(signature_valid=False).count() == 1
    first = api.post(url, raw, content_type="application/json", HTTP_SIGNATURE=good)
    assert first.status_code == 200 and first.data == {"received": True, "duplicate": False}
    again = api.post(url, raw, content_type="application/json", HTTP_SIGNATURE=good)
    assert again.data == {"received": True, "duplicate": True}
    event = GatewayEvent.objects.get(signature_valid=True)
    services.process_gateway_event({"gateway_event_id": str(event.id)})
    services.process_gateway_event({"gateway_event_id": str(event.id)})
    payment.refresh_from_db()
    event.refresh_from_db()
    assert payment.status == "paid" and event.processed_at is not None
    assert api.post("/api/v1/webhooks/gateway/unknown", raw, content_type="application/json").status_code == 404
