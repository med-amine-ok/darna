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
- BR-CAN-01 to 03: refund owed by the host after a cancellation (DEC-001);
- BR-PAY-04/05, DEC-018: commission taken at confirmation, given back in
  full whenever a confirmed booking is cancelled; nothing on decline or expiry.

Every function that writes runs inside ``transaction.atomic`` and reads the
booking with ``select_for_update`` so two actions cannot cross.
"""

import uuid
from datetime import datetime, time, timedelta

from django.db import transaction
from django.utils import timezone

from apps.audit import services as audit
from apps.catalog.models import POLICY_WINDOWS, Listing
from apps.config import services as config
from apps.core.errors import ConflictError, DomainError, ForbiddenError, NotFoundError
from apps.core.ids import human_reference
from apps.core.money import apply_bp
from apps.core.timeutils import business_datetime, business_today, business_tz
from apps.hosts.models import ApprovalMode
from apps.hosts.selectors import host_accounts_for
from apps.inventory import services as inventory
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
    InventoryKind,
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
    """Re-read a booking with a row lock, so two actions on it run one after the other."""
    return Booking.objects.select_for_update().get(pk=booking.pk)


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
    booking (the lock makes two guests racing for the same nights wait for
    each other; on PostgreSQL an exclusion constraint can back it up).
    Pools: one conditional ``UPDATE`` in inventory or trips. Pending
    requests count as ``booked`` too: a request keeps the dates blocked
    until it is answered or expires (BR-BKG-03); ``held`` is kept for the
    15-minute payment holds of BR-AVL-06, which do not exist yet.
    """
    if kind == InventoryKind.SINGLE:
        Listing.objects.select_for_update().filter(pk=result.listing.pk).first()
        if _single_unit_overlaps(result.listing.pk, result.check_in, result.check_out):
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
    _reserve(kind, result)

    # BR-BKG-01/02: instant only when the mode says so AND the deposit is above its floor (BR-PAY-10).
    instant = (
        pricing.effective_approval_mode(target) == ApprovalMode.INSTANT
        and ledger.can_accept_bookings(host_account)
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
    )
    if not instant:
        # BR-BKG-04, DEC-008: the host has request_ttl_hours, or until check-in time if that is sooner.
        ttl = timedelta(hours=int(config.get_value("request_ttl_hours")))
        booking.request_expires_at = min(now + ttl, check_in_at(booking))
    booking.save()
    _record_event(booking, "", actor=guest, role=ActorRole.GUEST)
    if instant:
        ledger.post_commission(host_account=host_account, booking_id=booking.id,
                               amount_minor=booking.commission_minor, reference=booking.reference)
    return booking


# ---------------------------------------------------------------------------
# Host answers (BR-BKG-03)
# ---------------------------------------------------------------------------
@transaction.atomic
def accept_booking(*, ctx, booking_key, actor) -> Booking:
    """
    The host accepts a request (BR-BKG-03): needs ``bookings.respond``, the
    booking must be pending and not past its deadline (``request_expired``),
    and the deposit must be above the credit floor (``deposit_below_floor``,
    BR-PAY-10). The commission is posted now (BR-PAY-04).
    """
    ctx.require("bookings.respond")
    booking = _lock(selectors.get_host_booking(ctx.host_account, booking_key))
    if booking.status != BookingStatus.PENDING:
        raise ConflictError("Only a pending request can be accepted.", code="booking_not_pending")
    if booking.request_expires_at and booking.request_expires_at <= timezone.now():
        raise ConflictError("This request has expired.", code="request_expired")
    if not ledger.can_accept_bookings(ctx.host_account):
        raise DomainError("Top up your deposit before accepting new bookings.", code="deposit_below_floor",
                          status_code=409)
    _transition(booking, BookingStatus.CONFIRMED, actor=actor, role=ActorRole.HOST)
    ledger.post_commission(host_account=booking.host_account, booking_id=booking.id,
                           amount_minor=booking.commission_minor, reference=booking.reference)
    return booking


@transaction.atomic
def decline_booking(*, ctx, booking_key, actor, reason: str) -> Booking:
    """
    The host declines a request with a reason (BR-BKG-03). The dates or
    seats are freed at once; no money moves (BR-PAY-05).
    """
    ctx.require("bookings.respond")
    reason = _clean_reason(reason)
    booking = _lock(selectors.get_host_booking(ctx.host_account, booking_key))
    if booking.status != BookingStatus.PENDING:
        raise ConflictError("Only a pending request can be declined.", code="booking_not_pending")
    _release(booking)
    booking.decline_reason = reason
    _transition(booking, BookingStatus.DECLINED, actor=actor, role=ActorRole.HOST, note=reason,
                fields=("decline_reason",))
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


