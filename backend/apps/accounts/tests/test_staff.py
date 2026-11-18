"""Tests of staff sign-in, invitations and staff management (STF-01, STF-02, STF-05, BR-ACC-03, BR-ACC-04, BR-STF-01)."""

from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import SessionToken, StaffProfile, StaffRolePermission, StaffStatus
from apps.accounts.tests.conftest import STAFF_PASSWORD, last_mail_token, make_staff, totp_code
from apps.audit.models import AuditEvent
from conftest import client_for, make_user

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _staff_mfa_on(settings):
    """These tests cover the staff authenticator step, so they run with it switched on."""
    settings.STAFF_MFA_REQUIRED = True


def staff_sign_in(email: str, secret: str) -> tuple[APIClient, dict]:
    """Run both staff sign-in steps; returns a client with the staff token and the StaffSession body."""
    api = APIClient()
    step_one = api.post("/api/v1/admin/auth/login", {"email": email, "password": STAFF_PASSWORD})
    assert step_one.status_code == 200, step_one.data
    token = step_one.data["session_token"]
    api.credentials(HTTP_X_SESSION_TOKEN=token)
    step_two = api.post("/api/v1/admin/auth/2fa/authenticate", {"code": totp_code(secret)})
    assert step_two.status_code == 200, step_two.data
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client, step_two.data


def test_br_acc_04_staff_sign_in_always_asks_second_factor():
    """Step 1 gives a pending staff token refused by admin endpoints; step 2 returns the staff session."""
    user, secret = make_staff("ops@bladus.dz")
    res = APIClient().post("/api/v1/admin/auth/login", {"email": "ops@bladus.dz", "password": STAFF_PASSWORD})
    assert res.data["status"] == "pending_flow" and res.data["mfa_enrolled"] is True
    pending = APIClient()
    pending.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['session_token']}")
    assert pending.get("/api/v1/admin/auth/session").status_code == 401

    client, body = staff_sign_in("ops@bladus.dz", secret)
    assert body["mfa_verified"] is True and "users.view" in body["permissions"] and body["user"]["email"] == user.email
    session = client.get("/api/v1/admin/auth/session")
    assert session.status_code == 200 and session.data["user"]["mfa_enrolled"] is True
    assert AuditEvent.objects.filter(action="STAFF_LOGIN", actor=user).exists()


def test_admin_login_refuses_non_staff_with_same_error():
    """A guest password gets the same 400 invalid_credentials as a wrong password (STF-05)."""
    make_user(email="guest@x.dz", password=STAFF_PASSWORD)
    make_staff("ops@bladus.dz")
    guest = APIClient().post("/api/v1/admin/auth/login", {"email": "guest@x.dz", "password": STAFF_PASSWORD})
    wrong = APIClient().post("/api/v1/admin/auth/login", {"email": "ops@bladus.dz", "password": "wrong-pass-123"})
    assert guest.status_code == wrong.status_code == 400
    assert guest.data["code"] == wrong.data["code"] == "invalid_credentials"


def test_stf_05_website_session_of_staff_is_refused_on_admin_api():
    """A staff member signing in on the website gets a session the admin API refuses."""
    make_staff("ops@bladus.dz", mfa=False)
    token = APIClient().post("/api/v1/auth/login", {"email": "ops@bladus.dz", "password": STAFF_PASSWORD}).data["token"]
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    assert client.get("/api/v1/admin/staff").status_code == 403


def test_br_acc_03_staff_session_ends_after_idle_time(admin_user, admin_client):
    """A staff session unused for more than 30 minutes is refused."""
    assert admin_client.get("/api/v1/admin/auth/session").status_code == 200
    SessionToken.objects.filter(user=admin_user).update(last_used_at=timezone.now() - timedelta(minutes=31))
    assert admin_client.get("/api/v1/admin/auth/session").status_code == 401


def test_admin_sign_out_revokes_the_session(admin_client):
    """DELETE /admin/auth/session revokes the token at once (BR-ACC-03)."""
    assert admin_client.delete("/api/v1/admin/auth/session").status_code == 204
    assert admin_client.get("/api/v1/admin/auth/session").status_code == 401


def test_admin_password_change(admin_client):
    """A staff member changes the password with the current one."""
    body = {"current_password": "Str0ng-pass-123", "new_password": "Brand-new-pass-456"}
    assert admin_client.post("/api/v1/admin/auth/password/change", body).status_code == 204


