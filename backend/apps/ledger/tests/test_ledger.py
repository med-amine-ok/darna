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


def test_br_pay_07_receipt_cannot_be_used_twice(host, admin_client):
    """The same receipt reference for the same method is refused."""
    _, account = host
    body = {"host_account": str(account.id), "method": "ccp_transfer", "amount_minor": dzd(10_000), "receipt_reference": "CCP-9"}
    assert admin_client.post("/api/v1/admin/wallet-topups", body).status_code == 201
    res = admin_client.post("/api/v1/admin/wallet-topups", body)
    assert res.status_code == 409 and res.data["code"] == "receipt_already_used"
    assert services.wallet_balance_minor(account) == dzd(10_000)


def test_br_pay_07_large_topup_needs_a_second_admin(host, admin_user, admin_client):
    """Above 500,000 DZD the top-up waits; the same admin cannot approve it; another admin can."""
    from apps.accounts.models import StaffProfile, StaffStatus

    _, account = host
    big = topup(admin_user, account, amount=dzd(600_000), receipt="BANK-1")
    assert big.status == TopupStatus.PENDING_APPROVAL and services.wallet_balance_minor(account) == 0
    res = admin_client.post(f"/api/v1/admin/wallet-topups/{big.id}/approve")
    assert res.status_code == 403 and res.data["code"] == "four_eyes_required"
    second = make_user(email="admin2@bladus.dz", is_staff=True)
    StaffProfile.objects.create(user=second, status=StaffStatus.ACTIVE)
    assert client_for(second).post(f"/api/v1/admin/wallet-topups/{big.id}/approve").status_code == 200
    assert services.wallet_balance_minor(account) == dzd(600_000)


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
    body = {"host_account": str(account.id), "method": "ccp_transfer", "amount_minor": 1000, "receipt_reference": "X"}
    assert user_client.post("/api/v1/admin/wallet-topups", body).status_code == 403
