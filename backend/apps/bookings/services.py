"""
Every write and business rule of the bookings app.

Life of a booking (BR-BKG-06, table 7a):

    quote --create_booking--> pending --accept--> confirmed --job--> completed
                                 |  \\--decline--> declined
                                 |   \\--job-----> expired
                                 \\--cancel-----> cancelled <--cancel-- confirmed

Rules applied here:
- BR-BKG-01/02: instant only when the listing (or trip) resolves to instant,
  the platform switch allows it and the host's deposit is above its floor
  (BR-PAY-10); otherwise the booking is a request;
- BR-BKG-03/04: a request blocks the dates until answered, and expires after
  ``request_ttl_hours`` (DEC-008) or at check-in time if sooner;
- BR-BKG-05: a confirmed stay completes at check-out time + 2 hours (Algiers);
- BR-BKG-07: price, commission rate and policy windows are frozen at creation;
- BR-AVL-01/02: no overlapping stay on a home, no oversold room or seat;
- BR-CAN-01 to 03: refund owed by the host after a cancellation (DEC-001),
  tracked as a debt with a deadline (review R8); the preview endpoints and
  the real cancellations share :func:`guest_cancellation_terms` and
  :func:`host_cancellation_terms`, so a preview never differs from the result;
- BR-CAN-04: admin refunds add up and never pass the total, one ``Refund``
  row and one debt each; BR-CAN-05: disputes opened by either side until
  14 days after check-out, resolved by support (R2);
- BR-PAY-11: online guest payment exists but is switched off (DEC-019);
- BR-PAY-04/05, DEC-018 revised 2026-11-13: commission taken at
  confirmation; after a cancellation the commission follows the refund
  (guest cancels: same share as the refunded subtotal; host cancels: all of
  it); nothing to return on decline or expiry, none was taken;
- review R7: the host wallet row is locked first, then the booking and the
  stock, in every function that can move money;
- review R13: open bookings per guest are limited, and a review needs a
  confirmed stay (check-in code or guest confirmation);
- review R3: every room change of a connected hotel is pushed to its system
  through the outbox.

Every function that writes runs inside ``transaction.atomic`` and reads the
booking with ``select_for_update`` so two actions cannot cross.
"""

import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, time, timedelta

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.audit import services as audit
from apps.catalog.models import POLICY_WINDOWS, Listing
from apps.config import services as config
from apps.core.errors import ConflictError, DomainError, ForbiddenError, NotFoundError
from apps.core.ids import human_reference
from apps.core import outbox
from apps.core.money import apply_bp
from apps.core.timeutils import business_datetime, business_today, business_tz
from apps.hosts.models import ApprovalMode
from apps.hosts.models import PropertyIntegration
from apps.hosts.selectors import host_accounts_for
from apps.inventory import services as inventory
from apps.inventory.selectors import blocked_days
from apps.ledger import services as ledger
from apps.pricing import services as pricing
from apps.pricing.models import Quote
from apps.pricing.services import PriceResult
from apps.trips import services as trips

from . import selectors
from .models import (
    BLOCKING_STATUSES,
    ActorRole,
    Booking,
    BookingEvent,
    BookingStatus,
    Dispute,
    DisputeOutcome,
    InventoryKind,
    Refund,
    RefundKind,
    RefundObligation,
    RefundSettlement,
    RefundStatus,
    StayConfirmedVia,
    UNPAID_REFUND_STATUSES,
    can_transition,
)

# Times used when a listing has no check-in or check-out time of its own.
DEFAULT_CHECK_IN_TIME = time(15, 0)
DEFAULT_CHECK_OUT_TIME = time(11, 0)
# Trips have dates only: they are taken to start in the morning and end in the evening.
TRIP_START_TIME = time(8, 0)
TRIP_END_TIME = time(18, 0)
# BR-BKG-05: a stay completes 2 hours after check-out time.
COMPLETION_DELAY = timedelta(hours=2)


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------
def _new_reference() -> str:
    """A booking reference ``BLD-<year>-XXXXXX`` not used yet (BR-BKG-07, BKG-08)."""
    year = business_today().year
    for _ in range(10):
        ref = human_reference("BLD", year)
        if not Booking.objects.filter(reference=ref).exists():
            return ref
    raise RuntimeError("Could not generate a unique booking reference.")


def _clean_reason(reason: str | None) -> str:
    """A reason is required for decline and host or admin cancellation (BR-BKG-03, BR-CAN-03/04)."""
    text = (reason or "").strip()
    if not text:
        raise DomainError("Give a reason.", code="reason_required", errors={"reason": ["Required."]})
    return text


def _lock(booking: Booking) -> Booking:
    """
    Lock the host wallet, then re-read the booking with a row lock (review R7).

    Every action that may move money takes the locks in this order (wallet,
    then booking, then stock), so two actions never wait for each other in
    a circle and two actions on one booking run one after the other.
    """
    ledger.lock_wallet(booking.host_account)
    return Booking.objects.select_for_update().get(pk=booking.pk)


def _new_check_in_code() -> str:
    """6-digit code the guest shows on arrival; the host enters it to confirm the stay (review R13)."""
    return f"{secrets.randbelow(1_000_000):06d}"


def has_overdue_refund(host_account) -> bool:
    """True when the host still owes a guest a refund after its deadline (review R8)."""
    return RefundObligation.objects.filter(
        host_account=host_account, status__in=UNPAID_REFUND_STATUSES, due_at__lte=timezone.now()
    ).exists()


def _check_guest_limits(guest) -> None:
    """
    Refuse a new booking when the guest already holds too many (review R13).

    Limits from the settings: ``max_pending_requests_per_guest`` waiting
    requests, and ``max_upcoming_bookings_per_guest`` pending or confirmed
    bookings that are not finished yet. Stops a guest from blocking many
    dates for free. The guest row is locked so two parallel requests count
    each other. Error ``too_many_open_bookings`` (409).
    """
    User.objects.select_for_update().filter(pk=guest.pk).first()
    today = business_today()
    open_qs = Booking.objects.filter(guest=guest, check_out__gte=today)
    pending = open_qs.filter(status=BookingStatus.PENDING).count()
    upcoming = open_qs.filter(status__in=[BookingStatus.PENDING, BookingStatus.CONFIRMED]).count()
    if pending >= int(config.get_value("max_pending_requests_per_guest")) or \
            upcoming >= int(config.get_value("max_upcoming_bookings_per_guest")):
        raise ConflictError("You already have too many open bookings. Finish or cancel one first.",
                            code="too_many_open_bookings")


