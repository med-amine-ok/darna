"""
Every write and business rule of the catalog app.

Main rules implemented here:
- DEC-014 / BR-HST-05: what each host type may publish (:func:`check_host_offer`);
- BR-LST-01: one vertical per listing, hotels and hostels need a room type to
  be submitted;
- BR-LST-02 (first version): editing a reviewed field of a published listing
  sends it back to review;
- BR-LST-03: state machine, via ``workflow.py``;
- BR-LST-05: an experience has exactly one experience type;
- BR-SRC-03: the public point is the exact point moved by up to about 500 m.
"""

import math
import secrets

from django.db import IntegrityError, transaction
from django.db.models import Min

from apps.core.errors import DomainError, ForbiddenError
from apps.core.ids import human_reference

from . import workflow
from .models import (
    INVENTORY_KIND_BY_VERTICAL,
    Amenity,
    CancellationPolicy,
    Category,
    ExperienceDetail,
    InventoryKind,
    Listing,
    ListingAmenity,
    ListingPhoto,
    PropertyService,
    PropertyType,
    RoomType,
    VehicleDetail,
    Vertical,
)
from .states import HOST, ListingStatus

# Largest distance between the exact and the public point, in metres (BR-SRC-03).
PUBLIC_OFFSET_MAX_M = 500
# Smallest distance, so the public point never lands on the house itself.
PUBLIC_OFFSET_MIN_M = 100
# Metres in one degree of latitude (close enough for a 500 m offset).
METRES_PER_DEGREE = 111_320

# Fields a host may set on a listing through the API (everything else is
# managed by the platform: status, ratings, references, public point...).
EDITABLE_FIELDS = (
    "title", "description", "source_language", "category", "property_type", "commune", "address_line",
    "latitude", "longitude", "capacity_guests", "bedrooms", "beds", "bathrooms", "surface_m2",
    "base_price_minor", "cleaning_fee_minor", "weekly_discount_bp", "monthly_discount_bp",
    "min_nights", "max_nights", "advance_notice_days", "available_from", "available_until",
    "check_in_time", "check_out_time", "approval_mode", "cancellation_policy", "house_rules",
)


# ---------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------
def check_host_offer(host_account, vertical: str) -> None:
    """
    Refuse a vertical the host type may not publish (DEC-014, BR-HST-05).

    individual: home, vehicle; agency: experience; hotel: hotel; hostel:
    hostel. The one place this rule is checked for listings: called when a
    listing is created and when its vertical changes. Raises 403
    ``host_offer_not_allowed``.
    """
    if not host_account.may_offer(vertical):
        raise ForbiddenError(
            f"A {host_account.host_type} host account cannot publish a {vertical} listing.",
            code="host_offer_not_allowed",
        )


def check_experience_type(vertical: str, experience_type: str | None) -> None:
    """
    An experience needs exactly one experience type, other verticals none (BR-LST-05, DEC-015).

    Codes: ``experience_type_required`` and ``experience_type_not_allowed``.
    The database has the same check; this gives a clear message first.
    """
    if vertical == Vertical.EXPERIENCE and not experience_type:
        raise DomainError(
            "Choose the type of experience.", code="experience_type_required",
            errors={"experience_type": ["Required for an experience."]},
        )
    if vertical != Vertical.EXPERIENCE and experience_type:
        raise DomainError(
            "Only experiences have an experience type.", code="experience_type_not_allowed",
            errors={"experience_type": ["Only for experiences."]},
        )


def public_point(latitude, longitude) -> tuple[float, float]:
    """
    The public point of a listing: the exact point moved in a random
    direction by 100 to 500 metres (BR-SRC-03).

    Called once when the exact point is set (and again only if the host
    moves the listing), so the public point stays fixed and repeated visits
    cannot average the noise away.
    """
    lat, lng = float(latitude), float(longitude)
    distance = PUBLIC_OFFSET_MIN_M + secrets.randbelow(PUBLIC_OFFSET_MAX_M - PUBLIC_OFFSET_MIN_M + 1)
    bearing = secrets.randbelow(360_000) / 1000 * math.pi / 180  # random direction in radians
    d_lat = distance * math.cos(bearing) / METRES_PER_DEGREE
    # A degree of longitude gets shorter towards the poles.
    d_lng = distance * math.sin(bearing) / (METRES_PER_DEGREE * max(math.cos(math.radians(lat)), 0.01))
    return round(lat + d_lat, 6), round(lng + d_lng, 6)


