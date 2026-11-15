"""Tests of the moderation queue: sync, priorities, decisions, change requests, assignment, bulk (BR-MOD-01, BR-MOD-02)."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.audit.models import AuditEvent
from apps.catalog.states import ListingStatus
from apps.catalog.tests.factories import individual_host, listing
from apps.core.models import OutboxMessage
from apps.hosts.models import DocumentStatus, VerificationStatus
from apps.trust import services
from apps.trust.models import CaseStatus, ModerationCase
from conftest import client_for, make_user

from .conftest import case_of, host_under_review, submitted

pytestmark = pytest.mark.django_db

CASES = "/api/v1/admin/moderation/cases"


def decide(client, case, **body):
    """``POST .../decisions`` for ``case``."""
    return client.post(f"{CASES}/{case.id}/decisions", body, format="json")


def test_queue_lists_pending_items_with_facets(admin_client, pending_listing, pending_document):
    """Reading the queue opens a case per pending listing, host and document, oldest first."""
    response = admin_client.get(CASES)
    assert response.status_code == 200
    body = response.json()
    kinds = {c["kind"] for c in body["results"]}
    assert kinds == {"listing_review", "host_verification", "document"}
    assert body["meta"] == {"page": 1, "page_size": 20, "total_count": 3, "total_pages": 1}
    kind_facet = {b["value"]: b["count"] for b in body["facets"]["kind"]}
    assert kind_facet["listing_review"] == 1 and kind_facet["document"] == 1
    listing_case = next(c for c in body["results"] if c["kind"] == "listing_review")
    assert listing_case["subject"]["type"] == "listing"
    assert listing_case["subject"]["reference"] == pending_listing[0].reference
    filtered = admin_client.get(CASES, {"kind": "document"}).json()
    assert [c["kind"] for c in filtered["results"]] == ["document"]
    assert {b["value"]: b["count"] for b in filtered["facets"]["kind"]}["listing_review"] == 1


def test_non_admin_refused(user_client, pending_listing):
    """Guests and hosts never reach the queue (403)."""
    assert user_client.get(CASES).status_code == 403
    assert user_client.get("/api/v1/admin/moderation/counts").status_code == 403


def test_bad_filter_is_400(admin_client):
    """Unknown kinds are refused."""
    assert admin_client.get(CASES, {"kind": "nope"}).status_code == 400


def test_br_mod_01_priority_after_waiting(admin_client):
    """Listings become high after 2 days, hosts after 3; counts show it."""
    host, _ = individual_host()
    old = submitted(listing(host, "home", title="Old"), days_ago=2.5)
    fresh = submitted(listing(host, "home", title="Fresh"), days_ago=0.5)
    account, _ = host_under_review(days_ago=2)
    services.sync_cases()
    assert case_of(old).priority == "high"
    assert case_of(fresh).priority == "normal"
    assert case_of(account).priority == "normal"
    counts = {q["kind"]: q for q in admin_client.get("/api/v1/admin/moderation/counts").json()["queues"]}
    assert counts["listing_review"]["open"] == 2 and counts["listing_review"]["high_priority"] == 1
    assert counts["host_verification"]["open"] == 1
    assert len(counts) == 10


def test_br_mod_01_resubmission_resets_clock(pending_listing):
    """A new submission moves ``submitted_at`` of the open case (waiting counts from the last one)."""
    item, _, _ = pending_listing
    services.sync_cases()
    first = case_of(item).submitted_at
    later = timezone.now() + timedelta(hours=5)
    type(item).objects.filter(pk=item.pk).update(submitted_at=later)
    services.sync_cases()
    assert case_of(item).submitted_at == later > first


def test_approve_listing_publishes_and_audits(admin_client, admin_user, pending_listing):
    """Approve calls the catalog workflow: listing published, case resolved, audit rows, host notified."""
    item, _, _ = pending_listing
    services.sync_cases()
    case = case_of(item)
    response = decide(admin_client, case, decision="approve")
    assert response.status_code == 200, response.json()
    assert response.json()["status"] == "resolved"
    assert response.json()["decisions"][0]["decision"] == "approve"
    assert response.json()["decisions"][0]["actor"]["id"] == str(admin_user.id)
    item.refresh_from_db()
    assert item.status == ListingStatus.PUBLISHED
    assert AuditEvent.objects.filter(action="CASE_APPROVE", object_id=str(case.id)).exists()
    assert AuditEvent.objects.filter(action="LISTING_APPROVE", object_id=str(item.id)).exists()
    assert OutboxMessage.objects.filter(topic="moderation.decided").count() == 1
    again = decide(admin_client, case, decision="approve")
    assert again.status_code == 409 and again.json()["code"] == "case_resolved"


def test_br_hst_04_reject_needs_note(admin_client, pending_listing):
    """Reject without a 10-character note is 422 ``reason_required``; with one it works."""
    item, _, _ = pending_listing
    services.sync_cases()
    case = case_of(item)
    short = decide(admin_client, case, decision="reject", note="bad")
    assert short.status_code == 422 and short.json()["code"] == "reason_required"
    wrong = decide(admin_client, case, decision="reject", note="Photos show another house.", reason_code="nope")
    assert wrong.status_code == 422 and wrong.json()["code"] == "unknown_reason"
    ok = decide(admin_client, case, decision="reject", note="Photos show another house.", reason_code="misleading")
    assert ok.status_code == 200
    assert ok.json()["decisions"][0]["reason_code"] == "misleading"
    item.refresh_from_db()
    assert item.status == ListingStatus.REJECTED


def test_unknown_body_field_refused(admin_client, pending_listing):
    """DecisionCreate has no extra properties (400)."""
    services.sync_cases()
    response = decide(admin_client, case_of(pending_listing[0]), decision="approve", extra=1)
    assert response.status_code == 400


def test_br_mod_02_change_request_seen_by_host_and_linked_on_resubmission(admin_client, pending_listing):
    """Items reach the host; the resubmission opens a new case linked to the request and closes the items."""
    item, host, owner = pending_listing
    services.sync_cases()
    case = case_of(item)
    missing = decide(admin_client, case, decision="request_changes", note="Please improve the listing.")
    assert missing.status_code == 422 and missing.json()["code"] == "items_required"
    response = decide(
        admin_client, case, decision="request_changes", note="Please improve the listing.",
        reason_code="photos_quality",
        items=[{"checklist_code": "photos", "message": "Add the bathroom."}, {"checklist_code": "description"}],
    )
    assert response.status_code == 200, response.json()
    item.refresh_from_db()
    assert item.status == ListingStatus.CHANGES_REQUESTED

    host_client = client_for(owner, host)
    items = host_client.get("/api/v1/host/change-requests").json()["results"]
    assert {i["checklist_code"] for i in items} == {"photos", "description"}
    photos = next(i for i in items if i["checklist_code"] == "photos")
    assert photos["label"] == "Photos" and photos["message"] == "Add the bathroom."
    assert photos["subject_type"] == "listing" and photos["subject_id"] == str(item.id)

    other_host, other_owner = individual_host()
    assert client_for(other_owner, other_host).get("/api/v1/host/change-requests").json()["results"] == []

    submitted(item)
    services.sync_cases()
    new_case = case_of(item)
    assert new_case.previous_case_id == case.id
    assert host_client.get("/api/v1/host/change-requests").json()["results"] == []
    assert len(host_client.get("/api/v1/host/change-requests", {"open": "false"}).json()["results"]) == 2


def test_br_hst_03_host_approval_needs_approved_documents(admin_client, pending_document):
    """Approving a host whose ID is still pending is 422 ``documents_not_approved``; after the document case it works."""
    services.sync_cases()
    account = pending_document.host_account
    host_case = case_of(account)
    refused = decide(admin_client, host_case, decision="approve")
    assert refused.status_code == 422 and refused.json()["code"] == "documents_not_approved"
    assert decide(admin_client, case_of(pending_document), decision="approve").status_code == 200
    pending_document.refresh_from_db()
    assert pending_document.status == DocumentStatus.APPROVED
    assert decide(admin_client, host_case, decision="approve").status_code == 200
    account.refresh_from_db()
    assert account.verification_status == VerificationStatus.APPROVED


def test_escalate_keeps_case_open_and_raises_priority(admin_client, pending_listing):
    """Escalate is recorded, sets priority high and leaves the case open."""
    services.sync_cases()
    case = case_of(pending_listing[0])
    response = decide(admin_client, case, decision="escalate", note="Looks like a scam pattern.")
    assert response.status_code == 200
    assert response.json()["priority"] == "high" and response.json()["status"] == "open"


def test_impossible_decision_is_409(admin_client, pending_document):
    """Dismiss is not a decision a document case has (409 ``invalid_transition``)."""
    services.sync_cases()
    response = decide(admin_client, case_of(pending_document), decision="dismiss")
    assert response.status_code == 409 and response.json()["code"] == "invalid_transition"


def test_decision_idempotency_replay(admin_client, pending_listing):
    """The same Idempotency-Key replays the first answer instead of failing on a resolved case."""
    services.sync_cases()
    case = case_of(pending_listing[0])
    url = f"{CASES}/{case.id}/decisions"
    first = admin_client.post(url, {"decision": "approve"}, format="json", HTTP_IDEMPOTENCY_KEY="k-1")
    second = admin_client.post(url, {"decision": "approve"}, format="json", HTTP_IDEMPOTENCY_KEY="k-1")
    assert first.status_code == second.status_code == 200
    assert second["Idempotency-Replayed"] == "true"
    assert second.json()["id"] == first.json()["id"]


def test_assign_take_give_release(admin_client, admin_user, pending_listing):
    """Omitted = me (in progress), null = nobody (open), a non-admin is 422; audited."""
    services.sync_cases()
    case = case_of(pending_listing[0])
    url = f"{CASES}/{case.id}/assign"
    mine = admin_client.post(url, {}, format="json").json()
    assert mine["assigned_to"]["id"] == str(admin_user.id) and mine["status"] == "in_progress"
    assert admin_client.get(CASES, {"assigned_to": "me"}).json()["meta"]["total_count"] == 1
    released = admin_client.post(url, {"assignee_id": None}, format="json").json()
    assert released["assigned_to"] is None and released["status"] == "open"
    guest = make_user(email="guest2@example.dz")
    refused = admin_client.post(url, {"assignee_id": str(guest.id)}, format="json")
    assert refused.status_code == 422
    assert AuditEvent.objects.filter(action="CASE_ASSIGN", object_id=str(case.id)).count() == 2


def test_bulk_decision_per_item_result(admin_client):
    """One decision on two cases: the resolved one fails alone, the other is approved."""
    host, _ = individual_host()
    a = submitted(listing(host, "home", title="A"))
    b = submitted(listing(host, "home", title="B"))
    services.sync_cases()
    case_a, case_b = case_of(a), case_of(b)
    decide(admin_client, case_a, decision="approve")
    response = admin_client.post("/api/v1/admin/moderation/bulk-decisions",
                                 {"case_ids": [str(case_a.id), str(case_b.id)], "decision": {"decision": "approve"}},
                                 format="json")
    assert response.status_code == 200
    results = {r["id"]: r for r in response.json()["results"]}
    assert results[str(case_a.id)]["ok"] is False and results[str(case_a.id)]["error"]["code"] == "case_resolved"
    assert results[str(case_b.id)]["ok"] is True and results[str(case_b.id)]["error"] is None
    assert ModerationCase.objects.get(pk=case_b.id).status == CaseStatus.RESOLVED


def test_case_closed_when_decided_elsewhere(pending_listing):
    """A listing approved through the older admin route closes its open case on the next sync."""
    item, _, _ = pending_listing
    services.sync_cases()
    case = case_of(item)
    type(item).objects.filter(pk=item.pk).update(status=ListingStatus.PUBLISHED)
    services.sync_cases()
    case.refresh_from_db()
    assert case.status == CaseStatus.RESOLVED and case.outcome == "closed_elsewhere"


def test_open_case_hook_is_idempotent(pending_listing):
    """Other apps can open cases directly; calling twice keeps one case."""
    item, host, _ = pending_listing
    first = services.open_case(kind="listing_review", subject_type="listing", subject_id=item.id, title=item.title,
                               host_account_id=host.id)
    second = services.open_case(kind="listing_review", subject_type="listing", subject_id=item.id)
    assert first.id == second.id
    assert services.close_cases_for(item.id, outcome="withdrawn") == 1


def test_case_detail_and_attention(admin_client, pending_listing):
    """One case reads with its history; the dashboard lists the waiting queue."""
    services.sync_cases()
    case = case_of(pending_listing[0])
    detail = admin_client.get(f"{CASES}/{case.id}")
    assert detail.status_code == 200 and detail.json()["waiting_hours"] == 0
    assert admin_client.get(f"{CASES}/00000000-0000-7000-8000-000000000000").status_code == 404
    items = admin_client.get("/api/v1/admin/dashboard/attention").json()["items"]
    group = next(i for i in items if i["kind"] == "moderation.listing_review")
    assert group["count"] == 1 and group["top"][0]["id"] == str(case.id)
