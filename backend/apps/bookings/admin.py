"""Django console pages of the bookings app (read only: every change goes through ``services.py`` and the API)."""

from django.contrib import admin

from .models import Booking, BookingEvent


class BookingEventInline(admin.TabularInline):
    """The status history shown under a booking (append-only)."""

    model = BookingEvent
    extra = 0
    can_delete = False
    readonly_fields = ("from_status", "to_status", "actor", "actor_role", "note", "created_at")

    def has_add_permission(self, request, obj=None) -> bool:
        """History rows are only written by the services."""
        return False


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    """Read-only list of bookings for support; actions use the admin API so they are audited."""

    list_display = ("reference", "status", "inventory_kind", "check_in", "check_out", "total_minor", "created_at")
    list_filter = ("status", "inventory_kind", "approval_mode_applied")
    search_fields = ("reference",)
    readonly_fields = [f.name for f in Booking._meta.fields]
    inlines = [BookingEventInline]

    def has_add_permission(self, request) -> bool:
        """Bookings are only created by guests through the API."""
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        """No direct edits: status changes must go through the services (BR-BKG-06)."""
        return False
