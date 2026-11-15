"""
Read queries of the search app: facet counts and map pins (BR-SRC-01, BR-SRC-03, BR-SRC-04).

Read model choice for this version: there is no ``listing_search_doc``
table yet. Facets and pins query the catalog through
``apps.catalog.selectors.search_listings``, the same function as
``GET /listings``, so the three endpoints always apply the same filters
(trigram text search included, migration ``catalog.0002``) and only show
public listings (BR-SRC-01). The denormalised table described in
05b-data-dictionary.md (refreshed by an outbox job) is the planned
optimisation once measured search load needs it (ADR-020).
"""

from django.db.models import Count, QuerySet

from apps.catalog import selectors as catalog_selectors
from apps.catalog.models import Amenity, Listing, ListingAmenity, PropertyType
from apps.catalog.types import EXPERIENCE_TYPE_LABELS, VERTICAL_LABELS
from apps.geo.models import Wilaya

# Most pins one map answer carries (openapi: "Map pins for the current search (max 500)").
MAP_PIN_LIMIT = 500
# Number of bars of the price histogram of the facets answer.
HISTOGRAM_BUCKETS = 10
# Labels of the host types facet.
HOST_TYPE_LABELS = {
    "individual": {"en": "Individual hosts", "fr": "Particuliers", "ar": "أفراد"},
    "agency": {"en": "Agencies", "fr": "Agences", "ar": "وكالات"},
    "hotel": {"en": "Hotels", "fr": "Hôtels", "ar": "فنادق"},
    "hostel": {"en": "Hostels", "fr": "Auberges", "ar": "نزل"},
}
INSTANT_LABELS = {
    "true": {"en": "Instant booking", "fr": "Réservation immédiate", "ar": "حجز فوري"},
    "false": {"en": "On request", "fr": "Sur demande", "ar": "عند الطلب"},
}


def _ids(result) -> QuerySet | list:
    """Ids of a search result: a sub-query for a queryset, a list when the date filter made a list."""
    if isinstance(result, list):
        return [listing.id for listing in result]
    return result.order_by().values("id")


def _matching(filters: dict, skip: frozenset = frozenset()) -> QuerySet:
    """Public listings matching ``filters`` without the ``skip`` filters, as a plain queryset (no ordering)."""
    return Listing.objects.filter(id__in=_ids(catalog_selectors.search_listings(**filters, skip=skip))).order_by()


def _buckets(rows, labels: dict | None) -> list[dict]:
    """``FacetBucket`` list ``[{value, label, count}]``, biggest count first, without empty values."""
    buckets = []
    for value, count in rows:
        if value in (None, "") or not count:
            continue
        key = str(value)
        label = labels.get(key) if labels else None
        buckets.append({"value": key, "label": label or key, "count": count})
    return sorted(buckets, key=lambda b: (-b["count"], b["value"]))


def _localized(table: dict[str, dict[str, str]], locale: str) -> dict[str, str]:
    """``{value: label}`` in one language from a ``{value: {en, fr, ar}}`` table."""
    return {key: names.get(locale, names["fr"]) for key, names in table.items()}


