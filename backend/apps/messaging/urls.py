"""URL routes of the messaging app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

urlpatterns = [
    path("conversations", views.ConversationListView.as_view(), name="conversations"),
    path("conversations/sync", views.ConversationSyncView.as_view(), name="conversations-sync"),
    path("conversations/<str:conversation_id>", views.ConversationDetailView.as_view(), name="conversation-detail"),
    path("conversations/<str:conversation_id>/messages", views.MessageListView.as_view(), name="conversation-messages"),
    path("conversations/<str:conversation_id>/read", views.ConversationReadView.as_view(), name="conversation-read"),
]
