"""
Tests of the bookings app: creation, requests, cancellations, jobs and scoping.

Rules covered: BR-BKG-01 to BR-BKG-07, BR-AVL-01/02, BR-CAN-01 to 03,
BR-PAY-04/05/10, DEC-012, DEC-018, BR-SRC-03, BR-SYS-01.
"""

import uuid
from datetime import time, timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.audit.models import AuditEvent
from apps.bookings import services
from apps.bookings.models import Booking, BookingEvent, BookingStatus
from apps.catalog.tests import factories as f
from apps.core.errors import ConflictError, DomainError, ForbiddenError
from apps.core.money import dzd
from apps.hosts.models import Membership
from apps.inventory.selectors import rooms_available
from apps.ledger import services as ledger
from apps.pricing import services as pricing
from apps.trips import services as trip_services
from apps.trips.models import Trip
from conftest import client_for, make_user

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def villa(host=None, **fields):
    """The Tipaza villa of example 8a (instant, 18,500 DZD a night, 4,000 DZD cleaning, moderate policy)."""
    data = {"title": "Villa Tipaza", "base_price_minor": dzd(18_500), "cleaning_fee_minor": dzd(4_000),
            "approval_mode": "instant", **fields}
    return f.published_home(host, **data)


def quote_stay(listing, start: int, end: int, guests: int = 2, **extra):
    """A saved quote for ``[future(start), future(end))``."""
    return pricing.build_quote(listing_id=listing.id, check_in=f.future(start), check_out=f.future(end),
                               guests=guests, **extra)


def book(client, quote, key: str | None = None):
    """``POST /me/bookings`` with an optional Idempotency-Key."""
    headers = {"HTTP_IDEMPOTENCY_KEY": key} if key else {}
    return client.post("/api/v1/me/bookings", {"quote_id": str(quote.id)}, format="json", **headers)


def host_client(listing):
    """API client of the person who owns the listing's host account (solo host or organisation owner), in that workspace."""
    account = listing.host_account
    if account.user_id:
        return client_for(account.user, account)
    owner = Membership.objects.get(organization=account.organization, role="owner", is_active=True).user
    return client_for(owner, account)


def make_trip(seats: int = 4):
    """A published trip of an approved agency with one departure of ``seats`` seats. Returns ``(trip, departure)``."""
    f.reference_data()
    agency, _ = f.approved_agency()
    trip = trip_services.create_trip(agency, {
        "trip_type": "desert_expedition", "title": "5 days in the Tassili", "duration_days": 5, "group_max": 12,
        "price_per_person_minor": dzd(90_000), "start_commune": f.commune(33, "Djanet"),
    })
    trip.status = "published"
    trip.save(update_fields=["status"])
    departure = trip_services.create_departure(trip, {"starts_on": f.future(20), "ends_on": f.future(24),
                                                      "seats_total": seats})
    return trip, departure


# ---------------------------------------------------------------------------
# Creation
# ---------------------------------------------------------------------------
def test_br_bkg_01_instant_booking_posts_commission_villa_example(user, user_client):
    """Example 8a: instant villa booking, total 59,500 DZD, 12 % commission 6,660 DZD taken from the wallet."""
    listing = villa()
    response = book(user_client, quote_stay(listing, 10, 13))
    assert response.status_code == 201, response.data
    body = response.data
    assert body["status"] == "confirmed"
    assert body["payment_status"] == "not_collected"
    assert body["total"] == {"amount_minor": dzd(59_500), "currency": "DZD"}
    assert body["reference"].startswith("BLD-")
    booking = Booking.objects.get(id=body["id"])
    assert booking.commission_rate_bp == 1200
    assert booking.commission_minor == dzd(6_660)
    assert booking.cancellation_windows[0] == {"min_days_before": 5, "refund_bp": 10000}
    assert ledger.wallet_balance_minor(listing.host_account) == -dzd(6_660)
    assert BookingEvent.objects.filter(booking=booking, to_status="confirmed").count() == 1


