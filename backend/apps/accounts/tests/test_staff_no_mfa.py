"""Staff sign-in with the authenticator step switched off (settings.STAFF_MFA_REQUIRED=False, BR-ACC-04)."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import StaffProfile, StaffStatus
from apps.accounts.tests.conftest import STAFF_PASSWORD, make_staff

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _staff_mfa_off(settings):
    """The decision for now: the password alone opens the admin."""
    settings.STAFF_MFA_REQUIRED = False


def test_password_alone_opens_a_working_staff_session():
    """Login answers 'authenticated' with a token the admin API accepts; no code step."""
    make_staff("ops@bladus.dz", mfa=False)
    api = APIClient()
    res = api.post("/api/v1/admin/auth/login", {"email": "ops@bladus.dz", "password": STAFF_PASSWORD})
    assert res.status_code == 200 and res.data["status"] == "authenticated" and res.data["pending_flows"] == []
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['session_token']}")
    session = client.get("/api/v1/admin/auth/session")
    assert session.status_code == 200 and session.data["mfa_verified"] is True
    assert client.get("/api/v1/admin/users").status_code == 200


def test_staff_who_has_an_authenticator_also_signs_in_with_password_only():
    """Enrolled staff are not asked for the code either while the step is off."""
    make_staff("enrolled@bladus.dz", mfa=True)
    res = APIClient().post("/api/v1/admin/auth/login", {"email": "enrolled@bladus.dz", "password": STAFF_PASSWORD})
    assert res.data["status"] == "authenticated"


def test_accepted_invitation_becomes_active_on_first_sign_in():
    """An invited member who set a password (no enrolment) is activated when signing in."""
    user, _ = make_staff("new@bladus.dz", mfa=False, status=StaffStatus.INVITED)
    res = APIClient().post("/api/v1/admin/auth/login", {"email": "new@bladus.dz", "password": STAFF_PASSWORD})
    assert res.status_code == 200 and res.data["status"] == "authenticated"
    assert StaffProfile.objects.get(user=user).status == StaffStatus.ACTIVE


def test_wrong_password_still_refused():
    """Switching the code off does not weaken the password check."""
    make_staff("ops2@bladus.dz", mfa=False)
    res = APIClient().post("/api/v1/admin/auth/login", {"email": "ops2@bladus.dz", "password": "wrong-password-1"})
    assert res.status_code == 400 and res.data["code"] == "invalid_credentials"
