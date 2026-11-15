"""
URL routes of the search app, mounted under ``/api/v1/``.

``apps.catalog.urls`` is included first; its listing page route leaves
``listings/facets`` and ``listings/map`` to these two views.
"""

from django.urls import path

from . import views

urlpatterns = [
    path("listings/facets", views.ListingFacetsView.as_view(), name="listing-facets"),
    path("listings/map", views.ListingMapView.as_view(), name="listing-map"),
]