def test_br_avl_01_overlap_refused_back_to_back_allowed(user_client):
    """Same nights twice: 409 ``dates_unavailable``; a stay starting on the check-out day is fine."""
    listing = villa()
    assert book(user_client, quote_stay(listing, 10, 13)).status_code == 201
    other = client_for(make_user(email="other@example.dz"))
    # The quote itself already sees the booked nights through the inventory provider.
    with pytest.raises(ConflictError) as exc:
        quote_stay(listing, 12, 14)
    assert exc.value.code == "dates_unavailable"
    assert book(other, quote_stay(listing, 13, 15)).status_code == 201


def test_br_avl_01_overlap_checked_again_at_booking(user):
    """Two quotes taken before either booking: the second booking is refused under the lock."""
    listing = villa()
    first, second = quote_stay(listing, 10, 13), quote_stay(listing, 11, 12)
    services.create_booking(guest=user, quote_id=first.id)
    other = make_user(email="late@example.dz")
    with pytest.raises(ConflictError) as exc:
        services.create_booking(guest=other, quote_id=second.id)
    assert exc.value.code == "dates_unavailable"


def test_br_sys_01_idempotent_retry_returns_same_booking(user_client):
    """Same Idempotency-Key twice: same answer, one booking, one commission."""
    listing = villa()
    quote = quote_stay(listing, 10, 13)
    first = book(user_client, quote, key="retry-123")
    second = book(user_client, quote, key="retry-123")
    assert first.status_code == second.status_code == 201
    assert first.data["id"] == second.data["id"]
    assert Booking.objects.count() == 1
    assert ledger.wallet_balance_minor(listing.host_account) == -dzd(6_660)


def test_quote_cannot_be_booked_twice_without_key(user_client):
    """Without a key, a second POST of the same quote is refused (``quote_already_used``)."""
    listing = villa()
    quote = quote_stay(listing, 10, 13)
    assert book(user_client, quote).status_code == 201
    response = book(user_client, quote)
    assert response.status_code == 409
    assert response.data["code"] == "quote_already_used"


def test_dec_012_unverified_phone_refused():
    """A guest without a verified phone cannot book (403 ``phone_not_verified``)."""
    listing = villa()
    guest = make_user(email="noverify@example.dz", verified=False)
    response = book(client_for(guest), quote_stay(listing, 10, 13))
    assert response.status_code == 403
    assert response.data["code"] == "phone_not_verified"
    with pytest.raises(ForbiddenError):
        services.create_booking(guest=guest, quote_id=quote_stay(listing, 10, 13).id)


def test_host_cannot_book_own_listing():
    """The host is not a guest of their own listing (``own_listing``)."""
    listing = villa()
    response = book(host_client(listing), quote_stay(listing, 10, 13))
    assert response.status_code == 403
    assert response.data["code"] == "own_listing"


def test_expired_quote_refused(user):
    """A quote older than its validity cannot be booked (BR-PRC-01)."""
    quote = quote_stay(villa(), 10, 13)
    quote.expires_at = timezone.now() - timedelta(seconds=1)
    quote.save(update_fields=["expires_at"])
    with pytest.raises(ConflictError) as exc:
        services.create_booking(guest=user, quote_id=quote.id)
    assert exc.value.code == "quote_expired"


def test_br_prc_01_price_change_detected(user):
    """The host changed the price after the quote: ``price_changed``, nothing booked."""
    listing = villa()
    quote = quote_stay(listing, 10, 13)
    listing.base_price_minor = dzd(20_000)
    listing.save(update_fields=["base_price_minor"])
    with pytest.raises(ConflictError) as exc:
        services.create_booking(guest=user, quote_id=quote.id)
    assert exc.value.code == "price_changed"
    assert Booking.objects.count() == 0


