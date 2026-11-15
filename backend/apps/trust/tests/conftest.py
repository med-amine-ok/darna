"""Fixtures of the trust tests: subjects waiting for review and a helper to find their case."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.catalog.states import ListingStatus
from apps.catalog.tests.factories import individual_host, listing, organization_host
from apps.hosts.models import HostDocument, VerificationStatus
from apps.trust.models import ModerationCase


def submitted(obj, *, days_ago: float = 0, status: str = ListingStatus.PENDING_REVIEW):
    """Put a listing or trip in review, submitted ``days_ago`` days ago (test setup only)."""
    when = timezone.now() - timedelta(days=days_ago)
    type(obj).objects.filter(pk=obj.pk).update(status=status, submitted_at=when)
    obj.refresh_from_db()
    return obj


def host_under_review(*, days_ago: float = 0, category: str | None = None):
    """A host account waiting for verification; returns ``(account, user)``."""
    account, user = organization_host(category, approved=False) if category else individual_host(approved=False)
    type(account).objects.filter(pk=account.pk).update(
        verification_status=VerificationStatus.UNDER_REVIEW, submitted_at=timezone.now() - timedelta(days=days_ago)
    )
    account.refresh_from_db()
    return account, user


def case_of(subject) -> ModerationCase:
    """The unresolved case of ``subject`` (after a sync)."""
    return ModerationCase.objects.exclude(status="resolved").get(subject_id=subject.pk)


@pytest.fixture
def pending_listing(db):
    """A home of an approved host, submitted for review today; returns ``(listing, host_account, owner)``."""
    host, owner = individual_host()
    return submitted(listing(host, "home")), host, owner


@pytest.fixture
def pending_document(db):
    """A pending national ID of a host under review."""
    account, _ = host_under_review()
    return HostDocument.objects.create(host_account=account, doc_type="national_id", file_url="media:abc")
