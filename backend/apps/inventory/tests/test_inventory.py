"""Tests of the inventory app: reservation counters, prices, windows, calendar and slots endpoints."""

from datetime import datetime, timedelta, timezone as dt_timezone

import pytest

from apps.catalog.tests import factories as f
from apps.core.errors import ConflictError
from apps.inventory import selectors, services
from apps.inventory.models import ExperienceSlot, RoomTypeNight
from conftest import client_for

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# BR-AVL-02: pooled counters never oversell
# ---------------------------------------------------------------------------
def test_br_avl_02_reserve_last_unit_twice_second_fails():
    """Two reservations of the last room: the first wins, the second gets dates_unavailable."""
    _, room = f.published_hotel(units=1)
    check_in, check_out = f.future(5), f.future(7)
    services.reserve_rooms(room, check_in, check_out, 1)
    with pytest.raises(ConflictError) as error:
        services.reserve_rooms(room, check_in, check_out, 1)
    assert error.value.code == "dates_unavailable"
    assert selectors.rooms_available(room, check_in, check_out) == 0


def test_br_avl_02_partial_nights_roll_back():
    """If one night lacks room, no night changes (all or nothing)."""
    _, room = f.published_hotel(units=2)
    services.reserve_rooms(room, f.future(6), f.future(7), 2)  # night 6 is full
    with pytest.raises(ConflictError):
        services.reserve_rooms(room, f.future(5), f.future(8), 1)  # nights 5, 6, 7
    rows = {r.night: r.booked for r in RoomTypeNight.objects.filter(room_type=room)}
    # Nights 5 and 7 are untouched (their rows were even rolled back), night 6 still full.
    assert rows.get(f.future(5), 0) == 0 and rows.get(f.future(7), 0) == 0 and rows[f.future(6)] == 2


def test_br_avl_02_hold_confirm_release_cycle():
    """Held units count against stock, confirm moves them to booked, release frees them."""
    _, room = f.published_hotel(units=3)
    nights = (f.future(3), f.future(5))
    services.reserve_rooms(room, *nights, 2, kind="held")
    assert selectors.rooms_available(room, *nights) == 1
    services.confirm_rooms(room, *nights, 2)
    row = RoomTypeNight.objects.filter(room_type=room).first()
    assert (row.held, row.booked) == (0, 2)
    services.release_rooms(room, *nights, 2)
    assert selectors.rooms_available(room, *nights) == 3
    with pytest.raises(ConflictError) as error:
        services.release_rooms(room, *nights, 1)
    assert error.value.code == "inventory_mismatch"


def test_br_avl_02_room_calendar_total_cannot_drop_below_sold():
    """A host cannot close rooms that are already sold."""
    _, room = f.published_hotel(units=3)
    services.reserve_rooms(room, f.future(4), f.future(5), 2)
    with pytest.raises(ConflictError):
        services.set_room_nights(room, [f.future(4)], total=1)
    services.set_room_nights(room, [f.future(4)], total=2)
    assert selectors.rooms_available(room, f.future(4), f.future(5)) == 0


def test_br_avl_02_slot_seats():
    """Experience slot seats behave like room units."""
    listing = f.published_experience()
    start = datetime.now(dt_timezone.utc) + timedelta(days=3)
    slot = services.create_slot(listing, {"starts_at": start, "ends_at": start + timedelta(hours=3), "seats_total": 4})
    services.slot_reserve(slot, 3)
    with pytest.raises(ConflictError):
        services.slot_reserve(slot, 2)
    services.slot_reserve(slot, 1, kind="held")
    assert slot.seats_left == 0
    services.slot_release(slot, 1, kind="held")
    assert slot.seats_left == 1
    slot.is_cancelled = True
    slot.save()
    with pytest.raises(ConflictError):
        services.slot_reserve(slot, 1)


