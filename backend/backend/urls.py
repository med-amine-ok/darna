"""
URL configuration of the BLADUS backend.

Everything the apps call lives under ``/api/v1/``. Each Django app owns a
``urls.py`` that is included here; an app without routes yet has an empty
``urlpatterns`` list. ``/api/schema`` serves the OpenAPI description and
``/api/docs`` a browsable version of it. ``/django-admin/`` is the internal
Django console (not the BLADUS admin app).
"""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.utils import extend_schema, inline_serializer
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


@extend_schema(
    summary="Health check",
    description="Tells monitoring and load balancers that the API process is alive.",
    responses={
        200: inline_serializer(
            name="HealthResponse",
            fields={"status": serializers.CharField(default="ok")},
        )
    },
    tags=["system"],
)
class HealthView(APIView):
    """``GET /api/v1/health``: tells monitoring that the API process is alive."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        """Always answers ``{"status": "ok"}``."""
        return Response({"status": "ok"})


api_v1 = [
    path("health", HealthView.as_view(), name="health"),
    path("", include("apps.accounts.urls")),
    path("", include("apps.geo.urls")),
    path("", include("apps.config.urls")),
    path("", include("apps.audit.urls")),
    path("", include("apps.hosts.urls")),
    path("", include("apps.catalog.urls")),
    path("", include("apps.inventory.urls")),
    path("", include("apps.trips.urls")),
    path("", include("apps.pricing.urls")),
    path("", include("apps.ledger.urls")),
    path("", include("apps.bookings.urls")),
]

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),

    # OpenAPI Schema
    path("api/schema/", SpectacularAPIView.as_view(permission_classes=[AllowAny]), name="schema"),
    path("api/schema", SpectacularAPIView.as_view(permission_classes=[AllowAny])),
    path("api/v1/schema/", SpectacularAPIView.as_view(permission_classes=[AllowAny])),
    path("api/v1/schema", SpectacularAPIView.as_view(permission_classes=[AllowAny])),

    # Swagger UI documentation
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[AllowAny]), name="docs"),
    path("api/docs", SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[AllowAny])),
    path("swagger/", SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[AllowAny]), name="swagger"),
    path("swagger", SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[AllowAny])),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[AllowAny])),
    path("docs", SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[AllowAny])),

    # ReDoc documentation
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema", permission_classes=[AllowAny]), name="redoc"),
    path("api/redoc", SpectacularRedocView.as_view(url_name="schema", permission_classes=[AllowAny])),
]
