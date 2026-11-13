"""Tests of the catalog app: host offer rule, state machine, privacy, search, admin review, seed."""

from decimal import Decimal
from io import StringIO

import pytest
from django.core.management import call_command

from apps.audit.models import AuditEvent
from apps.catalog.models import Amenity, CancellationPolicy, Category, Listing, PropertyType
from apps.catalog.states import ListingStatus
from apps.inventory.services import set_days_blocked
from conftest import client_for

from . import factories as f

pytestmark = pytest.mark.django_db

PRIVATE_KEYS = {"address_line", "latitude", "longitude"}


def _new_listing_body(vertical: str, **extra) -> dict:
    """Minimal body of ``POST /host/listings``."""
    return {"vertical": vertical, "title": f"My {vertical}", **extra}


# ---------------------------------------------------------------------------
# BR-HST-05 / DEC-014: who may publish what
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "maker, allowed, refused",
    [
        (f.approved_individual_host, ["home", "vehicle"], ["hotel", "hostel", "experience"]),
        (f.approved_agency, ["experience"], ["home", "vehicle", "hotel", "hostel"]),
        (f.approved_hotel, ["hotel"], ["home", "vehicle", "hostel", "experience"]),
        (f.approved_hostel, ["hostel"], ["home", "vehicle", "hotel", "experience"]),
    ],
)
def test_br_hst_05_host_offer_rule_per_host_type(maker, allowed, refused):
    """Each host type may create only its own verticals; others get 403 host_offer_not_allowed."""
    f.reference_data()
    account, user = maker()
    client = client_for(user, account)
    for vertical in allowed:
        extra = {"experience_type": "desert"} if vertical == "experience" else {}
        response = client.post("/api/v1/host/listings", _new_listing_body(vertical, **extra), format="json")
        assert response.status_code == 201, response.json()
        assert response.json()["inventory_kind"] in ("single", "room_pool", "slot")
    for vertical in refused:
        extra = {"experience_type": "desert"} if vertical == "experience" else {}
        response = client.post("/api/v1/host/listings", _new_listing_body(vertical, **extra), format="json")
        assert response.status_code == 403
        assert response.json()["code"] == "host_offer_not_allowed"


def test_br_hst_05_vertical_change_is_checked_too():
    """Changing the vertical of a draft to a forbidden one is refused."""
    account, user = f.approved_individual_host()
    listing = f.listing(account, "home")
    response = client_for(user, account).patch(f"/api/v1/host/listings/{listing.id}", {"vertical": "hotel"}, format="json")
    assert response.status_code == 403
    assert response.json()["code"] == "host_offer_not_allowed"


# ---------------------------------------------------------------------------
# BR-LST-05: experience type
# ---------------------------------------------------------------------------
def test_br_lst_05_experience_type_required():
    """An experience without type is refused; a home with a type too."""
    agency, owner = f.approved_agency()
    client = client_for(owner, agency)
    response = client.post("/api/v1/host/listings", _new_listing_body("experience"), format="json")
    assert response.status_code == 400
    assert response.json()["code"] == "experience_type_required"

    host, user = f.approved_individual_host()
    response = client_for(user, host).post(
        "/api/v1/host/listings", _new_listing_body("home", experience_type="desert"), format="json"
    )
    assert response.status_code == 400
    assert response.json()["code"] == "experience_type_not_allowed"


# ---------------------------------------------------------------------------
# BR-LST-03: state machine and visibility
# ---------------------------------------------------------------------------
def test_br_lst_03_submit_then_admin_approve_publishes(admin_client, api):
    """draft -> pending_review (host) -> published (admin); only then is it public."""
    host, user = f.approved_individual_host()
    listing = f.listing(host, "home")
    client = client_for(user, host)
    assert api.get(f"/api/v1/listings/{listing.id}").status_code == 404

    response = client.post(f"/api/v1/host/listings/{listing.id}/submit")
    assert response.status_code == 200
    assert response.json()["status"] == "pending_review"
    assert api.get(f"/api/v1/listings/{listing.id}").status_code == 404

    response = admin_client.post(f"/api/v1/admin/listings/{listing.id}/approve")
    assert response.status_code == 200
    assert response.json()["status"] == "published"
    assert api.get(f"/api/v1/listings/{listing.reference}").status_code == 200
    assert AuditEvent.objects.filter(action="LISTING_APPROVE", object_id=str(listing.id)).exists()


