"""
Database models of the bookings app.

- ``Booking``: one reservation of a home, vehicle, room, bed, experience
  seat or trip seat. It keeps a snapshot of everything agreed at creation
  (price lines, commission rate, cancellation windows, listing details), so
  later edits of the listing never change it (BR-BKG-07).
- ``BookingEvent``: the append-only history of its status changes (BR-BKG-06).
- ``Refund`` and ``RefundObligation``: refunds decided for a booking and the
  debt the host must pay back (BR-CAN-04, BR-CAN-06, review R8).
- ``Dispute``: a disagreement about a booking (R2, BR-CAN-05).

Payments are not collected online in this version (DEC-001, DEC-019): the
guest pays the host directly, ``payment_status`` stays ``not_collected`` and
``refund_due_minor`` is what the host owes the guest after a cancellation.
"""

from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

from apps.core.models import TimeStampedModel, UUIDModel


class BookingStatus(models.TextChoices):
    """States of a booking (BR-BKG-06, table 7a). ``disputed`` comes with disputes (R2)."""

    PENDING = "pending", "Pending (waiting for the host)"
    CONFIRMED = "confirmed", "Confirmed"
    DECLINED = "declined", "Declined by the host"
    EXPIRED = "expired", "Expired without an answer"
    CANCELLED = "cancelled", "Cancelled"
    COMPLETED = "completed", "Completed"


# States that keep the dates or seats taken (BR-AVL-01, BR-BKG-03).
BLOCKING_STATUSES = (BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED)

# States that can still change through a guest, host or admin action.
ACTIVE_STATUSES = (BookingStatus.PENDING, BookingStatus.CONFIRMED)

# Allowed moves of table 7a: {from: {to, ...}}. ``""`` is a new booking.
TRANSITIONS: dict[str, set[str]] = {
    "": {BookingStatus.PENDING, BookingStatus.CONFIRMED},          # request mode / instant mode (BR-BKG-01)
    BookingStatus.PENDING: {
        BookingStatus.CONFIRMED,   # host accepts
        BookingStatus.DECLINED,    # host declines
        BookingStatus.EXPIRED,     # job, BR-BKG-04
        BookingStatus.CANCELLED,   # guest withdraws (or admin)
    },
    BookingStatus.CONFIRMED: {
        BookingStatus.CANCELLED,   # guest, host or admin (section 8)
        BookingStatus.COMPLETED,   # job, BR-BKG-05
    },
    BookingStatus.DECLINED: set(),
    BookingStatus.EXPIRED: set(),
    BookingStatus.CANCELLED: set(),
    BookingStatus.COMPLETED: set(),
}


def can_transition(current: str, new: str) -> bool:
    """True when table 7a allows ``current -> new`` (BR-BKG-06). ``current=""`` means a new booking."""
    return new in TRANSITIONS.get(current or "", set())


class InventoryKind(models.TextChoices):
    """How the booking takes stock: one whole unit, rooms of a pool, seats of a slot or of a trip departure."""

    SINGLE = "single", "Single unit (home, vehicle)"
    ROOM_POOL = "room_pool", "Rooms or beds"
    SLOT = "slot", "Experience seats"
    DEPARTURE = "departure", "Trip seats"


class StayConfirmedVia(models.TextChoices):
    """Who proved that the stay happened (review R13)."""

    HOST_CODE = "host_code", "Host entered the guest's check-in code"
    GUEST = "guest", "Guest confirmed after check-in time"


class PaymentStatus(models.TextChoices):
    """Payment state, separate from the booking state (BR-BKG-06). Only ``not_collected`` exists now (DEC-001)."""

    NOT_COLLECTED = "not_collected", "Not collected by BLADUS (guest pays the host)"


class ActorRole(models.TextChoices):
    """Who made a change: the guest, the host, a BLADUS admin or a scheduled job."""

    GUEST = "guest", "Guest"
    HOST = "host", "Host"
    ADMIN = "admin", "Admin"
    SYSTEM = "system", "System"


class ApprovalModeApplied(models.TextChoices):
    """Whether the booking was confirmed at once or sent to the host as a request (BR-BKG-01)."""

    INSTANT = "instant", "Instant"
    REQUEST = "request", "Request"


