"""
HTTP endpoints of the notifications app (thin layer: rules live in ``services.py``).

- ``GET /me/notifications`` (cursor page, ``unread`` filter, ``unread_count``);
- ``POST /me/notifications/{id}/read`` and ``POST /me/notifications/read-all``;
- ``GET`` and ``PUT /me/notification-preferences`` (BR-PRV-03).

Every route acts on the signed-in user's own rows only (OWASP API1).
"""

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import selectors, services
from .cursor import CURSOR_PARAMETERS, cursor_body, cursor_page_schema, cursor_slice, read_bool
from .serializers import NotificationPreferenceListSerializer, NotificationSerializer


class MyNotificationListView(APIView):
    """``GET /me/notifications``: my notifications, newest first (BR-NTF-01)."""

    serializer_class = NotificationSerializer

    @extend_schema(
        operation_id="listMyNotifications",
        parameters=[OpenApiParameter("unread", bool, description="Only unread."), *CURSOR_PARAMETERS],
        responses=cursor_page_schema(NotificationSerializer, extra={"unread_count": serializers.IntegerField()}),
        tags=["me.notifications"],
    )
    def get(self, request):
        """One cursor page plus the unread badge count."""
        qs = selectors.notifications_for(request.user, unread=read_bool(request, "unread"))
        rows, next_cursor, has_more = cursor_slice(request, qs)
        data = NotificationSerializer(rows, many=True, context={"request": request}).data
        return Response(cursor_body(data, next_cursor, has_more, unread_count=selectors.unread_count(request.user)))


class MyNotificationReadView(APIView):
    """``POST /me/notifications/{notification_id}/read``: mark one as read (204)."""

    @extend_schema(operation_id="markMyNotificationRead", request=None, responses={204: None},
                   tags=["me.notifications"])
    def post(self, request, notification_id):
        """Someone else's notification answers 404."""
        services.mark_read(user=request.user, notification_id=notification_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyNotificationReadAllView(APIView):
    """``POST /me/notifications/read-all``: mark every notification as read (204)."""

    @extend_schema(operation_id="markAllMyNotificationsRead", request=None, responses={204: None},
                   tags=["me.notifications"])
    def post(self, request):
        """Mark all unread rows of the caller."""
        services.mark_all_read(user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyNotificationPreferencesView(APIView):
    """``GET`` and ``PUT /me/notification-preferences`` (BR-NTF-02, BR-PRV-03)."""

    serializer_class = NotificationPreferenceListSerializer

    @extend_schema(operation_id="listMyNotificationPreferences", responses=NotificationPreferenceListSerializer,
                   tags=["me.notifications"])
    def get(self, request):
        """Every kind x channel switch, with ``locked`` on critical email and SMS."""
        return Response({"results": selectors.preferences_for(request.user)})

    @extend_schema(operation_id="replaceMyNotificationPreferences", request=NotificationPreferenceListSerializer,
                   responses=NotificationPreferenceListSerializer, tags=["me.notifications"])
    def put(self, request):
        """Store the switches sent; switching off a critical one answers 422 ``preference_locked``."""
        data = NotificationPreferenceListSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.replace_preferences(user=request.user, items=data.validated_data["results"])
        return Response({"results": selectors.preferences_for(request.user)})