def _announce_room_change(booking: Booking) -> None:
    """
    Queue a push of the free rooms to the hotel's own system (review R3, DEC-017).

    Only for room pools of an organisation with an active integration. The
    message is written in the same transaction as the booking change and
    delivered by the outbox worker, with retries.
    """
    if booking.inventory_kind != InventoryKind.ROOM_POOL or not booking.host_account.organization_id:
        return
    nights = [booking.check_in.fromordinal(day) for day in
              range(booking.check_in.toordinal(), booking.check_out.toordinal())]
    for integration in PropertyIntegration.objects.filter(organization_id=booking.host_account.organization_id,
                                                          status="active"):
        outbox.enqueue("inventory.push", {
            "integration_id": str(integration.id), "room_type_id": str(booking.room_type_id),
            "nights": [n.isoformat() for n in nights], "booking": booking.reference,
        })


def _time_text(value: time) -> str:
    """``HH:MM`` text of a time, as stored in the snapshot."""
    return value.strftime("%H:%M")


def check_in_at(booking: Booking) -> datetime:
    """Aware date and time of arrival in Algeria (check-in day + check-in time from the snapshot)."""
    at = time.fromisoformat(booking.listing_snapshot.get("check_in_time") or _time_text(DEFAULT_CHECK_IN_TIME))
    return business_datetime(booking.check_in, at)


def check_out_at(booking: Booking) -> datetime:
    """Aware date and time of departure in Algeria (check-out day + check-out time from the snapshot)."""
    at = time.fromisoformat(booking.listing_snapshot.get("check_out_time") or _time_text(DEFAULT_CHECK_OUT_TIME))
    return business_datetime(booking.check_out, at)


def _is_own_offer(guest, host_account) -> bool:
    """True when the guest is the host, or a member of the host organisation (they may not book themselves)."""
    return any(account.id == host_account.id for account, _ in host_accounts_for(guest))


def _snapshot(result: PriceResult) -> tuple[dict, list]:
    """
    What the booking keeps from the listing or trip at creation (BR-BKG-07):
    title, reference, private address and point (shown once confirmed,
    BR-SRC-03), check-in and check-out times; plus the policy windows (BR-CAN-01).
    """
    if result.trip_departure is not None:
        trip = result.trip_departure.trip
        policy = trip.cancellation_policy
        data = {
            "vertical": "trip", "title": trip.title, "reference": trip.reference, "trip_id": str(trip.id),
            "address_line": trip.meeting_point_text,
            "latitude": str(trip.meeting_point_latitude) if trip.meeting_point_latitude is not None else None,
            "longitude": str(trip.meeting_point_longitude) if trip.meeting_point_longitude is not None else None,
            "check_in_time": _time_text(TRIP_START_TIME), "check_out_time": _time_text(TRIP_END_TIME),
        }
    else:
        listing = result.listing
        policy = listing.cancellation_policy
        if result.experience_slot is not None:
            # A session starts and ends at its own times (read in Algerian time).
            tz = business_tz()
            check_in_time = result.experience_slot.starts_at.astimezone(tz).time()
            check_out_time = result.experience_slot.ends_at.astimezone(tz).time()
        else:
            check_in_time = listing.check_in_time or DEFAULT_CHECK_IN_TIME
            check_out_time = listing.check_out_time or DEFAULT_CHECK_OUT_TIME
        data = {
            "vertical": listing.vertical, "title": listing.title, "reference": listing.reference,
            "address_line": listing.address_line,
            "commune": listing.commune.name_fr if listing.commune_id else None,
            "latitude": str(listing.latitude) if listing.latitude is not None else None,
            "longitude": str(listing.longitude) if listing.longitude is not None else None,
            "room_type_name": result.room_type.name if result.room_type else None,
            "check_in_time": _time_text(check_in_time), "check_out_time": _time_text(check_out_time),
        }
    data["policy_code"] = policy.code if policy else "moderate"
    data["policy_version"] = policy.version if policy else None
    # Without a policy, use the moderate windows (the default of new listings and trips).
    windows = policy.windows if policy else POLICY_WINDOWS["moderate"]
    return data, list(windows)


def _record_event(booking: Booking, from_status: str, *, actor, role: str, note: str = "") -> None:
    """Append one line to the booking history (BR-BKG-06)."""
    BookingEvent.objects.create(booking=booking, from_status=from_status, to_status=booking.status,
                                actor=actor, actor_role=role, note=note)


def _transition(booking: Booking, new_status: str, *, actor, role: str, note: str = "", fields: tuple = ()) -> None:
    """
    Move a locked booking to ``new_status`` if table 7a allows it (BR-BKG-06),
    set the matching timestamp, save ``fields`` too, and write the history line.
    """
    old = booking.status
    if not can_transition(old, new_status):
        raise ConflictError(f"A {old} booking cannot become {new_status}.", code="invalid_transition")
    now = timezone.now()
    booking.status = new_status
    changed = ["status", "updated_at", *fields]
    stamp = {BookingStatus.CONFIRMED: "confirmed_at", BookingStatus.COMPLETED: "completed_at",
             BookingStatus.CANCELLED: "cancelled_at"}.get(new_status)
    if stamp:
        setattr(booking, stamp, now)
        changed.append(stamp)
    booking.save(update_fields=changed)
    _record_event(booking, old, actor=actor, role=role, note=note)


# ---------------------------------------------------------------------------
# Inventory
# ---------------------------------------------------------------------------
def _single_unit_overlaps(listing_id, check_in, check_out) -> bool:
    """True when a blocking booking of this home overlaps ``[check_in, check_out)`` (back-to-back is fine, BR-AVL-01)."""
    return Booking.objects.filter(
        listing_id=listing_id, inventory_kind=InventoryKind.SINGLE, status__in=BLOCKING_STATUSES,
        check_in__lt=check_out, check_out__gt=check_in,
    ).exists()


def _reserve(kind: str, result: PriceResult) -> None:
    """
    Take the stock of a new booking (BR-AVL-01, BR-AVL-02).

    Single unit: lock the listing row, then refuse an overlapping blocking
    booking or a blocked day (the lock makes two guests, or a guest and the
    host closing days, wait for each other; on PostgreSQL the exclusion
    constraint and the triggers of migration 0003 back it up).
    Pools: one conditional ``UPDATE`` in inventory or trips. Pending
    requests count as ``booked`` too: a request keeps the dates blocked
    until it is answered or expires (BR-BKG-03); ``held`` is kept for the
    15-minute payment holds of BR-AVL-06, which do not exist yet.
    """
    if kind == InventoryKind.SINGLE:
        Listing.objects.select_for_update().filter(pk=result.listing.pk).first()
        # Review R2: re-check host blocks under the same lock the calendar uses.
        if _single_unit_overlaps(result.listing.pk, result.check_in, result.check_out) or \
                blocked_days(result.listing, result.check_in, result.check_out):
            raise ConflictError("These dates are no longer available.", code="dates_unavailable")
    elif kind == InventoryKind.ROOM_POOL:
        inventory.reserve_rooms(result.room_type, result.check_in, result.check_out, result.units, kind="booked")
    elif kind == InventoryKind.SLOT:
        inventory.slot_reserve(result.experience_slot, result.units, kind="booked")
    elif kind == InventoryKind.DEPARTURE:
        trips.departure_reserve(result.trip_departure, result.units, kind="booked")