def _price_histogram(listings: QuerySet) -> list[dict]:
    """``price_histogram``: up to 10 equal price ranges of ``base_price_minor`` with their counts."""
    prices = sorted(listings.values_list("base_price_minor", flat=True))
    if not prices:
        return []
    low, high = prices[0], prices[-1]
    width = max((high - low + HISTOGRAM_BUCKETS) // HISTOGRAM_BUCKETS, 1)
    counts: dict[int, int] = {}
    for price in prices:
        counts[(price - low) // width] = counts.get((price - low) // width, 0) + 1
    return [
        {"from_minor": low + i * width, "to_minor": low + (i + 1) * width, "count": counts[i]}
        for i in sorted(counts)
    ]


def listing_facets(filters: dict, locale: str = "fr") -> dict:
    """
    ``GET /listings/facets``: how many public listings match, and the counts per value of each facet.

    Facets: ``vertical``, ``experience_type``, ``property_type``,
    ``amenities``, ``wilaya``, ``host_type``, ``instant``. Each one is
    counted on the filtered set WITHOUT its own filter (BR-SRC-01), so the
    user sees what changing it would give. ``hotel`` and ``hostel`` stay
    separate verticals (BR-SRC-04, DEC-005). The price histogram ignores the
    price filters for the same reason.
    """
    total = len(_ids(catalog_selectors.search_listings(**filters))) if filters.get("check_in") else \
        _matching(filters).count()
    facets: dict[str, list[dict]] = {}

    rows = _matching(filters, frozenset({"vertical"})).values_list("vertical").annotate(n=Count("id"))
    facets["vertical"] = _buckets(rows, _localized(VERTICAL_LABELS, locale))

    rows = _matching(filters, frozenset({"experience_type"})).values_list("experience_type").annotate(n=Count("id"))
    facets["experience_type"] = _buckets(rows, _localized(EXPERIENCE_TYPE_LABELS, locale))

    rows = _matching(filters, frozenset({"property_type"})).values_list("property_type__slug").annotate(n=Count("id"))
    names = {p.slug: getattr(p, f"name_{locale}") for p in PropertyType.objects.all()}
    facets["property_type"] = _buckets(rows, names)

    amenity_ids = _matching(filters, frozenset({"amenities"})).values("id")
    rows = (
        ListingAmenity.objects.filter(listing_id__in=amenity_ids)
        .values_list("amenity__slug").annotate(n=Count("listing_id", distinct=True))
    )
    names = {a.slug: getattr(a, f"name_{locale}") for a in Amenity.objects.all()}
    facets["amenities"] = _buckets(rows, names)

    rows = _matching(filters, frozenset({"wilaya"})).values_list("commune__wilaya_id").annotate(n=Count("id"))
    names = {str(w.code): w.name_for(locale) for w in Wilaya.objects.all()}
    facets["wilaya"] = _buckets(rows, names)

    host_rows = (
        _matching(filters, frozenset({"host_type"}))
        .values_list("host_account__organization__business_category").annotate(n=Count("id"))
    )
    facets["host_type"] = _buckets(
        [(value or "individual", count) for value, count in host_rows], _localized(HOST_TYPE_LABELS, locale)
    )

    instant_set = _matching(filters, frozenset({"instant"}))
    instant_count = instant_set.filter(catalog_selectors.instant_q()).count()
    facets["instant"] = _buckets(
        [("true", instant_count), ("false", instant_set.count() - instant_count)],
        _localized(INSTANT_LABELS, locale),
    )

    without_price = {**filters, "min_price": None, "max_price": None}
    return {"total": total, "facets": facets, "price_histogram": _price_histogram(_matching(without_price))}


def map_pins(filters: dict) -> dict:
    """
    ``GET /listings/map``: one pin per matching public listing, at most 500 (``truncated`` says more exist).

    Pins use the PUBLIC point only (BR-SRC-03); listings without a point
    are left out. Same filters and order as ``GET /listings``.
    """
    result = catalog_selectors.search_listings(**filters)
    if isinstance(result, list):
        rows = [listing for listing in result if listing.public_latitude is not None]
    else:
        rows = list(result.filter(public_latitude__isnull=False)[: MAP_PIN_LIMIT + 1])
    pins = [
        {
            "id": str(listing.id),
            "vertical": listing.vertical,
            "location_public": {"lat": float(listing.public_latitude), "lng": float(listing.public_longitude)},
            "price_from": {"amount_minor": listing.base_price_minor, "currency": listing.currency},
            "title": listing.title,
        }
        for listing in rows[:MAP_PIN_LIMIT]
    ]
    return {"pins": pins, "truncated": len(rows) > MAP_PIN_LIMIT}
