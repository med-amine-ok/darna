"""Small builders shared by the hosts tests (organisations, team members, approved hosts)."""

from apps.hosts import services
from apps.hosts.models import HostAccount, Membership, VerificationStatus
from conftest import make_user

_counter = {"n": 0}


def new_user(**extra):
    """A user with a unique email and a verified phone."""
    _counter["n"] += 1
    return make_user(email=f"person{_counter['n']}@example.dz", **extra)


def make_org(owner=None, category: str = "agency", name: str = "Atlas Voyages", **fields) -> HostAccount:
    """Create an organisation through the service; returns its host account (owner = ``owner``)."""
    owner = owner or new_user()
    return services.create_organization(owner, business_category=category, display_name=name, **fields)


def add_member(account: HostAccount, role: str, user=None) -> Membership:
    """Put a (new) user in the organisation of ``account`` with ``role``."""
    return Membership.objects.create(organization=account.organization, user=user or new_user(), role=role)


def owner_of(account: HostAccount):
    """The user who owns the organisation of ``account``."""
    return account.organization.memberships.get(role="owner", is_active=True).user


def set_status(account: HostAccount, status: str) -> HostAccount:
    """Force a verification status (test setup only; the API enforces the state machine)."""
    HostAccount.objects.filter(pk=account.pk).update(verification_status=status)
    account.refresh_from_db()
    return account


def approved(account: HostAccount) -> HostAccount:
    """Shortcut: mark the host account approved."""
    return set_status(account, VerificationStatus.APPROVED)


def sample_answer(field: dict):
    """A valid answer for one onboarding field of the seeded flows (by type, with a few known ids)."""
    field_id, kind = field["id"], field["type"]
    if "Email" in field_id:
        return "contact@example.dz"
    if "Phone" in field_id:
        return "+213555000111"
    if field_id in ("checkInTime", "checkOutTime"):
        return "14:00"
    if kind == "select":
        return field["options"][0]["value"]
    if kind in ("multi_select", "amenities"):
        return [field["options"][0]["value"]] if field.get("options") else ["wifi"]
    if kind == "number":
        return 2
    if kind == "toggle":
        return True
    if kind in ("image_upload", "file_upload"):
        return ["upload-1"]
    if kind == "location":
        return {"lat": 36.75, "lng": 3.06}
    return "Sample answer"


def onboarding_answers(host_type: str, **overrides) -> dict:
    """Every required answer of the published flow of ``host_type``, plus ``overrides`` (approval mode: request)."""
    from apps.config.selectors import published_flow
    from apps.config.services import approval_field, flow_fields

    steps = published_flow(host_type).steps
    approval = approval_field(steps)
    answers = {fid: sample_answer(f) for fid, f in flow_fields(steps).items() if f.get("required")}
    answers[approval["id"]] = "request"
    answers.update(overrides)
    return answers


def onboard(client, host_type: str, **overrides):
    """Save a complete draft through the API and submit it; returns the submit response."""
    from apps.config.selectors import published_flow

    steps = published_flow(host_type).steps
    res = client.put(
        f"/api/v1/host/onboarding/drafts/{host_type}",
        {"current_step": steps[-1]["id"], "answers": onboarding_answers(host_type, **overrides)},
        format="json",
    )
    assert res.status_code == 200, res.data
    return client.post(f"/api/v1/host/onboarding/drafts/{host_type}/submit")
