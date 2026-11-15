"""Tests of the onboarding drafts and submission (HST-01, HST-02, BR-HST-01, BR-HST-02, BR-ORG-01)."""

import pytest

from apps.audit.models import AuditEvent
from apps.config.services import publish_flow, save_flow_draft
from apps.hosts.models import HostAccount, OnboardingDraft
from conftest import client_for

from .helpers import new_user, onboard, onboarding_answers

pytestmark = pytest.mark.django_db
DRAFTS = "/api/v1/host/onboarding/drafts"


def test_onboarding_needs_sign_in(api):
    """Anonymous callers get 401."""
    assert api.get(DRAFTS).status_code == 401
    assert api.put(f"{DRAFTS}/agency", {"current_step": "agency_basics", "answers": {}}, format="json").status_code == 401


def test_hst_02_save_get_list_and_abandon_draft():
    """A draft is saved on the server, read back, listed, then abandoned."""
    client = client_for(new_user())
    assert client.get(f"{DRAFTS}/agency").status_code == 404
    res = client.put(f"{DRAFTS}/agency", {"current_step": "agency_basics", "answers": {"businessName": "Atlas"}},
                     format="json")
    assert res.status_code == 200, res.data
    assert res.data["status"] == "in_progress" and res.data["flow_version"] == 1
    assert client.get(f"{DRAFTS}/agency").data["answers"] == {"businessName": "Atlas"}
    assert [d["host_type"] for d in client.get(DRAFTS).data["results"]] == ["agency"]
    assert client.delete(f"{DRAFTS}/agency").status_code == 204
    assert client.get(DRAFTS).data["results"] == []
    assert client.delete(f"{DRAFTS}/agency").status_code == 404


def test_br_hst_02_unknown_field_and_bad_values_refused():
    """Answers are checked against the flow version: unknown ids 422 unknown_field, bad choices 422."""
    client = client_for(new_user())
    res = client.put(f"{DRAFTS}/agency", {"current_step": "agency_basics", "answers": {"castle": 1}}, format="json")
    assert res.status_code == 422 and res.data["code"] == "unknown_field"
    res = client.put(f"{DRAFTS}/agency", {"current_step": "agency_basics", "answers": {"agencyBookingMode": "maybe"}},
                     format="json")
    assert res.status_code == 422 and res.data["code"] == "validation_failed"
    res = client.put(f"{DRAFTS}/agency", {"current_step": "nowhere", "answers": {}}, format="json")
    assert res.status_code == 422


def test_br_hst_02_draft_keeps_its_flow_version(admin_user):
    """A flow published after the draft started does not change the draft's questions."""
    client = client_for(new_user())
    client.put(f"{DRAFTS}/agency", {"current_step": "agency_basics", "answers": {}}, format="json")
    steps = client.get("/api/v1/onboarding-flows/agency").data["steps"]
    steps[0]["fields"].append({"id": "newQuestion", "type": "text", "label": {"en": "N", "fr": "N", "ar": "N"},
                               "required": True, "core": False})
    save_flow_draft("agency", steps, actor=admin_user)
    publish_flow("agency", actor=admin_user)
    res = client.put(f"{DRAFTS}/agency", {"current_step": "agency_basics", "answers": {"newQuestion": "x"}},
                     format="json")
    assert res.status_code == 422 and res.data["code"] == "unknown_field"
    assert client.get(f"{DRAFTS}/agency").data["flow_version"] == 1
    # A new person starts from version 2.
    other = client_for(new_user())
    res = other.put(f"{DRAFTS}/agency", {"current_step": "agency_basics", "answers": {"newQuestion": "x"}},
                    format="json")
    assert res.status_code == 200 and res.data["flow_version"] == 2


def test_br_hst_01_submit_needs_every_required_answer_and_approval_mode():
    """Missing answers (including the approval mode) give 422 onboarding_incomplete."""
    client = client_for(new_user())
    answers = onboarding_answers("agency")
    answers.pop("agencyBookingMode")
    client.put(f"{DRAFTS}/agency", {"current_step": "agency_review", "answers": answers}, format="json")
    res = client.post(f"{DRAFTS}/agency/submit")
    assert res.status_code == 422 and res.data["code"] == "onboarding_incomplete"
    assert "agencyBookingMode" in res.data["errors"]
    assert client.post(f"{DRAFTS}/hotel/submit").status_code == 404


def test_br_hst_01_submit_creates_organisation_with_answers_and_approval_mode():
    """Submit creates organisation, owner and host account (applied) from the answers; audited."""
    person = new_user()
    client = client_for(person)
    res = onboard(client, "hotel", hotelName="Hotel Ifri", hotelBookingMode="instant", hotelRegNumber="RC-16/00-1")
    assert res.status_code == 201, res.data
    account = HostAccount.objects.get(pk=res.data["host_account_id"])
    assert account.verification_status == "applied" and account.default_approval_mode == "instant"
    assert account.organization.business_category == "hotel" and account.organization.rc_number == "RC-16/00-1"
    assert account.organization.check_in_time.hour == 14
    assert res.data["organization_id"] == str(account.organization_id) and res.data["listing_id"] is None
    draft = OnboardingDraft.objects.get(user=person)
    assert draft.status == "submitted" and draft.host_account == account
    assert AuditEvent.objects.filter(action="ONBOARDING_SUBMIT", object_id=str(draft.pk)).exists()
    assert client.get(f"{DRAFTS}/hotel").data["status"] == "submitted"


def test_br_sys_01_submit_is_idempotent():
    """The same Idempotency-Key gives the first answer again and creates nothing more."""
    client = client_for(new_user())
    client.put(f"{DRAFTS}/agency", {"current_step": "agency_review", "answers": onboarding_answers("agency")},
               format="json")
    first = client.post(f"{DRAFTS}/agency/submit", HTTP_IDEMPOTENCY_KEY="k-1")
    again = client.post(f"{DRAFTS}/agency/submit", HTTP_IDEMPOTENCY_KEY="k-1")
    assert first.status_code == again.status_code == 201
    assert again.data["host_account_id"] == first.data["host_account_id"]
    assert again["Idempotency-Replayed"] == "true"
    assert HostAccount.objects.count() == 1


def test_submit_refuses_invalid_business_email():
    """Answers that fill organisation columns are validated (422 with the field id)."""
    res = onboard(client_for(new_user()), "agency", businessEmail="not-an-email")
    assert res.status_code == 422 and "businessEmail" in res.data["errors"]
