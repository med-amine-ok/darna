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
    path("host/calendar", views.HostMultiCalendarView.as_view(), name="host-multi-calendar"),
    path("host/listings/<uuid:listing_id>/slots", views.HostSlotListView.as_view(), name="host-slots"),
    path("host/listings/<uuid:listing_id>/slots/<uuid:slot_id>", views.HostSlotDetailView.as_view(), name="host-slot"),
    # Admin (review R3, R14)
    path("admin/inventory-conflicts", views.AdminInventoryConflictListView.as_view(), name="admin-inventory-conflicts"),
    path("admin/inventory-conflicts/<uuid:conflict_id>/resolve", views.AdminInventoryConflictResolveView.as_view(),
         name="admin-inventory-conflict-resolve"),
    path("admin/outbox", views.AdminOutboxListView.as_view(), name="admin-outbox"),
    path("admin/outbox/<uuid:message_id>/retry", views.AdminOutboxRetryView.as_view(), name="admin-outbox-retry"),
]
