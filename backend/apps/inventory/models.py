"""
Database models of the inventory app: the calendar and the stock.

Three kinds of inventory (``catalog.InventoryKind``):
- single unit (home, vehicle): ``ListingDay`` keeps only the days that
  differ from the defaults (blocked, special price). Whether a day is booked
  comes from the bookings themselves (BR-AVL-01, checked by the bookings app);
- room pool (hotel, hostel): ``RoomTypeNight`` counts, per room type and
  night, ``total`` units with ``held`` and ``booked`` counters (BR-AVL-02);
- slots (experience): ``ExperienceSlot`` counts seats the same way.

The counters are protected by database checks (``held + booked <= total``,
never negative), so even a bug in Python cannot oversell.
Design source: ``docs/backend/schema.dbml``, group INVENTORY AND CALENDAR.
"""

from django.db import models
from django.db.models import F, Q

from apps.core.models import UUIDModel


class ListingDay(models.Model):
    """
    A host setting for one day of a single-unit listing (home, vehicle).

    Only days that differ from the defaults are stored: ``is_blocked`` (host
    closed the day, BR-AVL-04) and/or ``price_override_minor`` (special
    price instead of ``Listing.base_price_minor``).
    """

    listing = models.ForeignKey("catalog.Listing", on_delete=models.CASCADE, related_name="days")
    day = models.DateField()
    is_blocked = models.BooleanField(default=False)
    price_override_minor = models.BigIntegerField(null=True, blank=True)
    note = models.CharField(max_length=120, blank=True)

    class Meta:
        """Table options: ordering, indexes and database checks."""

        ordering = ["listing", "day"]
        constraints = [
            models.UniqueConstraint(fields=["listing", "day"], name="listing_day_unique"),
            models.CheckConstraint(
                condition=Q(price_override_minor__isnull=True) | Q(price_override_minor__gt=0),
                name="listing_day_price_positive",
            ),
        ]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"{self.listing_id} {self.day}"


class RoomTypeNight(models.Model):
    """
    Stock of one room type for one night (BR-AVL-02).

    ``total`` units can be sold (``unit_count`` minus host blocks); ``held``
    are reserved by bookings waiting for payment or an answer; ``booked``
    are confirmed. Free units = ``total - held - booked``. Rows are created
    on demand by ``services.ensure_room_nights``.
    """

    room_type = models.ForeignKey("catalog.RoomType", on_delete=models.CASCADE, related_name="nights")
    night = models.DateField()
    total = models.PositiveSmallIntegerField()
    held = models.IntegerField(default=0)
    booked = models.IntegerField(default=0)
    price_override_minor = models.BigIntegerField(null=True, blank=True)

    class Meta:
        """Table options: ordering, indexes and database checks."""

        ordering = ["room_type", "night"]
        constraints = [
            models.UniqueConstraint(fields=["room_type", "night"], name="room_type_night_unique"),
            # BR-AVL-02: the counters can never oversell or go negative.
            models.CheckConstraint(
                condition=Q(held__gte=0) & Q(booked__gte=0) & Q(total__gte=F("held") + F("booked")),
                name="room_type_night_counters",
            ),
            models.CheckConstraint(
                condition=Q(price_override_minor__isnull=True) | Q(price_override_minor__gt=0),
                name="room_type_night_price_positive",
            ),
        ]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"{self.room_type_id} {self.night} ({self.held}+{self.booked}/{self.total})"

    @property
    def free(self) -> int:
        """Units still free this night."""
        return max(self.total - self.held - self.booked, 0)


class ExperienceSlot(UUIDModel):
    """
    One dated session of an experience with a number of seats (BR-AVL-02).

    Same counters as a room night: ``seats_held + seats_booked <=
    seats_total``. A cancelled slot accepts no new booking.
    """

    listing = models.ForeignKey("catalog.Listing", on_delete=models.CASCADE, related_name="slots")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    seats_total = models.PositiveSmallIntegerField()
    seats_held = models.IntegerField(default=0)
    seats_booked = models.IntegerField(default=0)
    price_override_minor = models.BigIntegerField(null=True, blank=True, help_text="Per person; empty = listing price.")
    is_cancelled = models.BooleanField(default=False)

    class Meta:
        """Table options: ordering, indexes and database checks."""

        ordering = ["listing", "starts_at"]
        constraints = [
            models.UniqueConstraint(fields=["listing", "starts_at"], name="experience_slot_unique_start"),
            models.CheckConstraint(
                condition=Q(seats_held__gte=0) & Q(seats_booked__gte=0)
                & Q(seats_total__gte=F("seats_held") + F("seats_booked")),
                name="experience_slot_counters",
            ),
            models.CheckConstraint(condition=Q(ends_at__gt=F("starts_at")), name="experience_slot_ends_after_start"),
        ]

    def __str__(self) -> str:
        """Readable name for the Django console."""
        return f"{self.listing_id} {self.starts_at:%Y-%m-%d %H:%M}"

    @property
    def seats_left(self) -> int:
        """Seats still free (0 when cancelled)."""
        if self.is_cancelled:
            return 0
        return max(self.seats_total - self.seats_held - self.seats_booked, 0)

    @property
    def price_minor(self) -> int:
        """Price per person of this slot: its own override or the listing base price."""
        return self.price_override_minor if self.price_override_minor is not None else self.listing.base_price_minor