class Booking(UUIDModel, TimeStampedModel):
    """
    A reservation made by a guest from a quote.

    Rules carried by this table:
    - ``status`` follows ``TRANSITIONS`` (BR-BKG-06), changed only by ``services.py``;
    - money in centimes, never negative, ``refund_due <= total`` (BR-PAY-01, BR-CAN-04);
    - commission rate and amount are frozen at creation (BR-BKG-07, BR-PAY-04);
    - for a single unit, two blocking bookings never overlap (BR-AVL-01):
      checked under a row lock in ``services.create_booking`` (on PostgreSQL an
      exclusion constraint can be added by a migration later).
    Slots and departures store their own dates in ``check_in``/``check_out``.
    """

    reference = models.CharField(max_length=20, unique=True, help_text="Human id, e.g. BLD-2026-7K2M9Q.")
    guest = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="bookings")
    host_account = models.ForeignKey("hosts.HostAccount", on_delete=models.PROTECT, related_name="bookings")
    inventory_kind = models.CharField(max_length=12, choices=InventoryKind.choices)
    listing = models.ForeignKey("catalog.Listing", on_delete=models.PROTECT, null=True, blank=True, related_name="bookings")
    room_type = models.ForeignKey("catalog.RoomType", on_delete=models.PROTECT, null=True, blank=True, related_name="bookings")
    experience_slot = models.ForeignKey(
        "inventory.ExperienceSlot", on_delete=models.PROTECT, null=True, blank=True, related_name="bookings"
    )
    trip_departure = models.ForeignKey(
        "trips.TripDeparture", on_delete=models.PROTECT, null=True, blank=True, related_name="bookings"
    )
    check_in = models.DateField()
    check_out = models.DateField(help_text="Exclusive for stays (half-open range); last day for slots and trips.")
    guests = models.PositiveSmallIntegerField()
    units = models.PositiveSmallIntegerField(default=1)

    status = models.CharField(max_length=12, choices=BookingStatus.choices)
    payment_status = models.CharField(max_length=16, choices=PaymentStatus.choices, default=PaymentStatus.NOT_COLLECTED)
    approval_mode_applied = models.CharField(max_length=8, choices=ApprovalModeApplied.choices)
    request_expires_at = models.DateTimeField(null=True, blank=True, help_text="Deadline of a request (BR-BKG-04).")
    confirmed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by_role = models.CharField(max_length=8, choices=ActorRole.choices, blank=True, default="")
    cancel_reason = models.TextField(blank=True)
    decline_reason = models.TextField(blank=True)

    # Money snapshot (BR-BKG-07), in centimes (BR-PAY-01).
    currency = models.CharField(max_length=3, default="DZD")
    subtotal_minor = models.BigIntegerField()
    discount_minor = models.BigIntegerField(default=0)
    cleaning_fee_minor = models.BigIntegerField(default=0)
    taxes_minor = models.BigIntegerField(default=0)
    total_minor = models.BigIntegerField()
    commission_base_minor = models.BigIntegerField(help_text="Subtotal after discount, cleaning fee excluded (DEC-002).")
    commission_rate_bp = models.PositiveIntegerField(help_text="Rate frozen at creation (BR-PAY-06).")
    commission_minor = models.BigIntegerField(help_text="round_half_up(base x rate / 10,000) (BR-PAY-04).")
    refund_due_minor = models.BigIntegerField(default=0, help_text="What the host owes the guest after a cancellation (section 8).")

    price_lines = models.JSONField(default=list)
    cancellation_windows = models.JSONField(default=list, help_text="Copied from the policy at creation (BR-CAN-01).")
    listing_snapshot = models.JSONField(default=dict, help_text="Title, reference, address, check-in/out times (BR-BKG-07).")
    quote = models.ForeignKey("pricing.Quote", on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings")

    # Stay confirmation (review R13): a review is allowed only for a stay that was confirmed.
    check_in_code = models.CharField(max_length=6, blank=True, help_text="6 digits shown to the guest once confirmed; the host enters it on arrival.")
    stay_confirmed_at = models.DateTimeField(null=True, blank=True)
    stay_confirmed_via = models.CharField(max_length=10, choices=StayConfirmedVia.choices, blank=True, default="")

    class Meta:
        """Table options: indexes for the lists and jobs, database checks on money and targets."""

        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["guest", "status"]),
            models.Index(fields=["host_account", "status"]),
            models.Index(fields=["listing", "status", "check_in"]),
            models.Index(fields=["status", "request_expires_at"]),
            models.Index(fields=["status", "check_out"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(subtotal_minor__gte=0) & Q(discount_minor__gte=0) & Q(cleaning_fee_minor__gte=0)
                    & Q(taxes_minor__gte=0) & Q(total_minor__gte=0) & Q(commission_base_minor__gte=0)
                    & Q(commission_minor__gte=0) & Q(refund_due_minor__gte=0)
                ),
                name="booking_money_not_negative",
            ),
            # BR-CAN-04: never owe the guest more than the total.
            models.CheckConstraint(condition=Q(refund_due_minor__lte=F("total_minor")), name="booking_refund_le_total"),
            models.CheckConstraint(condition=Q(commission_rate_bp__lte=10000), name="booking_commission_rate_range"),
            models.CheckConstraint(condition=Q(check_out__gte=F("check_in")), name="booking_dates_in_order"),
            models.CheckConstraint(condition=Q(guests__gt=0) & Q(units__gt=0), name="booking_guests_units_positive"),
            # A listing booking or a trip booking, never both and never none.
            models.CheckConstraint(
                condition=(
                    (Q(listing__isnull=False) & Q(trip_departure__isnull=True))
                    | (Q(listing__isnull=True) & Q(trip_departure__isnull=False))
                ),
                name="booking_one_target",
            ),
        ]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"{self.reference} ({self.status})"

    @property
    def title(self) -> str:
        """Title from the snapshot taken at creation (BR-BKG-07)."""
        return self.listing_snapshot.get("title", "")

    @property
    def is_active(self) -> bool:
        """True while the booking can still be accepted, declined or cancelled."""
        return self.status in ACTIVE_STATUSES

    @property
    def review_eligible(self) -> bool:
        """
        True when a review may be written for this booking (review R13).

        The booking must be completed AND the stay confirmed (host code or
        guest confirmation). Auto-completion alone proves nothing.
        """
        return self.status == BookingStatus.COMPLETED and self.stay_confirmed_at is not None


