"""Django admin site registration for the inventory (internal console, for support and debugging)."""

from django.contrib import admin

from .models import ExperienceSlot, ListingDay, RoomTypeNight


@admin.register(ListingDay)
class ListingDayAdmin(admin.ModelAdmin):
    """Blocked days and special prices of homes and vehicles."""

    list_display = ("listing", "day", "is_blocked", "price_override_minor")
    list_filter = ("is_blocked",)


@admin.register(RoomTypeNight)
class RoomTypeNightAdmin(admin.ModelAdmin):
    """Room stock per night. Counters are read-only: they change only through reservations (BR-AVL-02)."""

    list_display = ("room_type", "night", "total", "held", "booked", "price_override_minor")
    readonly_fields = ("held", "booked")


@admin.register(ExperienceSlot)
class ExperienceSlotAdmin(admin.ModelAdmin):
    """Experience sessions. Seat counters are read-only (BR-AVL-02)."""

    list_display = ("listing", "starts_at", "seats_total", "seats_held", "seats_booked", "is_cancelled")
    readonly_fields = ("seats_held", "seats_booked")
