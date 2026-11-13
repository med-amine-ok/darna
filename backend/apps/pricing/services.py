"""
Every price of BLADUS is computed here (BR-PRC-01 to BR-PRC-03).

- :func:`compute_price` checks that the target can be booked and returns
  the price lines and amounts, without saving anything;
- :func:`build_quote` saves that result as a :class:`~apps.pricing.models.Quote`
  valid ``QUOTE_TTL_MINUTES`` minutes;
- :func:`reprice` runs the same computation again for an existing quote
  (used by the bookings app to re-validate a quote at booking time).

Rules applied:
- BR-PRC-01: per-night prices come from ``inventory.nightly_prices`` (base
  price or the day's override), multiplied by the units for room pools;
- BR-PRC-02: no BLADUS fee for guests, total = subtotal - discount +
  cleaning fee + taxes (taxes are 0 in this version);
- BR-PRC-03: weekly (7+ nights) or monthly (28+ nights) discount, only the
  larger one, applied to the subtotal;
- DEC-002: commission base = subtotal after discount (trips and
  experiences: seats x price per person), cleaning fee excluded.

Availability: pricing checks the listing window, the host's blocked days,
free rooms, seats, and (through the provider the bookings app plugs into
inventory) the booked nights of a home. The bookings service checks the
overlap again under a row lock, because only it can do so safely.
"""

import uuid
from dataclasses import dataclass, field
from datetime import date, timedelta

from django.conf import settings
from django.utils import timezone

from apps.catalog.models import BookingUnit, InventoryKind, Listing, RoomType
from apps.catalog.selectors import public_listings
from apps.config import services as config
from apps.core.errors import ConflictError, DomainError, NotFoundError
from apps.core.money import apply_bp, money_dict
from apps.core.timeutils import business_today, business_tz
from apps.hosts.models import ApprovalMode
from apps.inventory.models import ExperienceSlot
from apps.inventory.selectors import (
    booked_ranges,
    listing_window_problem,
    nightly_prices,
    rooms_available,
    single_unit_free,
)
from apps.trips.models import OPEN_DEPARTURE_STATUSES, TripDeparture
from apps.trips.selectors import public_trips

from .models import Quote

# Stays of at least this many nights get the weekly or monthly discount (BR-PRC-03).
WEEKLY_MIN_NIGHTS = 7
MONTHLY_MIN_NIGHTS = 28


@dataclass
class PriceResult:
    """
    The outcome of :func:`compute_price`: the target, the stay and every amount.

    It has the same field names as :class:`Quote` so it can be saved as one,
    and it is compared with a stored quote when a booking is made.
    """

    listing: Listing | None
    room_type: RoomType | None
    experience_slot: ExperienceSlot | None
    trip_departure: TripDeparture | None
    check_in: date
    check_out: date
    guests: int
    units: int
    currency: str
    lines: list = field(default_factory=list)
    subtotal_minor: int = 0
    discount_minor: int = 0
    cleaning_fee_minor: int = 0
    taxes_minor: int = 0
    total_minor: int = 0
    commission_base_minor: int = 0

    def as_model_fields(self) -> dict:
        """The keyword arguments to create a :class:`Quote` from this result."""
        return {
            "listing": self.listing, "room_type": self.room_type, "experience_slot": self.experience_slot,
            "trip_departure": self.trip_departure, "check_in": self.check_in, "check_out": self.check_out,
            "guests": self.guests, "units": self.units, "currency": self.currency, "lines": self.lines,
            "subtotal_minor": self.subtotal_minor, "discount_minor": self.discount_minor,
            "cleaning_fee_minor": self.cleaning_fee_minor, "taxes_minor": self.taxes_minor,
            "total_minor": self.total_minor, "commission_base_minor": self.commission_base_minor,
        }


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------
def _line(kind: str, label: str, unit_minor: int, quantity: int, currency: str, day: date | None = None) -> dict:
    """One price line as stored in ``Quote.lines`` and shown to the guest (Money dicts, BR-PAY-01)."""
    return {
        "kind": kind,
        "label": label,
        "date": day.isoformat() if day else None,
        "quantity": quantity,
        "unit_amount": money_dict(unit_minor, currency),
        "amount": money_dict(unit_minor * quantity, currency),
    }


