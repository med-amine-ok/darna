"""URL routes of the bookings app, mounted under ``/api/v1/``. ``<booking_id>`` is the booking UUID only (DEC-031)."""

from django.urls import path

from . import views

urlpatterns = [
    # Guest
    path("me/bookings", views.GuestBookingListCreateView.as_view(), name="me-bookings"),
    path("me/bookings/<uuid:booking_id>", views.GuestBookingDetailView.as_view(), name="me-booking-detail"),
    path("me/bookings/<uuid:booking_id>/cancellation-preview", views.GuestCancellationPreviewView.as_view(),
         name="me-booking-cancellation-preview"),
    path("me/bookings/<uuid:booking_id>/cancel", views.GuestBookingCancelView.as_view(), name="me-booking-cancel"),
    path("me/bookings/<uuid:booking_id>/confirm-stay", views.GuestConfirmStayView.as_view(), name="me-booking-confirm-stay"),
    path("me/bookings/<uuid:booking_id>/dispute", views.GuestDisputeView.as_view(), name="me-booking-dispute"),
    path("me/bookings/<uuid:booking_id>/payments", views.GuestPaymentView.as_view(), name="me-booking-payments"),
    path("me/refunds", views.GuestRefundListView.as_view(), name="me-refunds"),
    path("me/refunds/<uuid:pk>/confirm-received", views.GuestRefundConfirmView.as_view(), name="me-refund-confirm"),
    path("me/refunds/<uuid:pk>/dispute", views.GuestRefundDisputeView.as_view(), name="me-refund-dispute"),
    # Host
    path("host/bookings", views.HostBookingListView.as_view(), name="host-bookings"),
    path("host/bookings/<uuid:booking_id>", views.HostBookingDetailView.as_view(), name="host-booking-detail"),
    path("host/bookings/<uuid:booking_id>/accept", views.HostBookingAcceptView.as_view(), name="host-booking-accept"),
    path("host/bookings/<uuid:booking_id>/decline", views.HostBookingDeclineView.as_view(), name="host-booking-decline"),
    path("host/bookings/<uuid:booking_id>/cancellation-preview", views.HostCancellationPreviewView.as_view(),
         name="host-booking-cancellation-preview"),
    path("host/bookings/<uuid:booking_id>/cancel", views.HostBookingCancelView.as_view(), name="host-booking-cancel"),
    path("host/bookings/<uuid:booking_id>/confirm-stay", views.HostConfirmStayView.as_view(), name="host-booking-confirm-stay"),
    path("host/bookings/<uuid:booking_id>/dispute", views.HostDisputeView.as_view(), name="host-booking-dispute"),
    path("host/refunds", views.HostRefundListView.as_view(), name="host-refunds"),
    path("host/refunds/<uuid:pk>/declare-paid", views.HostRefundDeclareView.as_view(), name="host-refund-declare"),
    path("host/earnings", views.HostEarningsView.as_view(), name="host-earnings"),
    # Admin
    path("admin/bookings", views.AdminBookingListView.as_view(), name="admin-bookings"),
    path("admin/bookings/<uuid:booking_id>", views.AdminBookingDetailView.as_view(), name="admin-booking-detail"),
    path("admin/bookings/<uuid:booking_id>/cancel", views.AdminBookingCancelView.as_view(), name="admin-booking-cancel"),
    path("admin/bookings/<uuid:booking_id>/refunds", views.AdminBookingRefundView.as_view(), name="admin-booking-refunds"),
    path("admin/bookings/<uuid:booking_id>/dispute/resolve", views.AdminDisputeResolveView.as_view(),
         name="admin-booking-dispute-resolve"),
    path("admin/refunds", views.AdminRefundListView.as_view(), name="admin-refunds"),
    path("admin/refunds/<uuid:pk>/settle", views.AdminRefundSettleView.as_view(), name="admin-refund-settle"),
]
