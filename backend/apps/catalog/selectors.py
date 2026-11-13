"""
Read-only queries of the catalog app (no writes here).

The public queries only ever return listings that guests may see
(BR-SRC-01): status ``published``, not deleted, owned by an approved host
account that is not deleted.

Date search (BR-AVL-04/05) needs the calendar, which lives in
``apps.inventory``, an app listed *after* catalog (layer rule: catalog may
not import it). So inventory plugs its date filter in at start-up with
:func:`register_date_filter` (see ``apps/inventory/apps.py``).
"""

import uuid
from collections.abc import Callable
from datetime import date
from decimal import Decimal

from django.db.models import Q, QuerySet

from apps.core.errors import NotFoundError
from apps.hosts.models import ApprovalMode, VerificationStatus

from .models import Amenity, CancellationPolicy, Category, Listing, PropertyType
from .states import ListingStatus

# Function given by apps.inventory: (listings, check_in, check_out, guests) -> set of listing ids free for those dates.
_date_filter: Callable | None = None


def register_date_filter(func: Callable) -> None:
    """
    Let the inventory app provide the "free for these dates" filter of the search.

    ``func(listings: list[Listing], check_in: date, check_out: date, guests: int) -> set[uuid]``
    returns the ids of the listings that can host the stay. Registered once
    from ``InventoryConfig.ready()``.
    """
    global _date_filter
    _date_filter = func


def public_listings() -> QuerySet:
    """
    Listings guests may see (BR-SRC-01, BR-LST-03): published, alive, host approved and alive.

    Paused, suspended, archived listings and listings of suspended hosts are
    hidden but keep their bookings.
    """
    return (
        Listing.objects.alive()
        .filter(
            status=ListingStatus.PUBLISHED,
            host_account__verification_status=VerificationStatus.APPROVED,
            host_account__deleted_at__isnull=True,
        )
        .select_related(
            "host_account", "host_account__organization", "host_account__user",
            "commune", "commune__wilaya", "property_type", "category", "cancellation_policy",
        )
    )


def get_public_listing(key: str) -> Listing:
    """
    One public listing by its UUID or its reference (``LST-7K2M9Q``), else 404.

    The website links listings by reference; the apps use the id.
    """
    queryset = public_listings()
    try:
        listing = queryset.filter(id=uuid.UUID(str(key))).first()
    except ValueError:
        listing = queryset.filter(reference__iexact=key).first()
    if listing is None:
        raise NotFoundError("Listing not found.")
    return listing


def _csv(value: str | None) -> list[str]:
    """Split a comma-separated query value into clean items (empty list when missing)."""
    return [item.strip() for item in (value or "").split(",") if item.strip()]