def _uuid_or_404(value, what: str):
    """Parse an id sent by the client; a malformed id looks like a missing object (404)."""
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError) as exc:
        raise NotFoundError(f"{what} not found.") from exc


def _window_error(reason: str) -> DomainError:
    """
    Turn a reason of ``inventory.listing_window_problem`` into an error
    whose code is that reason (BR-AVL-04, BR-AVL-05), status 422 as in the API contract.
    """
    return DomainError("These dates do not follow the listing's booking rules.", code=reason, status_code=422)


def _capacity_error() -> DomainError:
    """Too many guests for what is being booked (code ``capacity_exceeded``, 422)."""
    return DomainError("Too many guests for this place.", code="capacity_exceeded", status_code=422)


def length_of_stay_discount_bp(listing: Listing, nights: int) -> int:
    """
    The discount rate of a stay, in basis points (BR-PRC-03).

    Weekly applies from 7 nights, monthly from 28 nights. When both apply,
    only the larger one is used (they are never added up).
    """
    candidates = [0]
    if nights >= WEEKLY_MIN_NIGHTS:
        candidates.append(listing.weekly_discount_bp)
    if nights >= MONTHLY_MIN_NIGHTS:
        candidates.append(listing.monthly_discount_bp)
    return max(candidates)


def effective_approval_mode(target) -> str:
    """
    ``instant`` or ``request`` for a listing or a trip, before the wallet check (BR-BKG-02).

    The platform switch ``instant_booking_enabled`` forces request mode;
    otherwise the target's own mode, else the host account default.
    The credit floor (BR-PAY-10) is checked later by the bookings app.
    """
    if not config.get_value("instant_booking_enabled"):
        return ApprovalMode.REQUEST
    return target.effective_approval_mode or ApprovalMode.REQUEST


# ---------------------------------------------------------------------------
# Targets
# ---------------------------------------------------------------------------
def _price_stay(result: PriceResult, listing: Listing, room_type: RoomType | None) -> None:
    """
    Fill ``result`` for a stay of a home, vehicle, hotel or hostel (BR-PRC-01, BR-PRC-03).

    One line per night (price x units), then the length-of-stay discount and
    the cleaning fee, which is charged once per stay.
    """
    currency = result.currency
    subtotal = 0
    for day, price in nightly_prices(listing, result.check_in, result.check_out, room_type=room_type):
        result.lines.append(_line("night", f"Night of {day.isoformat()}", price, result.units, currency, day))
        subtotal += price * result.units
    nights = (result.check_out - result.check_in).days
    discount = apply_bp(subtotal, length_of_stay_discount_bp(listing, nights))
    if discount:
        # Shown as a negative line so the lines add up to the total (BR-PAY-01).
        result.lines.append(_line("discount", "Length of stay discount", -discount, 1, currency))
    cleaning = listing.cleaning_fee_minor
    if cleaning:
        result.lines.append(_line("cleaning_fee", "Cleaning fee", cleaning, 1, currency))
    result.subtotal_minor = subtotal
    result.discount_minor = discount
    result.cleaning_fee_minor = cleaning


def _check_stay(listing: Listing, check_in: date | None, check_out: date | None) -> tuple[date, date]:
    """Dates are required for stays and must follow the listing's window rules (BR-AVL-04, BR-AVL-05)."""
    if not check_in or not check_out:
        raise DomainError("Choose your dates.", code="invalid_dates",
                          errors={"check_in": ["Required."], "check_out": ["Required."]})
    problem = listing_window_problem(listing, check_in, check_out)
    if problem:
        raise _window_error(problem)
    return check_in, check_out