def _release(booking: Booking) -> None:
    """
    Give the stock of a booking back (decline, expiry, cancellation).

    A single unit has nothing to release: its dates are free again as soon
    as the status is no longer blocking.
    """
    kind = booking.inventory_kind
    if kind == InventoryKind.ROOM_POOL:
        inventory.release_rooms(booking.room_type, booking.check_in, booking.check_out, booking.units, kind="booked")
    elif kind == InventoryKind.SLOT:
        inventory.slot_release(booking.experience_slot, booking.units, kind="booked")
    elif kind == InventoryKind.DEPARTURE:
        trips.departure_release(booking.trip_departure, booking.units, kind="booked")


# ---------------------------------------------------------------------------
# Creation
# ---------------------------------------------------------------------------
def _parse_quote_id(quote_id) -> uuid.UUID:
    """A malformed quote id looks like a missing quote (404)."""
    try:
        return uuid.UUID(str(quote_id))
    except (TypeError, ValueError) as exc:
        raise NotFoundError("Quote not found.") from exc


@transaction.atomic
def create_booking(*, guest, quote_id) -> Booking:
    """
    Turn a quote into a booking (BR-BKG-01 to BR-BKG-07).

    Steps: the guest has a verified phone (DEC-012, ``phone_not_verified``);
    the quote is theirs or anonymous and not expired (``quote_expired``),
    never used before (``quote_already_used``); the price is computed again
    and must be the same (``price_changed``, BR-PRC-01); the guest is not the
    host (``own_listing``); the stock is taken (``dates_unavailable``); then
    instant or request is decided (BR-BKG-01/02), the commission rate frozen
    (BR-PAY-06) and, when confirmed, the commission posted (BR-PAY-04).
    Idempotency (BR-SYS-01) is handled by the view.
    """
    if not guest.phone_verified:
        raise ForbiddenError("Verify your phone number first.", code="phone_not_verified")
    _check_guest_limits(guest)
    # Lock the quote: two clicks on the same quote are served one after the other.
    quote = Quote.objects.select_for_update().filter(id=_parse_quote_id(quote_id)).first()
    if quote is None or (quote.guest_id and quote.guest_id != guest.id):
        raise NotFoundError("Quote not found.")
    if quote.is_expired:
        raise ConflictError("This price has expired. Ask for a new one.", code="quote_expired")
    if Booking.objects.filter(quote=quote).exists():
        raise ConflictError("This quote was already booked.", code="quote_already_used")

    result = pricing.reprice(quote)  # re-checks dates, capacity and that the listing is still public
    if result.total_minor != quote.total_minor:
        raise ConflictError("The price changed. Check the new price.", code="price_changed")

    target = result.trip_departure.trip if result.trip_departure else result.listing
    host_account = target.host_account
    if _is_own_offer(guest, host_account):
        raise ForbiddenError("You cannot book your own offer.", code="own_listing")

    kind = quote.inventory_kind
    # Review R7: lock the host wallet before the stock, so two bookings of
    # this host read the deposit one after the other.
    ledger.lock_wallet(host_account)
    _reserve(kind, result)

    # BR-BKG-01/02: instant only when the mode says so, the deposit is above
    # its floor (BR-PAY-10) and the host owes no overdue refund (review R8).
    instant = (
        pricing.effective_approval_mode(target) == ApprovalMode.INSTANT
        and ledger.can_accept_bookings(host_account)
        and not has_overdue_refund(host_account)
    )
    rate_bp = config.commission_rate_bp(host_account)
    snapshot, windows = _snapshot(result)
    now = timezone.now()
    booking = Booking(
        reference=_new_reference(), guest=guest, host_account=host_account, inventory_kind=kind,
        listing=result.listing, room_type=result.room_type, experience_slot=result.experience_slot,
        trip_departure=result.trip_departure, check_in=result.check_in, check_out=result.check_out,
        guests=result.guests, units=result.units,
        status=BookingStatus.CONFIRMED if instant else BookingStatus.PENDING,
        approval_mode_applied=ApprovalMode.INSTANT if instant else ApprovalMode.REQUEST,
        confirmed_at=now if instant else None,
        currency=result.currency, subtotal_minor=result.subtotal_minor, discount_minor=result.discount_minor,
        cleaning_fee_minor=result.cleaning_fee_minor, taxes_minor=result.taxes_minor, total_minor=result.total_minor,
        commission_base_minor=result.commission_base_minor, commission_rate_bp=rate_bp,
        commission_minor=apply_bp(result.commission_base_minor, rate_bp),  # BR-PAY-04, DEC-002
        price_lines=result.lines, cancellation_windows=windows, listing_snapshot=snapshot, quote=quote,
        check_in_code=_new_check_in_code() if instant else "",
    )
    if not instant:
        # BR-BKG-04, DEC-008: the host has request_ttl_hours, or until check-in time if that is sooner.
        ttl = timedelta(hours=int(config.get_value("request_ttl_hours")))
        booking.request_expires_at = min(now + ttl, check_in_at(booking))
    booking.save()
    _record_event(booking, "", actor=guest, role=ActorRole.GUEST)
    _announce_room_change(booking)
    if instant:
        ledger.post_commission(host_account=host_account, booking_id=booking.id,
                               amount_minor=booking.commission_minor, reference=booking.reference)
    return booking


# ---------------------------------------------------------------------------
# Host answers (BR-BKG-03)
# ---------------------------------------------------------------------------
@transaction.atomic
def accept_booking(*, ctx, booking_id, actor) -> Booking:
    """
    The host accepts a request (BR-BKG-03): needs ``bookings.respond``, the
    booking must be pending and not past its deadline (``request_expired``),
    the deposit must be above the credit floor (``deposit_below_floor``,
    BR-PAY-10) and no refund may be overdue (``refund_overdue``, review R8).
    The commission is posted now (BR-PAY-04) and the check-in code created.
    """
    ctx.require("bookings.respond")
    booking = _lock(selectors.get_host_booking(ctx.host_account, booking_id))
    if booking.status != BookingStatus.PENDING:
        raise ConflictError("Only a pending request can be accepted.", code="booking_not_pending")
    if booking.request_expires_at and booking.request_expires_at <= timezone.now():
        raise ConflictError("This request has expired.", code="request_expired")
    if not ledger.can_accept_bookings(ctx.host_account):
        raise DomainError("Top up your deposit before accepting new bookings.", code="deposit_below_floor",
                          status_code=409)
    if has_overdue_refund(ctx.host_account):
        raise DomainError("Pay back the overdue guest refund before accepting new bookings.",
                          code="refund_overdue", status_code=409)
    booking.check_in_code = _new_check_in_code()
    _transition(booking, BookingStatus.CONFIRMED, actor=actor, role=ActorRole.HOST, fields=("check_in_code",))
    ledger.post_commission(host_account=booking.host_account, booking_id=booking.id,
                           amount_minor=booking.commission_minor, reference=booking.reference)
    return booking


