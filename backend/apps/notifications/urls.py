"""URL routes of the notifications app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

urlpatterns = [
    path("me/notifications", views.MyNotificationListView.as_view(), name="me-notifications"),
    path("me/notifications/read-all", views.MyNotificationReadAllView.as_view(), name="me-notifications-read-all"),
    path("me/notifications/<str:notification_id>/read", views.MyNotificationReadView.as_view(),
         name="me-notification-read"),
    path("me/notification-preferences", views.MyNotificationPreferencesView.as_view(),
         name="me-notification-preferences"),
]