def test_br_lst_03_illegal_moves_refused(admin_client):
    """A host cannot publish its own draft, pause a draft, or approve; admin cannot approve a draft."""
    host, user = f.approved_individual_host()
    listing = f.listing(host, "home")
    client = client_for(user, host)
    assert client.post(f"/api/v1/host/listings/{listing.id}/resume").json()["code"] == "invalid_status_change"
    assert client.post(f"/api/v1/host/listings/{listing.id}/pause").status_code == 409
    assert admin_client.post(f"/api/v1/admin/listings/{listing.id}/approve").status_code == 409


def test_br_lst_03_pause_resume_and_only_published_is_public(api):
    """Paused listings disappear from search and come back on resume without review."""
    host, user = f.approved_individual_host()
    listing = f.published_home(host)
    client = client_for(user, host)
    assert api.get("/api/v1/listings").json()["count"] == 1
    assert client.post(f"/api/v1/host/listings/{listing.id}/pause").json()["status"] == "paused"
    assert api.get("/api/v1/listings").json()["count"] == 0
    assert client.post(f"/api/v1/host/listings/{listing.id}/resume").json()["status"] == "published"
    assert api.get("/api/v1/listings").json()["count"] == 1


def test_br_src_01_unapproved_host_listing_hidden(api):
    """A published listing of a host that is not approved is not public."""
    host, _ = f.individual_host(approved=False)
    listing = f.published_home(host)
    assert api.get("/api/v1/listings").json()["count"] == 0
    assert api.get(f"/api/v1/listings/{listing.id}").status_code == 404


def test_br_lst_02_editing_title_of_published_listing_sends_back_to_review(api):
    """First version of BR-LST-02: reviewed field -> pending_review; price change stays live."""
    host, user = f.approved_individual_host()
    listing = f.published_home(host)
    client = client_for(user, host)
    response = client.patch(f"/api/v1/host/listings/{listing.id}", {"base_price_minor": 1_500_000}, format="json")
    assert response.json()["status"] == "published"
    response = client.patch(f"/api/v1/host/listings/{listing.id}", {"title": "New title"}, format="json")
    assert response.json()["status"] == "pending_review"


def test_br_lst_01_hotel_needs_room_type_to_submit():
    """A hotel without an active room type cannot be submitted; with one it can."""
    hotel, owner = f.approved_hotel()
    listing = f.listing(hotel, "hotel")
    client = client_for(owner, hotel)
    response = client.post(f"/api/v1/host/listings/{listing.id}/submit")
    assert response.status_code == 400
    assert response.json()["code"] == "listing_incomplete"
    assert "room_types" in response.json()["errors"]

    response = client.post(
        f"/api/v1/host/listings/{listing.id}/room-types",
        {"name": "Double", "unit_count": 5, "capacity_per_unit": 2, "base_price_minor": 800_000}, format="json",
    )
    assert response.status_code == 201
    response = client.post(f"/api/v1/host/listings/{listing.id}/submit")
    assert response.status_code == 200
    assert response.json()["base_price_minor"] == 800_000  # lowest room price copied for search


def test_br_lst_01_home_needs_commune_and_price():
    """A home without commune or price cannot be submitted."""
    host, user = f.approved_individual_host()
    listing = f.listing(host, "home", base_price_minor=0)
    Listing.objects.filter(pk=listing.pk).update(commune=None)
    response = client_for(user, host).post(f"/api/v1/host/listings/{listing.id}/submit")
    assert response.status_code == 400
    assert {"commune", "base_price_minor"} <= set(response.json()["errors"])


def test_soft_delete_and_admin_restore(admin_client):
    """Host deletes (soft), admin restores the previous status."""
    host, user = f.approved_individual_host()
    listing = f.published_home(host)
    assert client_for(user, host).delete(f"/api/v1/host/listings/{listing.id}").status_code == 204
    listing.refresh_from_db()
    assert listing.status == "deleted" and listing.deleted_at is not None
    response = admin_client.post(f"/api/v1/admin/listings/{listing.id}/restore")
    assert response.status_code == 200
    assert response.json()["status"] == "published"


