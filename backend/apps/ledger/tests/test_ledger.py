"""Tests of the deposit wallet, top-ups and commission (BR-PAY-02 to BR-PAY-10, DEC-018)."""

import uuid

import pytest
from django.db.models import Sum

from apps.core.money import dzd
from apps.hosts.models import HostAccount, HostAccountKind, VerificationStatus
from apps.ledger import services
from apps.ledger.models import LedgerEntry, LedgerTransaction, TopupStatus
from conftest import client_for, make_user

pytestmark = pytest.mark.django_db


@pytest.fixture
def host():
    """An approved solo host and their host account."""
    owner = make_user(email="host@example.dz")
    account = HostAccount.objects.create(kind=HostAccountKind.INDIVIDUAL, user=owner, verification_status=VerificationStatus.APPROVED)
    return owner, account


def topup(admin, account, amount=dzd(50_000), receipt="CCP-001"):
    """Record a CCP top-up as ``admin``."""
    return services.create_topup(host_account=account, method="ccp_transfer", amount_minor=amount, receipt_reference=receipt, actor=admin)


def test_br_pay_02_every_transaction_balances(host, admin_user):
    """The lines of each transaction add up to zero, and so does the whole ledger."""
    _, account = host
    topup(admin_user, account)
    services.post_commission(host_account=account, booking_id=uuid.uuid4(), amount_minor=dzd(6_660))
    for tx in LedgerTransaction.objects.all():
        assert tx.entries.aggregate(total=Sum("amount_minor"))["total"] == 0
    assert LedgerEntry.objects.aggregate(total=Sum("amount_minor"))["total"] == 0


def test_dec_018_full_commission_back_on_cancellation(host, admin_user):
    """Worked example of the blueprint: 50,000 -> 43,340 after commission -> 50,000 after cancellation."""
    _, account = host
    booking = uuid.uuid4()
    topup(admin_user, account)
    services.post_commission(host_account=account, booking_id=booking, amount_minor=dzd(6_660))
    assert services.wallet_balance_minor(account) == dzd(43_340)
    services.reverse_commission(host_account=account, booking_id=booking)
    assert services.wallet_balance_minor(account) == dzd(50_000)


def test_br_pay_04_commission_posted_once_and_returned_once(host):
    """Calling the services twice does not move money twice."""
    _, account = host
    booking = uuid.uuid4()
    services.post_commission(host_account=account, booking_id=booking, amount_minor=1000)
    services.post_commission(host_account=account, booking_id=booking, amount_minor=1000)
    assert services.wallet_balance_minor(account) == -1000
    services.reverse_commission(host_account=account, booking_id=booking)
    services.reverse_commission(host_account=account, booking_id=booking)
    assert services.wallet_balance_minor(account) == 0


def test_br_pay_02_ledger_rows_cannot_be_changed(host):
    """Ledger lines are insert-only."""
    _, account = host
    tx = services.post_commission(host_account=account, booking_id=uuid.uuid4(), amount_minor=1000)
    with pytest.raises(RuntimeError):
        tx.save()
    with pytest.raises(RuntimeError):
        tx.entries.first().delete()


def _topup_body(amount=dzd(10_000), receipt="CCP-9", method="ccp_transfer"):
    """Body of ``POST /admin/wallets/{id}/topups``."""
    return {"amount": {"amount_minor": amount, "currency": "DZD"}, "method": method, "receipt_reference": receipt}


def _post_topup(client, account, body, key="topup-key-0001"):
    """Record a top-up through the API with an Idempotency-Key."""
    return client.post(f"/api/v1/admin/wallets/{account.id}/topups", body, format="json", HTTP_IDEMPOTENCY_KEY=key)


