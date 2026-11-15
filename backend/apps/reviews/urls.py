"""URL routes of the reviews app, mounted under ``/api/v1/``. ``<key>`` is a booking id or its reference."""

from django.urls import path

from . import views

urlpatterns = [
    # Public
    path("listings/<str:listing_id>/reviews", views.ListingReviewListView.as_view(), name="listing-reviews"),
    path("trips/<str:trip_id>/reviews", views.TripReviewListView.as_view(), name="trip-reviews"),
    path("users/<str:user_id>/reviews", views.UserReviewListView.as_view(), name="user-reviews"),
    # Guest
    path("me/bookings/<str:key>/review", views.MyBookingReviewView.as_view(), name="me-booking-review"),
    path("me/reviews", views.MyReviewListView.as_view(), name="me-reviews"),
    path("reviews/<str:review_id>/reports", views.ReviewReportView.as_view(), name="review-reports"),
    # Host
    path("host/reviews", views.HostReviewListView.as_view(), name="host-reviews"),
    path("host/reviews/<str:review_id>/reply", views.HostReviewReplyView.as_view(), name="host-review-reply"),
    path("host/bookings/<str:key>/guest-review", views.HostGuestReviewView.as_view(), name="host-booking-guest-review"),
    # Admin
    path("admin/reviews", views.AdminReviewListView.as_view(), name="admin-reviews"),
    path("admin/reviews/<str:review_id>", views.AdminReviewRemoveView.as_view(), name="admin-review-remove"),
    path("admin/reviews/<str:review_id>/hide", views.AdminReviewHideView.as_view(), name="admin-review-hide"),
    path("admin/reviews/<str:review_id>/restore", views.AdminReviewRestoreView.as_view(), name="admin-review-restore"),
    path("admin/reviews/<str:review_id>/dismiss-reports", views.AdminReviewDismissReportsView.as_view(),
         name="admin-review-dismiss-reports"),
]