def test_br_bkg_07_snapshot_survives_listing_edit(user):
    """Later listing edits never change the booking's title or price."""
    listing = villa()
    booking = services.create_booking(guest=user, quote_id=quote_stay(listing, 10, 13).id)
    listing.title, listing.base_price_minor = "New title", dzd(30_000)
    listing.save(update_fields=["title", "base_price_minor"])
    booking.refresh_from_db()
    assert booking.title == "Villa Tipaza"
    assert booking.total_minor == dzd(59_500)


# ---------------------------------------------------------------------------
# Requests (BR-BKG-03, BR-BKG-04)
# ---------------------------------------------------------------------------
def test_br_bkg_03_request_accept_posts_commission(user, user_client):
    """Request mode: pending, no commission; accepted by the host: confirmed and 6,660 DZD posted."""
    listing = villa(approval_mode="request")
    response = book(user_client, quote_stay(listing, 10, 13))
    assert response.data["status"] == "pending"
    assert response.data["request_expires_at"] is not None
    assert ledger.wallet_balance_minor(listing.host_account) == 0
    accepted = host_client(listing).post(f"/api/v1/host/bookings/{response.data['id']}/accept")
    assert accepted.status_code == 200, accepted.data
    assert accepted.data["status"] == "confirmed"
    assert ledger.wallet_balance_minor(listing.host_account) == -dzd(6_660)


def test_br_bkg_03_decline_frees_dates_and_needs_reason(user_client):
    """Decline needs a reason; afterwards the same nights can be quoted and booked again."""
    listing = villa(approval_mode="request")
    booking_id = book(user_client, quote_stay(listing, 10, 13)).data["id"]
    host = host_client(listing)
    no_reason = host.post(f"/api/v1/host/bookings/{booking_id}/decline", {}, format="json")
    assert no_reason.status_code == 400
    assert no_reason.data["code"] == "reason_required"
    declined = host.post(f"/api/v1/host/bookings/{booking_id}/decline", {"reason": "Family visit"}, format="json")
    assert declined.data["status"] == "declined"
    assert ledger.wallet_balance_minor(listing.host_account) == 0  # BR-PAY-05: decline posts nothing
    other = client_for(make_user(email="next@example.dz"))
    assert book(other, quote_stay(listing, 10, 13)).status_code == 201


def test_br_bkg_04_request_expires_and_frees_dates(user):
    """The job expires a request after 24 hours; the dates are free and no money moved."""
    listing = villa(approval_mode="request")
    booking = services.create_booking(guest=user, quote_id=quote_stay(listing, 10, 13).id)
    assert booking.request_expires_at <= timezone.now() + timedelta(hours=24)
    assert services.expire_pending_requests(timezone.now() + timedelta(hours=1)) == 0
    assert services.expire_pending_requests(timezone.now() + timedelta(hours=25)) == 1
    booking.refresh_from_db()
    assert booking.status == BookingStatus.EXPIRED
    assert quote_stay(listing, 10, 13).total_minor == dzd(59_500)  # dates free again
    assert ledger.wallet_balance_minor(listing.host_account) == 0


def test_br_bkg_04_request_expires_at_check_in_if_sooner(user):
    """A request for tomorrow expires at tomorrow's check-in time if that comes before 24 hours."""
    listing = villa(approval_mode="request")
    booking = services.create_booking(guest=user, quote_id=quote_stay(listing, 0, 2).id)
    assert booking.request_expires_at == min(booking.created_at + timedelta(hours=24), services.check_in_at(booking)) \
        or booking.request_expires_at <= services.check_in_at(booking)


def test_br_pay_10_below_floor_instant_becomes_request_and_accept_refused(user):
    """Deposit below the credit floor: an instant listing gives a pending booking, and accepting is refused."""
    listing = villa()
    account = listing.host_account
    account.credit_limit_override_minor = 0
    account.save(update_fields=["credit_limit_override_minor"])
    ledger.post_commission(host_account=account, booking_id=uuid.uuid4(), amount_minor=dzd(100))  # wallet -100 DZD
    booking = services.create_booking(guest=user, quote_id=quote_stay(listing, 10, 13).id)
    assert booking.status == BookingStatus.PENDING
    assert booking.approval_mode_applied == "request"
    response = host_client(listing).post(f"/api/v1/host/bookings/{booking.id}/accept")
    assert response.status_code == 409
    assert response.data["code"] == "deposit_below_floor"


