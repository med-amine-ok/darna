"""URL routes of the media app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

urlpatterns = [
    path("media/uploads", views.UploadCreateView.as_view(), name="media-uploads"),
    path("media/<uuid:media_id>", views.MediaDetailView.as_view(), name="media-detail"),
    path("media/<uuid:media_id>/complete", views.MediaCompleteView.as_view(), name="media-complete"),
    path("media/<uuid:media_id>/url", views.MediaUrlView.as_view(), name="media-url"),
    # Development stand-in for the object store (local backend only, not in the API contract).
    path("media/_local/<str:token>", views.LocalFileView.as_view(), name="media-local-file"),
]