def test_other_hosts_listing_is_404():
    """Host endpoints are scoped by the workspace: someone else's listing looks missing."""
    listing = f.published_home()
    other, user = f.approved_individual_host()
    assert client_for(user, other).get(f"/api/v1/host/listings/{listing.id}").status_code == 404


# ---------------------------------------------------------------------------
# BR-SRC-03: privacy of the exact location
# ---------------------------------------------------------------------------
def test_br_src_03_public_responses_hide_exact_location(api):
    """Cards and detail never contain the address or the exact point; the public point is near."""
    listing = f.published_home()
    card = api.get("/api/v1/listings").json()["results"][0]
    detail = api.get(f"/api/v1/listings/{listing.id}").json()
    for body in (card, detail):
        assert not PRIVATE_KEYS & set(body)
        assert "12 rue" not in str(body)
    point = detail["location_public"]
    assert (point["lat"], point["lng"]) != (36.7538, 3.0588)
    # Within about 600 m (0.0055 degrees of latitude ~ 610 m).
    assert abs(point["lat"] - 36.7538) < 0.0055 and abs(point["lng"] - 3.0588) < 0.0070


def test_host_sees_exact_location():
    """The host view contains the private fields."""
    host, user = f.approved_individual_host()
    listing = f.published_home(host)
    body = client_for(user, host).get(f"/api/v1/host/listings/{listing.id}").json()
    assert body["address_line"] == "12 rue Secrète"
    assert Decimal(body["latitude"]) == Decimal("36.753800")


# ---------------------------------------------------------------------------
# Search filters
# ---------------------------------------------------------------------------
def test_search_filters_vertical_price_guests_amenities_and_sort(api):
    """Vertical (comma list), price range, guests, amenities (all of), sort by price."""
    f.reference_data()
    host, _ = f.approved_individual_host()
    cheap = f.published_home(host, base_price_minor=500_000, capacity_guests=2, amenities=["wifi", "pool"])
    dear = f.published_home(host, base_price_minor=2_000_000, capacity_guests=8, amenities=["wifi"])
    car = f.listing(host, "vehicle", status=ListingStatus.PUBLISHED, base_price_minor=700_000)
    f.published_hotel()

    def ids(query):
        """Result ids of a search with this query string."""
        return [r["id"] for r in api.get(f"/api/v1/listings?{query}").json()["results"]]

    assert set(ids("vertical=home")) == {str(cheap.id), str(dear.id)}
    assert set(ids("vertical=home,vehicle")) == {str(cheap.id), str(dear.id), str(car.id)}
    assert ids("vertical=hostel") == []
    assert ids("vertical=home&max_price=1000000") == [str(cheap.id)]
    assert ids("vertical=home&guests=6") == [str(dear.id)]
    assert ids("amenities=wifi,pool") == [str(cheap.id)]
    assert ids("vertical=home&sort=-price") == [str(dear.id), str(cheap.id)]


def test_search_filters_wilaya_and_experience_type(api):
    """Wilaya from the commune; experience types as a comma list."""
    oran = f.commune(31, "Oran", "35.6971", "-0.6308")
    home = f.published_home(commune=oran)
    f.published_home()
    desert = f.published_experience(experience_type="desert")
    f.published_experience(experience_type="gastronomy")
    assert [r["id"] for r in api.get("/api/v1/listings?wilaya=31").json()["results"]] == [str(home.id)]
    results = api.get("/api/v1/listings?exp_type=desert,wellness").json()["results"]
    assert [r["id"] for r in results] == [str(desert.id)]