@transaction.atomic
def decline_booking(*, ctx, booking_id, actor, reason: str) -> Booking:
    """
    The host declines a request with a reason (BR-BKG-03). The dates or
    seats are freed at once; no money moves (BR-PAY-05).
    """
    ctx.require("bookings.respond")
    reason = _clean_reason(reason)
    booking = _lock(selectors.get_host_booking(ctx.host_account, booking_id))
    if booking.status != BookingStatus.PENDING:
        raise ConflictError("Only a pending request can be declined.", code="booking_not_pending")
    _release(booking)
    booking.decline_reason = reason
    _transition(booking, BookingStatus.DECLINED, actor=actor, role=ActorRole.HOST, note=reason,
                fields=("decline_reason",))
    _announce_room_change(booking)
    return booking


# ---------------------------------------------------------------------------
# Cancellations (section 8)
# ---------------------------------------------------------------------------
def refund_bp_for(windows: list[dict], days_before: int) -> int:
    """
    Refund rate of a policy for a cancellation ``days_before`` days before check-in (BR-CAN-01).

    The most generous window whose ``min_days_before`` is reached wins;
    0 when none is (for example on arrival day with the strict policy).
    """
    for window in sorted(windows, key=lambda w: w["min_days_before"], reverse=True):
        if days_before >= window["min_days_before"]:
            return int(window["refund_bp"])
    return 0


def guest_refund_parts(booking: Booking, *, today=None) -> tuple[int, int]:
    """
    ``(refund_minor, refund_of_base_minor)`` when the guest cancels a confirmed booking.

    ``refund_of_base_minor`` = policy rate x accommodation subtotal after
    discount (the commission base); ``refund_minor`` adds the cleaning fee
    and taxes, always given back before check-in, capped at the total.
    """
    today = today or business_today()
    days_before = (booking.check_in - today).days
    rate = refund_bp_for(booking.cancellation_windows, days_before)
    refund_of_base = apply_bp(booking.commission_base_minor, rate)
    refund = refund_of_base + booking.cleaning_fee_minor + booking.taxes_minor
    return min(refund, booking.total_minor), refund_of_base


def guest_refund_minor(booking: Booking, *, today=None) -> int:
    """
    What the host owes the guest when the guest cancels a confirmed booking (BR-CAN-01, BR-CAN-02).

    Policy rate (from the windows copied at creation) x accommodation
    subtotal after discount, plus the cleaning fee and taxes, which are
    always given back before check-in. "Days before" are calendar days in
    Algeria. Never more than the total.
    """
    return guest_refund_parts(booking, today=today)[0]


def refund_of_base_for(booking: Booking, refund_minor: int) -> int:
    """
    Part of a refund that comes from the commission base (admin cancellations).

    The cleaning fee and taxes are refunded first; what is left of the
    refund comes from the accommodation subtotal, at most the whole base.
    """
    rest = refund_minor - booking.cleaning_fee_minor - booking.taxes_minor
    return max(0, min(rest, booking.commission_base_minor))


def commission_to_return(booking: Booking, refund_of_base_minor: int) -> int:
    """Commission share given back to the host: it follows the refund (DEC-018 revised 2026-11-13)."""
    return ledger.commission_share_to_return(
        commission_minor=booking.commission_minor, commission_base_minor=booking.commission_base_minor,
        refund_of_base_minor=refund_of_base_minor,
    )


def _commission_increment(booking: Booking, target_total_minor: int) -> int:
    """
    Commission to give back now so the total returned reaches ``target_total_minor`` (BR-PAY-05).

    Earlier reversals (partial refunds) are subtracted, and never more than
    what BLADUS still keeps is returned.
    """
    returned = ledger.commission_returned_minor(booking.id)
    return max(0, min(target_total_minor - returned, ledger.commission_remaining_minor(booking.id)))


def commission_back_for_total_refund(booking: Booking, total_refund_minor: int) -> int:
    """
    Commission to return now when the guest's refunds add up to ``total_refund_minor`` (BR-CAN-04).

    refund_of_base = clamp(R - cleaning fee - taxes, 0, base); the share of
    the commission follows it; earlier reversals are subtracted.
    """
    return _commission_increment(booking, commission_to_return(booking, refund_of_base_for(booking, total_refund_minor)))


@dataclass(frozen=True)
class CancellationTerms:
    """
    What a cancellation does right now (BR-CAN-01 to BR-CAN-03, BR-PAY-05).

    Computed by :func:`guest_cancellation_terms` and
    :func:`host_cancellation_terms`, which both the preview endpoints and
    the real cancellations use, so the preview can never differ from the result.
    """

    allowed: bool
    not_allowed_code: str | None
    policy_code: str
    days_before_check_in: int
    refund_percent_bp: int
    refund_minor: int
    kept_by_host_minor: int
    commission_back_minor: int


def _days_before(booking: Booking, now) -> int:
    """Calendar days in Algeria between ``now`` and check-in (BR-CAN-01)."""
    return (booking.check_in - now.astimezone(business_tz()).date()).days


def _refused(booking: Booking, code: str, now, rate: int = 0) -> CancellationTerms:
    """Terms of a cancellation that is not allowed: nothing moves."""
    return CancellationTerms(
        allowed=False, not_allowed_code=code, policy_code=booking.listing_snapshot.get("policy_code") or "",
        days_before_check_in=_days_before(booking, now), refund_percent_bp=rate, refund_minor=0,
        kept_by_host_minor=0, commission_back_minor=0,
    )


def guest_cancellation_terms(booking: Booking, *, now=None) -> CancellationTerms:
    """
    What the guest gets back if they cancel now (BR-CAN-01, BR-CAN-02, BR-PAY-05).

    Pending: withdrawn, nothing was paid, nothing owed. Confirmed and before
    check-in time: policy rate x accommodation subtotal plus cleaning fee and
    taxes, minus refunds already decided; the host gets back the same share
    of the commission. Otherwise refused (``booking_not_cancellable`` or
    ``too_late_to_cancel``).
    """
    now = now or timezone.now()
    days = _days_before(booking, now)
    rate = refund_bp_for(booking.cancellation_windows, days)
    policy = booking.listing_snapshot.get("policy_code") or ""
    if booking.status == BookingStatus.PENDING:
        return CancellationTerms(True, None, policy, days, rate, 0, 0, 0)
    if booking.status != BookingStatus.CONFIRMED:
        return _refused(booking, "booking_not_cancellable", now, rate)
    if now >= check_in_at(booking):
        return _refused(booking, "too_late_to_cancel", now, rate)
    refund_total, refund_of_base = guest_refund_parts(booking, today=now.astimezone(business_tz()).date())
    refund_now = max(0, refund_total - booking.refund_due_minor)
    commission_back = _commission_increment(booking, commission_to_return(booking, refund_of_base))
    kept = booking.total_minor - booking.refund_due_minor - refund_now
    return CancellationTerms(True, None, policy, days, rate, refund_now, kept, commission_back)


