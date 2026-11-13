"""Tests of the trips app: who may create trips, trip type, review, public search, departure seats."""

import pytest

from apps.audit.models import AuditEvent
from apps.catalog.states import ListingStatus
from apps.catalog.tests import factories as f
from apps.core.errors import ConflictError
from apps.trips import services
from apps.trips.models import Trip, TripDeparture
from conftest import client_for

pytestmark = pytest.mark.django_db


def trip_body(**extra) -> dict:
    """Minimal valid body of ``POST /host/trips``."""
    return {"trip_type": "desert_expedition", "title": "5 days in the Tassili", "duration_days": 5, "group_max": 12,
            "price_per_person_minor": 9_000_000, "start_commune": f.commune(33, "Djanet").id, **extra}


def make_trip(agency=None, *, published: bool = True, **extra) -> Trip:
    """A complete trip (with a one-day itinerary) of an approved agency, published by default."""
    f.reference_data()
    agency = agency or f.approved_agency()[0]
    data = trip_body(**extra)
    data["start_commune"] = f.commune(33, "Djanet")
    trip = services.create_trip(agency, data)
    services.replace_itinerary(trip, [{"day_number": 1, "title": "Arrival in Djanet"}])
    if published:
        trip.status = ListingStatus.PUBLISHED
        trip.save(update_fields=["status"])
    return trip


# ---------------------------------------------------------------------------
# BR-TRP-01: only approved agencies
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("maker", [f.approved_individual_host, f.approved_hotel, f.approved_hostel])
def test_br_trp_01_only_agencies_create_trips(maker):
    """Solo hosts, hotels and hostels get 403 host_offer_not_allowed."""
    account, user = maker()
    response = client_for(user, account).post("/api/v1/host/trips", trip_body(), format="json")
    assert response.status_code == 403
    assert response.json()["code"] == "host_offer_not_allowed"


def test_br_trp_01_agency_must_be_approved():
    """An agency still under review cannot create trips; an approved one can."""
    pending, owner = f.organization_host("agency", approved=False)
    response = client_for(owner, pending).post("/api/v1/host/trips", trip_body(), format="json")
    assert response.json()["code"] == "host_offer_not_allowed"
    agency, owner = f.approved_agency()
    response = client_for(owner, agency).post("/api/v1/host/trips", trip_body(), format="json")
    assert response.status_code == 201
    assert response.json()["status"] == "draft"
    assert response.json()["slug"].startswith("5-days-in-the-tassili")


def test_br_lst_05_trip_type_required():
    """A trip without type is refused with trip_type_required."""
    agency, owner = f.approved_agency()
    body = trip_body()
    body.pop("trip_type")
    response = client_for(owner, agency).post("/api/v1/host/trips", body, format="json")
    assert response.status_code == 400
    assert response.json()["code"] == "trip_type_required"


# ---------------------------------------------------------------------------
# Review and visibility (BR-LST-03 for trips)
# ---------------------------------------------------------------------------
def test_trip_submit_review_and_public(api, admin_client):
    """Submit needs an itinerary; admin approves; then the trip is public by id and slug."""
    f.reference_data()  # cancellation policies
    agency, owner = f.approved_agency()
    client = client_for(owner, agency)
    trip_id = client.post("/api/v1/host/trips", trip_body(), format="json").json()["id"]
    response = client.post(f"/api/v1/host/trips/{trip_id}/submit")
    assert response.json()["code"] == "trip_incomplete"
    response = client.put(f"/api/v1/host/trips/{trip_id}/itinerary",
                          {"days": [{"day_number": 1, "title": "Arrival"}, {"day_number": 2, "title": "Tadrart"}]},
                          format="json")
    assert response.status_code == 200 and len(response.json()) == 2
    assert client.post(f"/api/v1/host/trips/{trip_id}/submit").json()["status"] == "pending_review"
    assert api.get(f"/api/v1/trips/{trip_id}").status_code == 404

    response = admin_client.post(f"/api/v1/admin/trips/{trip_id}/approve")
    assert response.json()["status"] == "published"
    slug = response.json()["slug"]
    assert api.get(f"/api/v1/trips/{slug}").json()["itinerary"][1]["title"] == "Tadrart"
    assert AuditEvent.objects.filter(action="TRIP_APPROVE").exists()


def test_trip_admin_reason_required(admin_client):
    """Reject needs a reason of 10+ characters."""
    trip = make_trip(published=False)
    Trip.objects.filter(pk=trip.pk).update(status=ListingStatus.PENDING_REVIEW)
    assert admin_client.post(f"/api/v1/admin/trips/{trip.id}/reject", {"reason": "no"}, format="json").json()["code"] \
        == "reason_required"
    response = admin_client.post(f"/api/v1/admin/trips/{trip.id}/reject",
                                 {"reason": "Itinerary is too vague."}, format="json")
    assert response.json()["status"] == "rejected"


