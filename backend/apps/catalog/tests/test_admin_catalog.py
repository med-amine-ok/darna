"""Tests of the 2026-11-15 catalog endpoints: admin status, delete, featured, taxonomy, host status and room types."""

import pytest

from apps.audit.models import AuditEvent
from apps.catalog.models import Amenity, Category, FeaturedPlacement, Listing, PropertyType
from apps.catalog.states import ListingStatus
from conftest import client_for

from . import factories as f

pytestmark = pytest.mark.django_db

LABELS = {"en": "Beach", "fr": "Plage", "ar": "شاطئ"}


# ---------------------------------------------------------------------------
# Host status (BR-LST-03)
# ---------------------------------------------------------------------------
def test_br_lst_03_host_status_moves_and_allowed_list():
    """Withdraw, reopen after archive; allowed_status_changes follows table 4a."""
    host, user = f.approved_individual_host()
    listing = f.listing(host, "home")
    client = client_for(user, host)
    url = f"/api/v1/host/listings/{listing.id}/status"
    body = client.post(url, {"status": "pending_review"}, format="json").json()
    assert body["allowed_status_changes"] == ["draft"]
    assert client.post(url, {"status": "draft", "note": "Forgot photos"}, format="json").json()["status"] == "draft"
    Listing.objects.filter(pk=listing.pk).update(status=ListingStatus.PUBLISHED)
    assert client.post(url, {"status": "archived"}, format="json").json()["status"] == "archived"
    assert client.post(url, {"status": "draft"}, format="json").json()["status"] == "draft"


def test_br_lst_03_host_cannot_publish_or_use_unknown_status():
    """published only resumes a paused listing; other values are 400."""
    host, user = f.approved_individual_host()
    listing = f.listing(host, "home", status=ListingStatus.PENDING_REVIEW)
    client = client_for(user, host)
    url = f"/api/v1/host/listings/{listing.id}/status"
    assert client.post(url, {"status": "published"}, format="json").status_code == 409
    assert client.post(url, {"status": "suspended"}, format="json").status_code == 400


def test_host_status_needs_permission():
    """A team member without listings.manage gets 403."""
    from apps.hosts.models import Membership

    hotel, _ = f.published_hotel()
    agent = f.make_user(email="agent-status@example.dz")
    Membership.objects.create(organization=hotel.host_account.organization, user=agent, role="agent")
    response = client_for(agent, hotel.host_account).post(
        f"/api/v1/host/listings/{hotel.id}/status", {"status": "paused"}, format="json")
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Admin status, delete, featured (BR-LST-03, BR-STF-02)
# ---------------------------------------------------------------------------
def test_br_stf_02_admin_status_delete_and_restore_audited(admin_client):
    """Admin soft-deletes through DELETE, then restores to the previous status through /status."""
    listing = f.published_home()
    assert admin_client.delete(f"/api/v1/admin/listings/{listing.id}").status_code == 204
    listing.refresh_from_db()
    assert listing.status == ListingStatus.DELETED and listing.status_before_delete == "published"
    url = f"/api/v1/admin/listings/{listing.id}/status"
    assert admin_client.post(url, {"status": "draft"}, format="json").json()["code"] == "invalid_transition"
    assert admin_client.post(url, {"status": "published"}, format="json").json()["status"] == "published"
    actions = set(AuditEvent.objects.filter(object_id=str(listing.id)).values_list("action", flat=True))
    assert {"LISTING_DELETE", "LISTING_RESTORE"} <= actions


def test_br_lst_03_admin_status_reason_and_staff_only(admin_client):
    """Suspend needs a reason of 10+ characters; a host cannot call the admin endpoint."""
    listing = f.published_home()
    url = f"/api/v1/admin/listings/{listing.id}/status"
    assert admin_client.post(url, {"status": "suspended"}, format="json").status_code == 422
    response = admin_client.post(url, {"status": "suspended", "reason": "Fake photos reported."}, format="json")
    assert response.json()["status"] == "suspended"
    assert response.json()["moderation_note"] == "Fake photos reported."
    assert client_for(listing.host_account.user, listing.host_account).post(
        url, {"status": "published"}, format="json").status_code == 403


def test_admin_featured_only_published_and_audited(admin_client, api):
    """Feature a published listing (409 not_published otherwise), filter featured=true, unfeature."""
    draft = f.listing(f.approved_individual_host()[0], "home")
    response = admin_client.put(f"/api/v1/admin/listings/{draft.id}/featured", {"is_featured": True}, format="json")
    assert response.status_code == 409 and response.json()["code"] == "not_published"
    listing = f.published_home()
    f.published_home()
    url = f"/api/v1/admin/listings/{listing.id}/featured"
    response = admin_client.put(url, {"is_featured": True, "placement": "home_hero"}, format="json")
    assert response.status_code == 200 and response.json()["is_featured"] is True
    assert [r["id"] for r in api.get("/api/v1/listings?featured=true").json()["results"]] == [str(listing.id)]
    assert admin_client.put(url, {"is_featured": False}, format="json").json()["is_featured"] is False
    assert FeaturedPlacement.objects.filter(listing=listing, ends_at__isnull=False).count() == 1
    assert AuditEvent.objects.filter(action="LISTING_UNFEATURE", object_id=str(listing.id)).exists()


