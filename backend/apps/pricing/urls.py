"""URL routes of the pricing app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

urlpatterns = [
    path("quotes", views.QuoteCreateView.as_view(), name="quote-create"),
    path("quotes/<uuid:pk>", views.QuoteDetailView.as_view(), name="quote-detail"),
]
