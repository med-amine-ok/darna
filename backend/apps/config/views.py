"""
Platform settings endpoints (BR-CFG-01).

``GET /settings/public`` is open to everybody (the apps read the commission
and switches from it). ``GET`` and ``PATCH /admin/settings`` are for admins
only; every change creates a new settings version and an audit row.
"""

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.accounts.views import client_ip

from . import selectors, services
from .serializers import PublicSettingsSerializer, SettingsUpdateSerializer, admin_settings_data


def admin_settings_body() -> dict:
    """Full settings plus their version, as answered by both admin endpoints."""
    return admin_settings_data(selectors.current_version(), services.get_settings())


class PublicSettingsView(APIView):
    """``GET /settings/public``: commission by host type, request window and switches."""

    permission_classes = [AllowAny]
    serializer_class = PublicSettingsSerializer

    def get(self, request):
        """Return the public subset of the current settings."""
        return Response(PublicSettingsSerializer(selectors.public_settings()).data)


class AdminSettingsView(APIView):
    """``GET /admin/settings`` (read every value) and ``PATCH /admin/settings`` (change some)."""

    permission_classes = [IsAdmin]
    serializer_class = SettingsUpdateSerializer

    def get(self, request):
        """Return every setting and the version in force."""
        return Response(admin_settings_body())

    def patch(self, request):
        """Validate the changed keys, save a new version and audit it (BR-CFG-01)."""
        data = SettingsUpdateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.change_settings_as_admin(data.validated_data, actor=request.user, ip=client_ip(request))
        return Response(admin_settings_body())
