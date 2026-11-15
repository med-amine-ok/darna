"""Moderation decisions reach the host as notifications (BR-MOD-02, BR-NTF-01)."""

import pytest

from apps.hosts.tests.helpers import make_org, owner_of
from apps.notifications.models import Notification
from apps.trust import notify_hooks

pytestmark = pytest.mark.django_db


def test_br_mod_02_host_approval_notifies_the_owner():
    """Approving a host verification case tells the organisation's owner."""
    account = make_org()
    notify_hooks.handle_decision(
        {"case_id": None, "kind": "host_verification", "decision": "approve", "host_account_id": str(account.id)}
    )
    note = Notification.objects.get(user=owner_of(account))
    assert note.kind == "verification.approved"


def test_br_mod_02_escalation_and_documents_send_nothing():
    """Decisions without a host-facing message are skipped."""
    account = make_org()
    for kind, decision in (("host_verification", "escalate"), ("document", "approve")):
        notify_hooks.handle_decision(
            {"case_id": None, "kind": kind, "decision": decision, "host_account_id": str(account.id)}
        )
    assert not Notification.objects.exists()


def test_moderation_decided_topic_has_a_handler():
    """The outbox topic is registered, so these messages never end up dead for lack of a handler."""
    from apps.core import outbox

    assert outbox._handlers.get("moderation.decided") is notify_hooks.handle_decision