def _single(listing: Listing, check_in, check_out, guests: int) -> PriceResult:
    """
    Price a home or a vehicle (single unit, BR-AVL-01).

    Refuses blocked days and nights already taken by a booking in a blocking
    state (known through the provider the bookings app registers in inventory).
    """
    check_in, check_out = _check_stay(listing, check_in, check_out)
    if guests > listing.capacity_guests:
        raise _capacity_error()
    taken = booked_ranges([listing.id], check_in, check_out).get(listing.id, [])
    if not single_unit_free(listing, check_in, check_out, taken):
        raise ConflictError("These dates are no longer available.", code="dates_unavailable")
    result = PriceResult(listing=listing, room_type=None, experience_slot=None, trip_departure=None,
                         check_in=check_in, check_out=check_out, guests=guests, units=1, currency=listing.currency)
    _price_stay(result, listing, None)
    return result


def _room_pool(listing: Listing, room_type_id, check_in, check_out, guests: int, units: int | None) -> PriceResult:
    """
    Price rooms or beds of a hotel or hostel (BR-AVL-02, BR-AVL-03).

    A bed type takes one unit per guest; a room type takes the rooms asked
    for, and the guests must fit (units x capacity per unit).
    """
    if not room_type_id:
        raise DomainError("Choose a room type.", code="room_type_required", errors={"room_type_id": ["Required."]})
    room_type = RoomType.objects.alive().filter(
        listing=listing, id=_uuid_or_404(room_type_id, "Room type"), is_active=True
    ).first()
    if room_type is None:
        raise NotFoundError("Room type not found.")
    check_in, check_out = _check_stay(listing, check_in, check_out)
    if room_type.booking_unit == BookingUnit.BED:
        units = guests  # BR-AVL-03: one bed per guest
    units = units or 1
    if guests > units * room_type.capacity_per_unit:
        raise _capacity_error()
    if rooms_available(room_type, check_in, check_out) < units:
        raise ConflictError("Not enough rooms left for these dates.", code="not_enough_units")
    result = PriceResult(listing=listing, room_type=room_type, experience_slot=None, trip_departure=None,
                         check_in=check_in, check_out=check_out, guests=guests, units=units, currency=listing.currency)
    _price_stay(result, listing, room_type)
    return result


def _slot(listing: Listing, slot_id, guests: int) -> PriceResult:
    """
    Price seats on an experience session: seats x price per person (DEC-002).

    The slot must belong to the listing, be open, in the future and have
    enough seats left (409 ``seats_unavailable``). One seat per guest.
    """
    if not slot_id:
        raise DomainError("Choose a session.", code="slot_required", errors={"experience_slot_id": ["Required."]})
    slot = ExperienceSlot.objects.filter(listing=listing, id=_uuid_or_404(slot_id, "Session")).select_related("listing").first()
    if slot is None:
        raise NotFoundError("Session not found.")
    if slot.starts_at <= timezone.now():
        raise _window_error("past")
    if slot.seats_left < guests:
        raise ConflictError("Not enough seats left on this session.", code="seats_unavailable")
    tz = business_tz()
    price = slot.price_minor
    result = PriceResult(
        listing=listing, room_type=None, experience_slot=slot, trip_departure=None,
        # Slot dates are read in Algerian time (BR-SYS-05).
        check_in=slot.starts_at.astimezone(tz).date(), check_out=slot.ends_at.astimezone(tz).date(),
        guests=guests, units=guests, currency=listing.currency,
    )
    result.lines.append(_line("seat", "Seat", price, guests, listing.currency))
    result.subtotal_minor = price * guests
    return result


def _departure(departure_id, guests: int) -> PriceResult:
    """
    Price seats on a trip departure: seats x price per person (DEC-002, DEC-006).

    The trip must be public, the departure open and not started, with
    enough seats left (409 ``seats_unavailable``). One seat per guest.
    """
    departure = (
        TripDeparture.objects.filter(id=_uuid_or_404(departure_id, "Departure"), trip__in=public_trips())
        .select_related("trip", "trip__host_account")
        .first()
    )
    if departure is None:
        raise NotFoundError("Departure not found.")
    if departure.starts_on < business_today():
        raise _window_error("past")
    if departure.status not in OPEN_DEPARTURE_STATUSES or departure.seats_left < guests:
        raise ConflictError("Not enough seats left on this departure.", code="seats_unavailable")
    trip = departure.trip
    price = departure.price_per_person_minor or trip.price_per_person_minor
    result = PriceResult(listing=None, room_type=None, experience_slot=None, trip_departure=departure,
                         check_in=departure.starts_on, check_out=departure.ends_on, guests=guests, units=guests,
                         currency=trip.currency)
    result.lines.append(_line("seat", "Seat", price, guests, trip.currency))
    result.subtotal_minor = price * guests
    return result