def test_br_bkg_02_platform_switch_forces_request(user, admin_user):
    """With ``instant_booking_enabled`` off, an instant listing still becomes a request."""
    from apps.config.services import update_settings

    update_settings({"instant_booking_enabled": False}, actor=admin_user)
    booking = services.create_booking(guest=user, quote_id=quote_stay(villa(), 10, 13).id)
    assert booking.status == BookingStatus.PENDING


# ---------------------------------------------------------------------------
# Cancellations (section 8, DEC-018)
# ---------------------------------------------------------------------------
def test_br_can_02_guest_cancel_moderate_three_days_before(user, user_client):
    """Example 8a: moderate, 3 days before: 50 % of 55,500 + 4,000 = 31,750 DZD owed; 6,660 back to the wallet."""
    listing = villa()
    booking_id = book(user_client, quote_stay(listing, 3, 6)).data["id"]
    assert ledger.wallet_balance_minor(listing.host_account) == -dzd(6_660)
    response = user_client.post(f"/api/v1/me/bookings/{booking_id}/cancel", {}, format="json")
    assert response.status_code == 200, response.data
    assert response.data["status"] == "cancelled"
    assert response.data["cancelled_by_role"] == "guest"
    assert response.data["refund_due"]["amount_minor"] == dzd(31_750)
    assert ledger.wallet_balance_minor(listing.host_account) == 0  # DEC-018: full commission back


def test_br_can_01_refund_windows_table():
    """Moderate policy: 100 % from 5 days, 50 % from 4 to 1 day, 0 % on arrival day."""
    from apps.catalog.models import POLICY_WINDOWS

    windows = POLICY_WINDOWS["moderate"]
    assert [services.refund_bp_for(windows, d) for d in (10, 5, 4, 1, 0)] == [10000, 10000, 5000, 5000, 0]


def test_br_can_01_guest_cannot_cancel_after_check_in_time(user):
    """After check-in time on arrival day the guest must contact support (``too_late_to_cancel``)."""
    listing = villa(check_in_time=time(0, 0))
    booking = services.create_booking(guest=user, quote_id=quote_stay(listing, 0, 2).id)
    with pytest.raises(DomainError) as exc:
        services.cancel_by_guest(guest=user, booking_key=booking.id)
    assert exc.value.code == "too_late_to_cancel"


def test_guest_withdraws_pending_request_nothing_owed(user, user_client):
    """Cancelling a pending request owes nothing and frees the dates."""
    listing = villa(approval_mode="request")
    booking_id = book(user_client, quote_stay(listing, 10, 13)).data["id"]
    response = user_client.post(f"/api/v1/me/bookings/{booking_id}/cancel", {}, format="json")
    assert response.data["status"] == "cancelled"
    assert response.data["refund_due"]["amount_minor"] == 0


def test_br_can_03_host_cancel_full_refund_and_commission_back(user, user_client):
    """Host cancels a confirmed booking: the guest is owed 59,500 DZD and the 6,660 DZD come back."""
    listing = villa()
    booking_id = book(user_client, quote_stay(listing, 10, 13)).data["id"]
    host = host_client(listing)
    assert host.post(f"/api/v1/host/bookings/{booking_id}/cancel", {}, format="json").status_code == 400
    response = host.post(f"/api/v1/host/bookings/{booking_id}/cancel", {"reason": "Water leak"}, format="json")
    assert response.status_code == 200, response.data
    assert response.data["refund_due"]["amount_minor"] == dzd(59_500)
    assert response.data["cancelled_by_role"] == "host"
    assert ledger.wallet_balance_minor(listing.host_account) == 0
    assert AuditEvent.objects.filter(action="BOOKING_CANCEL_BY_HOST").count() == 1