def current_policy(code: str) -> CancellationPolicy:
    """The current version of the policy ``code`` (flexible, moderate, strict) or 400 ``invalid_policy``."""
    policy = CancellationPolicy.objects.filter(code=code, is_current=True).first()
    if policy is None:
        raise DomainError("Unknown cancellation policy.", code="invalid_policy", errors={"cancellation_policy": [code]})
    return policy


def _check_taxonomy(listing: Listing) -> None:
    """Category and property type must belong to the listing's vertical and be active (BR-LST-04)."""
    for field in ("category", "property_type"):
        row = getattr(listing, field)
        if row is not None and (row.vertical != listing.vertical or not row.is_active):
            raise DomainError(f"This {field.replace('_', ' ')} does not fit the listing.", code="invalid_taxonomy",
                              errors={field: ["Not available for this vertical."]})


def _check_values(listing: Listing) -> None:
    """Value rules that would otherwise surface as database errors (dbml checks), with clear field errors."""
    errors = {}
    if listing.min_nights > listing.max_nights:
        errors["min_nights"] = ["Must not exceed max_nights."]
    for field in ("weekly_discount_bp", "monthly_discount_bp"):
        if not 0 <= getattr(listing, field) <= 9000:
            errors[field] = ["Between 0 and 9000 basis points."]
    if listing.capacity_guests < 1:
        errors["capacity_guests"] = ["At least 1."]
    if listing.available_from and listing.available_until and listing.available_until < listing.available_from:
        errors["available_until"] = ["Must be after available_from."]
    if errors:
        raise DomainError("Invalid data.", code="invalid", errors=errors)


def _set_amenities(listing: Listing, slugs: list[str]) -> None:
    """Replace the amenities of a listing; every slug must exist, be active and apply to the vertical."""
    amenities = list(Amenity.objects.filter(slug__in=set(slugs), is_active=True))
    found = {a.slug: a for a in amenities}
    bad = [s for s in slugs if s not in found or listing.vertical not in (found[s].applies_to or [])]
    if bad:
        raise DomainError("Unknown amenity for this vertical.", code="invalid_amenity", errors={"amenities": bad})
    ListingAmenity.objects.filter(listing=listing).delete()
    ListingAmenity.objects.bulk_create([ListingAmenity(listing=listing, amenity=a) for a in amenities])


def _set_detail(listing: Listing, vehicle_detail: dict | None, experience_detail: dict | None) -> None:
    """Create or update the one-to-one detail row matching the vertical (vehicle or experience)."""
    if vehicle_detail is not None:
        if listing.vertical != Vertical.VEHICLE:
            raise DomainError("Only vehicles have vehicle details.", code="invalid", errors={"vehicle_detail": ["Not a vehicle."]})
        VehicleDetail.objects.update_or_create(listing=listing, defaults=vehicle_detail)
    if experience_detail is not None:
        if listing.vertical != Vertical.EXPERIENCE:
            raise DomainError("Only experiences have experience details.", code="invalid",
                              errors={"experience_detail": ["Not an experience."]})
        ExperienceDetail.objects.update_or_create(listing=listing, defaults=experience_detail)


def _new_reference() -> str:
    """A listing reference ``LST-XXXXXX`` not used yet."""
    for _ in range(10):
        ref = human_reference("LST")
        if not Listing.objects.filter(reference=ref).exists():
            return ref
    raise RuntimeError("Could not generate a unique listing reference.")