# ---------------------------------------------------------------------------
# Taxonomy (BR-LST-04)
# ---------------------------------------------------------------------------
def test_br_lst_04_category_crud_and_slug_taken(admin_client):
    """Create, refuse a duplicate slug, edit (reorder, deactivate), delete when unused; all audited."""
    body = {"vertical": "home", "slug": "sea-view", "labels": LABELS, "sort_order": 3}
    response = admin_client.post("/api/v1/admin/categories", body, format="json")
    assert response.status_code == 201
    created = response.json()
    assert created["label"] == "Plage" and created["listing_count"] == 0
    assert admin_client.post("/api/v1/admin/categories", body, format="json").json()["code"] == "slug_taken"
    url = f"/api/v1/admin/categories/{created['id']}"
    response = admin_client.patch(url, {"sort_order": 1, "is_active": False}, format="json")
    assert response.json()["sort_order"] == 1 and response.json()["is_active"] is False
    rows = admin_client.get("/api/v1/admin/categories?vertical=home&active=false").json()["results"]
    assert [r["slug"] for r in rows] == ["sea-view"]
    assert admin_client.delete(url).status_code == 204
    assert not Category.objects.filter(slug="sea-view").exists()
    actions = set(AuditEvent.objects.filter(object_id=created["id"]).values_list("action", flat=True))
    assert actions == {"CATEGORY_CREATE", "CATEGORY_UPDATE", "CATEGORY_DELETE"}


def test_br_lst_04_used_rows_cannot_be_deleted(admin_client):
    """An amenity, category or property type used by a listing answers 409 in_use; deactivating works."""
    f.reference_data()
    host, _ = f.approved_individual_host()
    category = Category.objects.filter(vertical="home").first()
    ptype = PropertyType.objects.filter(vertical="home").first()
    f.listing(host, "home", amenities=["wifi"], category=category, property_type=ptype)
    wifi = Amenity.objects.get(slug="wifi")
    for url in (f"/api/v1/admin/amenities/{wifi.id}", f"/api/v1/admin/categories/{category.id}",
                f"/api/v1/admin/property-types/{ptype.id}"):
        response = admin_client.delete(url)
        assert response.status_code == 409 and response.json()["code"] == "in_use"
        assert admin_client.patch(url, {"is_active": False}, format="json").json()["is_active"] is False
    rows = admin_client.get("/api/v1/admin/amenities?vertical=home").json()["results"]
    assert next(r for r in rows if r["slug"] == "wifi")["listing_count"] == 1


def test_amenity_and_property_type_create(admin_client):
    """Amenities take group and applies_to; property types are unique per vertical."""
    response = admin_client.post("/api/v1/admin/amenities", {
        "slug": "sauna", "group": "features", "labels": LABELS, "applies_to": ["home", "hotel"]}, format="json")
    assert response.status_code == 201 and response.json()["group"] == "features"
    body = {"vertical": "home", "slug": "yurt", "labels": LABELS}
    assert admin_client.post("/api/v1/admin/property-types", body, format="json").status_code == 201
    assert admin_client.post("/api/v1/admin/property-types", {**body, "vertical": "hostel"},
                             format="json").status_code == 201
    assert admin_client.post("/api/v1/admin/property-types", body, format="json").status_code == 409


def test_taxonomy_admin_refuses_hosts_and_bad_slug(admin_client):
    """Hosts get 403; a slug outside [a-z0-9-] is refused."""
    host, user = f.approved_individual_host()
    assert client_for(user, host).get("/api/v1/admin/amenities").status_code == 403
    response = admin_client.post("/api/v1/admin/categories",
                                 {"vertical": "home", "slug": "Bad Slug", "labels": LABELS}, format="json")
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Room types under the listing
# ---------------------------------------------------------------------------
def test_room_type_patch_and_delete_under_listing():
    """PATCH takes base_price money and amenity ids; DELETE soft-deletes; another listing's path is 404."""
    f.reference_data()
    hotel, room = f.published_hotel()
    owner = hotel.host_account.organization.memberships.get().user
    client = client_for(owner, hotel.host_account)
    url = f"/api/v1/host/listings/{hotel.id}/room-types/{room.id}"
    wifi = Amenity.objects.get(slug="wifi")
    response = client.patch(url, {"base_price": {"amount_minor": 1_000_000, "currency": "DZD"},
                                  "amenity_ids": [str(wifi.id)]}, format="json")
    assert response.status_code == 200
    assert response.json()["base_price"]["amount_minor"] == 1_000_000
    assert response.json()["amenity_ids"] == [str(wifi.id)]
    other_hotel, _ = f.published_hotel(hotel.host_account)
    assert client.patch(f"/api/v1/host/listings/{other_hotel.id}/room-types/{room.id}", {"name": "X"},
                        format="json").status_code == 404
    assert client.delete(url).status_code == 204
    room.refresh_from_db()
    assert room.deleted_at is not None
