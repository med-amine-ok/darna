"""Tests of admin analytics (BR-RPT-01, RPT-02) and the command palette search (STF-05)."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.bookings.models import Booking
from apps.catalog.tests.factories import approved_hotel, commune, listing, published_home
from apps.core.timeutils import business_today
from apps.trust import analytics
from conftest import make_user

pytestmark = pytest.mark.django_db

_n = {"i": 0}


def booking(item, *, status="confirmed", days_from_today=0, total=1_000_000, commission=120_000,
            created_days_ago=1, mode="instant", answered_minutes=None):
    """A booking row for ``item`` checking in ``days_from_today`` days from today (test setup only)."""
    _n["i"] += 1
    guest = make_user(email=f"g{_n['i']}@example.dz")
    check_in = business_today() + timedelta(days=days_from_today)
    created = timezone.now() - timedelta(days=created_days_ago)
    row = Booking.objects.create(
        reference=f"BLD-T-{_n['i']:06d}", guest=guest, host_account=item.host_account, inventory_kind="single",
        listing=item, check_in=check_in, check_out=check_in + timedelta(days=2), guests=2, status=status,
        approval_mode_applied=mode, subtotal_minor=total, total_minor=total, commission_base_minor=total,
        commission_rate_bp=1200, commission_minor=commission,
        confirmed_at=created + timedelta(minutes=answered_minutes) if answered_minutes else None,
    )
    Booking.objects.filter(pk=row.pk).update(created_at=created)
    return row


def metrics(response) -> dict:
    """``key -> metric`` of a KPI answer."""
    return {m["key"]: m for m in response.json()["metrics"]}


def test_br_rpt_01_kpis_with_previous_period(admin_client):
    """GBV and net commission count confirmed and completed bookings by check-in; cancelled ones do not."""
    home = published_home()
    booking(home, days_from_today=-3, total=1_000_000, commission=120_000)
    booking(home, status="completed", days_from_today=-10, total=500_000, commission=60_000)
    booking(home, status="cancelled", days_from_today=-2, commission=0)
    booking(home, days_from_today=-40, total=300_000, commission=36_000, created_days_ago=45)
    booking(home, status="pending", days_from_today=5, mode="request", answered_minutes=None)
    booking(home, days_from_today=6, mode="request", answered_minutes=90)
    response = admin_client.get("/api/v1/admin/analytics/kpis", {"period": "30d"})
    assert response.status_code == 200
    body = response.json()
    assert body["to"] == business_today().isoformat()
    assert body["from"] == (business_today() - timedelta(days=29)).isoformat()
    m = metrics(response)
    assert m["gross_booking_value"]["value"] == 1_500_000
    assert m["gross_booking_value"]["money"] == {"amount_minor": 1_500_000, "currency": "DZD"}
    assert m["commission_net"]["value"] == 180_000 and m["commission_net"]["previous"] == 36_000
    assert m["commission_net"]["change_bp"] == 40_000
    assert m["bookings"]["value"] == 5 and m["bookings"]["previous"] == 1
    assert m["cancellation_rate_bp"]["value"] == 2000
    assert m["response_time_minutes"]["value"] == 90
    assert m["active_listings"]["value"] == 1 and m["active_listings"]["previous"] is None


def test_kpi_filters_and_custom_period(admin_client):
    """Host type and vertical filters narrow the figures; a custom window needs both dates."""
    home = published_home()
    hotel, _ = approved_hotel()
    hotel_listing = listing(hotel, "hotel", status="published")
    booking(home, days_from_today=-1, total=1_000_000)
    booking(hotel_listing, days_from_today=-1, total=700_000)
    only_hotel = metrics(admin_client.get("/api/v1/admin/analytics/kpis", {"host_type": "hotel"}))
    assert only_hotel["gross_booking_value"]["value"] == 700_000
    only_home = metrics(admin_client.get("/api/v1/admin/analytics/kpis", {"vertical": "home"}))
    assert only_home["gross_booking_value"]["value"] == 1_000_000
    today = business_today()
    custom = admin_client.get("/api/v1/admin/analytics/kpis", {
        "period": "custom", "from": (today - timedelta(days=2)).isoformat(), "to": today.isoformat()})
    assert custom.status_code == 200 and custom.json()["previous_to"] == (today - timedelta(days=3)).isoformat()
    assert admin_client.get("/api/v1/admin/analytics/kpis", {"period": "custom"}).status_code == 400
    assert admin_client.get("/api/v1/admin/analytics/kpis", {"host_type": "pirate"}).status_code == 400


def test_charts_series_and_cross_tab(admin_client):
    """Monthly series cover the window; impossible cross tab cells are null (RPT-02); stays roll up."""
    home = published_home(commune=commune(31, "Oran"))
    booking(home, days_from_today=-1, total=1_000_000, commission=120_000)
    response = admin_client.get("/api/v1/admin/analytics/charts", {"period": "90d"})
    assert response.status_code == 200
    body = response.json()
    revenue = next(s for s in body["revenue_by_month"] if s["key"] == "revenue")
    assert len(revenue["points"]) >= 3 and sum(p["y"] for p in revenue["points"]) == 120_000
    assert {b["value"]: b["count"] for b in body["revenue_by_host_type"]}["individual"] == 120_000
    assert body["bookings_by_wilaya"] == [{"value": "31", "label": "Wilaya 31", "count": 1}]
    cross = body["host_type_by_vertical"]
    assert cross["individual"]["home"] == 1 and cross["individual"]["hotel"] is None
    assert cross["hotel"]["hotel"] == 0
    grouped = admin_client.get("/api/v1/admin/analytics/charts", {"group_stays": "true"}).json()
    assert {b["value"]: b["count"] for b in grouped["revenue_by_vertical"]}["stays"] == 120_000


def test_analytics_admin_only(user_client):
    """Non-admins get 403."""
    assert user_client.get("/api/v1/admin/analytics/kpis").status_code == 403
    assert user_client.get("/api/v1/admin/analytics/charts").status_code == 403


def test_window_lengths():
    """7d ends today and the previous window has the same length right before."""
    win = analytics.window("7d", None, None)
    assert (win.end - win.start).days == 6
    assert win.previous_end == win.start - timedelta(days=1)
    assert (win.previous_end - win.previous_start).days == 6


def test_admin_search_finds_listings_bookings_and_users(admin_client, user_client):
    """The palette finds a listing by title, a booking by reference and a user by email; limits apply."""
    home = published_home(title="Villa Tipaza vue mer")
    row = booking(home)
    make_user(email="yacine.tipaza@example.dz")
    hits = admin_client.get("/api/v1/admin/search", {"q": "tipaza"}).json()["results"]
    types = {h["type"] for h in hits}
    assert {"listing", "user"} <= types
    by_ref = admin_client.get("/api/v1/admin/search", {"q": row.reference}).json()["results"]
    assert by_ref[0]["type"] == "booking" and by_ref[0]["href"] == f"/bookings/{row.reference}"
    assert len(admin_client.get("/api/v1/admin/search", {"q": "example", "limit": 2}).json()["results"]) == 2
    assert admin_client.get("/api/v1/admin/search", {"q": "a"}).status_code == 400
    assert admin_client.get("/api/v1/admin/search", {"q": "ab", "limit": 50}).status_code == 400
    assert user_client.get("/api/v1/admin/search", {"q": "tipaza"}).status_code == 403