def test_br_avl_04_search_with_dates_skips_blocked_days(api):
    """With check_in/check_out only listings free for every night are returned."""
    free = f.published_home()
    busy = f.published_home()
    set_days_blocked(busy, [f.future(11)], True)
    query = f"check_in={f.future(10).isoformat()}&check_out={f.future(13).isoformat()}&vertical=home"
    assert [r["id"] for r in api.get(f"/api/v1/listings?{query}").json()["results"]] == [str(free.id)]
    # A stay ending on the blocked day does not use it as a night: both match.
    query = f"check_in={f.future(9).isoformat()}&check_out={f.future(11).isoformat()}&vertical=home"
    assert api.get(f"/api/v1/listings?{query}").json()["count"] == 2


def test_br_avl_05_search_respects_min_nights(api):
    """A stay shorter than min_nights does not match."""
    f.published_home(min_nights=3)
    query = f"check_in={f.future(10).isoformat()}&check_out={f.future(11).isoformat()}"
    assert api.get(f"/api/v1/listings?{query}").json()["count"] == 0


def test_search_bbox_uses_public_point(api):
    """The map box filters on the public point."""
    listing = f.published_home()
    lat, lng = float(listing.public_latitude), float(listing.public_longitude)
    inside = f"{lng - 0.01},{lat - 0.01},{lng + 0.01},{lat + 0.01}"
    outside = f"{lng + 1},{lat + 1},{lng + 2},{lat + 2}"
    assert api.get(f"/api/v1/listings?bbox={inside}").json()["count"] == 1
    assert api.get(f"/api/v1/listings?bbox={outside}").json()["count"] == 0
    assert api.get("/api/v1/listings?bbox=1,2,3").status_code == 400


def test_search_instant_filter(api):
    """instant=true keeps listings booked at once (own mode or inherited from the host)."""
    host, _ = f.approved_individual_host()
    instant = f.published_home(host, approval_mode="instant")
    f.published_home(host)
    assert [r["id"] for r in api.get("/api/v1/listings?instant=true").json()["results"]] == [str(instant.id)]


# ---------------------------------------------------------------------------
# Admin review
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("action", ["reject", "request-changes"])
def test_br_lst_03_admin_reason_required(admin_client, action):
    """Reject and request changes need a reason of 10+ characters; it is stored and audited."""
    host, _ = f.approved_individual_host()
    listing = f.listing(host, "home", status=ListingStatus.PENDING_REVIEW)
    response = admin_client.post(f"/api/v1/admin/listings/{listing.id}/{action}", {"reason": "short"}, format="json")
    assert response.status_code == 400
    assert response.json()["code"] == "reason_required"
    reason = "Photos are blurry, please replace them."
    response = admin_client.post(f"/api/v1/admin/listings/{listing.id}/{action}", {"reason": reason}, format="json")
    assert response.status_code == 200
    assert response.json()["moderation_note"] == reason
    assert AuditEvent.objects.filter(object_id=str(listing.id), note=reason).exists()


def test_admin_suspend_and_unsuspend(admin_client, api):
    """Suspend hides a published listing (reason required); unsuspend publishes it again."""
    listing = f.published_home()
    assert admin_client.post(f"/api/v1/admin/listings/{listing.id}/suspend").status_code == 400
    response = admin_client.post(
        f"/api/v1/admin/listings/{listing.id}/suspend", {"reason": "Reported as a fake listing."}, format="json"
    )
    assert response.json()["status"] == "suspended"
    assert api.get("/api/v1/listings").json()["count"] == 0
    assert admin_client.post(f"/api/v1/admin/listings/{listing.id}/unsuspend").json()["status"] == "published"


def test_admin_endpoints_refuse_hosts():
    """A host session cannot reach admin listing endpoints."""
    host, user = f.approved_individual_host()
    assert client_for(user, host).get("/api/v1/admin/listings").status_code == 403


def test_admin_list_filters(admin_client):
    """Admin queue filters by status and vertical."""
    host, _ = f.approved_individual_host()
    f.listing(host, "home", status=ListingStatus.PENDING_REVIEW)
    f.published_home(host)
    body = admin_client.get("/api/v1/admin/listings?status=pending_review&vertical=home").json()
    assert body["count"] == 1


