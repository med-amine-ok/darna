"""Read-only queries of the geo app (BR-SRC-02). Nothing here writes."""

from django.db.models import Q, QuerySet

from .models import Commune, Wilaya

# Hard cap of the commune autocomplete, whatever the client asks for.
AUTOCOMPLETE_MAX = 20
# Fewer characters than this would match half of the country.
AUTOCOMPLETE_MIN_CHARS = 2


def list_wilayas() -> QuerySet[Wilaya]:
    """Every wilaya, ordered by its official code."""
    return Wilaya.objects.all()


def get_wilaya(code: int) -> Wilaya | None:
    """The wilaya with this code, or ``None``."""
    return Wilaya.objects.filter(code=code).first()


def communes_of_wilaya(wilaya: Wilaya) -> QuerySet[Commune]:
    """Communes of one wilaya, ordered by French name."""
    return Commune.objects.filter(wilaya=wilaya).select_related("wilaya").order_by("name_fr")


def search_communes(query: str, *, wilaya_code: int | None = None, limit: int = 10) -> list[Commune]:
    """
    Autocomplete: communes whose French, Arabic or English name contains ``query``.

    Names that start with the text come first, so typing "Or" shows "Oran"
    before "Bordj". A query shorter than two characters returns nothing. At
    most ``AUTOCOMPLETE_MAX`` rows are returned.
    """
    query = (query or "").strip()
    if len(query) < AUTOCOMPLETE_MIN_CHARS:
        return []
    limit = max(1, min(limit, AUTOCOMPLETE_MAX))

    matches = Commune.objects.select_related("wilaya").filter(
        Q(name_fr__icontains=query) | Q(name_ar__icontains=query) | Q(name_en__icontains=query)
    )
    if wilaya_code is not None:
        matches = matches.filter(wilaya_id=wilaya_code)

    prefix = Q(name_fr__istartswith=query) | Q(name_ar__istartswith=query) | Q(name_en__istartswith=query)
    found = list(matches.filter(prefix).order_by("name_fr", "wilaya_id")[:limit])
    if len(found) < limit:
        # Fill what is left with names that only contain the text.
        found += list(matches.exclude(prefix).order_by("name_fr", "wilaya_id")[: limit - len(found)])
    return found
