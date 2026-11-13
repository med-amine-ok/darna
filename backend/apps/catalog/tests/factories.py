"""
Test factories for catalog, inventory, trips and the apps built on them.

Plain functions (no factory library) that create valid rows with sensible
defaults. Every keyword can be overridden. Typical use::

    host, owner = approved_individual_host()
    listing = published_home(host)
    client = client_for(owner, host)          # from conftest

Hosts are returned with the user who acts for them:
- ``approved_individual_host()`` -> ``(host_account, user)``
- ``approved_agency()`` / ``approved_hotel()`` / ``approved_hostel()`` ->
  ``(host_account, owner_user)`` with an organisation and an owner membership.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone

from apps.catalog.models import Listing
from apps.catalog.services import create_listing, create_room_type, seed_reference_data
from apps.catalog.states import ListingStatus
from apps.core.timeutils import business_today
from apps.geo.models import Commune, Wilaya
from apps.hosts.models import HostAccount, Membership, Organization, VerificationStatus
from conftest import make_user

_counter = {"n": 0}


def _next() -> int:
    """A number unique within the test run (for emails and slugs)."""
    _counter["n"] += 1
    return _counter["n"]


def commune(wilaya_code: int = 16, name: str = "Alger Centre", lat: str = "36.7538", lng: str = "3.0588") -> Commune:
    """A commune (and its wilaya) for listings; reuses the row if it already exists."""
    wilaya, _ = Wilaya.objects.get_or_create(
        code=wilaya_code, defaults={"name_fr": f"Wilaya {wilaya_code}", "name_ar": "ولاية", "name_en": f"Wilaya {wilaya_code}"}
    )
    found = Commune.objects.filter(wilaya=wilaya, name_fr=name).first()
    return found or Commune.objects.create(wilaya=wilaya, name_fr=name, latitude=Decimal(lat), longitude=Decimal(lng))


def reference_data() -> None:
    """Seed policies, amenities, property types and categories (idempotent)."""
    seed_reference_data()


def individual_host(*, approved: bool = True, user=None) -> tuple[HostAccount, object]:
    """A solo host account (``individual``). Approved by default."""
    user = user or make_user(email=f"host{_next()}@example.dz")
    account = HostAccount.objects.create(
        kind="individual", user=user,
        verification_status=VerificationStatus.APPROVED if approved else VerificationStatus.APPLIED,
        approved_at=timezone.now() if approved else None,
    )
    return account, user


def approved_individual_host() -> tuple[HostAccount, object]:
    """An approved solo host and its user."""
    return individual_host(approved=True)


def organization_host(category: str, *, approved: bool = True) -> tuple[HostAccount, object]:
    """An organisation host account (agency, hotel or hostel) with an owner membership."""
    owner = make_user(email=f"owner{_next()}@example.dz")
    n = _next()
    org = Organization.objects.create(
        business_category=category, display_name=f"{category.title()} {n}", slug=f"{category}-{n}", created_by=owner
    )
    Membership.objects.create(organization=org, user=owner, role="owner")
    account = HostAccount.objects.create(
        kind="organization", organization=org,
        verification_status=VerificationStatus.APPROVED if approved else VerificationStatus.APPLIED,
        approved_at=timezone.now() if approved else None,
    )
    return account, owner


def approved_agency() -> tuple[HostAccount, object]:
    """An approved travel agency and its owner."""
    return organization_host("agency")


def approved_hotel() -> tuple[HostAccount, object]:
    """An approved hotel and its owner."""
    return organization_host("hotel")


def approved_hostel() -> tuple[HostAccount, object]:
    """An approved hostel and its owner."""
    return organization_host("hostel")


def listing(host_account, vertical: str = "home", *, status: str = ListingStatus.DRAFT, **fields) -> Listing:
    """
    A complete listing created through the real service (offer rule, public
    point), then forced to ``status`` for the test (bypassing review).
    Defaults: Algiers commune, 12,000 DZD, 4 guests, moderate policy.
    """
    reference_data()
    data = {
        "vertical": vertical, "title": fields.pop("title", f"Test {vertical}"), "description": "A nice place.",
        "commune": fields.pop("commune", None) or commune(), "latitude": Decimal("36.753800"),
        "longitude": Decimal("3.058800"), "address_line": "12 rue Secrète", "capacity_guests": 4,
        "base_price_minor": 1_200_000,
    }
    if vertical == "experience":
        data["experience_type"] = fields.pop("experience_type", "guided_tour")
    data.update(fields)
    obj = create_listing(host_account, data)
    if status != ListingStatus.DRAFT:
        obj.status = status
        obj.published_at = timezone.now() if status == ListingStatus.PUBLISHED else None
        obj.save(update_fields=["status", "published_at"])
    return obj


def published_home(host_account=None, **fields) -> Listing:
    """A published home of an approved individual host (created when not given)."""
    host_account = host_account or approved_individual_host()[0]
    return listing(host_account, "home", status=ListingStatus.PUBLISHED, **fields)


def published_hotel(host_account=None, *, units: int = 3, price_minor: int = 900_000, **fields):
    """A published hotel with one room type of ``units`` rooms. Returns ``(listing, room_type)``."""
    host_account = host_account or approved_hotel()[0]
    obj = listing(host_account, "hotel", **fields)
    room = create_room_type(obj, {"name": "Double", "unit_count": units, "capacity_per_unit": 2,
                                  "base_price_minor": price_minor})
    obj.refresh_from_db()
    obj.status = ListingStatus.PUBLISHED
    obj.published_at = timezone.now()
    obj.save(update_fields=["status", "published_at"])
    return obj, room


def published_experience(host_account=None, **fields) -> Listing:
    """A published experience of an approved agency."""
    host_account = host_account or approved_agency()[0]
    return listing(host_account, "experience", status=ListingStatus.PUBLISHED, **fields)


def future(days: int) -> date:
    """A date ``days`` days from today in Algeria (handy for stays that must be in the future)."""
    return business_today() + timedelta(days=days)