def test_br_pay_07_receipt_cannot_be_used_twice(host, admin_client):
    """The same receipt reference for the same method is refused."""
    _, account = host
    first = _post_topup(admin_client, account, _topup_body())
    assert first.status_code == 201 and first.data["status"] == "approved"
    assert first.data["wallet_balance_after"]["amount_minor"] == dzd(10_000)
    assert first.data["ledger_transaction_id"] and first.data["needs_second_approval"] is False
    res = _post_topup(admin_client, account, _topup_body(), key="topup-key-0002")
    assert res.status_code == 409 and res.data["code"] == "receipt_already_used"
    assert services.wallet_balance_minor(account) == dzd(10_000)


def test_br_sys_01_topup_retry_with_same_key_is_replayed(host, admin_client):
    """A retry with the same Idempotency-Key returns the first answer and credits once; no key is refused."""
    _, account = host
    first = _post_topup(admin_client, account, _topup_body())
    again = _post_topup(admin_client, account, _topup_body())
    assert again.status_code == 201 and again.data["id"] == first.data["id"]
    assert again["Idempotency-Replayed"] == "true"
    assert services.wallet_balance_minor(account) == dzd(10_000)
    no_key = admin_client.post(f"/api/v1/admin/wallets/{account.id}/topups", _topup_body(receipt="X-1"), format="json")
    assert no_key.status_code == 400 and no_key.data["code"] == "idempotency_key_required"


def test_br_pay_08_gateway_method_refused_for_manual_topups(host, admin_client):
    """``gateway`` is reserved for online top-ups, which do not exist in v1."""
    _, account = host
    assert _post_topup(admin_client, account, _topup_body(method="gateway")).status_code == 400


def test_br_pay_07_large_topup_needs_a_second_admin(host, admin_user, admin_client):
    """Above 500,000 DZD the top-up waits; the same admin cannot approve it; another admin can."""
    _, account = host
    big = topup(admin_user, account, amount=dzd(600_000), receipt="BANK-1")
    assert big.status == TopupStatus.PENDING_APPROVAL and services.wallet_balance_minor(account) == 0
    listed = admin_client.get("/api/v1/admin/topups?status=pending_approval").data["results"]
    assert [row["id"] for row in listed] == [str(big.id)] and listed[0]["needs_second_approval"] is True
    res = admin_client.post(f"/api/v1/admin/topups/{big.id}/approve")
    assert res.status_code == 403 and res.data["code"] == "four_eyes_same_user"
    approved = client_for(_second_admin()).post(f"/api/v1/admin/topups/{big.id}/approve")
    assert approved.status_code == 200 and approved.data["status"] == "approved"
    assert services.wallet_balance_minor(account) == dzd(600_000)
    late = admin_client.post(f"/api/v1/admin/topups/{big.id}/reject", {"reason": "Too late for this"}, format="json")
    assert late.status_code == 409 and late.data["code"] == "topup_not_pending"


def test_br_pay_07_reject_pending_topup(host, admin_user, admin_client):
    """A pending top-up is refused with a reason; nothing is credited."""
    _, account = host
    big = topup(admin_user, account, amount=dzd(600_000), receipt="BANK-2")
    short = admin_client.post(f"/api/v1/admin/topups/{big.id}/reject", {"reason": "no"}, format="json")
    assert short.status_code == 400
    res = admin_client.post(f"/api/v1/admin/topups/{big.id}/reject", {"reason": "Receipt does not match"}, format="json")
    assert res.status_code == 200 and res.data["status"] == "rejected"
    assert services.wallet_balance_minor(account) == 0


def test_old_topup_and_wallet_routes_are_gone(host, admin_client):
    """The routes moved to the plan's addresses (/admin/topups, /admin/wallets/{id})."""
    _, account = host
    assert admin_client.get("/api/v1/admin/wallet-topups").status_code == 404
    assert admin_client.get(f"/api/v1/admin/hosts/{account.id}/wallet").status_code == 404


def test_br_pay_10_credit_floor(host):
    """Below minus 20,000 DZD the host can no longer accept bookings."""
    _, account = host
    services.post_commission(host_account=account, booking_id=uuid.uuid4(), amount_minor=dzd(15_000))
    assert services.can_accept_bookings(account) is True
    services.post_commission(host_account=account, booking_id=uuid.uuid4(), amount_minor=dzd(6_000))
    assert services.can_accept_bookings(account) is False


