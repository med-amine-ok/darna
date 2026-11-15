"""
Tell the host about a moderation decision (BR-MOD-02, BR-NTF-01).

``trust.services.decide`` queues an outbox message ``moderation.decided`` in
the same transaction as the decision. This module turns it into an in-app
notification (plus email or SMS for critical kinds) for the person behind the
host account: the solo host, or the organisation's owner. ``trust`` sits in
layer L6, so it may call ``notifications`` (L1) and read ``hosts`` (L2).
"""

from apps.core import outbox

TOPIC = "moderation.decided"

# (case kind group, decision) -> notification kind in apps.notifications.catalogue.
_KINDS = {
    ("host", "approve"): "verification.approved",
    ("host", "request_changes"): "verification.changes_requested",
    ("host", "reject"): "verification.rejected",
    ("offer", "approve"): "listing.published",
    ("offer", "request_changes"): "listing.changes_requested",
    ("offer", "reject"): "listing.rejected",
}
_GROUPS = {
    "host_verification": "host",
    "listing_review": "offer",
    "listing_revision": "offer",
    "trip_review": "offer",
}


def host_contact(host_account_id):
    """The person to tell for a host account: the solo host, or the active owner of the organisation; else ``None``."""
    from apps.hosts.models import HostAccount, MembershipRole

    account = HostAccount.objects.filter(pk=host_account_id).select_related("user", "organization").first()
    if account is None:
        return None
    if account.user_id:
        return account.user
    if account.organization_id is None:
        return None
    owner = (
        account.organization.memberships.filter(role=MembershipRole.OWNER, is_active=True)
        .select_related("user")
        .first()
    )
    return owner.user if owner else None


def handle_decision(payload: dict) -> None:
    """
    Outbox handler of ``moderation.decided``. Decisions with no host-facing
    message (documents, reviews, disputes, escalations) are skipped on purpose.
    """
    from apps.notifications.services import notify

    from .models import ModerationCase, ReasonCode

    kind = _KINDS.get((_GROUPS.get(payload.get("kind"), ""), payload.get("decision")))
    if kind is None or not payload.get("host_account_id"):
        return
    person = host_contact(payload["host_account_id"])
    if person is None:
        return
    case = ModerationCase.objects.filter(pk=payload.get("case_id")).first()
    reason = ""
    if payload.get("reason_code"):
        code = ReasonCode.objects.filter(code=payload["reason_code"]).first()
        if code is not None:
            locale = getattr(person, "preferred_locale", "fr")
            reason = code.host_text_for(locale) or code.label_for(locale)
    notify(person, kind, params={"title": case.subject_title if case else "", "reason": reason})


def connect() -> None:
    """Register the handler; called from ``TrustConfig.ready``."""
    outbox.register_handler(TOPIC, handle_decision)
