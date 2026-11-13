"""
Django admin site registration for trips (internal console).

Status changes go through ``/api/v1/admin/trips`` (state machine + audit),
so status and seat counters are read-only here.
"""

from django.contrib import admin

from .models import Trip, TripDeparture, TripItineraryDay, TripPhoto


class ItineraryInline(admin.TabularInline):
    """Programme days inside their trip."""

    model = TripItineraryDay
    extra = 0


class DepartureInline(admin.TabularInline):
    """Departures inside their trip; counters are read-only (BR-TRP-02)."""

    model = TripDeparture
    extra = 0
    readonly_fields = ("seats_held", "seats_booked")


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    """Browse trips."""

    list_display = ("reference", "title", "trip_type", "status", "host_account", "created_at")
    list_filter = ("trip_type", "status")
    search_fields = ("reference", "title", "slug")
    readonly_fields = ("reference", "status", "status_before_delete", "submitted_at", "published_at", "deleted_at")
    inlines = [ItineraryInline, DepartureInline]


admin.site.register(TripPhoto)