def test_host_sees_own_wallet_and_history(host, admin_user):
    """The host wallet endpoints show balance and signed history lines."""
    owner, account = host
    topup(admin_user, account)
    services.post_commission(host_account=account, booking_id=uuid.uuid4(), amount_minor=dzd(6_660))
    client = client_for(owner, account)
    wallet = client.get("/api/v1/host/wallet")
    assert wallet.status_code == 200 and wallet.data["balance"]["amount_minor"] == dzd(43_340)
    assert wallet.data["commission_rate_bp"] == 1200
    amounts = [row["amount"]["amount_minor"] for row in client.get("/api/v1/host/wallet/entries").data["results"]]
    assert amounts == [-dzd(6_660), dzd(50_000)]


def test_guest_cannot_record_topups(host, user_client):
    """Top-ups are admin only."""
    _, account = host
    assert _post_topup(user_client, account, _topup_body()).status_code == 403


# ---------------------------------------------------------------------------
# Review 2026-11-13 (R6, R11)
# ---------------------------------------------------------------------------
def _second_admin():
    """Another active admin, for four-eyes checks."""
    from apps.accounts.models import StaffProfile, StaffStatus

    second = make_user(email="admin2@bladus.dz", is_staff=True)
    StaffProfile.objects.create(user=second, status=StaffStatus.ACTIVE)
    return second


def test_br_pay_07_split_topups_still_need_a_second_admin(host, admin_user):
    """Two top-ups of 300,000 DZD in 24 hours: the second one waits for another admin (review R6)."""
    _, account = host
    first = topup(admin_user, account, amount=dzd(300_000), receipt="CCP-A")
    second = topup(admin_user, account, amount=dzd(300_000), receipt="CCP-B")
    assert first.status == TopupStatus.APPROVED and second.status == TopupStatus.PENDING_APPROVAL
    assert services.wallet_balance_minor(account) == dzd(300_000)


def test_br_pay_13_adjustment_needs_second_admin_and_cap(host, admin_user, admin_client):
    """Adjustments wait for another admin, are capped at 1,000,000 DZD and move the deposit once approved."""
    from apps.core.errors import DomainError, ForbiddenError

    _, account = host
    with pytest.raises(DomainError) as exc:
        services.create_adjustment(host_account=account, amount_minor=dzd(1_000_001), reason="Too big correction", actor=admin_user)
    assert exc.value.code == "invalid_amount"
    res = admin_client.post("/api/v1/admin/wallet-adjustments",
                            {"host_account": str(account.id), "amount_minor": -dzd(2_000), "reason": "Duplicate top-up CCP-001"},
                            format="json")
    assert res.status_code == 201 and res.data["status"] == "pending_approval"
    assert services.wallet_balance_minor(account) == 0
    with pytest.raises(ForbiddenError):
        services.approve_adjustment(res.data["id"], actor=admin_user)
    approved = client_for(_second_admin()).post(f"/api/v1/admin/wallet-adjustments/{res.data['id']}/approve")
    assert approved.status_code == 200 and approved.data["status"] == "approved"
    assert services.wallet_balance_minor(account) == -dzd(2_000)


def test_br_pay_15_reconcile_finds_and_fixes_a_wrong_balance(host, admin_user):
    """A stored balance that differs from the lines is reported, and fixed with --fix (review R11)."""
    from apps.ledger.models import AccountBalance

    _, account = host
    topup(admin_user, account)
    assert services.reconcile_balances() == []
    AccountBalance.objects.filter(account__host_account=account).update(balance_minor=1)
    diff = services.reconcile_balances()
    assert diff == [{"account": f"host_wallet:{account.id}", "stored_minor": 1, "computed_minor": dzd(50_000)}]
    services.reconcile_balances(fix=True)
    assert services.wallet_balance_minor(account) == dzd(50_000)
