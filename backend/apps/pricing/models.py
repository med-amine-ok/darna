"""
Database models of the pricing app: server-side price quotes.

The server computes every price (BR-PRC-01). A guest first asks for a
``Quote``; the booking is then created from the quote id, never from prices
sent by the client, so a tampered price is simply ignored. A quote is valid
for ``settings.QUOTE_TTL_MINUTES`` minutes (30 by default) and is checked
again when the booking is made.
"""

from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

from apps.core.models import UUIDModel
from apps.core.timeutils import nights_between


class Quote(UUIDModel):
    """
    One price computed by the server for one stay, slot or trip departure (BR-PRC-01 to BR-PRC-03).

    Exactly one target is priced:
    - ``listing`` alone: a home or a vehicle (single unit);
    - ``listing`` + ``room_type``: rooms or beds of a hotel or hostel;
    - ``listing`` + ``experience_slot``: seats on an experience session;
    - ``trip_departure`` alone: seats on an agency trip (DEC-006).

    Amounts are centimes (BR-PAY-01). ``total = subtotal - discount +
    cleaning fee + taxes``; there is no BLADUS fee for guests (BR-PRC-02).
    ``commission_base_minor`` is what the commission is computed on: the
    accommodation subtotal after discount, cleaning fee excluded (DEC-002).
    """

    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="quotes",
        help_text="Empty for an anonymous visitor; the quote can then be booked by anyone who signs in.",
    )
    listing = models.ForeignKey("catalog.Listing", on_delete=models.CASCADE, null=True, blank=True, related_name="+")
    room_type = models.ForeignKey("catalog.RoomType", on_delete=models.CASCADE, null=True, blank=True, related_name="+")
    experience_slot = models.ForeignKey(
        "inventory.ExperienceSlot", on_delete=models.CASCADE, null=True, blank=True, related_name="+"
    )
    trip_departure = models.ForeignKey(
        "trips.TripDeparture", on_delete=models.CASCADE, null=True, blank=True, related_name="+"
    )
    check_in = models.DateField(help_text="First night, or the date of the slot or departure (Algerian time).")
    check_out = models.DateField(help_text="Day of departure (not a night), or the last day of the slot or trip.")
    guests = models.PositiveSmallIntegerField()
    units = models.PositiveSmallIntegerField(default=1, help_text="Rooms, beds or seats taken (BR-AVL-03).")

    currency = models.CharField(max_length=3, default="DZD")
    lines = models.JSONField(default=list, help_text="Price lines shown to the guest (nights, seats, discount, cleaning fee).")
    subtotal_minor = models.BigIntegerField(help_text="Nights (or seats) before discount.")
    discount_minor = models.BigIntegerField(default=0, help_text="Length-of-stay discount (BR-PRC-03).")
    cleaning_fee_minor = models.BigIntegerField(default=0)
    taxes_minor = models.BigIntegerField(default=0, help_text="Always 0 in this version (BR-PRC-04 comes later).")
    total_minor = models.BigIntegerField(help_text="What the guest pays the host.")
    commission_base_minor = models.BigIntegerField(help_text="Subtotal after discount, cleaning fee excluded (DEC-002).")

    expires_at = models.DateTimeField(help_text="Quotes are valid QUOTE_TTL_MINUTES minutes (BR-PRC-01).")
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        """Table options: database checks on the target and on the amounts."""

        ordering = ["-created_at"]
        constraints = [
            # A listing quote or a trip quote, never both and never none.
            models.CheckConstraint(
                condition=(
                    (Q(listing__isnull=False) & Q(trip_departure__isnull=True))
                    | (Q(listing__isnull=True) & Q(trip_departure__isnull=False))
                ),
                name="quote_one_target",
            ),
            models.CheckConstraint(
                condition=(
                    Q(subtotal_minor__gte=0) & Q(discount_minor__gte=0) & Q(cleaning_fee_minor__gte=0)
                    & Q(taxes_minor__gte=0) & Q(total_minor__gte=0) & Q(commission_base_minor__gte=0)
                ),
                name="quote_amounts_not_negative",
            ),
            models.CheckConstraint(condition=Q(discount_minor__lte=F("subtotal_minor")), name="quote_discount_le_subtotal"),
            models.CheckConstraint(condition=Q(guests__gt=0) & Q(units__gt=0), name="quote_guests_units_positive"),
        ]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"Quote {self.id} ({self.total_minor} {self.currency})"

    @property
    def is_expired(self) -> bool:
        """True once ``expires_at`` has passed; an expired quote cannot be booked (BR-PRC-01)."""
        return self.expires_at <= timezone.now()

    @property
    def nights(self) -> int:
        """Number of nights for stays (0 for slots and same-day sessions)."""
        return max(nights_between(self.check_in, self.check_out), 0)

    @property
    def inventory_kind(self) -> str:
        """``single``, ``room_pool``, ``slot`` or ``departure``: how the booking will take stock."""
        if self.trip_departure_id:
            return "departure"
        if self.experience_slot_id:
            return "slot"
        if self.room_type_id:
            return "room_pool"
        return "single"