class BookingEvent(UUIDModel):
    """
    One status change of a booking: who moved it, from which state to which (BR-BKG-06).

    Append-only: a row is never updated or deleted, so the history can be
    trusted by support and in disputes.
    """

    booking = models.ForeignKey(Booking, on_delete=models.PROTECT, related_name="events")
    from_status = models.CharField(max_length=12, blank=True, help_text="Empty for the creation of the booking.")
    to_status = models.CharField(max_length=12, choices=BookingStatus.choices)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    actor_role = models.CharField(max_length=8, choices=ActorRole.choices)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        """Oldest first, so the history reads like a timeline."""

        ordering = ["created_at", "id"]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"{self.booking_id}: {self.from_status or 'new'} -> {self.to_status}"

    def save(self, *args, **kwargs) -> None:
        """Insert only: refuse to change an existing history row."""
        if not self._state.adding:
            raise RuntimeError("Booking events are append-only.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Refuse to delete a history row."""
        raise RuntimeError("Booking events are append-only.")


class RefundStatus(models.TextChoices):
    """Life of a refund a host owes a guest (review R8)."""

    OPEN = "open", "Owed, not paid yet"
    DECLARED = "declared", "Host says it was paid"
    DISPUTED = "disputed", "Guest says it was not received"
    SETTLED = "settled", "Guest received it"


# Statuses that count as unpaid when the deadline has passed.
UNPAID_REFUND_STATUSES = (RefundStatus.OPEN, RefundStatus.DISPUTED)


class RefundKind(models.TextChoices):
    """Why a refund was owed (05b ``refund.kind``)."""

    POLICY = "policy", "Guest cancellation, by the policy"
    HOST_CANCEL = "host_cancel", "Host cancellation"
    STAFF = "staff", "Decided by BLADUS staff"
    DISPUTE = "dispute", "Outcome of a dispute"


class RefundSettlement(models.TextChoices):
    """How the refund reaches the guest. M1: the host pays it back (DEC-019)."""

    OWED_BY_HOST = "owed_by_host", "Owed by the host"
    SETTLED_CONFIRMED = "settled_confirmed", "Settled and confirmed"


class Refund(UUIDModel):
    """
    One refund decided for a booking (BR-CAN-04, BR-CAN-06).

    A booking may get several (a cancellation, then a partial refund by
    support, then a dispute outcome); their sum is ``booking.refund_due_minor``
    and never passes the total (DB check on the booking). In M1 each refund
    opens one :class:`RefundObligation` the host must pay; ``settlement``
    turns ``settled_confirmed`` when that debt is settled. Never deleted.
    """

    booking = models.ForeignKey(Booking, on_delete=models.PROTECT, related_name="refunds")
    amount_minor = models.BigIntegerField()
    currency = models.CharField(max_length=3, default="DZD")
    kind = models.CharField(max_length=20, choices=RefundKind.choices)
    settlement = models.CharField(max_length=20, choices=RefundSettlement.choices, default=RefundSettlement.OWED_BY_HOST)
    reason = models.TextField(blank=True)
    reason_code = models.CharField(max_length=64, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name="+")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Oldest first, so the refunds read like a timeline."""

        ordering = ["created_at", "id"]
        constraints = [models.CheckConstraint(condition=Q(amount_minor__gt=0), name="refund_amount_positive")]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"refund {self.amount_minor} of {self.booking_id} ({self.kind})"


class RefundObligation(UUIDModel):
    """
    A refund the host must pay back to the guest after a cancellation (review R8).

    BLADUS does not hold the guest's money (DEC-019), so it cannot pay the
    refund itself. It records the debt (here and as memo lines in the
    ledger), shows it to both sides, and blocks the host from instant
    bookings and from accepting requests while a refund is overdue.
    """

    booking = models.ForeignKey(Booking, on_delete=models.PROTECT, related_name="refund_obligations")
    refund = models.OneToOneField(Refund, on_delete=models.PROTECT, null=True, blank=True, related_name="obligation",
                                  help_text="Refund row this debt comes from (one debt per refund, BR-CAN-06).")
    host_account = models.ForeignKey("hosts.HostAccount", on_delete=models.PROTECT, related_name="refund_obligations")
    guest = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="refunds_owed")
    amount_minor = models.BigIntegerField()
    currency = models.CharField(max_length=3, default="DZD")
    status = models.CharField(max_length=10, choices=RefundStatus.choices, default=RefundStatus.OPEN)
    due_at = models.DateTimeField(help_text="Cancellation time + refund_due_days.")
    declared_at = models.DateTimeField(null=True, blank=True)
    payment_reference = models.CharField(max_length=200, blank=True, help_text="Transfer reference given by the host.")
    settled_at = models.DateTimeField(null=True, blank=True)
    settled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Overdue lookups are by host, status and deadline."""

        ordering = ["due_at"]
        indexes = [models.Index(fields=["host_account", "status", "due_at"])]
        constraints = [models.CheckConstraint(condition=Q(amount_minor__gt=0), name="refund_obligation_positive")]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"refund {self.amount_minor} for {self.booking_id} ({self.status})"

    @property
    def is_overdue(self) -> bool:
        """True when still unpaid after the deadline."""
        return self.status in UNPAID_REFUND_STATUSES and self.due_at <= timezone.now()


class DisputeOutcome(models.TextChoices):
    """How support closed a dispute (BR-CAN-05)."""

    REFUND_FULL = "refund_full", "Full refund"
    REFUND_PARTIAL = "refund_partial", "Partial refund"
    DECLINED = "declined", "Declined"


class Dispute(UUIDModel):
    """
    A disagreement about a booking, opened by the guest or the host (R2, BR-CAN-05).

    One per booking. It may be opened until 14 days after check-out; the
    other side may add its statement while it is open. Support resolves it
    with a full refund, a partial refund or a refusal, and a note.
    """

    booking = models.OneToOneField(Booking, on_delete=models.PROTECT, related_name="dispute")
    opened_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    opened_by_role = models.CharField(max_length=8, choices=ActorRole.choices)
    reason_code = models.CharField(max_length=64, blank=True)
    guest_statement = models.TextField(blank=True)
    host_statement = models.TextField(blank=True)
    media_ids = models.JSONField(default=list, blank=True, help_text="Ids of uploaded photos or documents.")
    outcome = models.CharField(max_length=16, choices=DisputeOutcome.choices, blank=True)
    refund_minor = models.BigIntegerField(null=True, blank=True)
    resolution_note = models.TextField(blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
                                    related_name="+")
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Open disputes first in the admin queue."""

        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(condition=Q(refund_minor__isnull=True) | Q(refund_minor__gte=0),
                                   name="dispute_refund_not_negative"),
        ]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"dispute on {self.booking_id} ({self.outcome or 'open'})"

    @property
    def is_open(self) -> bool:
        """True until support resolves it."""
        return self.resolved_at is None
