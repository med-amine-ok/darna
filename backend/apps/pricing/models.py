"""
Database models of the pricing app: server-side price quotes.

The server computes every price (BR-PRC-01). A guest first asks for a
``Quote``; the booking is then created from the quote id, never from prices
sent by the client, so a tampered price is simply ignored. A quote is valid
for ``settings.QUOTE_TTL_MINUTES`` minutes (30 by default) and is checked
again when the booking is made.

Coupons (R2, BR-PRM-01/02) are kept here too (``Coupon``,
``CouponRedemption``); in this release only the admin catalogue exists and
quotes ignore them.
"""

from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.db.models.functions import Lower
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


# ---------------------------------------------------------------------------
# Coupons (R2, BR-PRM-01, BR-PRM-02)
# ---------------------------------------------------------------------------
class DiscountType(models.TextChoices):
    """How a coupon reduces the price."""

    PERCENTAGE = "percentage", "Percentage (basis points)"
    FIXED = "fixed", "Fixed amount (centimes)"


class CouponFundedBy(models.TextChoices):
    """Who pays for the discount (BR-PRM-02)."""

    PLATFORM = "platform", "BLADUS (reduces the commission)"
    HOST = "host", "The host (reduces the subtotal)"


class Coupon(UUIDModel):
    """
    A discount code (R2, BR-PRM-01). Not applied to quotes in this release:
    only the admin catalogue exists, so codes can be prepared in advance.

    The code is unique without regard to case. ``discount_value`` is basis
    points for ``percentage`` and centimes for ``fixed``. A host-funded
    coupon belongs to one host account (BR-PRM-02).
    """

    code = models.CharField(max_length=32)
    discount_type = models.CharField(max_length=12, choices=DiscountType.choices)
    discount_value = models.BigIntegerField(help_text="Basis points for percentage, centimes for fixed.")
    min_spend_minor = models.BigIntegerField(default=0)
    currency = models.CharField(max_length=3, default="DZD")
    funded_by = models.CharField(max_length=8, choices=CouponFundedBy.choices)
    host_account = models.ForeignKey("hosts.HostAccount", on_delete=models.PROTECT, null=True, blank=True,
                                     related_name="coupons")
    scope_verticals = models.JSONField(default=list, blank=True, help_text="Empty = every vertical.")
    usage_limit = models.PositiveIntegerField(null=True, blank=True, help_text="Empty = no total limit.")
    per_user_limit = models.PositiveIntegerField(default=1)
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Table options: case-insensitive unique code and database checks on the values."""

        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(Lower("code"), name="coupon_code_ci_unique"),
            models.CheckConstraint(condition=Q(discount_value__gt=0), name="coupon_value_positive"),
            models.CheckConstraint(
                condition=~Q(discount_type="percentage") | Q(discount_value__lte=10000), name="coupon_percentage_range",
            ),
            models.CheckConstraint(condition=Q(min_spend_minor__gte=0), name="coupon_min_spend_not_negative"),
            models.CheckConstraint(
                condition=Q(funded_by="platform") | Q(host_account__isnull=False), name="coupon_host_funded_has_host",
            ),
            models.CheckConstraint(
                condition=Q(valid_to__isnull=True) | Q(valid_to__gt=F("valid_from")), name="coupon_dates_in_order",
            ),
        ]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return self.code


class CouponRedemption(UUIDModel):
    """
    One use of a coupon on a booking (BR-PRM-01): counted when the booking is
    confirmed, released (``released_at``) if it is cancelled before check-in.

    ``booking_id`` is a plain UUID: pricing sits below bookings in the layer order.
    """

    coupon = models.ForeignKey(Coupon, on_delete=models.PROTECT, related_name="redemptions")
    booking_id = models.UUIDField(unique=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    amount_minor = models.BigIntegerField()
    released_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        """Table options: amounts never negative."""

        constraints = [models.CheckConstraint(condition=Q(amount_minor__gte=0), name="coupon_redemption_amount")]
