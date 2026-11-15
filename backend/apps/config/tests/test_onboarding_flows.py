"""Tests of onboarding flows, commission rates and settings history (BR-CFG-01 to 03, BR-HST-01, BR-PAY-06)."""

import copy

import pytest

from apps.audit.models import AuditEvent
from apps.config.models import OnboardingFlowVersion

pytestmark = pytest.mark.django_db
ADMIN_FLOWS = "/api/v1/admin/onboarding-flows"


def published_steps(api, host_type: str) -> list[dict]:
    """Steps of the published flow, as the website reads them."""
    return copy.deepcopy(api.get(f"/api/v1/onboarding-flows/{host_type}").data["steps"])


def test_br_hst_01_seeded_flows_have_planned_lengths_and_approval_step(api):
    """Individual 12 steps, agency 5, hotel 7, hostel 7, each with the approval-mode question."""
    for host_type, length in {"individual": 12, "agency": 5, "hotel": 7, "hostel": 7}.items():
        res = api.get(f"/api/v1/onboarding-flows/{host_type}")
        assert res.status_code == 200 and res.data["status"] == "published" and len(res.data["steps"]) == length
        options = [o["value"] for s in res.data["steps"] for f in s["fields"] for o in f.get("options", [])]
        assert "instant" in options and "request" in options
    assert api.get("/api/v1/onboarding-flows/castle").status_code == 404


def test_public_flow_etag_and_304(api):
    """The ETag lets the website skip unchanged flows."""
    res = api.get("/api/v1/onboarding-flows/agency")
    assert res["Cache-Control"].startswith("public")
    again = api.get("/api/v1/onboarding-flows/agency", HTTP_IF_NONE_MATCH=res["ETag"])
    assert again.status_code == 304


def test_admin_flow_endpoints_need_admin(user_client, api):
    """Guests get 403, anonymous callers 401."""
    assert user_client.get(ADMIN_FLOWS).status_code == 403
    assert user_client.post(f"{ADMIN_FLOWS}/agency/publish").status_code == 403
    assert api.get(ADMIN_FLOWS).status_code == 401


def test_br_cfg_03_draft_checks(admin_client, api):
    """Unknown type, removed core step, changed core field, missing approval step: 422 with stable codes."""
    url = f"{ADMIN_FLOWS}/agency/draft"
    steps = published_steps(api, "agency")
    bad = copy.deepcopy(steps)
    bad[0]["fields"][0]["type"] = "color"
    assert admin_client.put(url, {"steps": bad}, format="json").data["code"] == "unknown_field_type"
    bad = [s for s in steps if s["id"] != "agency_basics"]
    assert admin_client.put(url, {"steps": bad}, format="json").data["code"] == "core_step_removed"
    bad = copy.deepcopy(steps)
    bad[0]["fields"][0]["type"] = "textarea"
    assert admin_client.put(url, {"steps": bad}, format="json").data["code"] == "core_field_changed"
    bad = [s for s in steps if s["id"] != "agency_approval"]
    res = admin_client.put(url, {"steps": bad}, format="json")
    assert res.status_code == 422 and res.data["code"] in ("core_step_removed", "approval_step_missing")
    assert OnboardingFlowVersion.objects.filter(status="draft").count() == 0


def test_br_cfg_02_publish_creates_immutable_next_version_and_rollback(admin_client, api, admin_user):
    """Draft v2, publish (v1 archived but readable), republish v1 as v3; each step audited."""
    steps = published_steps(api, "hostel")
    steps[2]["fields"].append({"id": "laundry", "type": "toggle", "label": {"en": "L", "fr": "L", "ar": "L"},
                               "required": False, "core": False})
    res = admin_client.put(f"{ADMIN_FLOWS}/hostel/draft", {"steps": steps}, format="json")
    assert res.status_code == 200 and res.data["version"] == 2 and res.data["status"] == "draft"
    stale = admin_client.put(f"{ADMIN_FLOWS}/hostel/draft", {"steps": steps}, format="json", HTTP_IF_MATCH='"old"')
    assert stale.status_code == 412 and stale.data["code"] == "stale_version"
    summary = {r["host_type"]: r for r in admin_client.get(ADMIN_FLOWS).data["results"]}
    assert summary["hostel"]["published_version"] == 1 and summary["hostel"]["draft_version"] == 2

    res = admin_client.post(f"{ADMIN_FLOWS}/hostel/publish")
    assert res.status_code == 201 and res.data["version"] == 2 and res.data["status"] == "published"
    assert api.get("/api/v1/onboarding-flows/hostel").data["version"] == 2
    v1 = admin_client.get(f"{ADMIN_FLOWS}/hostel/versions/1").data
    assert v1["status"] == "archived" and not any(f["id"] == "laundry" for s in v1["steps"] for f in s["fields"])
    assert admin_client.post(f"{ADMIN_FLOWS}/hostel/publish").status_code == 404

    res = admin_client.post(f"{ADMIN_FLOWS}/hostel/versions/1/republish")
    assert res.status_code == 201 and res.data["version"] == 3
    assert api.get("/api/v1/onboarding-flows/hostel").data["version"] == 3
    assert admin_client.post(f"{ADMIN_FLOWS}/hostel/versions/3/republish").data["code"] == "already_published"
    versions = [r["version"] for r in admin_client.get(f"{ADMIN_FLOWS}/hostel/versions").data["results"]]
    assert versions == [3, 2, 1]
    actions = set(AuditEvent.objects.values_list("action", flat=True))
    assert {"ONBOARDING_FLOW_DRAFT_SAVE", "ONBOARDING_FLOW_PUBLISH", "ONBOARDING_FLOW_REPUBLISH"} <= actions


def test_br_pay_06_commission_rates_get_and_put(admin_client, user_client):
    """Four rates in, new settings version and audit row; stale If-Match is 412; guests 403."""
    res = admin_client.get("/api/v1/admin/commission-rates")
    assert res.status_code == 200 and res.data["effective_for"] == "new_bookings"
    etag = res["ETag"]
    body = {"individual_bp": 1000, "agency_bp": 1100, "hotel_bp": 1200, "hostel_bp": 1300}
    res = admin_client.put("/api/v1/admin/commission-rates", body, format="json", HTTP_IF_MATCH=etag)
    assert res.status_code == 200 and res.data["hotel_bp"] == 1200
    res = admin_client.put("/api/v1/admin/commission-rates", body, format="json", HTTP_IF_MATCH=etag)
    assert res.status_code == 412
    assert admin_client.put("/api/v1/admin/commission-rates", {**body, "hotel_bp": 10001}, format="json").status_code == 400
    assert AuditEvent.objects.filter(action="SETTINGS_UPDATE").count() == 1
    assert user_client.get("/api/v1/admin/commission-rates").status_code == 403


def test_br_cfg_01_settings_history(admin_client, user_client):
    """Every version is listed newest first with its author."""
    admin_client.patch("/api/v1/admin/settings", {"request_ttl_hours": 12}, format="json")
    admin_client.patch("/api/v1/admin/settings", {"maintenance_mode": True}, format="json")
    res = admin_client.get("/api/v1/admin/settings/versions")
    assert res.status_code == 200 and res.data["count"] == 2
    first, second = res.data["results"]
    assert first["version"] == 2 and first["data"]["maintenance_mode"] is True
    assert second["data"]["request_ttl_hours"] == 12 and second["created_by"]["display_name"]
    assert user_client.get("/api/v1/admin/settings/versions").status_code == 403
