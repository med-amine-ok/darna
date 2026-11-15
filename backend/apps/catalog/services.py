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
- BR-SRC-03: the public point is the exact point moved by up to about 500 m;
- BR-LST-04: taxonomy rows (amenities, categories, property types) are
  deleted only when never used, otherwise deactivated; every admin change
  is audited (BR-STF-02).
"""

import math
import secrets
from collections.abc import Callable

from django.db import IntegrityError, transaction
from django.db.models import Min, Q
from django.utils import timezone

from apps.audit import services as audit
from apps.core.errors import ConflictError, DomainError, ForbiddenError, NotFoundError
from apps.core.ids import human_reference

from . import workflow
from .models import (
    INVENTORY_KIND_BY_VERTICAL,
    Amenity,
    CancellationPolicy,
    Category,
    ExperienceDetail,
    FeaturedPlacement,
    InventoryKind,
    Listing,
    ListingAmenity,
    ListingPhoto,
    PropertyService,
    PropertyType,
    RoomType,
    RoomTypeAmenity,
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
        raise DomainError("Complete the listing before submitting.", code="listing_incomplete", status_code=422,
                          errors=problems)
    workflow.change_status(listing, ListingStatus.PENDING_REVIEW, actor_kind=HOST)
    return listing


@transaction.atomic
def change_host_listing_status(listing: Listing, target: str) -> Listing:
    """
    ``POST /host/listings/{id}/status`` (``HostStatusChange``, BR-LST-03, table 4a).

    ``pending_review`` submits (422 ``listing_incomplete`` when something is
    missing, BR-LST-01); ``draft`` withdraws or reopens; ``paused``,
    ``archived``; ``published`` resumes a paused listing without review.
    Other moves: 409 ``invalid_transition``. The row is locked first so two
    clicks cannot cross.
    """
    locked = Listing.objects.select_for_update().get(pk=listing.pk)
    workflow.host_set_status(locked, target, submit=submit_listing)
    listing.refresh_from_db()
    return listing


def delete_listing(listing: Listing) -> None:
    """Host soft delete (table 4a). An admin can restore it with the previous status."""
    workflow.soft_delete(listing)


def admin_change_listing_status(listing: Listing, target: str, *, actor, reason: str | None = None,
                                reason_code: str | None = None) -> Listing:
    """``POST /admin/listings/{id}/status``: any staff move of table 4a, audited (BR-LST-03, BR-STF-02)."""
    workflow.admin_set_status(listing, target, actor=actor, reason=reason, reason_code=reason_code)
    return listing


def admin_delete_listing(listing: Listing, *, actor) -> None:
    """``DELETE /admin/listings/{id}``: soft delete by staff, previous state kept for restore, audited (BR-STF-02)."""
    workflow.admin_set_status(listing, ListingStatus.DELETED, actor=actor)


# ---------------------------------------------------------------------------
# Featured placements (LST-09)
# ---------------------------------------------------------------------------
def active_placements(listing: Listing):
    """Placements of ``listing`` live now (started, not ended)."""
    now = timezone.now()
    return FeaturedPlacement.objects.filter(listing=listing, starts_at__lte=now).filter(
        Q(ends_at__isnull=True) | Q(ends_at__gt=now)
    )


@transaction.atomic
def set_listing_featured(listing: Listing, data: dict, *, actor) -> Listing:
    """
    ``PUT /admin/listings/{id}/featured`` (``FeaturedUpdate``, LST-09, BR-STF-02).

    ``is_featured=true`` needs a published listing (409 ``not_published``)
    and replaces the current placement with a new one (``placement``
    defaults to ``search_top``, ``starts_at`` to now). ``is_featured=false``
    ends every current or future placement (history kept). Audited.
    """
    locked = Listing.objects.select_for_update().get(pk=listing.pk)
    now = timezone.now()
    before = {"is_featured": active_placements(locked).exists()}
    open_rows = FeaturedPlacement.objects.filter(listing=locked).filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now))
    if data["is_featured"]:
        if locked.status != ListingStatus.PUBLISHED or locked.deleted_at is not None:
            raise ConflictError("Only published listings can be featured.", code="not_published")
        starts_at = data.get("starts_at") or now
        ends_at = data.get("ends_at")
        if ends_at is not None and ends_at <= starts_at:
            raise DomainError("End must be after start.", code="validation_failed", status_code=422,
                              errors={"ends_at": ["Must be after starts_at."]})
    # Future rows are dropped, rows already live end now.
    open_rows.filter(starts_at__gt=now).delete()
    open_rows.update(ends_at=now)
    if data["is_featured"]:
        FeaturedPlacement.objects.create(
            listing=locked, placement=data.get("placement") or "search_top", position=data.get("position") or 0,
            starts_at=starts_at, ends_at=ends_at, created_by=actor,
        )
    audit.record(
        actor=actor, action="LISTING_FEATURE" if data["is_featured"] else "LISTING_UNFEATURE", obj=locked,
        before=before, after={"is_featured": bool(data["is_featured"]), "placement": data.get("placement")},
    )
    return listing


# ---------------------------------------------------------------------------
# Room types
# ---------------------------------------------------------------------------
def _require_room_pool(listing: Listing) -> None:
    """Room types exist only on hotels and hostels (BR-LST-01)."""
    if listing.inventory_kind != InventoryKind.ROOM_POOL:
        raise DomainError("Only hotels and hostels have room types.", code="room_types_not_allowed")


# Hook given by apps.inventory (a higher layer): ``resize(room_type, new_unit_count)`` refuses with
# 409 ``inventory_in_use`` when a future night has more units held or booked than the new count, and
# makes the stored night totals follow it. ``new_unit_count=0`` is the check made before a soft delete.
_room_units_resizer: Callable | None = None


def register_room_units_resizer(func: Callable | None) -> None:
    """
    Let the inventory app check and apply a room type size change (BR-AVL-02).

    Catalog may not import inventory (layer rule), so inventory registers
    ``func(room_type, new_unit_count)`` from ``InventoryConfig.ready()``.
    """
    global _room_units_resizer
    _room_units_resizer = func


def _set_room_amenities(room_type: RoomType, amenity_ids: list) -> None:
    """Replace the amenities of a room type; each id must be an active amenity of the listing's vertical."""
    wanted = {str(i) for i in amenity_ids}
    found = {str(a.id): a for a in Amenity.objects.filter(id__in=wanted, is_active=True)}
    vertical = room_type.listing.vertical
    bad = sorted(i for i in wanted if i not in found or vertical not in (found[i].applies_to or []))
    if bad:
        raise DomainError("Unknown amenity for this vertical.", code="validation_failed", status_code=422,
                          errors={"amenity_ids": bad})
    RoomTypeAmenity.objects.filter(room_type=room_type).delete()
    RoomTypeAmenity.objects.bulk_create([RoomTypeAmenity(room_type=room_type, amenity=a) for a in found.values()])


