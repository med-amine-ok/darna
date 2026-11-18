"""
Favourite hooks for listings (ACC-09).

``accounts`` (layer L2) cannot import ``catalog``, so catalog registers these
functions from ``CatalogConfig.ready`` through
``apps.accounts.extensions.register_favorite_target``: saving an unknown
listing answers 404, and ``GET /me/favorites`` shows the listing card.
"""

from .models import Listing
from .selectors import public_listings
from .serializers import ListingCardSerializer


def listing_exists(target_id) -> bool:
    """A listing that is not deleted may be saved (a paused one comes back later)."""
    return Listing.objects.alive().filter(pk=target_id).exists()


def listing_cards(target_ids, request) -> dict:
    """``{id: (card, is_available)}``: the public card when bookable now, else a title-only card marked unavailable."""
    public = {row.pk: row for row in public_listings().filter(pk__in=target_ids)}
    out = {}
    for row in Listing.objects.alive().filter(pk__in=target_ids).only("id", "title"):
        if row.pk in public:
            out[row.pk] = (ListingCardSerializer(public[row.pk], context={"request": request}).data, True)
        else:
            out[row.pk] = ({"id": str(row.pk), "title": row.title}, False)
    return out


def connect() -> None:
    """Register the listing hooks with accounts."""
    from apps.accounts.extensions import register_favorite_target

    register_favorite_target("listing", exists=listing_exists, cards=listing_cards)
