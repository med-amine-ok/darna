"""Tests of the reason catalogue (MOD-03): seed, public endpoint with caching, admin endpoint."""

import pytest

from apps.trust.models import ReasonCode
from apps.trust.reason_data import PUBLIC_ACTIONS, REASONS
from apps.trust.services import seed_reason_codes

pytestmark = pytest.mark.django_db


def test_seed_has_every_public_action_in_three_languages():
    """The data migration seeded every row; each public action has reasons in en, fr and ar."""
    assert ReasonCode.objects.count() == len(REASONS)
    for action in PUBLIC_ACTIONS:
        rows = ReasonCode.objects.filter(action=action)
        assert rows.exists()
        assert all(r.label_en and r.label_fr and r.label_ar for r in rows)
    assert seed_reason_codes() == len(REASONS)
    assert ReasonCode.objects.count() == len(REASONS)


def test_public_reasons_in_caller_language(api):
    """Labels follow Accept-Language; French by default."""
    fr = api.get("/api/v1/reference/reasons", {"action": "decline_booking"})
    assert fr.status_code == 200
    codes = [r["code"] for r in fr.json()["results"]]
    assert codes[0] == "dates_unavailable" and "other" in codes
    assert fr.json()["results"][0]["label"] == "Dates plus disponibles"
    ar = api.get("/api/v1/reference/reasons", {"action": "decline_booking"}, HTTP_ACCEPT_LANGUAGE="ar")
    assert ar.json()["results"][0]["label"] == "التواريخ لم تعد متاحة"


def test_public_reasons_etag_and_304(api):
    """``ETag`` and one hour of public caching; a matching ``If-None-Match`` gives 304."""
    first = api.get("/api/v1/reference/reasons", {"action": "report_review"})
    assert first["Cache-Control"] == "public, max-age=3600"
    again = api.get("/api/v1/reference/reasons", {"action": "report_review"}, HTTP_IF_NONE_MATCH=first["ETag"])
    assert again.status_code == 304


def test_public_reasons_need_a_public_action(api):
    """Missing or staff-only actions are 400."""
    assert api.get("/api/v1/reference/reasons").status_code == 400
    assert api.get("/api/v1/reference/reasons", {"action": "reject_listing"}).status_code == 400


def test_admin_reason_codes(admin_client, user_client):
    """Admins see every action with host texts; others get 403."""
    rows = admin_client.get("/api/v1/admin/reason-codes").json()["results"]
    assert len(rows) == len(REASONS)
    reject = admin_client.get("/api/v1/admin/reason-codes", {"action": "reject_listing"}).json()["results"]
    assert reject and all(r["action"] == "reject_listing" and r["host_text"] for r in reject)
    assert user_client.get("/api/v1/admin/reason-codes").status_code == 403
