"""
Favourite hooks for agency trips (ACC-09).

Registered from ``TripsConfig.ready`` through
``apps.accounts.extensions.register_favorite_target``: saving an unknown trip
answers 404, and ``GET /me/favorites`` shows the trip card.
"""

from .models import Trip
from .selectors import public_trips
from .serializers import TripCardSerializer


def trip_exists(target_id) -> bool:
    """A trip that is not deleted may be saved."""
    return Trip.objects.alive().filter(pk=target_id).exists()


def trip_cards(target_ids, request) -> dict:
    """``{id: (card, is_available)}``: the public card when visible now, else a title-only card marked unavailable."""
    public = {row.pk: row for row in public_trips().filter(pk__in=target_ids)}
    out = {}
    for row in Trip.objects.alive().filter(pk__in=target_ids).only("id", "title"):
        if row.pk in public:
            out[row.pk] = (TripCardSerializer(public[row.pk], context={"request": request}).data, True)
        else:
            out[row.pk] = ({"id": str(row.pk), "title": row.title}, False)
    return out


def connect() -> None:
    """Register the trip hooks with accounts."""
    from apps.accounts.extensions import register_favorite_target

    register_favorite_target("trip", exists=trip_exists, cards=trip_cards)