def test_stf_02_invitation_accept_enrol_activates(admin_client, django_capture_on_commit_callbacks):
    """Invite, accept with a password, enrol TOTP with the pending token: the member becomes active."""
    with django_capture_on_commit_callbacks(execute=True):
        res = admin_client.post(
            "/api/v1/admin/staff/invitations", {"email": "new@bladus.dz", "display_name": "Amina Benali", "role": "admin"}
        )
    assert res.status_code == 201 and res.data["status"] == "invited" and res.data["display_name"] == "Amina B."
    token = last_mail_token(r"token=([\w-]+)")
    assert AuditEvent.objects.filter(action="STAFF_INVITE").exists()

    accepted = APIClient().post("/api/v1/admin/auth/invitations/accept", {"token": token, "password": STAFF_PASSWORD})
    assert accepted.status_code == 200 and accepted.data["status"] == "pending_flow"
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {accepted.data['session_token']}")
    assert client.get("/api/v1/admin/staff").status_code == 401  # not before the enrolment
    secret = client.get("/api/v1/auth/authenticators/totp").data["secret"]
    enrolled = client.post("/api/v1/admin/auth/authenticators/totp", {"code": totp_code(secret)})
    assert enrolled.status_code == 201 and len(enrolled.data["recovery_codes"]) == 10
    assert StaffProfile.objects.get(user__email="new@bladus.dz").status == StaffStatus.ACTIVE
    assert client.get("/api/v1/admin/auth/session").status_code == 200

    again = APIClient().post("/api/v1/admin/auth/invitations/accept", {"token": token, "password": STAFF_PASSWORD})
    assert again.status_code == 400 and again.data["code"] == "invalid_token"


def test_invitation_with_taken_email_is_a_conflict(admin_client, user):
    """Staff accounts are separate: an email already used gets 409 email_taken."""
    res = admin_client.post(
        "/api/v1/admin/staff/invitations", {"email": user.email, "display_name": "Someone", "role": "admin"}
    )
    assert res.status_code == 409 and res.data["code"] == "email_taken"
    assert not mail.outbox


def test_staff_list_and_roles(admin_client, admin_user):
    """The team screen lists staff and the admin role with every permission (BR-STF-01, DEC-016)."""
    staff = admin_client.get("/api/v1/admin/staff")
    assert staff.status_code == 200 and staff.data["results"][0]["user_id"] == str(admin_user.id)
    roles = admin_client.get("/api/v1/admin/staff/roles").data["results"]
    assert roles[0]["role"] == "admin" and {"team.manage", "users.ban", "privacy.handle_requests"} <= set(roles[0]["permissions"])


def test_br_stf_01_permission_is_read_from_the_database(admin_client):
    """Without the team.manage grant the admin gets 403 (deny by default)."""
    StaffRolePermission.objects.filter(permission_id="team.manage").delete()
    assert admin_client.get("/api/v1/admin/staff").status_code == 403
    assert admin_client.get("/api/v1/admin/users").status_code == 200


def test_guest_cannot_reach_staff_management(user_client):
    """A website session gets 403 on every admin endpoint."""
    assert user_client.get("/api/v1/admin/staff").status_code == 403
    assert user_client.get("/api/v1/admin/auth/session").status_code == 403


def test_br_acc_03_deactivation_revokes_sessions(admin_client, second_admin, staff_member):
    """Deactivating a staff member signs them out at once; reactivating keeps their MFA."""
    their = client_for(staff_member)
    assert their.get("/api/v1/admin/auth/session").status_code == 200
    res = admin_client.post(f"/api/v1/admin/staff/{staff_member.id}/deactivate")
    assert res.status_code == 200 and res.data["status"] == "deactivated"
    assert their.get("/api/v1/admin/auth/session").status_code == 401
    assert admin_client.post(f"/api/v1/admin/staff/{staff_member.id}/deactivate").status_code == 409
    back = admin_client.post(f"/api/v1/admin/staff/{staff_member.id}/activate")
    assert back.status_code == 200 and back.data["status"] == "active"
    assert AuditEvent.objects.filter(action__in=["STAFF_DEACTIVATE", "STAFF_ACTIVATE"]).count() == 2


def test_deactivation_keeps_two_admins_and_not_self(admin_client, admin_user, second_admin):
    """With two admins neither can be deactivated; nobody deactivates themselves."""
    res = admin_client.post(f"/api/v1/admin/staff/{second_admin.id}/deactivate")
    assert res.status_code == 409 and res.data["code"] == "last_admin"
    res = admin_client.post(f"/api/v1/admin/staff/{admin_user.id}/deactivate")
    assert res.status_code == 409 and res.data["code"] == "cannot_deactivate_self"


def test_br_acc_04_reset_mfa_forces_new_enrolment(admin_client, staff_member):
    """After a reset the member has no authenticator and their sessions are revoked."""
    their = client_for(staff_member)
    res = admin_client.post(f"/api/v1/admin/staff/{staff_member.id}/reset-mfa")
    assert res.status_code == 200 and res.data["mfa_enrolled"] is False
    assert their.get("/api/v1/admin/auth/session").status_code == 401
    login = APIClient().post("/api/v1/admin/auth/login", {"email": staff_member.email, "password": STAFF_PASSWORD})
    assert login.data["mfa_enrolled"] is False


def test_change_staff_role(admin_client, staff_member):
    """PATCH keeps the only role (admin) and is audited; unknown roles are refused."""
    assert admin_client.patch(f"/api/v1/admin/staff/{staff_member.id}", {"role": "admin"}).status_code == 200
    assert admin_client.patch(f"/api/v1/admin/staff/{staff_member.id}", {"role": "boss"}).status_code == 400
    assert AuditEvent.objects.filter(action="STAFF_ROLE_CHANGE").exists()
