"""URL routes of the pricing app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

urlpatterns = [
    path("quotes", views.QuoteCreateView.as_view(), name="quote-create"),
    path("quotes/<uuid:pk>", views.QuoteDetailView.as_view(), name="quote-detail"),
    path("admin/coupons", views.AdminCouponListCreateView.as_view(), name="admin-coupons"),
    path("admin/coupons/<uuid:coupon_id>", views.AdminCouponDetailView.as_view(), name="admin-coupon-detail"),
]