def host_cancellation_terms(booking: Booking, *, now=None) -> CancellationTerms:
    """
    What a host cancellation means now (BR-CAN-03, BR-PAY-05).

    Only a confirmed booking (``booking_not_cancellable``; a request is
    declined instead): the guest is owed everything not refunded yet and
    the host gets back all the commission BLADUS still keeps.
    """
    now = now or timezone.now()
    if booking.status != BookingStatus.CONFIRMED:
        return _refused(booking, "booking_not_cancellable", now)
    refund_now = booking.total_minor - booking.refund_due_minor
    return CancellationTerms(
        allowed=True, not_allowed_code=None, policy_code=booking.listing_snapshot.get("policy_code") or "",
        days_before_check_in=_days_before(booking, now), refund_percent_bp=10_000, refund_minor=refund_now,
        kept_by_host_minor=0, commission_back_minor=ledger.commission_remaining_minor(booking.id),
    )


def preview_guest_cancellation(*, guest, booking_id) -> CancellationTerms:
    """``GET /me/bookings/{id}/cancellation-preview``: pure calculation, nothing changes (BR-CAN-01)."""
    return guest_cancellation_terms(selectors.get_guest_booking(guest, booking_id))


def preview_host_cancellation(*, ctx, booking_id) -> CancellationTerms:
    """
    ``GET /host/bookings/{id}/cancellation-preview`` (BR-CAN-03): needs ``bookings.view``.

    A caller without ``bookings.cancel`` sees ``allowed: false`` with
    ``host_permission_denied``, the same answer the real action would give.
    """
    ctx.require("bookings.view")
    booking = selectors.get_host_booking(ctx.host_account, booking_id)
    terms = host_cancellation_terms(booking)
    if terms.allowed and not ctx.can("bookings.cancel"):
        return _refused(booking, "host_permission_denied", timezone.now())
    return terms


def _open_refund(booking: Booking, *, amount_minor: int, kind: str, reason: str, actor,
                 reason_code: str = "", due_from=None) -> Refund:
    """
    Record one refund and the debt it opens (BR-CAN-04, BR-CAN-06, review R8).

    Adds the amount to ``booking.refund_due_minor`` (the DB check keeps the
    sum within the total), opens the :class:`RefundObligation` with its
    deadline (``due_from`` + ``refund_due_days``; ``due_from`` defaults to
    now, a cancellation passes its own time) and posts the ``refund_due``
    memo lines, keyed by the refund id.
    The caller holds the wallet and booking locks.
    """
    booking.refund_due_minor += amount_minor
    booking.save(update_fields=["refund_due_minor", "updated_at"])
    refund = Refund.objects.create(booking=booking, amount_minor=amount_minor, currency=booking.currency, kind=kind,
                                   reason=reason[:2000], reason_code=(reason_code or "")[:64], created_by=actor)
    days = int(config.get_value("refund_due_days"))
    RefundObligation.objects.create(
        booking=booking, refund=refund, host_account=booking.host_account, guest=booking.guest,
        amount_minor=amount_minor, currency=booking.currency, due_at=(due_from or timezone.now()) + timedelta(days=days),
    )
    ledger.record_refund_due(host_account=booking.host_account, booking_id=booking.id, amount_minor=amount_minor,
                             reference=booking.reference, refund_id=refund.id)
    return refund


def _cancel(booking: Booking, *, actor, role: str, reason: str, refund_minor: int, refund_kind: str = "",
            commission_back_minor: int = 0) -> Booking:
    """
    Shared end of every cancellation (section 8).

    Frees the stock, records who cancelled, opens the refund owed now (if
    any) with its debt and memo lines (review R8), gives back
    ``commission_back_minor`` of the commission if the booking was confirmed
    (DEC-018 revised), and queues the hotel push. The caller holds the
    wallet and booking locks (:func:`_lock`).
    """
    was_confirmed = booking.status == BookingStatus.CONFIRMED
    _release(booking)
    booking.cancelled_by_role = role
    booking.cancel_reason = reason
    _transition(booking, BookingStatus.CANCELLED, actor=actor, role=role, note=reason,
                fields=("cancelled_by_role", "cancel_reason"))
    refund = None
    if refund_minor > 0:
        refund = _open_refund(booking, amount_minor=refund_minor, kind=refund_kind or RefundKind.STAFF,
                              reason=reason, actor=actor, due_from=booking.cancelled_at)
    if was_confirmed and commission_back_minor > 0:
        ledger.reverse_commission(host_account=booking.host_account, booking_id=booking.id,
                                  amount_minor=commission_back_minor, reference=booking.reference,
                                  refund_id=refund.id if refund else None)
    _announce_room_change(booking)
    return booking


def _raise_refused(terms: CancellationTerms) -> None:
    """Turn refused terms into the error the API answers."""
    if terms.not_allowed_code == "too_late_to_cancel":
        raise DomainError("Contact support to cancel after check-in time.", code="too_late_to_cancel", status_code=409)
    if terms.not_allowed_code == "booking_not_cancellable":
        raise ConflictError("This booking can no longer be cancelled.", code="booking_not_cancellable")
    raise ConflictError("This booking cannot be cancelled now.", code=terms.not_allowed_code or "conflict")


@transaction.atomic
def cancel_by_guest(*, guest, booking_id, reason: str = "") -> Booking:
    """
    The guest cancels their booking (BR-CAN-01, BR-CAN-02).

    Uses :func:`guest_cancellation_terms`, exactly like the preview.
    Pending: withdrawn, nothing owed. Confirmed: refund by the policy
    windows, only until check-in time on arrival day (``too_late_to_cancel``;
    support can still cancel); the host gets back the same share of the
    commission (DEC-018 revised). Other states: ``booking_not_cancellable``.
    """
    booking = _lock(selectors.get_guest_booking(guest, booking_id))
    terms = guest_cancellation_terms(booking)
    if not terms.allowed:
        _raise_refused(terms)
    return _cancel(booking, actor=guest, role=ActorRole.GUEST, reason=(reason or "").strip(),
                   refund_minor=terms.refund_minor, refund_kind=RefundKind.POLICY,
                   commission_back_minor=terms.commission_back_minor)


