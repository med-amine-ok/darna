"""Tests of the audited CSV exports (BR-STF-04, BR-STF-02)."""

import pytest

from apps.audit import services
from apps.audit.exports import safe_cell
from apps.audit.models import AuditEvent, ExportJob
from conftest import make_user

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _exports_root(settings, tmp_path):
    """Write export files to a temporary folder."""
    settings.EXPORTS_ROOT = str(tmp_path)


def test_br_stf_04_formula_cells_neutralised():
    """Text starting with = + - @ TAB CR gets a quote; numbers stay numbers."""
    assert safe_cell("=HYPERLINK(1)") == "'=HYPERLINK(1)"
    assert safe_cell("@SUM") == "'@SUM" and safe_cell("\tx") == "'\tx" and safe_cell("-1+2") == "'-1+2"
    assert safe_cell(-500) == "-500" and safe_cell(None) == "" and safe_cell("Atlas") == "Atlas"


def test_br_stf_04_export_audit_dataset_and_download(admin_client, admin_user, api):
    """The export is done at once, audited with filters and rows, and the link gives the CSV."""
    services.record(actor=None, action="=EVIL()", object_type="x", object_id="1")
    res = admin_client.post("/api/v1/admin/exports", {"dataset": "audit", "filters": {"object_type": "x"}},
                            format="json")
    assert res.status_code == 201, res.data
    assert res.data["status"] == "done" and res.data["row_count"] == 1 and res.data["download_url"]
    event = AuditEvent.objects.get(action="EXPORT_CREATE")
    assert event.actor == admin_user and event.after["filters"] == {"object_type": "x"} and event.after["row_count"] == 1

    download = api.get(res.data["download_url"].split("testserver", 1)[1])
    assert download.status_code == 200 and download["Content-Type"].startswith("text/csv")
    text = download.content.decode("utf-8-sig")
    assert text.splitlines()[0].startswith("id,occurred_at") and "'=EVIL()" in text
    assert AuditEvent.objects.filter(action="EXPORT_DOWNLOAD").count() == 1

    assert admin_client.get(f"/api/v1/admin/exports/{res.data['id']}").data["status"] == "done"
    assert admin_client.get("/api/v1/admin/exports").data["count"] == 1
    assert api.get(f"/api/v1/admin/exports/{res.data['id']}/download?token=forged").status_code == 404


def test_hosts_export_with_filters(admin_client):
    """The hosts dataset exports host accounts; a date filter must be ISO."""
    from apps.hosts.tests.helpers import make_org

    make_org()
    res = admin_client.post("/api/v1/admin/exports",
                            {"dataset": "hosts", "filters": {"verification_status": "applied",
                                                             "created_from": "2020-01-01"}}, format="json")
    assert res.status_code == 201 and res.data["row_count"] == 1
    res = admin_client.post("/api/v1/admin/exports", {"dataset": "hosts", "filters": {"created_from": "yesterday"}},
                            format="json")
    assert res.status_code == 422


def test_export_refusals(admin_client, user_client, settings):
    """Unknown dataset 400, kpi not available 422, unknown filter 422, guests 403, 11th export in an hour 429."""
    assert admin_client.post("/api/v1/admin/exports", {"dataset": "castles", "filters": {}}, format="json").status_code == 400
    res = admin_client.post("/api/v1/admin/exports", {"dataset": "kpi", "filters": {}}, format="json")
    assert res.status_code == 422 and res.data["code"] == "dataset_not_available"
    res = admin_client.post("/api/v1/admin/exports", {"dataset": "audit", "filters": {"password": "x"}}, format="json")
    assert res.status_code == 422 and res.data["code"] == "unknown_filter"
    assert user_client.post("/api/v1/admin/exports", {"dataset": "audit", "filters": {}}, format="json").status_code == 403
    for _ in range(services.EXPORTS_PER_HOUR):
        admin_client.post("/api/v1/admin/exports", {"dataset": "audit", "filters": {}}, format="json")
    res = admin_client.post("/api/v1/admin/exports", {"dataset": "audit", "filters": {}}, format="json")
    assert res.status_code == 429 and res.data["code"] == "rate_limited"
    assert ExportJob.objects.count() == services.EXPORTS_PER_HOUR


def test_export_of_another_admin_is_hidden(admin_client):
    """An admin sees only their own exports (404 otherwise)."""
    other = make_user(email="other-admin@bladus.dz", is_staff=True)
    job = ExportJob.objects.create(requested_by=other, dataset="audit", filters={})
    assert admin_client.get(f"/api/v1/admin/exports/{job.id}").status_code == 404