def guest_refund_minor(booking: Booking, *, today=None) -> int:
    """
    What the host owes the guest when the guest cancels a confirmed booking (BR-CAN-01, BR-CAN-02).

    Policy rate (from the windows copied at creation) x accommodation
    subtotal after discount, plus the cleaning fee and taxes, which are
    always given back before check-in. "Days before" are calendar days in
    Algeria. Never more than the total.
    """
    today = today or business_today()
    days_before = (booking.check_in - today).days
    rate = refund_bp_for(booking.cancellation_windows, days_before)
    refund = apply_bp(booking.commission_base_minor, rate) + booking.cleaning_fee_minor + booking.taxes_minor
    return min(refund, booking.total_minor)


def _cancel(booking: Booking, *, actor, role: str, reason: str, refund_minor: int) -> Booking:
    """
    Shared end of every cancellation: free the stock, record who cancelled and
    the refund owed, and give the full commission back if the booking was
    confirmed (DEC-018, BR-PAY-05).
    """
    was_confirmed = booking.status == BookingStatus.CONFIRMED
    _release(booking)
    booking.refund_due_minor = refund_minor
    booking.cancelled_by_role = role
    booking.cancel_reason = reason
    _transition(booking, BookingStatus.CANCELLED, actor=actor, role=role, note=reason,
                fields=("refund_due_minor", "cancelled_by_role", "cancel_reason"))
    if was_confirmed:
        ledger.reverse_commission(host_account=booking.host_account, booking_id=booking.id, reference=booking.reference)
    return booking


@transaction.atomic
def cancel_by_guest(*, guest, booking_key, reason: str = "") -> Booking:
    """
    The guest cancels their booking (BR-CAN-01, BR-CAN-02).

    Pending: withdrawn, nothing owed. Confirmed: refund by the policy windows,
    and only until check-in time on arrival day (``too_late_to_cancel``;
    support can still cancel). Other states: ``booking_not_cancellable``.
    """
    booking = _lock(selectors.get_guest_booking(guest, booking_key))
    reason = (reason or "").strip()
    if booking.status == BookingStatus.PENDING:
        return _cancel(booking, actor=guest, role=ActorRole.GUEST, reason=reason, refund_minor=0)
    if booking.status != BookingStatus.CONFIRMED:
        raise ConflictError("This booking can no longer be cancelled.", code="booking_not_cancellable")
    if timezone.now() >= check_in_at(booking):
        raise DomainError("Contact support to cancel after check-in time.", code="too_late_to_cancel", status_code=409)
    return _cancel(booking, actor=guest, role=ActorRole.GUEST, reason=reason, refund_minor=guest_refund_minor(booking))


@transaction.atomic
def cancel_by_host(*, ctx, booking_key, actor, reason: str) -> Booking:
    """
    The host cancels a confirmed booking (BR-CAN-03): needs ``bookings.cancel``
    and a reason; the guest is owed the full total and the host gets the
    full commission back (DEC-018). A pending request is declined instead.
    Audited, because it moves money and feeds the host cancellation count.
    """
    ctx.require("bookings.cancel")
    reason = _clean_reason(reason)
    booking = _lock(selectors.get_host_booking(ctx.host_account, booking_key))
    if booking.status != BookingStatus.CONFIRMED:
        raise ConflictError("Only a confirmed booking can be cancelled; decline a request instead.",
                            code="booking_not_cancellable")
    _cancel(booking, actor=actor, role=ActorRole.HOST, reason=reason, refund_minor=booking.total_minor)
    audit.record(actor=actor, action="BOOKING_CANCEL_BY_HOST", obj=booking, note=reason,
                 before={"status": BookingStatus.CONFIRMED},
                 after={"status": booking.status, "refund_due_minor": booking.refund_due_minor})
    return booking


@transaction.atomic
def cancel_by_admin(*, actor, booking_key, reason: str, refund_due_minor: int | None = None) -> Booking:
    """
    A BLADUS admin cancels a pending or confirmed booking (section 8, BR-CAN-04).

    Reason required. ``refund_due_minor`` between 0 and the total; when not
    given: the full total for a confirmed booking, 0 for a pending one
    (nothing was paid yet). Commission is given back in full if it was taken
    (DEC-018). Audited (BR-STF-02).
    """
    reason = _clean_reason(reason)
    booking = _lock(selectors.get_admin_booking(booking_key))
    if not booking.is_active:
        raise ConflictError("This booking can no longer be cancelled.", code="booking_not_cancellable")
    if refund_due_minor is None:
        refund_due_minor = booking.total_minor if booking.status == BookingStatus.CONFIRMED else 0
    if not 0 <= refund_due_minor <= booking.total_minor:
        raise DomainError("The refund must be between 0 and the booking total.", code="invalid_refund",
                          errors={"refund_due_minor": [f"Between 0 and {booking.total_minor}."]})
    before = booking.status
    _cancel(booking, actor=actor, role=ActorRole.ADMIN, reason=reason, refund_minor=refund_due_minor)
    audit.record(actor=actor, action="BOOKING_CANCEL_BY_ADMIN", obj=booking, note=reason,
                 before={"status": before}, after={"status": booking.status, "refund_due_minor": refund_due_minor})
    return booking


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