@transaction.atomic
def cancel_by_host(*, ctx, booking_id, actor, reason: str) -> Booking:
    """
    The host cancels a confirmed booking (BR-CAN-03): needs ``bookings.cancel``
    and a reason; the guest is owed the full total and the host gets the
    full commission back (DEC-018 revised). A pending request is declined instead.
    Uses :func:`host_cancellation_terms`, exactly like the preview.
    Audited, because it moves money and feeds the host cancellation count.
    """
    ctx.require("bookings.cancel")
    reason = _clean_reason(reason)
    booking = _lock(selectors.get_host_booking(ctx.host_account, booking_id))
    terms = host_cancellation_terms(booking)
    if not terms.allowed:
        raise ConflictError("Only a confirmed booking can be cancelled; decline a request instead.",
                            code="booking_not_cancellable")
    _cancel(booking, actor=actor, role=ActorRole.HOST, reason=reason, refund_minor=terms.refund_minor,
            refund_kind=RefundKind.HOST_CANCEL, commission_back_minor=terms.commission_back_minor)
    audit.record(actor=actor, action="BOOKING_CANCEL_BY_HOST", obj=booking, note=reason,
                 before={"status": BookingStatus.CONFIRMED},
                 after={"status": booking.status, "refund_due_minor": booking.refund_due_minor})
    return booking


@transaction.atomic
def cancel_by_admin(*, actor, booking_id, reason: str, refund_due_minor: int | None = None) -> Booking:
    """
    A BLADUS admin cancels a pending or confirmed booking (section 8, BR-CAN-04).

    Reason required. ``refund_due_minor`` is the refund decided now, between
    0 and the total minus refunds already decided; when not given: all of
    it for a confirmed booking, 0 for a pending one (nothing was paid yet).
    The commission follows the refunds (BR-PAY-05). Audited (BR-STF-02).
    """
    reason = _clean_reason(reason)
    booking = _lock(selectors.get_admin_booking(booking_id))
    if not booking.is_active:
        raise ConflictError("This booking can no longer be cancelled.", code="booking_not_cancellable")
    remaining = booking.total_minor - booking.refund_due_minor
    if refund_due_minor is None:
        refund_due_minor = remaining if booking.status == BookingStatus.CONFIRMED else 0
    if not 0 <= refund_due_minor <= remaining:
        raise DomainError("The refund must be between 0 and the booking total.", code="invalid_refund",
                          errors={"refund_due_minor": [f"Between 0 and {remaining}."]})
    before = booking.status
    back = commission_back_for_total_refund(booking, booking.refund_due_minor + refund_due_minor)
    _cancel(booking, actor=actor, role=ActorRole.ADMIN, reason=reason, refund_minor=refund_due_minor,
            refund_kind=RefundKind.STAFF, commission_back_minor=back)
    audit.record(actor=actor, action="BOOKING_CANCEL_BY_ADMIN", obj=booking, note=reason,
                 before={"status": before}, after={"status": booking.status, "refund_due_minor": booking.refund_due_minor})
    return booking


# ---------------------------------------------------------------------------
# Admin refunds (BR-CAN-04) and disputes (R2, BR-CAN-05)
# ---------------------------------------------------------------------------
REFUNDABLE_STATUSES = (BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED)
DISPUTABLE_STATUSES = (BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED)
# TODO(config): move to platform settings. A dispute may be opened until this many days after check-out (BR-CAN-05).
DISPUTE_WINDOW_DAYS = 14


def _refund(booking: Booking, *, amount_minor: int, kind: str, reason: str, actor, reason_code: str = "") -> Refund:
    """
    Record a refund of ``amount_minor`` on a locked booking and return the commission share (BR-CAN-04, BR-PAY-05).

    1 centime up to the total minus refunds already decided (422
    ``refund_exceeds_total``); refunds add up. The host gets back the
    commission share that follows the new total refunded.
    """
    if booking.status not in REFUNDABLE_STATUSES:
        raise ConflictError("Only a confirmed, completed or cancelled booking can be refunded.",
                            code="booking_not_refundable")
    remaining = booking.total_minor - booking.refund_due_minor
    if amount_minor < 1 or amount_minor > remaining:
        raise DomainError("The refunds would pass the booking total.", code="refund_exceeds_total", status_code=422,
                          errors={"amount": [f"Between 1 and {remaining} centimes."]})
    back = commission_back_for_total_refund(booking, booking.refund_due_minor + amount_minor)
    refund = _open_refund(booking, amount_minor=amount_minor, kind=kind, reason=reason, actor=actor,
                          reason_code=reason_code)
    if back > 0:
        ledger.reverse_commission(host_account=booking.host_account, booking_id=booking.id, amount_minor=back,
                                  reference=booking.reference, refund_id=refund.id)
    return refund


@transaction.atomic
def admin_refund(*, actor, booking_id, amount_minor: int, reason: str, reason_code: str = "") -> Booking:
    """
    Support records a full or partial refund of a booking (BR-CAN-04, BR-PAY-02, BR-PAY-05).

    In M1 the refund is owed by the host (a debt with a deadline); the
    commission follows it in the ledger. Reason required; audited (BR-STF-02).
    """
    reason = _clean_reason(reason)
    booking = _lock(selectors.get_admin_booking(booking_id))
    before = booking.refund_due_minor
    refund = _refund(booking, amount_minor=amount_minor, kind=RefundKind.STAFF, reason=reason, actor=actor,
                     reason_code=reason_code)
    audit.record(actor=actor, action="BOOKING_REFUND", obj=booking, note=reason,
                 before={"refund_due_minor": before},
                 after={"refund_due_minor": booking.refund_due_minor, "refund_id": str(refund.id)})
    return booking


def _open_dispute(booking: Booking, *, user, role: str, reason_code: str, statement: str, media_ids) -> Dispute:
    """
    Open a dispute or add the other side's statement (BR-CAN-05).

    The booking must be confirmed, completed or cancelled (409
    ``booking_not_disputable``) and today at most 14 days after check-out
    (422 ``dispute_window_closed``). One dispute per booking: while it is
    open the other side may add its statement once; otherwise 409 ``dispute_exists``.
    """
    if booking.status not in DISPUTABLE_STATUSES:
        raise ConflictError("This booking cannot be disputed.", code="booking_not_disputable")
    if business_today() > booking.check_out + timedelta(days=DISPUTE_WINDOW_DAYS):
        raise DomainError("Disputes can be opened until 14 days after check-out.", code="dispute_window_closed",
                          status_code=422)
    field = "guest_statement" if role == ActorRole.GUEST else "host_statement"
    statement = statement.strip()
    dispute = Dispute.objects.select_for_update().filter(booking=booking).first()
    if dispute is not None:
        if not dispute.is_open or getattr(dispute, field):
            raise ConflictError("A dispute already exists for this booking.", code="dispute_exists")
        setattr(dispute, field, statement)
        dispute.media_ids = list(dispute.media_ids) + [str(m) for m in media_ids or []]
        dispute.save(update_fields=[field, "media_ids"])
        return dispute
    return Dispute.objects.create(
        booking=booking, opened_by=user, opened_by_role=role, reason_code=reason_code[:64],
        media_ids=[str(m) for m in media_ids or []], **{field: statement},
    )


