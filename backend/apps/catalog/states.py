"""
The life cycle shared by listings and trips (BR-LST-03, table 4a).

A listing or a trip is always in one state. ``TRANSITIONS`` says which moves
exist and who may make each one (the host or a BLADUS admin). Every status
change in the project goes through ``apps.catalog.workflow.change_status``,
which reads this table, so the rule lives in one place.

``apps.trips`` reuses this module: trips have the same state machine.
"""

from django.db import models


class ListingStatus(models.TextChoices):
    """States of a listing or a trip (table 4a)."""

    DRAFT = "draft", "Draft"
    PENDING_REVIEW = "pending_review", "Pending review"
    CHANGES_REQUESTED = "changes_requested", "Changes requested"
    PUBLISHED = "published", "Published"
    PAUSED = "paused", "Paused"
    REJECTED = "rejected", "Rejected"
    SUSPENDED = "suspended", "Suspended"
    ARCHIVED = "archived", "Archived"
    DELETED = "deleted", "Deleted"


# The two kinds of actor that can move a listing or trip.
HOST = "host"
ADMIN = "admin"

# Allowed moves: {from: {to: {who may do it}}} (BR-LST-03, table 4a).
# "deleted" is not listed here: soft delete and restore have their own
# functions in workflow.py because they remember the previous state.
TRANSITIONS: dict[str, dict[str, set[str]]] = {
    ListingStatus.DRAFT: {
        ListingStatus.PENDING_REVIEW: {HOST},          # host submits (DEC-003)
    },
    ListingStatus.PENDING_REVIEW: {
        ListingStatus.PUBLISHED: {ADMIN},              # approve
        ListingStatus.CHANGES_REQUESTED: {ADMIN},      # request changes
        ListingStatus.REJECTED: {ADMIN},               # reject
        ListingStatus.DRAFT: {HOST},                   # host withdraws
    },
    ListingStatus.CHANGES_REQUESTED: {
        ListingStatus.PENDING_REVIEW: {HOST},          # host resubmits
    },
    ListingStatus.PUBLISHED: {
        ListingStatus.PAUSED: {HOST},
        ListingStatus.ARCHIVED: {HOST},
        ListingStatus.SUSPENDED: {ADMIN},
        ListingStatus.CHANGES_REQUESTED: {ADMIN},
        # First-version shortcut for BR-LST-02: editing a reviewed field of a
        # published listing sends it back to review (see services.py).
        ListingStatus.PENDING_REVIEW: {HOST},
    },
    ListingStatus.PAUSED: {
        ListingStatus.PUBLISHED: {HOST},               # resume, no new review
        # Same shortcut: "no review unless key fields changed" (table 4a).
        ListingStatus.PENDING_REVIEW: {HOST},
    },
    ListingStatus.REJECTED: {
        ListingStatus.DRAFT: {HOST},                   # host starts again
    },
    ListingStatus.SUSPENDED: {
        ListingStatus.PUBLISHED: {ADMIN},              # unsuspend
        ListingStatus.REJECTED: {ADMIN},
    },
    ListingStatus.ARCHIVED: {
        ListingStatus.DRAFT: {HOST},                   # host reopens
    },
    ListingStatus.DELETED: {},
}


def can_transition(current: str, new: str, actor_kind: str) -> bool:
    """
    True when ``actor_kind`` (``"host"`` or ``"admin"``) may move from
    ``current`` to ``new`` (BR-LST-03, table 4a).
    """
    return actor_kind in TRANSITIONS.get(current, {}).get(new, set())