def test_admin_cancel_with_partial_refund_is_audited(user, admin_client):
    """Admin cancels with a chosen refund; reason required; commission returned (DEC-018); audited."""
    listing = villa()
    booking = services.create_booking(guest=user, quote_id=quote_stay(listing, 10, 13).id)
    url = f"/api/v1/admin/bookings/{booking.id}/cancel"
    assert admin_client.post(url, {"refund_due_minor": 100}, format="json").status_code == 400
    too_much = admin_client.post(url, {"reason": "Support case", "refund_due_minor": dzd(60_000)}, format="json")
    assert too_much.data["code"] == "invalid_refund"
    response = admin_client.post(url, {"reason": "Support case", "refund_due_minor": dzd(10_000)}, format="json")
    assert response.status_code == 200, response.data
    assert response.data["refund_due"]["amount_minor"] == dzd(10_000)
    assert ledger.wallet_balance_minor(listing.host_account) == 0
    assert AuditEvent.objects.filter(action="BOOKING_CANCEL_BY_ADMIN", object_id=str(booking.id)).exists()


# ---------------------------------------------------------------------------
# Pools (BR-AVL-02, BR-TRP-02)
# ---------------------------------------------------------------------------
def test_br_avl_02_hotel_room_pool_never_oversold(user):
    """One room left: two quotes, the second booking is refused and the counter stays exact."""
    hotel, room = f.published_hotel(units=1)
    first = pricing.build_quote(listing_id=hotel.id, room_type_id=room.id, check_in=f.future(10),
                                check_out=f.future(12), guests=2)
    second = pricing.build_quote(listing_id=hotel.id, room_type_id=room.id, check_in=f.future(11),
                                 check_out=f.future(13), guests=2)
    services.create_booking(guest=user, quote_id=first.id)
    with pytest.raises(ConflictError):
        services.create_booking(guest=make_user(email="b@example.dz"), quote_id=second.id)
    assert rooms_available(room, f.future(10), f.future(12)) == 0
    assert rooms_available(room, f.future(12), f.future(13)) == 1


def test_br_avl_02_hotel_decline_releases_rooms(user):
    """A declined hotel request gives its room back."""
    hotel, room = f.published_hotel(units=1)
    quote = pricing.build_quote(listing_id=hotel.id, room_type_id=room.id, check_in=f.future(10),
                                check_out=f.future(12), guests=2)
    booking = services.create_booking(guest=user, quote_id=quote.id)
    assert booking.status == BookingStatus.PENDING  # hotels default to request mode
    assert booking.commission_rate_bp == 1800
    response = host_client(hotel).post(f"/api/v1/host/bookings/{booking.id}/decline", {"reason": "Full"},
                                           format="json")
    assert response.status_code == 200, response.data
    assert rooms_available(room, f.future(10), f.future(12)) == 1


def test_br_trp_02_trip_departure_seats(user):
    """4 seats: 3 booked, then 2 more refused, then 1 accepted; price = seats x price per person."""
    _, departure = make_trip(seats=4)
    quote = pricing.build_quote(trip_departure_id=departure.id, guests=3)
    assert quote.total_minor == 3 * dzd(90_000)
    booking = services.create_booking(guest=user, quote_id=quote.id)
    assert booking.inventory_kind == "departure"
    assert booking.commission_minor == 3 * dzd(90_000) * 15 // 100  # agency 15 %, DEC-002
    departure.refresh_from_db()
    assert departure.seats_left == 1
    with pytest.raises(ConflictError):
        pricing.build_quote(trip_departure_id=departure.id, guests=2)
    other = make_user(email="seat@example.dz")
    services.create_booking(guest=other, quote_id=pricing.build_quote(trip_departure_id=departure.id, guests=1).id)
    departure.refresh_from_db()
    assert departure.seats_left == 0
    assert Trip.objects.count() == 1


