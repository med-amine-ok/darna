"""URL routes of the inventory app, mounted under ``/api/v1/`` (paths follow docs/backend/openapi.yaml)."""

from django.urls import path

from . import views

urlpatterns = [
    path("listings/<uuid:listing_id>/availability", views.ListingAvailabilityView.as_view(), name="listing-availability"),
    path("host/listings/<uuid:listing_id>/calendar", views.HostCalendarView.as_view(), name="host-calendar"),
    path("host/listings/<uuid:listing_id>/calendar/blocks", views.HostCalendarBlocksView.as_view(),
         name="host-calendar-blocks"),
    path("host/listings/<uuid:listing_id>/calendar/prices", views.HostCalendarPricesView.as_view(),
         name="host-calendar-prices"),
    path("host/room-types/<uuid:room_type_id>/calendar", views.HostRoomCalendarView.as_view(), name="host-room-calendar"),
    path("host/listings/<uuid:listing_id>/slots", views.HostSlotListView.as_view(), name="host-slots"),
    path("host/listings/<uuid:listing_id>/slots/<uuid:slot_id>", views.HostSlotDetailView.as_view(), name="host-slot"),
]
