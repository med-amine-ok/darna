"""
The fixed lists of experience types and trip types (DEC-015, BR-LST-05).

This file is the single source of truth on the server. It mirrors
``frontend/lib/catalog-types.ts`` (same ids, same order, same labels). The
ids are stored in the database (``Listing.experience_type``,
``Trip.trip_type``); the labels are served to both apps by
``GET /reference/experience-types`` and ``GET /reference/trip-types``.

Changing a list is a product change: edit it here, then in the two apps.
"""

from django.db import models


class ExperienceType(models.TextChoices):
    """The 8 kinds of experience listing. Exactly one per experience (BR-LST-05)."""

    EXCURSION = "excursion", "Excursions"
    GUIDED_TOUR = "guided_tour", "Guided tours"
    NATURE_ADVENTURE = "nature_adventure", "Nature & adventure"
    DESERT = "desert", "Desert & bivouac"
    SPORT = "sport", "Sports activities"
    CULTURE_WORKSHOP = "culture_workshop", "Workshops & culture"
    GASTRONOMY = "gastronomy", "Food & gastronomy"
    WELLNESS = "wellness", "Wellness & hammam"


class TripType(models.TextChoices):
    """The 8 kinds of agency trip. Exactly one per trip (BR-LST-05)."""

    GROUP_TOUR = "group_tour", "Group tour"
    PRIVATE_TRIP = "private_trip", "Private trip"
    ADVENTURE = "adventure", "Adventure"
    DESERT_EXPEDITION = "desert_expedition", "Saharan expedition"
    CULTURAL = "cultural", "Cultural & heritage"
    HIKING = "hiking", "Hiking & trekking"
    RELAXATION = "relaxation", "Relaxation & seaside"
    RELIGIOUS = "religious", "Religious & spiritual"


# Labels in the three languages, keyed by id. Order = display order.
EXPERIENCE_TYPE_LABELS: dict[str, dict[str, str]] = {
    "excursion": {"en": "Excursions", "fr": "Excursions", "ar": "رحلات قصيرة"},
    "guided_tour": {"en": "Guided tours", "fr": "Visites guidées", "ar": "جولات بمرشد"},
    "nature_adventure": {"en": "Nature & adventure", "fr": "Nature & aventure", "ar": "طبيعة ومغامرة"},
    "desert": {"en": "Desert & bivouac", "fr": "Désert & bivouac", "ar": "الصحراء والمبيت"},
    "sport": {"en": "Sports activities", "fr": "Activités sportives", "ar": "أنشطة رياضية"},
    "culture_workshop": {"en": "Workshops & culture", "fr": "Ateliers & culture", "ar": "ورشات وثقافة"},
    "gastronomy": {"en": "Food & gastronomy", "fr": "Gastronomie", "ar": "فن الطبخ"},
    "wellness": {"en": "Wellness & hammam", "fr": "Bien-être & hammam", "ar": "الاسترخاء والحمّام"},
}

TRIP_TYPE_LABELS: dict[str, dict[str, str]] = {
    "group_tour": {"en": "Group tour", "fr": "Circuit en groupe", "ar": "جولة جماعية"},
    "private_trip": {"en": "Private trip", "fr": "Séjour privé", "ar": "رحلة خاصة"},
    "adventure": {"en": "Adventure", "fr": "Aventure", "ar": "مغامرة"},
    "desert_expedition": {"en": "Saharan expedition", "fr": "Expédition saharienne", "ar": "رحلة صحراوية"},
    "cultural": {"en": "Cultural & heritage", "fr": "Culturel & patrimoine", "ar": "ثقافة وتراث"},
    "hiking": {"en": "Hiking & trekking", "fr": "Randonnée & trek", "ar": "مشي وتسلق"},
    "relaxation": {"en": "Relaxation & seaside", "fr": "Séjour détente", "ar": "استجمام وبحر"},
    "religious": {"en": "Religious & spiritual", "fr": "Séjour religieux", "ar": "رحلة دينية وروحية"},
}

# Plain id lists, in display order (handy for validation and tests).
EXPERIENCE_TYPES: list[str] = list(EXPERIENCE_TYPE_LABELS)
TRIP_TYPES: list[str] = list(TRIP_TYPE_LABELS)


def type_list(labels: dict[str, dict[str, str]]) -> list[dict]:
    """
    Turn a label table into the API shape: ``[{"id", "label_en", "label_fr", "label_ar"}]``.

    Used by the two ``/reference/*-types`` endpoints so both apps read the
    same list (BR-LST-05).
    """
    return [
        {"id": type_id, "label_en": names["en"], "label_fr": names["fr"], "label_ar": names["ar"]}
        for type_id, names in labels.items()
    ]