def send_back_to_review_if_live(listing: Listing) -> None:
    """
    First version of BR-LST-02: a reviewed change on a published (or paused)
    listing sends the whole listing back to ``pending_review``.

    The full mechanism is the next step: a ``listing_revision`` row holding
    the proposed values, reviewed by an admin while the published version
    stays visible. Until then the listing is hidden during the new review.
    Price, calendar and booking-rule edits never call this (they stay live).
    """
    if listing.status in (ListingStatus.PUBLISHED, ListingStatus.PAUSED):
        workflow.change_status(listing, ListingStatus.PENDING_REVIEW, actor_kind=HOST)


def sync_room_pool_summary(listing: Listing) -> None:
    """
    Keep a hotel or hostel's ``base_price_minor`` (lowest active room price)
    and ``capacity_guests`` (sum of units x capacity) in step with its room
    types, so search filters and sorts every vertical on the same columns.
    """
    if listing.inventory_kind != InventoryKind.ROOM_POOL:
        return
    rooms = RoomType.objects.alive().filter(listing=listing, is_active=True)
    summary = rooms.aggregate(low=Min("base_price_minor"))
    capacity = sum(r.unit_count * r.capacity_per_unit for r in rooms)
    listing.base_price_minor = summary["low"] or 0
    listing.capacity_guests = max(capacity, 1)
    listing.save(update_fields=["base_price_minor", "capacity_guests", "updated_at"])


# ---------------------------------------------------------------------------
# Listings
# ---------------------------------------------------------------------------
@transaction.atomic
def create_listing(host_account, data: dict) -> Listing:
    """
    Create a draft listing for ``host_account``.

    ``data`` holds model fields (see ``EDITABLE_FIELDS``) plus ``vertical``,
    ``experience_type``, optional ``amenities`` (slugs),
    ``vehicle_detail`` and ``experience_detail``. Checks the host offer rule
    (DEC-014) and the experience type rule (BR-LST-05); derives
    ``inventory_kind`` from the vertical; fixes the public point (BR-SRC-03).
    The listing starts in ``draft`` (submit sends it to review, DEC-003).
    """
    data = dict(data)
    vertical = data.pop("vertical")
    check_host_offer(host_account, vertical)
    experience_type = data.pop("experience_type", None)
    check_experience_type(vertical, experience_type)
    amenities = data.pop("amenities", None)
    vehicle_detail = data.pop("vehicle_detail", None)
    experience_detail = data.pop("experience_detail", None)
    if "cancellation_policy" not in data:
        # Sensible default so a draft is complete sooner; the host can change it.
        data["cancellation_policy"] = CancellationPolicy.objects.filter(code="moderate", is_current=True).first()

    listing = Listing(
        reference=_new_reference(), host_account=host_account, vertical=vertical,
        inventory_kind=INVENTORY_KIND_BY_VERTICAL[vertical], experience_type=experience_type,
        **{k: v for k, v in data.items() if k in EDITABLE_FIELDS},
    )
    _check_taxonomy(listing)
    _check_values(listing)
    if listing.latitude is not None and listing.longitude is not None:
        listing.public_latitude, listing.public_longitude = public_point(listing.latitude, listing.longitude)
    listing.save()
    if amenities is not None:
        _set_amenities(listing, amenities)
    _set_detail(listing, vehicle_detail, experience_detail)
    return listing


