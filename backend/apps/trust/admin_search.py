"""
Admin command palette search (STF-05, BR-STF-01): one text box that finds hosts, listings, trips, bookings and users.

Each kind is one bounded query (``LIMIT``) read through the owning app's
admin selector; exact references come first. Only admins reach it (one
staff role, DEC-016), so every hit is visible to the caller.
"""

from django.contrib.auth import get_user_model
from django.db.models import Q

from apps.bookings import selectors as booking_selectors
from apps.catalog import selectors as catalog_selectors
from apps.hosts import selectors as host_selectors
from apps.trips import selectors as trip_selectors

MIN_CHARS = 2
DEFAULT_LIMIT = 12
MAX_LIMIT = 20
# Longest text searched, so a pasted paragraph cannot make the queries expensive.
MAX_CHARS = 100


def _hosts(q: str, limit: int) -> list[dict]:
    """Host accounts by organisation name or the solo host's name, email or phone."""
    rows = host_selectors.admin_host_accounts().filter(
        Q(organization__display_name__icontains=q) | Q(organization__legal_name__icontains=q)
        | Q(user__first_name_latin__icontains=q) | Q(user__last_name_latin__icontains=q)
        | Q(user__full_name_ar__icontains=q) | Q(user__email__icontains=q) | Q(user__phone_e164__icontains=q)
    )[:limit]
    return [{"type": "host", "id": str(a.id), "title": a.display_name,
             "subtitle": f"{a.host_type} - {a.verification_status}", "href": f"/hosts/{a.id}"} for a in rows]


def _listings(q: str, limit: int) -> list[dict]:
    """Listings by reference or title."""
    rows = catalog_selectors.admin_listings().filter(Q(reference__iexact=q) | Q(title__icontains=q))[:limit]
    return [{"type": "listing", "id": str(x.id), "title": x.title, "subtitle": f"{x.reference} - {x.status}",
             "href": f"/listings/{x.id}"} for x in rows]


def _trips(q: str, limit: int) -> list[dict]:
    """Trips by reference or title."""
    rows = trip_selectors.admin_trips().filter(Q(reference__iexact=q) | Q(title__icontains=q))[:limit]
    return [{"type": "trip", "id": str(x.id), "title": x.title, "subtitle": f"{x.reference} - {x.status}",
             "href": f"/trips/{x.id}"} for x in rows]


def _bookings(q: str, limit: int) -> list[dict]:
    """Bookings by reference (exact or partial)."""
    rows = booking_selectors.admin_bookings().filter(reference__icontains=q)[:limit]
    return [{"type": "booking", "id": str(b.id), "title": b.reference, "subtitle": b.status,
             "href": f"/bookings/{b.reference}"} for b in rows]


def _users(q: str, limit: int) -> list[dict]:
    """Users by name, email or phone (not deleted)."""
    # TODO(accounts): read through an accounts admin selector when one exists.
    rows = get_user_model().objects.filter(deleted_at__isnull=True).filter(
        Q(email__icontains=q) | Q(phone_e164__icontains=q) | Q(first_name_latin__icontains=q)
        | Q(last_name_latin__icontains=q) | Q(full_name_ar__icontains=q)
    ).order_by("-date_joined")[:limit]
    return [{"type": "user", "id": str(u.id), "title": u.display_name, "subtitle": u.email or u.phone_e164,
             "href": f"/users/{u.id}"} for u in rows]


def search(q: str, limit: int = DEFAULT_LIMIT) -> list[dict]:
    """
    Up to ``limit`` hits across kinds, mixed so every kind with a match shows up.

    Order: bookings and listings or trips whose reference matches exactly,
    then the remaining hits round-robin by kind (hosts, listings, trips,
    bookings, users).
    """
    q = q.strip()[:MAX_CHARS]
    groups = [_hosts(q, limit), _listings(q, limit), _trips(q, limit), _bookings(q, limit), _users(q, limit)]
    exact = [h for g in groups for h in g if h["type"] in ("listing", "trip", "booking")
             and (h["title"].upper() == q.upper() or (h.get("subtitle") or "").upper().startswith(q.upper() + " "))]
    hits, seen = list(exact), {(h["type"], h["id"]) for h in exact}
    index = 0
    while len(hits) < limit and any(index < len(g) for g in groups):
        for g in groups:
            if index < len(g) and (g[index]["type"], g[index]["id"]) not in seen and len(hits) < limit:
                hits.append(g[index])
                seen.add((g[index]["type"], g[index]["id"]))
        index += 1
    return hits[:limit]
