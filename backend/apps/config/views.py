"""
Platform settings and onboarding flow endpoints (BR-CFG-01 to BR-CFG-03, BR-HST-01).

``GET /settings/public`` and ``GET /onboarding-flows/{host_type}`` are open
to everybody. Everything under ``/admin/`` is for admins only; every change
creates a new version and an audit row.
"""

from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.accounts.views import client_ip
from apps.core.errors import NotFoundError

from . import selectors, services
from .serializers import (
    CommissionRatesBodySerializer,
    OnboardingDraftFlowWriteSerializer,
    OnboardingFlowSerializer,
    OnboardingFlowSummarySerializer,
    PlatformSettingsVersionSerializer,
    PublicSettingsSerializer,
    SettingsUpdateSerializer,
    admin_settings_data,
    commission_rates_data,
)

# Public reference data may be cached one hour by browsers and Next.js (06-api-design, caching).
PUBLIC_CACHE_CONTROL = "public, max-age=3600"
IF_MATCH = OpenApiParameter("If-Match", str, OpenApiParameter.HEADER, required=False,
                            description="ETag of the last read; 412 stale_version when someone saved in between.")


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


class AdminSettingsVersionListView(ListAPIView):
    """``GET /admin/settings/versions``: settings history, newest first, paginated (BR-CFG-01)."""

    permission_classes = [IsAdmin]
    serializer_class = PlatformSettingsVersionSerializer
    filter_backends: list = []

    def get_queryset(self):
        """Every settings version with its author."""
        return selectors.settings_versions()


class AdminCommissionRatesView(APIView):
    """``GET`` and ``PUT /admin/commission-rates``: default commission per host type (BR-PAY-06)."""

    permission_classes = [IsAdmin]
    serializer_class = CommissionRatesBodySerializer

    @extend_schema(responses=CommissionRatesBodySerializer)
    def get(self, request):
        """The four default rates, with the settings ETag for a later ``PUT``."""
        response = Response(commission_rates_data(services.commission_rates()))
        response["ETag"] = services.settings_etag()
        return response

    @extend_schema(request=CommissionRatesBodySerializer, responses=CommissionRatesBodySerializer,
                   parameters=[IF_MATCH])
    def put(self, request):
        """Replace the four rates: new settings version, audited; new bookings only (BR-CFG-01, BR-STF-02)."""
        data = CommissionRatesBodySerializer(data=request.data)
        data.is_valid(raise_exception=True)
        rates = {key.removesuffix("_bp"): value for key, value in data.validated_data.items()}
        result = services.set_commission_rates(
            rates, actor=request.user, if_match=request.headers.get("If-Match"), ip=client_ip(request)
        )
        response = Response(commission_rates_data(result))
        response["ETag"] = services.settings_etag()
        return response


# ---------------------------------------------------------------------------
# Onboarding flows
# ---------------------------------------------------------------------------
def flow_response(row, *, status_code: int = status.HTTP_200_OK) -> Response:
    """Answer one flow version with its ETag."""
    response = Response(OnboardingFlowSerializer(row).data, status=status_code)
    response["ETag"] = services.flow_etag(row)
    return response


class PublicOnboardingFlowView(APIView):
    """``GET /onboarding-flows/{host_type}``: the published wizard the website renders (BR-HST-01)."""

    permission_classes = [AllowAny]
    serializer_class = OnboardingFlowSerializer

    @extend_schema(
        responses={200: OnboardingFlowSerializer, 304: None},
        parameters=[OpenApiParameter("If-None-Match", str, OpenApiParameter.HEADER, required=False)],
    )
    def get(self, request, host_type):
        """Published version only; 304 when the client already has it (``If-None-Match``)."""
        services.require_host_type(host_type)
        row = selectors.published_flow(host_type)
        if row is None:
            raise NotFoundError("No published flow for this host type.", code="flow_not_published")
        etag = services.flow_etag(row)
        if request.headers.get("If-None-Match") == etag:
            response = Response(status=status.HTTP_304_NOT_MODIFIED)
        else:
            response = flow_response(row)
        response["ETag"] = etag
        response["Cache-Control"] = PUBLIC_CACHE_CONTROL
        return response


