"""URL routes of the geo app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

urlpatterns = [
    path("geo/wilayas", views.WilayaListView.as_view(), name="geo-wilayas"),
    path("geo/wilayas/<int:code>/communes", views.WilayaCommunesView.as_view(), name="geo-wilaya-communes"),
    path("geo/communes", views.CommuneSearchView.as_view(), name="geo-communes"),
]