@transaction.atomic
def create_room_type(listing: Listing, data: dict) -> RoomType:
    """
    Add a room type to a hotel or hostel.

    Updates the listing summary (lowest price, capacity) and, on a live
    listing, sends it back to review (BR-LST-02 first version).
    ``amenity_ids`` (optional) sets the room amenities.
    """
    _require_room_pool(listing)
    data = dict(data)
    amenity_ids = data.pop("amenity_ids", None)
    room_type = RoomType.objects.create(listing=listing, **data)
    if amenity_ids is not None:
        _set_room_amenities(room_type, amenity_ids)
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

    Changing ``unit_count`` goes through the inventory hook: lowering it
    below the units already held or booked on a future night is refused
    with 409 ``inventory_in_use`` (BR-AVL-02), and future night totals
    follow the new count.
    """
    data = dict(data)
    amenity_ids = data.pop("amenity_ids", None)
    reviewed = any(f in data and getattr(room_type, f) != data[f] for f in ROOM_TYPE_REVIEWED_FIELDS)
    if "unit_count" in data and data["unit_count"] != room_type.unit_count and _room_units_resizer is not None:
        _room_units_resizer(room_type, data["unit_count"])
    for field, value in data.items():
        setattr(room_type, field, value)
    room_type.save()
    if amenity_ids is not None:
        _set_room_amenities(room_type, amenity_ids)
    sync_room_pool_summary(room_type.listing)
    if reviewed:
        send_back_to_review_if_live(room_type.listing)
    return room_type


@transaction.atomic
def delete_room_type(room_type: RoomType) -> None:
    """
    Soft-delete a room type (bookings keep pointing to it) and refresh the listing summary.

    Refused with 409 ``inventory_in_use`` while a future night still has
    units held or booked (BR-AVL-02): deactivate it instead.
    """
    if _room_units_resizer is not None:
        _room_units_resizer(room_type, 0)
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
def replace_listing_photos(listing: Listing, photos: list[dict], cover_media_id) -> list[ListingPhoto]:
    """
    ``PUT /host/listings/{id}/photos`` (``PhotosReplace``, BR-MED-01, BR-LST-02).

    ``photos`` is the gallery in its new order (``media_id`` and an optional
    ``caption``); listing photos left out are removed; room type photos are
    not touched. ``cover_media_id`` must be one of ``photos``. A
    ``media_id`` matches a photo of this listing by its ``media_id``, or by
    its own id for photos added by URL. Attaching a brand-new media asset
    needs the media app (not built yet), so unknown ids answer 422
    ``validation_failed``, as do duplicates. When the gallery changes, a
    live listing goes back to review (photos are reviewed, BR-LST-02 first version).
    """
    existing = list(listing.photos.filter(room_type__isnull=True))
    by_ref = {str(p.media_ref): p for p in existing}
    wanted = [str(item["media_id"]) for item in photos]
    errors: dict[str, list[str]] = {}
    if len(set(wanted)) != len(wanted):
        errors["photos"] = ["Send each media_id only once."]
    unknown = [ref for ref in wanted if ref not in by_ref]
    if unknown:
        errors["photos"] = [f"Unknown media_id: {ref}" for ref in unknown]
    if str(cover_media_id) not in wanted:
        errors["cover_media_id"] = ["Must be one of the photos."]
    if errors:
        raise DomainError("Invalid photo list.", code="validation_failed", status_code=422, errors=errors)
    before = [(str(p.media_ref), p.is_cover) for p in sorted(existing, key=lambda p: p.sort_order)]
    keep = set(wanted)
    ListingPhoto.objects.filter(id__in=[p.id for ref, p in by_ref.items() if ref not in keep]).delete()
    # Clear the cover first: the partial unique index allows one cover per listing at any moment.
    listing.photos.filter(is_cover=True).update(is_cover=False)
    result = []
    for position, item in enumerate(photos):
        photo = by_ref[str(item["media_id"])]
        photo.sort_order = position
        if "caption" in item:
            photo.caption = item["caption"] or ""
        photo.is_cover = str(item["media_id"]) == str(cover_media_id)
        photo.save(update_fields=["sort_order", "caption", "is_cover"])
        result.append(photo)
    if before != [(ref, ref == str(cover_media_id)) for ref in wanted]:
        send_back_to_review_if_live(listing)
    return result


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
# Taxonomy administration (BR-LST-04, BR-STF-02)
# ---------------------------------------------------------------------------
# Audit name of each taxonomy model.
TAXONOMY_AUDIT_NAMES = {Amenity: "AMENITY", Category: "CATEGORY", PropertyType: "PROPERTY_TYPE"}


def taxonomy_usage(row) -> int:
    """
    How many rows use this amenity, category or property type (BR-LST-04).

    Counts every listing, soft-deleted ones included (they still point to
    the row), and for amenities also room types.
    """
    if isinstance(row, Amenity):
        return row.listing_links.count() + row.room_type_links.count()
    field = "category" if isinstance(row, Category) else "property_type"
    return Listing.objects.filter(**{field: row}).count()


def _taxonomy_values(data: dict) -> dict:
    """API body (``labels``, ``group``...) to model fields (``name_en``, ``group_code``...)."""
    values = {k: v for k, v in data.items() if k not in ("labels", "group")}
    if "labels" in data:
        for lang in ("en", "fr", "ar"):
            values[f"name_{lang}"] = data["labels"][lang]
    if "group" in data:
        values["group_code"] = data["group"]
    if "icon" in values and values["icon"] is None:
        values["icon"] = ""
    return values


def _snapshot(row) -> dict:
    """Small before/after picture of a taxonomy row for the audit log."""
    keys = ("slug", "vertical", "is_active", "sort_order", "group_code", "applies_to", "name_en")
    return {k: getattr(row, k) for k in keys if hasattr(row, k)}


def _slug_taken(model, slug: str, vertical: str | None, exclude_id=None) -> bool:
    """True when another row already uses this slug (per vertical for categories and property types)."""
    qs = model.objects.filter(slug=slug)
    if model is not Amenity:
        qs = qs.filter(vertical=vertical)
    if exclude_id is not None:
        qs = qs.exclude(id=exclude_id)
    return qs.exists()


@transaction.atomic
def create_taxonomy_row(model, data: dict, *, actor):
    """
    Create an amenity, category or property type (``POST /admin/...``, BR-LST-04).

    409 ``slug_taken`` when the slug exists (per vertical for categories and
    property types, globally for amenities). Audited (BR-STF-02).
    """
    values = _taxonomy_values(data)
    if _slug_taken(model, values["slug"], values.get("vertical")):
        raise ConflictError("This slug is already used.", code="slug_taken")
    row = model.objects.create(**values)
    audit.record(actor=actor, action=f"{TAXONOMY_AUDIT_NAMES[model]}_CREATE", obj=row, after=_snapshot(row))
    return row


@transaction.atomic
def update_taxonomy_row(row, data: dict, *, actor):
    """
    Edit, reorder, activate or deactivate a taxonomy row (``PATCH``, BR-LST-04).

    Any subset of the write fields. A new slug or vertical must stay unique
    (409 ``slug_taken``). The vertical of a row in use cannot change, the
    listings using it would no longer fit (409 ``in_use``). Audited (BR-STF-02).
    """
    model = type(row)
    values = _taxonomy_values(data)
    slug = values.get("slug", row.slug)
    vertical = values.get("vertical", getattr(row, "vertical", None))
    if ("slug" in values or "vertical" in values) and _slug_taken(model, slug, vertical, exclude_id=row.id):
        raise ConflictError("This slug is already used.", code="slug_taken")
    if "vertical" in values and values["vertical"] != row.vertical and taxonomy_usage(row):
        raise ConflictError("This row is in use; its vertical cannot change.", code="in_use")
    before = _snapshot(row)
    for field, value in values.items():
        setattr(row, field, value)
    row.save()
    audit.record(actor=actor, action=f"{TAXONOMY_AUDIT_NAMES[model]}_UPDATE", obj=row, before=before,
                 after=_snapshot(row))
    return row


@transaction.atomic
def delete_taxonomy_row(row, *, actor) -> None:
    """
    Hard-delete a taxonomy row that was never used (BR-LST-04).

    A row in use answers 409 ``in_use``: deactivate it instead
    (``is_active=false``). Audited (BR-STF-02).
    """
    if taxonomy_usage(row):
        raise ConflictError("This row is in use: deactivate it instead.", code="in_use")
    audit.record(actor=actor, action=f"{TAXONOMY_AUDIT_NAMES[type(row)]}_DELETE", obj=row, before=_snapshot(row))
    row.delete()


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