class AdminOnboardingFlowListView(APIView):
    """``GET /admin/onboarding-flows``: one line per host type (BR-CFG-02)."""

    permission_classes = [IsAdmin]
    serializer_class = OnboardingFlowSummarySerializer

    @extend_schema(responses=inline_serializer(
        "OnboardingFlowSummaryList", {"results": OnboardingFlowSummarySerializer(many=True)}
    ))
    def get(self, request):
        """Published and draft version numbers of the four flows."""
        return Response({"results": OnboardingFlowSummarySerializer(selectors.flow_summaries(), many=True).data})


class AdminOnboardingVersionListView(APIView):
    """``GET /admin/onboarding-flows/{host_type}/versions``: every version, draft included."""

    permission_classes = [IsAdmin]
    serializer_class = OnboardingFlowSerializer

    @extend_schema(responses=inline_serializer("OnboardingFlowList", {"results": OnboardingFlowSerializer(many=True)}))
    def get(self, request, host_type):
        """Newest version number first."""
        services.require_host_type(host_type)
        rows = selectors.flow_versions(host_type)
        return Response({"results": OnboardingFlowSerializer(rows, many=True).data})


class AdminOnboardingVersionView(APIView):
    """``GET /admin/onboarding-flows/{host_type}/versions/{version}``: one version."""

    permission_classes = [IsAdmin]
    serializer_class = OnboardingFlowSerializer

    def get(self, request, host_type, version):
        """404 for an unknown host type or version."""
        services.require_host_type(host_type)
        row = selectors.flow_version(host_type, version)
        if row is None:
            raise NotFoundError("Unknown flow version.", code="flow_version_not_found")
        return flow_response(row)


class AdminOnboardingDraftView(APIView):
    """``PUT /admin/onboarding-flows/{host_type}/draft``: save the draft flow (BR-CFG-03)."""

    permission_classes = [IsAdmin]
    serializer_class = OnboardingDraftFlowWriteSerializer

    @extend_schema(request=OnboardingDraftFlowWriteSerializer, responses=OnboardingFlowSerializer,
                   parameters=[IF_MATCH])
    def put(self, request, host_type):
        """Validate the steps (canonical types, core steps and fields, approval step) and save them."""
        services.require_host_type(host_type)
        data = OnboardingDraftFlowWriteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        steps = OnboardingDraftFlowWriteSerializer(data.validated_data).data["steps"]
        row = services.save_flow_draft(
            host_type, steps, actor=request.user, if_match=request.headers.get("If-Match"), ip=client_ip(request)
        )
        return flow_response(row)


class AdminOnboardingPublishView(APIView):
    """``POST /admin/onboarding-flows/{host_type}/publish``: the draft becomes the next immutable version."""

    permission_classes = [IsAdmin]
    serializer_class = OnboardingFlowSerializer

    @extend_schema(request=None, responses={201: OnboardingFlowSerializer})
    def post(self, request, host_type):
        """Publish and archive the version it replaces (BR-CFG-02); audited."""
        row = services.publish_flow(host_type, actor=request.user, ip=client_ip(request))
        return flow_response(row, status_code=status.HTTP_201_CREATED)


class AdminOnboardingRepublishView(APIView):
    """``POST /admin/onboarding-flows/{host_type}/versions/{version}/republish``: roll back to an older version."""

    permission_classes = [IsAdmin]
    serializer_class = OnboardingFlowSerializer

    @extend_schema(request=None, responses={201: OnboardingFlowSerializer})
    def post(self, request, host_type, version):
        """Copy the old content into a new version number and publish it; audited."""
        row = services.republish_flow_version(host_type, version, actor=request.user, ip=client_ip(request))
        return flow_response(row, status_code=status.HTTP_201_CREATED)
