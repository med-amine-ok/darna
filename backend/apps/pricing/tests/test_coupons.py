"""Tests of the admin coupon catalogue (R2, BR-PRM-01, BR-PRM-02, BR-STF-02)."""

import uuid

import pytest

from apps.audit.models import AuditEvent
from apps.pricing.models import Coupon, CouponRedemption

pytestmark = pytest.mark.django_db

BODY = {"code": "SUMMER26", "discount_type": "percentage", "discount_value": 1000, "funded_by": "platform",
        "valid_from": "2026-06-01T00:00:00Z", "valid_to": "2026-09-01T00:00:00Z"}


def test_br_prm_01_create_list_and_code_unique_without_case(admin_client):
    """Created coupons are listed; the same code in another case is refused (409 ``code_taken``)."""
    created = admin_client.post("/api/v1/admin/coupons", BODY, format="json")
    assert created.status_code == 201 and created.data["used_count"] == 0 and created.data["per_user_limit"] == 1
    clash = admin_client.post("/api/v1/admin/coupons", {**BODY, "code": "summer26"}, format="json")
    assert clash.status_code == 409 and clash.data["code"] == "code_taken"
    assert admin_client.get("/api/v1/admin/coupons?active=true").data["count"] == 1
    assert admin_client.get("/api/v1/admin/coupons?active=false").data["count"] == 0
    assert AuditEvent.objects.filter(action="COUPON_CREATE").count() == 1


def test_br_prm_02_values_checked(admin_client):
    """Percentage at most 100 %, host-funded needs a host, dates in order."""
    too_big = admin_client.post("/api/v1/admin/coupons", {**BODY, "discount_value": 10_001}, format="json")
    assert too_big.status_code == 422 and too_big.data["code"] == "invalid_coupon"
    no_host = admin_client.post("/api/v1/admin/coupons", {**BODY, "funded_by": "host"}, format="json")
    assert no_host.status_code == 422
    backwards = admin_client.post("/api/v1/admin/coupons", {**BODY, "valid_to": "2026-05-01T00:00:00Z"}, format="json")
    assert backwards.status_code == 422


def test_br_prm_01_patch_disable_and_delete_rules(admin_client, admin_user):
    """PATCH changes only the given fields; a redeemed coupon cannot be deleted (409 ``in_use``)."""
    coupon_id = admin_client.post("/api/v1/admin/coupons", BODY, format="json").data["id"]
    patched = admin_client.patch(f"/api/v1/admin/coupons/{coupon_id}", {"is_active": False}, format="json")
    assert patched.status_code == 200 and patched.data["is_active"] is False and patched.data["code"] == "SUMMER26"
    CouponRedemption.objects.create(coupon_id=coupon_id, booking_id=uuid.uuid4(), user=admin_user, amount_minor=500)
    res = admin_client.delete(f"/api/v1/admin/coupons/{coupon_id}")
    assert res.status_code == 409 and res.data["code"] == "in_use"
    unused = admin_client.post("/api/v1/admin/coupons", {**BODY, "code": "FREE-2"}, format="json").data["id"]
    assert admin_client.delete(f"/api/v1/admin/coupons/{unused}").status_code == 204
    assert not Coupon.objects.filter(pk=unused).exists()
    assert admin_client.delete(f"/api/v1/admin/coupons/{uuid.uuid4()}").status_code == 404


def test_coupons_are_admin_only(user_client):
    """A guest cannot see or create coupons."""
    assert user_client.get("/api/v1/admin/coupons").status_code == 403
    assert user_client.post("/api/v1/admin/coupons", BODY, format="json").status_code == 403