@transaction.atomic
def update_listing(listing: Listing, data: dict) -> Listing:
    """
    Apply a host's partial update to a listing.

    - A new ``vertical`` is checked again with the host offer rule (DEC-014)
      and recomputes ``inventory_kind``; it is only allowed before the first
      publication (a live listing changing kind would break its bookings).
    - A new exact point recomputes the public point (BR-SRC-03).
    - Changing a reviewed field (``Listing.REVIEWED_FIELDS``, vertical) of a
      published or paused listing sends it back to review (BR-LST-02 first
      version, see :func:`send_back_to_review_if_live`). Price, rules and
      calendar edits stay live.
    """
    data = dict(data)
    reviewed_change = False
    if "vertical" in data and data["vertical"] != listing.vertical:
        if listing.published_at is not None:
            raise DomainError("The vertical of a published listing cannot change.", code="vertical_locked")
        check_host_offer(listing.host_account, data["vertical"])
        listing.vertical = data["vertical"]
        listing.inventory_kind = INVENTORY_KIND_BY_VERTICAL[listing.vertical]
        if listing.vertical != Vertical.EXPERIENCE and "experience_type" not in data:
            listing.experience_type = None
        reviewed_change = True
    data.pop("vertical", None)
    if "experience_type" in data:
        if data["experience_type"] != listing.experience_type:
            reviewed_change = True
        listing.experience_type = data.pop("experience_type")
    check_experience_type(listing.vertical, listing.experience_type)

    amenities = data.pop("amenities", None)
    vehicle_detail = data.pop("vehicle_detail", None)
    experience_detail = data.pop("experience_detail", None)
    for field, value in data.items():
        if field not in EDITABLE_FIELDS:
            continue
        if field in Listing.REVIEWED_FIELDS and getattr(listing, field) != value:
            reviewed_change = True
        setattr(listing, field, value)
    if "latitude" in data or "longitude" in data:
        if listing.latitude is not None and listing.longitude is not None:
            listing.public_latitude, listing.public_longitude = public_point(listing.latitude, listing.longitude)
        else:
            listing.public_latitude = listing.public_longitude = None
    _check_taxonomy(listing)
    _check_values(listing)
    listing.save()
    if amenities is not None:
        _set_amenities(listing, amenities)
    _set_detail(listing, vehicle_detail, experience_detail)
    sync_room_pool_summary(listing)
    if reviewed_change:
        send_back_to_review_if_live(listing)
    return listing


def submission_problems(listing: Listing) -> dict[str, list[str]]:
    """
    What is missing before a listing can be sent to review (empty dict = ready).

    Every listing needs a title, a commune (BR-SRC-02), an exact point and a
    cancellation policy. Hotels and hostels need at least one active room
    type (BR-LST-01); other verticals need a price above zero; experiences
    need their type (BR-LST-05).
    """
    problems: dict[str, list[str]] = {}
    if not listing.title.strip():
        problems["title"] = ["Required."]
    if listing.commune_id is None:
        problems["commune"] = ["Required."]
    if listing.latitude is None or listing.longitude is None:
        problems["location"] = ["Place the listing on the map."]
    if listing.cancellation_policy_id is None:
        problems["cancellation_policy"] = ["Required."]
    if listing.inventory_kind == InventoryKind.ROOM_POOL:
        if not RoomType.objects.alive().filter(listing=listing, is_active=True).exists():
            problems["room_types"] = ["Add at least one room type."]
    elif listing.base_price_minor <= 0:
        problems["base_price_minor"] = ["Set a price."]
    if listing.vertical == Vertical.EXPERIENCE and not listing.experience_type:
        problems["experience_type"] = ["Required."]
    return problems


@transaction.atomic
def submit_listing(listing: Listing) -> Listing:
    """
    Send a listing to staff review (DEC-003, BR-LST-02).

    Allowed from ``draft`` and ``changes_requested``. Refused with 400
    ``listing_incomplete`` (and the list of problems) when something
    required is missing, for example a hotel without room type (BR-LST-01).
    """
    problems = submission_problems(listing)
    if problems:
        raise DomainError("Complete the listing before submitting.", code="listing_incomplete", errors=problems)
    workflow.change_status(listing, ListingStatus.PENDING_REVIEW, actor_kind=HOST)
    return listing


def host_move(listing: Listing, action: str) -> Listing:
    """
    Host status buttons: ``pause``, ``resume``, ``archive``, ``withdraw``, ``reopen`` (BR-LST-03).

    resume = paused -> published without a new review; withdraw = pending
    review -> draft; reopen = rejected or archived -> draft. The state
    machine refuses any other move with 409 ``invalid_status_change``.
    """
    targets = {
        "pause": ListingStatus.PAUSED,
        "resume": ListingStatus.PUBLISHED,
        "archive": ListingStatus.ARCHIVED,
        "withdraw": ListingStatus.DRAFT,
        "reopen": ListingStatus.DRAFT,
    }
    workflow.change_status(listing, targets[action], actor_kind=HOST)
    return listing