@transaction.atomic
def open_dispute_as_guest(*, guest, booking_id, reason_code: str, statement: str, media_ids=None) -> Dispute:
    """The guest opens a dispute about one of their bookings (BR-CAN-05)."""
    booking = selectors.get_guest_booking(guest, booking_id)
    booking = Booking.objects.select_for_update().get(pk=booking.pk)
    return _open_dispute(booking, user=guest, role=ActorRole.GUEST, reason_code=reason_code, statement=statement,
                         media_ids=media_ids)


@transaction.atomic
def open_dispute_as_host(*, ctx, booking_id, actor, reason_code: str, statement: str, media_ids=None) -> Dispute:
    """The host opens a dispute (BR-CAN-05): needs ``bookings.respond``, scoped to the active workspace."""
    ctx.require("bookings.respond")
    booking = selectors.get_host_booking(ctx.host_account, booking_id)
    booking = Booking.objects.select_for_update().get(pk=booking.pk)
    dispute = _open_dispute(booking, user=actor, role=ActorRole.HOST, reason_code=reason_code, statement=statement,
                            media_ids=media_ids)
    audit.record(actor=actor, action="DISPUTE_OPEN_BY_HOST", obj=dispute, after={"booking": str(booking.id)})
    return dispute


@transaction.atomic
def resolve_dispute(*, actor, booking_id, outcome: str, note: str, refund_amount_minor: int | None = None) -> Booking:
    """
    Support resolves a dispute (BR-CAN-05, BR-STF-02).

    ``refund_full`` refunds everything not refunded yet, ``refund_partial``
    needs ``refund_amount`` (same limits as :func:`admin_refund`),
    ``declined`` refunds nothing. Note required (10 characters or more).
    404 ``dispute_not_found``, 409 ``dispute_already_resolved``. Audited.
    """
    note = (note or "").strip()
    if len(note) < 10:
        raise DomainError("Give a note of at least 10 characters.", code="reason_required",
                          errors={"note": ["At least 10 characters."]})
    booking = _lock(selectors.get_admin_booking(booking_id))
    dispute = Dispute.objects.select_for_update().filter(booking=booking).first()
    if dispute is None:
        raise NotFoundError("This booking has no dispute.", code="dispute_not_found")
    if not dispute.is_open:
        raise ConflictError("This dispute is already resolved.", code="dispute_already_resolved")
    refund_minor = 0
    if outcome == DisputeOutcome.REFUND_FULL:
        refund_minor = booking.total_minor - booking.refund_due_minor
    elif outcome == DisputeOutcome.REFUND_PARTIAL:
        if not refund_amount_minor:
            raise DomainError("Give the refund amount.", code="refund_amount_required",
                              errors={"refund_amount": ["Required for refund_partial."]})
        refund_minor = refund_amount_minor
    elif refund_amount_minor:
        raise DomainError("A declined dispute has no refund.", code="invalid",
                          errors={"refund_amount": ["Must be empty when declined."]})
    if refund_minor > 0:
        _refund(booking, amount_minor=refund_minor, kind=RefundKind.DISPUTE, reason=note, actor=actor)
    dispute.outcome, dispute.refund_minor, dispute.resolution_note = outcome, refund_minor, note
    dispute.resolved_by, dispute.resolved_at = actor, timezone.now()
    dispute.save(update_fields=["outcome", "refund_minor", "resolution_note", "resolved_by", "resolved_at"])
    audit.record(actor=actor, action="DISPUTE_RESOLVE", obj=dispute, note=note,
                 after={"outcome": outcome, "refund_minor": refund_minor})
    return booking


# ---------------------------------------------------------------------------
# Online payment: DORMANT (DEC-019, BR-PAY-11)
# ---------------------------------------------------------------------------
PAYABLE_STATUSES = (BookingStatus.PENDING, BookingStatus.CONFIRMED)


def start_payment(*, guest, booking_id):
    """
    The guest pays a booking online (M2 to M4). 404 while guest payments are off (BR-PAY-11).

    Only a pending or confirmed booking of the guest (409
    ``booking_not_payable``); the amount is the frozen total (BR-BKG-07).
    """
    ledger.require_guest_payments()
    booking = selectors.get_guest_booking(guest, booking_id)
    if booking.status not in PAYABLE_STATUSES:
        raise ConflictError("This booking cannot be paid.", code="booking_not_payable")
    return ledger.start_guest_payment(booking_id=booking.id, guest=guest, amount_minor=booking.total_minor,
                                      currency=booking.currency, reference=booking.reference)


# ---------------------------------------------------------------------------
# Scheduled jobs (BR-BKG-04, BR-BKG-05)
# ---------------------------------------------------------------------------
def expire_pending_requests(now: datetime | None = None) -> int:
    """
    Expire every request whose deadline has passed and free its stock (BR-BKG-04).

    No money moves (BR-PAY-05). Each booking is handled in its own
    transaction under a lock, so a host accepting at the same moment wins
    or loses cleanly. Returns how many bookings expired. Run every 5 minutes
    (management command ``expire_requests``).
    """
    now = now or timezone.now()
    ids = list(Booking.objects.filter(status=BookingStatus.PENDING, request_expires_at__lte=now)
               .values_list("id", flat=True))
    count = 0
    for booking_id in ids:
        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(pk=booking_id)
            # Re-check under the lock: the host may have answered in between.
            if booking.status != BookingStatus.PENDING or booking.request_expires_at > now:
                continue
            _release(booking)
            _transition(booking, BookingStatus.EXPIRED, actor=None, role=ActorRole.SYSTEM)
            _announce_room_change(booking)
            count += 1
    return count


def complete_finished_stays(now: datetime | None = None) -> int:
    """
    Mark confirmed bookings completed once check-out time + 2 hours has
    passed in Algeria (BR-BKG-05, DEC-010). Returns how many were completed.
    Run every 5 minutes (management command ``complete_stays``).
    """
    now = now or timezone.now()
    local_today = now.astimezone(business_tz()).date()
    # Cheap first filter on the date; the exact time is checked per booking.
    candidates = Booking.objects.filter(status=BookingStatus.CONFIRMED, check_out__lte=local_today)
    count = 0
    for candidate in candidates:
        if check_out_at(candidate) + COMPLETION_DELAY > now:
            continue
        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(pk=candidate.pk)
            if booking.status != BookingStatus.CONFIRMED:
                continue
            _transition(booking, BookingStatus.COMPLETED, actor=None, role=ActorRole.SYSTEM)
            count += 1
    return count