# ---------------------------------------------------------------------------
# Scoping and privacy
# ---------------------------------------------------------------------------
def test_other_host_cannot_see_or_accept(user):
    """A booking of another workspace answers 404 to list, detail and accept (OWASP API1)."""
    listing = villa(approval_mode="request")
    booking = services.create_booking(guest=user, quote_id=quote_stay(listing, 10, 13).id)
    stranger = host_client(villa())
    assert stranger.get(f"/api/v1/host/bookings/{booking.id}").status_code == 404
    assert stranger.post(f"/api/v1/host/bookings/{booking.id}/accept").status_code == 404
    assert stranger.get("/api/v1/host/bookings").data["count"] == 0
    assert host_client(listing).get("/api/v1/host/bookings?status=pending").data["count"] == 1


def test_other_guest_cannot_see_booking(user):
    """Another guest gets 404 on someone else's booking."""
    booking = services.create_booking(guest=user, quote_id=quote_stay(villa(), 10, 13).id)
    other = client_for(make_user(email="nosy@example.dz"))
    assert other.get(f"/api/v1/me/bookings/{booking.id}").status_code == 404
    assert other.post(f"/api/v1/me/bookings/{booking.id}/cancel", {}, format="json").status_code == 404


def test_br_src_03_address_hidden_while_pending(user, user_client):
    """The exact address appears only once the booking is confirmed; the detail works by reference too."""
    listing = villa(approval_mode="request")
    booking = services.create_booking(guest=user, quote_id=quote_stay(listing, 10, 13).id)
    pending = user_client.get(f"/api/v1/me/bookings/{booking.reference}")
    assert pending.status_code == 200
    assert pending.data["address_line"] is None
    assert pending.data["location_exact"] is None
    host_client(listing).post(f"/api/v1/host/bookings/{booking.id}/accept")
    confirmed = user_client.get(f"/api/v1/me/bookings/{booking.id}")
    assert confirmed.data["address_line"] == "12 rue Secrète"
    listed = user_client.get("/api/v1/me/bookings?status=confirmed")
    assert listed.data["count"] == 1


def test_admin_lists_and_reads_bookings(user, admin_client, user_client):
    """Admins see every booking with its history; guests cannot reach the admin list."""
    booking = services.create_booking(guest=user, quote_id=quote_stay(villa(), 10, 13).id)
    listed = admin_client.get(f"/api/v1/admin/bookings?reference={booking.reference}")
    assert listed.data["count"] == 1
    detail = admin_client.get(f"/api/v1/admin/bookings/{booking.id}")
    assert detail.data["events"][0]["to_status"] == "confirmed"
    assert user_client.get("/api/v1/admin/bookings").status_code == 403


# ---------------------------------------------------------------------------
# Jobs (BR-BKG-05)
# ---------------------------------------------------------------------------
def test_br_bkg_05_completion_job(user):
    """A confirmed stay completes only after check-out time + 2 hours (Algiers)."""
    booking = services.create_booking(guest=user, quote_id=quote_stay(villa(), 10, 13).id)
    checkout = services.check_out_at(booking)
    assert services.complete_finished_stays(checkout + timedelta(hours=1)) == 0
    assert services.complete_finished_stays(checkout + timedelta(hours=2, minutes=1)) == 1
    booking.refresh_from_db()
    assert booking.status == BookingStatus.COMPLETED
    assert booking.completed_at is not None


def test_management_commands_run():
    """Both job commands run on an empty database."""
    call_command("expire_requests")
    call_command("complete_stays")


def test_br_bkg_06_events_are_append_only(user):
    """History rows cannot be changed or deleted."""
    booking = services.create_booking(guest=user, quote_id=quote_stay(villa(), 10, 13).id)
    event = booking.events.first()
    with pytest.raises(RuntimeError):
        event.save()
    with pytest.raises(RuntimeError):
        event.delete()