# ---------------------------------------------------------------------------
# Prices, blocks, windows (BR-AVL-04/05)
# ---------------------------------------------------------------------------
def test_nightly_prices_use_overrides():
    """Base price per night, special price where the host set one (home and room type)."""
    home = f.published_home(base_price_minor=1_000_000)
    services.set_day_prices(home, [f.future(2)], 1_500_000)
    prices = selectors.nightly_prices(home, f.future(1), f.future(4))
    assert [p for _, p in prices] == [1_000_000, 1_500_000, 1_000_000]
    hotel, room = f.published_hotel(price_minor=800_000)
    services.set_room_nights(room, [f.future(1)], price_minor=900_000, set_price=True)
    assert [p for _, p in selectors.nightly_prices(hotel, f.future(1), f.future(3), room)] == [900_000, 800_000]


def test_br_avl_04_window_rules():
    """Past, advance notice, availability window, min and max nights."""
    home = f.published_home(min_nights=2, max_nights=5, advance_notice_days=3)
    problem = selectors.listing_window_problem
    assert problem(home, f.future(-1), f.future(2)) == "past"
    assert problem(home, f.future(1), f.future(4)) == "advance_notice"
    assert problem(home, f.future(5), f.future(6)) == "min_nights"
    assert problem(home, f.future(5), f.future(12)) == "max_nights"
    assert selectors.is_listing_window_ok(home, f.future(5), f.future(8))
    home.available_until = f.future(6)
    assert problem(home, f.future(5), f.future(8)) == "outside_window"


def test_br_avl_01_single_unit_free_with_booked_ranges():
    """Blocked day or overlapping booking makes the stay unavailable; back-to-back is fine."""
    home = f.published_home()
    booked = [(f.future(10), f.future(12))]
    assert selectors.single_unit_free(home, f.future(12), f.future(14), booked)  # back-to-back
    assert not selectors.single_unit_free(home, f.future(11), f.future(13), booked)
    services.set_days_blocked(home, [f.future(20)], True)
    assert not selectors.single_unit_free(home, f.future(19), f.future(21), [])


def test_booked_ranges_provider_feeds_search(api):
    """The bookings app can plug in booked ranges; search then hides the booked home."""
    home = f.published_home()
    selectors.register_booked_ranges_provider(lambda ids, start, end: {home.id: [(f.future(10), f.future(12))]})
    try:
        query = f"check_in={f.future(11).isoformat()}&check_out={f.future(13).isoformat()}"
        assert api.get(f"/api/v1/listings?{query}").json()["count"] == 0
        body = api.get(f"/api/v1/listings/{home.id}/availability?from={f.future(10)}&to={f.future(13)}").json()
        assert [n["reason"] for n in body["nights"]] == ["booked", "booked", None]
    finally:
        selectors.register_booked_ranges_provider(None)


def test_search_with_dates_hotel_capacity(api):
    """A hotel matches dates only while enough rooms (x capacity) are free."""
    hotel, room = f.published_hotel(units=1)  # 1 room for 2 guests
    query = f"check_in={f.future(5).isoformat()}&check_out={f.future(6).isoformat()}"
    assert api.get(f"/api/v1/listings?{query}&guests=2").json()["count"] == 1
    assert api.get(f"/api/v1/listings?{query}&guests=3").json()["count"] == 0
    services.reserve_rooms(room, f.future(5), f.future(6), 1)
    assert api.get(f"/api/v1/listings?{query}").json()["count"] == 0


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
def test_public_availability_home(api):
    """Per day: available flag, reason and price."""
    home = f.published_home(base_price_minor=1_000_000)
    services.set_days_blocked(home, [f.future(3)], True)
    body = api.get(f"/api/v1/listings/{home.id}/availability?from={f.future(2)}&to={f.future(4)}").json()
    assert body["inventory_kind"] == "single"
    assert [(n["available"], n["reason"]) for n in body["nights"]] == [(True, None), (False, "blocked")]
    assert body["nights"][0]["price"] == {"amount_minor": 1_000_000, "currency": "DZD"}


