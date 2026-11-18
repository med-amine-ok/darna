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

from django.db import connection
from django.db.models import CharField, Count, F, Func, OuterRef, Q, QuerySet, Subquery, Sum, Value
from django.db.models.functions import Greatest
from django.utils import timezone

from apps.core.errors import NotFoundError
from apps.hosts.models import ApprovalMode, VerificationStatus

from .models import (
    Amenity,
    CancellationPolicy,
    Category,
    FeaturedPlacement,
    InventoryKind,
    Listing,
    PropertyType,
    RoomType,
)
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
            "vehicle_detail", "experience_detail",
        )
        # Card fields (cover photo, amenity slugs) read these lists: one query each per page, not per row.
        .prefetch_related("photos", "amenity_links__amenity")
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


# R15: shortest free-text query worth searching; trigram matching needs a few letters.
TEXT_QUERY_MIN_CHARS = 2
# R15: longest free-text query kept (longer text is cut), so a request cannot be made expensive.
TEXT_QUERY_MAX_CHARS = 100
# R15: fields matched by the free-text query: listing title and commune names.
TEXT_QUERY_FIELDS = ("title", "commune__name_fr", "commune__name_ar", "commune__name_en")


def _unaccent(expression) -> Func:
    """
    ``f_unaccent(expression)``: the IMMUTABLE wrapper of ``unaccent`` created by
    migration ``catalog.0002`` (R15). The GIN trigram indexes use the same
    expression, so the search can use them.
    """
    return Func(expression, function="f_unaccent", output_field=CharField())


def _filter_text(qs: QuerySet, text: str) -> QuerySet:
    """
    Keep listings whose title or commune name matches ``text`` (R15).

    PostgreSQL: pg_trgm word similarity on unaccented values (Arabic, French
    and Darija spellings tolerate typos and missing accents), ranked by the
    best similarity in ``search_rank``. Other databases (SQLite on laptops):
    case-insensitive ``contains`` on the same fields, ``search_rank`` unset.
    """
    if connection.vendor != "postgresql":
        match = Q()
        for name in TEXT_QUERY_FIELDS:
            match |= Q(**{f"{name}__icontains": text})
        return qs.filter(match)

    from django.contrib.postgres.lookups import TrigramWordSimilar
    from django.contrib.postgres.search import TrigramWordSimilarity

    needle = _unaccent(Value(text))
    match = Q()
    for name in TEXT_QUERY_FIELDS:
        # ``f_unaccent(column) %> f_unaccent(text)``: word similarity above pg_trgm.word_similarity_threshold.
        match |= Q(TrigramWordSimilar(_unaccent(F(name)), needle))
    rank = Greatest(*(TrigramWordSimilarity(needle, _unaccent(F(name))) for name in TEXT_QUERY_FIELDS))
    return qs.filter(match).annotate(search_rank=rank)


# Filters a facet can leave out (BR-SRC-01: each facet is counted without its own filter).
FACET_FILTERS = ("vertical", "experience_type", "property_type", "amenities", "wilaya", "host_type", "instant")


def instant_q() -> Q:
    """Listings booked without host approval: own mode ``instant``, or none and the host default ``instant`` (BR-BKG-02)."""
    return Q(approval_mode=ApprovalMode.INSTANT) | Q(
        approval_mode__isnull=True, host_account__default_approval_mode=ApprovalMode.INSTANT
    )


def host_type_q(host_types: list[str]) -> Q:
    """Listings whose host account has one of ``host_types`` (an individual host has no organisation)."""
    match = Q(host_account__organization__business_category__in=[t for t in host_types if t != "individual"])
    if "individual" in host_types:
        match |= Q(host_account__organization__isnull=True)
    return match


def featured_ids() -> QuerySet:
    """Ids of listings with a featured placement live now (LST-09)."""
    now = timezone.now()
    return (
        FeaturedPlacement.objects.filter(starts_at__lte=now)
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now))
        .values("listing_id")
    )


def _as_list(value) -> list[str]:
    """A comma string or a list of strings to a clean list."""
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        return [str(v).strip() for v in value if str(v).strip()]
    return _csv(value)