def test_trip_itinerary_numbering_checked():
    """Day numbers must be 1..n without gaps."""
    trip = make_trip(published=False)
    owner = trip.host_account.organization.memberships.get().user
    response = client_for(owner, trip.host_account).put(
        f"/api/v1/host/trips/{trip.id}/itinerary", {"days": [{"day_number": 2, "title": "x"}]}, format="json"
    )
    assert response.json()["code"] == "invalid_itinerary"


# ---------------------------------------------------------------------------
# Public search
# ---------------------------------------------------------------------------
def test_trip_search_filters(api):
    """Trip type list, max price, wilaya and departure dates."""
    desert = make_trip()
    hike = make_trip(trip_type="hiking", price_per_person_minor=3_000_000)
    make_trip(published=False)
    TripDeparture.objects.create(trip=desert, starts_on=f.future(30), ends_on=f.future(34), seats_total=10)

    def ids(query):
        """Result ids of a search with this query string."""
        return {r["id"] for r in api.get(f"/api/v1/trips?{query}").json()["results"]}

    assert ids("") == {str(desert.id), str(hike.id)}
    assert ids("trip_type=hiking,cultural") == {str(hike.id)}
    assert ids("max_price=5000000") == {str(hike.id)}
    assert ids("wilaya=33") == {str(desert.id), str(hike.id)}
    assert ids(f"from={f.future(31)}&to={f.future(40)}") == {str(desert.id)}
    assert ids(f"from={f.future(35)}&to={f.future(40)}") == set()


def test_trip_departures_public(api):
    """Upcoming open departures with seats left and the effective price."""
    trip = make_trip()
    TripDeparture.objects.create(trip=trip, starts_on=f.future(10), ends_on=f.future(14), seats_total=8,
                                 seats_booked=3, price_per_person_minor=8_000_000)
    TripDeparture.objects.create(trip=trip, starts_on=f.future(20), ends_on=f.future(24), seats_total=8,
                                 status="cancelled")
    body = api.get(f"/api/v1/trips/{trip.id}/departures").json()
    assert len(body) == 1
    assert body[0]["seats_left"] == 5
    assert body[0]["price_per_person"] == {"amount_minor": 8_000_000, "currency": "DZD"}


# ---------------------------------------------------------------------------
# BR-TRP-02: departure seats
# ---------------------------------------------------------------------------
def test_br_trp_02_departure_seats_never_oversold():
    """Reserve up to the last seat; one more fails with dates_unavailable; release frees seats."""
    trip = make_trip()
    departure = services.create_departure(trip, {"starts_on": f.future(10), "ends_on": f.future(14), "seats_total": 4})
    services.departure_reserve(departure, 3)
    with pytest.raises(ConflictError) as error:
        services.departure_reserve(departure, 2)
    assert error.value.code == "dates_unavailable"
    services.departure_reserve(departure, 1, kind="held")
    assert departure.seats_left == 0
    services.departure_confirm(departure, 1)
    assert departure.seats_booked == 4
    services.departure_release(departure, 2)
    assert departure.seats_left == 2
    assert services.departure_price_minor(departure) == trip.price_per_person_minor


def test_br_trp_02_cancelled_departure_refuses_seats():
    """A cancelled departure accepts no reservation."""
    trip = make_trip()
    departure = services.create_departure(trip, {"starts_on": f.future(10), "ends_on": f.future(12), "seats_total": 4})
    services.cancel_departure(departure)
    with pytest.raises(ConflictError):
        services.departure_reserve(departure, 1)


def test_host_departures_crud():
    """Create, refuse duplicate start and seats beyond group_max, refuse delete with seats taken, cancel."""
    trip = make_trip()
    owner = trip.host_account.organization.memberships.get().user
    client = client_for(owner, trip.host_account)
    url = f"/api/v1/host/trips/{trip.id}/departures"
    body = {"starts_on": f.future(10).isoformat(), "ends_on": f.future(14).isoformat(), "seats_total": 10}
    created = client.post(url, body, format="json")
    assert created.status_code == 201
    assert client.post(url, body, format="json").json()["code"] == "departure_exists"
    assert client.post(url, {**body, "starts_on": f.future(20).isoformat(), "ends_on": f.future(22).isoformat(),
                             "seats_total": 99}, format="json").status_code == 400
    departure = TripDeparture.objects.get(id=created.json()["id"])
    services.departure_reserve(departure, 2)
    assert client.delete(f"{url}/{departure.id}").json()["code"] == "departure_has_bookings"
    assert client.post(f"{url}/{departure.id}/cancel").json()["status"] == "cancelled"


def test_other_agency_trip_is_404():
    """Host endpoints are scoped by workspace."""
    trip = make_trip()
    other, owner = f.approved_agency()
    assert client_for(owner, other).get(f"/api/v1/host/trips/{trip.id}").status_code == 404