def test_public_availability_hotel_units_left(api):
    """Per room type: units left per night."""
    hotel, room = f.published_hotel(units=3)
    services.reserve_rooms(room, f.future(2), f.future(3), 2)
    body = api.get(f"/api/v1/listings/{hotel.id}/availability?from={f.future(2)}&to={f.future(4)}").json()
    assert [n["units_left"] for n in body["room_types"][0]["nights"]] == [1, 3]


def test_host_calendar_blocks_and_prices_endpoints():
    """Host closes and prices days; the host calendar shows them."""
    host, user = f.approved_individual_host()
    home = f.published_home(host)
    client = client_for(user, host)
    day = f.future(4).isoformat()
    assert client.put(f"/api/v1/host/listings/{home.id}/calendar/blocks", {"dates": [day], "blocked": True},
                      format="json").status_code == 204
    assert client.put(f"/api/v1/host/listings/{home.id}/calendar/prices", {"dates": [day], "price_minor": 2_000_000},
                      format="json").status_code == 204
    body = client.get(f"/api/v1/host/listings/{home.id}/calendar?from={day}&to={f.future(5)}").json()
    assert body["days"] == [{"date": day, "is_blocked": True, "is_booked": False, "price_minor": 2_000_000,
                             "has_price_override": True}]


def test_host_room_type_calendar_endpoint():
    """Host lowers the sellable rooms of a night."""
    hotel, room = f.published_hotel(units=3)
    owner = hotel.host_account.organization.memberships.get().user
    client = client_for(owner, hotel.host_account)
    response = client.put(f"/api/v1/host/room-types/{room.id}/calendar",
                          {"dates": [f.future(2).isoformat()], "total": 1}, format="json")
    assert response.status_code == 204
    assert selectors.rooms_available(room, f.future(2), f.future(3)) == 1
    response = client.put(f"/api/v1/host/room-types/{room.id}/calendar",
                          {"dates": [f.future(2).isoformat()], "total": 9}, format="json")
    assert response.status_code == 400


def test_calendar_needs_permission_and_ownership():
    """Another host gets 404; a team member without calendar.manage gets 403."""
    from apps.hosts.models import Membership

    hotel, room = f.published_hotel()
    other, user = f.approved_individual_host()
    assert client_for(user, other).put(f"/api/v1/host/room-types/{room.id}/calendar",
                                       {"dates": [f.future(2).isoformat()], "total": 1}, format="json").status_code == 404
    agent = f.make_user(email="agent@example.dz")
    Membership.objects.create(organization=hotel.host_account.organization, user=agent, role="agent")
    response = client_for(agent, hotel.host_account).get(f"/api/v1/host/listings/{hotel.id}/calendar")
    assert response.status_code == 403


def test_host_slots_crud():
    """Create, list, refuse duplicate start, shrink below taken seats refused, delete cancels a used slot."""
    agency, owner = f.approved_agency()
    experience = f.published_experience(agency)
    client = client_for(owner, agency)
    start = (datetime.now(dt_timezone.utc) + timedelta(days=5)).replace(microsecond=0)
    body = {"starts_at": start.isoformat(), "ends_at": (start + timedelta(hours=2)).isoformat(), "seats_total": 6}
    created = client.post(f"/api/v1/host/listings/{experience.id}/slots", body, format="json")
    assert created.status_code == 201
    assert client.post(f"/api/v1/host/listings/{experience.id}/slots", body, format="json").json()["code"] == "slot_exists"
    slot = ExperienceSlot.objects.get(id=created.json()["id"])
    services.slot_reserve(slot, 4)
    url = f"/api/v1/host/listings/{experience.id}/slots/{slot.id}"
    assert client.patch(url, {"seats_total": 3}, format="json").json()["code"] == "seats_taken"
    assert client.delete(url).status_code == 204
    slot.refresh_from_db()
    assert slot.is_cancelled
    assert len(client.get(f"/api/v1/host/listings/{experience.id}/slots").json()) == 1