# ---------------------------------------------------------------------------
# Stay confirmation (review R13)
# ---------------------------------------------------------------------------
STAY_CONFIRMABLE = (BookingStatus.CONFIRMED, BookingStatus.COMPLETED)


def _mark_stay(booking: Booking, via: str) -> Booking:
    """Record the first proof that the stay happened; later proofs change nothing."""
    if booking.stay_confirmed_at is None:
        booking.stay_confirmed_at, booking.stay_confirmed_via = timezone.now(), via
        booking.save(update_fields=["stay_confirmed_at", "stay_confirmed_via", "updated_at"])
    return booking


@transaction.atomic
def confirm_stay_by_host(*, ctx, booking_id, code: str) -> Booking:
    """
    The host enters the guest's check-in code on arrival (review R13).

    Needs ``bookings.respond``; the booking must be confirmed or completed,
    its check-in day reached, and the code right (``invalid_code``). The
    stay then counts as proven, which a review needs.
    """
    ctx.require("bookings.respond")
    booking = Booking.objects.select_for_update().get(pk=selectors.get_host_booking(ctx.host_account, booking_id).pk)
    if booking.status not in STAY_CONFIRMABLE:
        raise ConflictError("Only a confirmed stay can be confirmed.", code="booking_not_confirmed")
    if business_today() < booking.check_in:
        raise ConflictError("The stay has not started yet.", code="stay_not_started")
    if not booking.check_in_code or not secrets.compare_digest(booking.check_in_code, (code or "").strip()):
        raise DomainError("This code is not right.", code="invalid_code", errors={"code": ["Wrong code."]})
    return _mark_stay(booking, StayConfirmedVia.HOST_CODE)


@transaction.atomic
def confirm_stay_by_guest(*, guest, booking_id) -> Booking:
    """
    The guest confirms the stay took place, from check-in time on (review R13).

    Only for a confirmed or completed booking (``booking_not_confirmed``),
    not before check-in time (``stay_not_started``).
    """
    booking = Booking.objects.select_for_update().get(pk=selectors.get_guest_booking(guest, booking_id).pk)
    if booking.status not in STAY_CONFIRMABLE:
        raise ConflictError("Only a confirmed stay can be confirmed.", code="booking_not_confirmed")
    if timezone.now() < check_in_at(booking):
        raise ConflictError("The stay has not started yet.", code="stay_not_started")
    return _mark_stay(booking, StayConfirmedVia.GUEST)


# ---------------------------------------------------------------------------
# Refund debts (review R8)
# ---------------------------------------------------------------------------
def _lock_refund(queryset, refund_id) -> RefundObligation:
    """Read one refund debt of ``queryset`` under a lock, or 404."""
    try:
        refund_uuid = uuid.UUID(str(refund_id))
    except (TypeError, ValueError) as exc:
        raise NotFoundError("Refund not found.") from exc
    refund = queryset.select_for_update().filter(pk=refund_uuid).first()
    if refund is None:
        raise NotFoundError("Refund not found.")
    return refund


@transaction.atomic
def declare_refund_paid(*, ctx, refund_id, actor, payment_reference: str) -> RefundObligation:
    """
    The host says the refund was sent, with a transfer reference (review R8).

    Needs ``bookings.cancel`` (the people who handle money with guests).
    The debt is settled only when the guest confirms or an admin checks the
    proof; while declared it does not count as overdue.
    """
    ctx.require("bookings.cancel")
    reference = (payment_reference or "").strip()
    if not reference:
        raise DomainError("Give the transfer reference.", code="reference_required",
                          errors={"payment_reference": ["Required."]})
    refund = _lock_refund(RefundObligation.objects.filter(host_account=ctx.host_account), refund_id)
    if refund.status not in (RefundStatus.OPEN, RefundStatus.DISPUTED):
        raise ConflictError("This refund is not waiting for payment.", code="refund_not_open")
    refund.status, refund.declared_at, refund.payment_reference = RefundStatus.DECLARED, timezone.now(), reference[:200]
    refund.save(update_fields=["status", "declared_at", "payment_reference"])
    audit.record(actor=actor, action="REFUND_DECLARED_PAID", obj=refund, after={"amount_minor": refund.amount_minor})
    return refund


def _settle(refund: RefundObligation, *, actor, note: str = "") -> RefundObligation:
    """Close a refund debt and write the ledger memo line that cancels it."""
    refund.status, refund.settled_at, refund.settled_by = RefundStatus.SETTLED, timezone.now(), actor
    refund.note = note or refund.note
    refund.save(update_fields=["status", "settled_at", "settled_by", "note"])
    ledger.record_refund_settled(host_account=refund.host_account, booking_id=refund.booking_id,
                                 reference=refund.booking.reference, actor=actor, refund_id=refund.refund_id)
    if refund.refund_id:
        Refund.objects.filter(pk=refund.refund_id).update(settlement=RefundSettlement.SETTLED_CONFIRMED)
    return refund


@transaction.atomic
def confirm_refund_received(*, guest, refund_id) -> RefundObligation:
    """The guest confirms the money arrived: the debt is settled (review R8)."""
    refund = _lock_refund(RefundObligation.objects.filter(guest=guest), refund_id)
    if refund.status == RefundStatus.SETTLED:
        return refund
    return _settle(refund, actor=guest)


@transaction.atomic
def dispute_refund(*, guest, refund_id, note: str) -> RefundObligation:
    """
    The guest says a declared refund never arrived (review R8).

    The debt goes back to unpaid (``disputed``); if its deadline has passed
    the host is blocked again until it is settled.
    """
    note = (note or "").strip()
    if not note:
        raise DomainError("Say what is wrong.", code="reason_required", errors={"note": ["Required."]})
    refund = _lock_refund(RefundObligation.objects.filter(guest=guest), refund_id)
    if refund.status != RefundStatus.DECLARED:
        raise ConflictError("Only a refund the host declared paid can be disputed.", code="refund_not_declared")
    refund.status, refund.note = RefundStatus.DISPUTED, note[:2000]
    refund.save(update_fields=["status", "note"])
    return refund


@transaction.atomic
def admin_settle_refund(*, actor, refund_id, note: str) -> RefundObligation:
    """An admin closes a refund debt after checking the proof (review R8). Note required, audited."""
    note = (note or "").strip()
    if not note:
        raise DomainError("Say which proof was checked.", code="reason_required", errors={"note": ["Required."]})
    refund = _lock_refund(RefundObligation.objects.all(), refund_id)
    if refund.status == RefundStatus.SETTLED:
        raise ConflictError("This refund is already settled.", code="refund_settled")
    before = refund.status
    _settle(refund, actor=actor, note=note[:2000])
    audit.record(actor=actor, action="REFUND_SETTLE_BY_ADMIN", obj=refund, note=note,
                 before={"status": before}, after={"status": refund.status})
    return refund