def delete_listing(listing: Listing) -> None:
    """Host soft delete (table 4a). An admin can restore it with the previous status."""
    workflow.soft_delete(listing)


# ---------------------------------------------------------------------------
# Room types
# ---------------------------------------------------------------------------
def _require_room_pool(listing: Listing) -> None:
    """Room types exist only on hotels and hostels (BR-LST-01)."""
    if listing.inventory_kind != InventoryKind.ROOM_POOL:
        raise DomainError("Only hotels and hostels have room types.", code="room_types_not_allowed")


@transaction.atomic
def create_room_type(listing: Listing, data: dict) -> RoomType:
    """
    Add a room type to a hotel or hostel.

    Updates the listing summary (lowest price, capacity) and, on a live
    listing, sends it back to review (BR-LST-02 first version).
    """
    _require_room_pool(listing)
    room_type = RoomType.objects.create(listing=listing, **data)
    sync_room_pool_summary(listing)
    send_back_to_review_if_live(listing)
    return room_type


# Room type fields whose change needs a review on a live listing (BR-LST-02).
ROOM_TYPE_REVIEWED_FIELDS = ("name", "description", "booking_unit", "unit_count", "capacity_per_unit", "beds_description")


@transaction.atomic
def update_room_type(room_type: RoomType, data: dict) -> RoomType:
    """
    Change a room type. Price changes stay live; descriptive or capacity
    changes on a live listing send it back to review (BR-LST-02 first version).

    Lowering ``unit_count`` does not touch nights already created in the
    inventory (their ``total`` is changed through the room type calendar,
    which refuses to go below held + booked).
    """
    reviewed = any(f in data and getattr(room_type, f) != data[f] for f in ROOM_TYPE_REVIEWED_FIELDS)
    for field, value in data.items():
        setattr(room_type, field, value)
    room_type.save()
    sync_room_pool_summary(room_type.listing)
    if reviewed:
        send_back_to_review_if_live(room_type.listing)
    return room_type


@transaction.atomic
def delete_room_type(room_type: RoomType) -> None:
    """Soft-delete a room type (bookings keep pointing to it) and refresh the listing summary."""
    room_type.is_active = False
    room_type.soft_delete(save=False)
    room_type.save(update_fields=["is_active", "deleted_at"])
    sync_room_pool_summary(room_type.listing)
    send_back_to_review_if_live(room_type.listing)


# ---------------------------------------------------------------------------
# Photos
# ---------------------------------------------------------------------------
@transaction.atomic
def add_photo(listing: Listing, *, url: str, caption: str = "", is_cover: bool = False, room_type: RoomType | None = None) -> ListingPhoto:
    """
    Add a photo at the end of the listing's gallery (or to one of its room types).

    The first listing photo becomes the cover. A new cover replaces the old
    one (one cover per listing). Changes the photos of a live listing, so it
    goes back to review (BR-LST-02 first version).
    """
    if room_type is not None and room_type.listing_id != listing.id:
        raise DomainError("This room type belongs to another listing.", code="invalid", errors={"room_type_id": ["Unknown."]})
    last = listing.photos.order_by("-sort_order").first()
    first_listing_photo = not listing.photos.filter(room_type__isnull=True).exists() and room_type is None
    if is_cover or first_listing_photo:
        listing.photos.filter(is_cover=True).update(is_cover=False)
        is_cover = True
    photo = ListingPhoto.objects.create(
        listing=listing, room_type=room_type, url=url, caption=caption, is_cover=is_cover,
        sort_order=(last.sort_order + 1) if last else 0,
    )
    send_back_to_review_if_live(listing)
    return photo


@transaction.atomic
def update_photo(photo: ListingPhoto, *, caption: str | None = None, is_cover: bool | None = None) -> ListingPhoto:
    """Change the caption of a photo or make it the cover (only one cover per listing)."""
    if caption is not None:
        photo.caption = caption
    if is_cover:
        ListingPhoto.objects.filter(listing_id=photo.listing_id, is_cover=True).exclude(pk=photo.pk).update(is_cover=False)
        photo.is_cover = True
    photo.save()
    return photo