def search_listings(
    *,
    q: str | None = None,
    vertical=None,
    wilaya: int | None = None,
    commune: int | None = None,
    guests: int | None = None,
    rooms: int | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    property_type=None,
    category: str | None = None,
    amenities=None,
    experience_type=None,
    host_type=None,
    host_account=None,
    host_user=None,
    bedrooms_min: int | None = None,
    bathrooms_min: int | None = None,
    min_rating=None,
    instant: bool | None = None,
    featured: bool | None = None,
    check_in: date | None = None,
    check_out: date | None = None,
    bbox: tuple[Decimal, Decimal, Decimal, Decimal] | None = None,
    sort: str | None = None,
    skip: frozenset | set = frozenset(),
):
    """
    The public search (``GET /listings``), also used by the facets and the
    map pins of ``apps.search``, so the three answers apply the same filters.
    Returns a queryset, or a list when dates are given (the date filter runs
    in Python on the candidates).

    Filters (all optional, combined with AND; list filters take a list or a comma string):
    - ``q``: free text on the title and the commune names (R15, see
      :func:`_filter_text`); ignored below two characters, cut at 100;
    - ``vertical``: exact (``hotel`` does not include ``hostel``, DEC-005);
    - ``wilaya`` (code) or ``commune`` (id) (BR-SRC-02);
    - ``guests``: capacity at least this; ``rooms``: hotels and hostels with
      at least this many active units (other verticals are not affected);
    - ``min_price`` / ``max_price``: on ``base_price_minor``, in centimes;
    - ``property_type``: slugs; ``category``: one slug;
    - ``amenities``: slugs, the listing must have every one;
    - ``experience_type``: experience types (BR-LST-05);
    - ``host_type``: individual, agency, hotel, hostel; ``host_account``: one host account id;
      ``host_user``: the solo host account of one user (public profile page);
    - ``bedrooms_min``, ``bathrooms_min``, ``min_rating``;
    - ``instant``: only listings booked without host approval (own or inherited mode);
    - ``featured``: only listings with a live featured placement;
    - ``check_in`` + ``check_out``: only listings free for the stay (inventory filter);
    - ``bbox``: ``(min_lng, min_lat, max_lng, max_lat)`` on the PUBLIC point (BR-SRC-03).
    ``skip`` names filters to leave out (from ``FACET_FILTERS``), for facet counts (BR-SRC-01).
    Sort: ``price``, ``-price``, ``newest`` (default), ``rating``; with ``q``
    on PostgreSQL and no explicit sort, the best text match comes first.
    """
    qs = public_listings()
    text = (q or "").strip()[:TEXT_QUERY_MAX_CHARS]
    if len(text) >= TEXT_QUERY_MIN_CHARS:
        qs = _filter_text(qs, text)
    else:
        text = ""
    if "vertical" not in skip and (verticals := _as_list(vertical)):
        qs = qs.filter(vertical__in=verticals)
    if wilaya and "wilaya" not in skip:
        qs = qs.filter(commune__wilaya_id=wilaya)
    if commune:
        qs = qs.filter(commune_id=commune)
    if guests:
        qs = qs.filter(capacity_guests__gte=guests)
    if rooms:
        units = (
            RoomType.objects.alive().filter(listing=OuterRef("pk"), is_active=True)
            .values("listing").annotate(total=Sum("unit_count")).values("total")
        )
        qs = qs.annotate(active_units=Subquery(units)).filter(
            ~Q(inventory_kind=InventoryKind.ROOM_POOL) | Q(active_units__gte=rooms)
        )
    if min_price is not None:
        qs = qs.filter(base_price_minor__gte=min_price)
    if max_price is not None:
        qs = qs.filter(base_price_minor__lte=max_price)
    if "property_type" not in skip and (types := _as_list(property_type)):
        qs = qs.filter(property_type__slug__in=types)
    if category:
        qs = qs.filter(category__slug=category)
    if "amenities" not in skip:
        for slug in _as_list(amenities):
            # One join per amenity: the listing must have all of them.
            qs = qs.filter(amenity_links__amenity__slug=slug)
    if "experience_type" not in skip and (exp_types := _as_list(experience_type)):
        qs = qs.filter(experience_type__in=exp_types)
    if "host_type" not in skip and (host_types := _as_list(host_type)):
        qs = qs.filter(host_type_q(host_types))
    if host_account:
        qs = qs.filter(host_account_id=host_account)
    if host_user:
        qs = qs.filter(host_account__user_id=host_user)
    if bedrooms_min is not None:
        qs = qs.filter(bedrooms__gte=bedrooms_min)
    if bathrooms_min is not None:
        qs = qs.filter(bathrooms__gte=bathrooms_min)
    if min_rating is not None:
        qs = qs.filter(rating_avg__gte=min_rating)
    if instant is not None and "instant" not in skip:
        qs = qs.filter(instant_q() if instant else ~instant_q())
    if featured:
        qs = qs.filter(id__in=featured_ids())
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
    if text and not sort and connection.vendor == "postgresql":
        order = ["-search_rank", *order]
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


def is_featured(listing: Listing) -> bool:
    """True when the listing has a featured placement live now (LST-09)."""
    return featured_ids().filter(listing_id=listing.id).exists()


def admin_taxonomy(model, *, vertical: str | None = None, active: bool | None = None) -> QuerySet:
    """
    Every amenity, category or property type for the admin console, active or not (BR-LST-04).

    ``vertical`` keeps rows of that vertical (for amenities: rows that apply
    to it); ``active`` filters on ``is_active``. Each row carries
    ``listing_count`` (listings using it, soft-deleted ones included).
    """
    qs = model.objects.all()
    if active is not None:
        qs = qs.filter(is_active=active)
    if model is Amenity:
        qs = qs.annotate(listing_count=Count("listing_links", distinct=True))
        if vertical:
            qs = qs.filter(id__in=[a.id for a in Amenity.objects.all() if vertical in (a.applies_to or [])])
        return qs
    if vertical:
        qs = qs.filter(vertical=vertical)
    field = "category" if model is Category else "property_type"
    usage = Listing.objects.filter(**{field: OuterRef("pk")}).values(field).annotate(n=Count("id")).values("n")
    return qs.annotate(listing_count=Subquery(usage))


def get_taxonomy_row(model, row_id):
    """One amenity, category or property type by id, else 404."""
    row = model.objects.filter(id=row_id).first()
    if row is None:
        raise NotFoundError(f"{model._meta.verbose_name.capitalize()} not found.")
    return row