def search_listings(
    *,
    vertical: str | None = None,
    wilaya: int | None = None,
    commune: int | None = None,
    guests: int | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    property_type: str | None = None,
    amenities: str | None = None,
    exp_type: str | None = None,
    instant: bool | None = None,
    check_in: date | None = None,
    check_out: date | None = None,
    bbox: tuple[Decimal, Decimal, Decimal, Decimal] | None = None,
    sort: str | None = None,
):
    """
    The public search (``GET /listings``). Returns a queryset, or a list when
    dates are given (the date filter runs in Python on the candidates).

    Filters (all optional, combined with AND):
    - ``vertical``: exact, comma list allowed (``hotel`` does not include ``hostel``);
    - ``wilaya`` (code) or ``commune`` (id) (BR-SRC-02);
    - ``guests``: capacity at least this;
    - ``min_price`` / ``max_price``: on ``base_price_minor``, in centimes;
    - ``property_type``: slugs, comma list;
    - ``amenities``: slugs, the listing must have every one;
    - ``exp_type``: experience types, comma list (BR-LST-05);
    - ``instant``: only listings booked without host approval (own or inherited mode);
    - ``check_in`` + ``check_out``: only listings free for the stay (inventory filter);
    - ``bbox``: ``(min_lng, min_lat, max_lng, max_lat)`` on the PUBLIC point (BR-SRC-03).
    Sort: ``price``, ``-price``, ``newest`` (default), ``rating``.
    """
    qs = public_listings()
    if verticals := _csv(vertical):
        qs = qs.filter(vertical__in=verticals)
    if wilaya:
        qs = qs.filter(commune__wilaya_id=wilaya)
    if commune:
        qs = qs.filter(commune_id=commune)
    if guests:
        qs = qs.filter(capacity_guests__gte=guests)
    if min_price is not None:
        qs = qs.filter(base_price_minor__gte=min_price)
    if max_price is not None:
        qs = qs.filter(base_price_minor__lte=max_price)
    if types := _csv(property_type):
        qs = qs.filter(property_type__slug__in=types)
    for slug in _csv(amenities):
        # One join per amenity: the listing must have all of them.
        qs = qs.filter(amenity_links__amenity__slug=slug)
    if exp_types := _csv(exp_type):
        qs = qs.filter(experience_type__in=exp_types)
    if instant is not None:
        instant_q = Q(approval_mode=ApprovalMode.INSTANT) | Q(
            approval_mode__isnull=True, host_account__default_approval_mode=ApprovalMode.INSTANT
        )
        qs = qs.filter(instant_q if instant else ~instant_q)
    if bbox:
        min_lng, min_lat, max_lng, max_lat = bbox
        qs = qs.filter(
            public_longitude__gte=min_lng, public_longitude__lte=max_lng,
            public_latitude__gte=min_lat, public_latitude__lte=max_lat,
        )
    order = {
        "price": ["base_price_minor", "-created_at"],
        "-price": ["-base_price_minor", "-created_at"],
        "rating": ["-rating_avg", "-review_count", "-created_at"],
        "newest": ["-published_at", "-created_at"],
    }.get(sort or "newest", ["-published_at", "-created_at"])
    qs = qs.distinct().order_by(*order)

    if check_in and check_out and _date_filter is not None:
        candidates = list(qs)
        free_ids = _date_filter(candidates, check_in, check_out, guests or 1)
        return [listing for listing in candidates if listing.id in free_ids]
    return qs


def host_listings(host_account) -> QuerySet:
    """Every non-deleted listing of one host account (host dashboard). Always scope host queries with this."""
    return Listing.objects.alive().filter(host_account=host_account).select_related(
        "commune", "property_type", "category", "cancellation_policy"
    )


def get_host_listing(host_account, listing_id) -> Listing:
    """One listing of this host account, else 404 (someone else's listing looks like a missing one)."""
    listing = host_listings(host_account).filter(id=listing_id).first()
    if listing is None:
        raise NotFoundError("Listing not found.")
    return listing


def admin_listings(*, status: str | None = None, vertical: str | None = None, host: str | None = None,
                   deleted: bool = False) -> QuerySet:
    """
    Listings for the admin queue. Filters: ``status``, ``vertical`` (comma
    lists), ``host`` (host account id); ``deleted=True`` shows soft-deleted
    rows (to restore them). Oldest submission first, so the queue is fair (BR-MOD-01).
    """
    qs = Listing.objects.dead() if deleted else Listing.objects.alive()
    if statuses := _csv(status):
        qs = qs.filter(status__in=statuses)
    if verticals := _csv(vertical):
        qs = qs.filter(vertical__in=verticals)
    if host:
        qs = qs.filter(host_account_id=host)
    return qs.select_related("host_account", "host_account__organization", "host_account__user", "commune").order_by(
        "submitted_at", "created_at"
    )


def get_admin_listing(listing_id) -> Listing:
    """Any listing, deleted or not, for an admin; 404 when the id is unknown."""
    listing = Listing.objects.filter(id=listing_id).first()
    if listing is None:
        raise NotFoundError("Listing not found.")
    return listing


def reference_amenities() -> QuerySet:
    """Active amenities, for the listing form and the search filters."""
    return Amenity.objects.filter(is_active=True)


def reference_property_types() -> QuerySet:
    """Active property types of every vertical."""
    return PropertyType.objects.filter(is_active=True)


def reference_categories() -> QuerySet:
    """Active categories of every vertical."""
    return Category.objects.filter(is_active=True)


def current_policies() -> QuerySet:
    """The current version of each cancellation policy (BR-CAN-01)."""
    return CancellationPolicy.objects.filter(is_current=True).order_by("code")