@transaction.atomic
def remove_photo(photo: ListingPhoto) -> None:
    """Delete a photo; if it was the cover, the next photo becomes the cover. Live listing goes back to review."""
    listing = photo.listing
    was_cover = photo.is_cover
    photo.delete()
    if was_cover:
        nxt = listing.photos.filter(room_type__isnull=True).order_by("sort_order").first()
        if nxt:
            nxt.is_cover = True
            nxt.save(update_fields=["is_cover"])
    send_back_to_review_if_live(listing)


@transaction.atomic
def reorder_photos(listing: Listing, photo_ids: list) -> None:
    """
    Put the listing photos in the given order. ``photo_ids`` must contain
    exactly the ids of the listing's photos (code ``invalid_photo_order``).
    """
    photos = {str(p.id): p for p in listing.photos.all()}
    wanted = [str(i) for i in photo_ids]
    if sorted(wanted) != sorted(photos):
        raise DomainError("Send every photo id of the listing exactly once.", code="invalid_photo_order")
    for position, photo_id in enumerate(wanted):
        photo = photos[photo_id]
        photo.sort_order = position
        photo.save(update_fields=["sort_order"])


# ---------------------------------------------------------------------------
# Property services (DEC-017)
# ---------------------------------------------------------------------------
def create_service(listing: Listing, data: dict) -> PropertyService:
    """Add a service (restaurant, spa...) to a hotel or hostel, typed by hand (``source = manual``)."""
    if listing.inventory_kind != InventoryKind.ROOM_POOL:
        raise DomainError("Only hotels and hostels list services.", code="services_not_allowed")
    return PropertyService.objects.create(listing=listing, source="manual", **data)


def update_service(service: PropertyService, data: dict) -> PropertyService:
    """
    Change a service. Imported services are read-only while their
    connection is active (BR-HST-06): code ``managed_by_integration``.
    """
    if service.source == "integration":
        raise DomainError("This service is managed by the hotel system.", code="managed_by_integration")
    for field, value in data.items():
        setattr(service, field, value)
    service.save()
    return service


def delete_service(service: PropertyService) -> None:
    """Remove a manual service (imported ones are read-only, BR-HST-06)."""
    if service.source == "integration":
        raise DomainError("This service is managed by the hotel system.", code="managed_by_integration")
    service.delete()


# ---------------------------------------------------------------------------
# Reference data seed
# ---------------------------------------------------------------------------
@transaction.atomic
def seed_reference_data() -> dict[str, int]:
    """
    Create the reference rows the product needs, without duplicating them.

    Safe to run any number of times (idempotent): existing rows, looked up by
    their natural key, are left as they are. Returns how many rows were
    created per table. Used by ``manage.py seed_catalog`` and by tests.
    """
    from .seed_data import AMENITIES, CATEGORIES, POLICIES, PROPERTY_TYPES

    created = {"cancellation_policies": 0, "amenities": 0, "property_types": 0, "categories": 0}
    for code, names, windows in POLICIES:
        # Version 1 is created once; later versions are made by an admin tool.
        if not CancellationPolicy.objects.filter(code=code).exists():
            try:
                with transaction.atomic():
                    CancellationPolicy.objects.create(
                        code=code, version=1, name_en=names[0], name_fr=names[1], name_ar=names[2],
                        windows=windows, is_current=True,
                    )
                created["cancellation_policies"] += 1
            except IntegrityError:  # created by a parallel run
                pass
    for slug, group, names, applies_to in AMENITIES:
        _, new = Amenity.objects.get_or_create(
            slug=slug,
            defaults={"group_code": group, "name_en": names[0], "name_fr": names[1], "name_ar": names[2],
                      "applies_to": applies_to},
        )
        created["amenities"] += int(new)
    for model, rows, key in ((PropertyType, PROPERTY_TYPES, "property_types"), (Category, CATEGORIES, "categories")):
        for vertical, slug, names in rows:
            _, new = model.objects.get_or_create(
                vertical=vertical, slug=slug,
                defaults={"name_en": names[0], "name_fr": names[1], "name_ar": names[2]},
            )
            created[key] += int(new)
    return created
