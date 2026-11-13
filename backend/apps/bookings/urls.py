"""URL routes of the bookings app, mounted under ``/api/v1/``. ``<key>`` is a booking id or its reference."""

from django.urls import path

from . import views

urlpatterns = [
    # Guest
    path("me/bookings", views.GuestBookingListCreateView.as_view(), name="me-bookings"),
    path("me/bookings/<str:key>", views.GuestBookingDetailView.as_view(), name="me-booking-detail"),
    path("me/bookings/<str:key>/cancel", views.GuestBookingCancelView.as_view(), name="me-booking-cancel"),
    # Host
    path("host/bookings", views.HostBookingListView.as_view(), name="host-bookings"),
    path("host/bookings/<str:key>", views.HostBookingDetailView.as_view(), name="host-booking-detail"),
    path("host/bookings/<str:key>/accept", views.HostBookingAcceptView.as_view(), name="host-booking-accept"),
    path("host/bookings/<str:key>/decline", views.HostBookingDeclineView.as_view(), name="host-booking-decline"),
    path("host/bookings/<str:key>/cancel", views.HostBookingCancelView.as_view(), name="host-booking-cancel"),
    # Admin
    path("admin/bookings", views.AdminBookingListView.as_view(), name="admin-bookings"),
    path("admin/bookings/<str:key>", views.AdminBookingDetailView.as_view(), name="admin-booking-detail"),
    path("admin/bookings/<str:key>/cancel", views.AdminBookingCancelView.as_view(), name="admin-booking-cancel"),
]