# ---------------------------------------------------------------------------
# Public functions
# ---------------------------------------------------------------------------
def compute_price(*, listing_id=None, room_type_id=None, experience_slot_id=None, trip_departure_id=None,
                  check_in: date | None = None, check_out: date | None = None, guests: int = 1,
                  units: int | None = None) -> PriceResult:
    """
    Check the request and compute every amount, without saving (BR-PRC-01 to BR-PRC-03).

    Exactly one target: ``listing_id`` (with ``room_type_id`` for a hotel or
    hostel, ``experience_slot_id`` for an experience) or ``trip_departure_id``.
    Only public listings and trips can be priced (BR-SRC-01). Raises
    ``DomainError`` (400/422), ``NotFoundError`` or ``ConflictError`` (409)
    with a stable code when the stay cannot be booked.
    """
    if guests is None or guests < 1:
        raise DomainError("At least one guest.", code="invalid", errors={"guests": ["Must be at least 1."]})
    if units is not None and units < 1:
        raise DomainError("At least one unit.", code="invalid", errors={"units": ["Must be at least 1."]})
    if bool(listing_id) == bool(trip_departure_id):
        raise DomainError("Price either a listing or a trip departure.", code="invalid_target")

    if trip_departure_id:
        result = _departure(trip_departure_id, guests)
    else:
        listing = public_listings().filter(id=_uuid_or_404(listing_id, "Listing")).first()
        if listing is None:
            raise NotFoundError("Listing not found.")
        if listing.inventory_kind == InventoryKind.SLOT:
            result = _slot(listing, experience_slot_id, guests)
        elif listing.inventory_kind == InventoryKind.ROOM_POOL:
            result = _room_pool(listing, room_type_id, check_in, check_out, guests, units)
        else:
            result = _single(listing, check_in, check_out, guests)

    # BR-PRC-02: no BLADUS fee; taxes come later (BR-PRC-04), 0 for now.
    result.taxes_minor = 0
    result.commission_base_minor = result.subtotal_minor - result.discount_minor  # DEC-002
    result.total_minor = result.commission_base_minor + result.cleaning_fee_minor + result.taxes_minor
    return result


def build_quote(*, guest=None, **request) -> Quote:
    """
    Compute a price with :func:`compute_price` and save it as a quote valid
    ``QUOTE_TTL_MINUTES`` minutes (BR-PRC-01).

    ``guest`` is the signed-in user, or ``None`` for a visitor. ``request``
    holds the arguments of :func:`compute_price`.
    """
    result = compute_price(**request)
    expires_at = timezone.now() + timedelta(minutes=settings.QUOTE_TTL_MINUTES)
    return Quote.objects.create(guest=guest, expires_at=expires_at, **result.as_model_fields())


def reprice(quote: Quote) -> PriceResult:
    """
    Run the computation of ``quote`` again with today's data (BR-PRC-01: a quote
    is re-validated at booking). The caller compares the totals.
    """
    return compute_price(
        listing_id=quote.listing_id, room_type_id=quote.room_type_id, experience_slot_id=quote.experience_slot_id,
        trip_departure_id=quote.trip_departure_id, check_in=quote.check_in, check_out=quote.check_out,
        guests=quote.guests, units=quote.units,
    )


def get_quote(quote_id) -> Quote:
    """One quote by id, else 404. Ids are unguessable UUIDs, so anyone holding one may read it."""
    quote = Quote.objects.filter(id=_uuid_or_404(quote_id, "Quote")).select_related(
        "listing", "listing__cancellation_policy", "listing__host_account", "trip_departure",
        "trip_departure__trip", "trip_departure__trip__cancellation_policy", "trip_departure__trip__host_account",
    ).first()
    if quote is None:
        raise NotFoundError("Quote not found.")
    return quote