# ---------------------------------------------------------------------------
# Rooms, photos, services, reference endpoints
# ---------------------------------------------------------------------------
def test_photos_cover_and_reorder():
    """First photo is the cover; reorder keeps every id once."""
    host, user = f.approved_individual_host()
    listing = f.listing(host, "home")
    client = client_for(user, host)
    first = client.post(f"/api/v1/host/listings/{listing.id}/photos", {"url": "https://x/1.jpg"}, format="json").json()
    second = client.post(f"/api/v1/host/listings/{listing.id}/photos", {"url": "https://x/2.jpg"}, format="json").json()
    assert first["is_cover"] and not second["is_cover"]
    response = client.put(f"/api/v1/host/listings/{listing.id}/photos/order", {"ids": [second["id"], first["id"]]},
                          format="json")
    assert [p["id"] for p in response.json()] == [second["id"], first["id"]]
    assert client.put(f"/api/v1/host/listings/{listing.id}/photos/order", {"ids": [first["id"]]},
                      format="json").status_code == 400
    assert client.delete(f"/api/v1/host/listings/{listing.id}/photos/{first['id']}").status_code == 204
    assert client.get(f"/api/v1/host/listings/{listing.id}/photos").json()[0]["is_cover"] is True


def test_hotel_services_public_and_host(api):
    """Hotel services (DEC-017): host adds, public lists; homes cannot have services."""
    listing, _ = f.published_hotel()
    owner = listing.host_account.organization.memberships.get().user
    client = client_for(owner, listing.host_account)
    response = client.post(f"/api/v1/host/listings/{listing.id}/services",
                           {"kind": "spa", "name": "Hammam", "price_minor": 200_000}, format="json")
    assert response.status_code == 201
    assert api.get(f"/api/v1/listings/{listing.id}/services").json()[0]["name"] == "Hammam"
    home_host, user = f.approved_individual_host()
    home = f.listing(home_host, "home")
    response = client_for(user, home_host).post(f"/api/v1/host/listings/{home.id}/services",
                                                 {"kind": "spa", "name": "Spa"}, format="json")
    assert response.json()["code"] == "services_not_allowed"


def test_public_detail_has_room_types_and_host_card(api):
    """Hotel page shows room types, policy and the host card."""
    listing, room = f.published_hotel()
    body = api.get(f"/api/v1/listings/{listing.id}").json()
    assert body["room_types"][0]["id"] == str(room.id)
    assert body["cancellation_policy"]["code"] == "moderate"
    assert body["host"]["host_type"] == "hotel"


def test_reference_endpoints(api):
    """Reference lists are public; type lists mirror the frontend (8 + 8, three languages)."""
    f.reference_data()
    experience_types = api.get("/api/v1/reference/experience-types").json()
    trip_types = api.get("/api/v1/reference/trip-types").json()
    assert [t["id"] for t in experience_types][:2] == ["excursion", "guided_tour"]
    assert len(experience_types) == 8 and len(trip_types) == 8
    assert trip_types[0] == {"id": "group_tour", "label_en": "Group tour", "label_fr": "Circuit en groupe",
                             "label_ar": "جولة جماعية"}
    assert len(api.get("/api/v1/reference/cancellation-policies").json()) == 3
    assert api.get("/api/v1/reference/amenities?vertical=vehicle").json()
    assert api.get("/api/v1/reference/property-types?vertical=home").json()
    assert api.get("/api/v1/reference/categories").json()


# ---------------------------------------------------------------------------
# Seed command
# ---------------------------------------------------------------------------
def test_seed_catalog_is_idempotent():
    """Running seed_catalog twice creates the rows once; policy windows follow BR-CAN-01."""
    call_command("seed_catalog", stdout=StringIO())
    counts = (CancellationPolicy.objects.count(), Amenity.objects.count(), PropertyType.objects.count(),
              Category.objects.count())
    call_command("seed_catalog", stdout=StringIO())
    assert counts == (CancellationPolicy.objects.count(), Amenity.objects.count(), PropertyType.objects.count(),
                      Category.objects.count())
    assert counts[0] == 3 and counts[1] >= 20
    strict = CancellationPolicy.objects.get(code="strict", is_current=True)
    assert strict.windows == [{"min_days_before": 14, "refund_bp": 10000}, {"min_days_before": 7, "refund_bp": 5000},
                              {"min_days_before": 0, "refund_bp": 0}]
