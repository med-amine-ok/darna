"""
HTTP endpoints of the media app (``/api/v1/media/*``, BR-MED-01, BR-MED-02).

Signed-in users only. Views are thin: validate, call :mod:`apps.media.services`,
format the answer. The dev-only route ``/media/_local/<token>`` plays the role
of the object store when the local backend is active (hidden from Swagger).
"""

from django.http import FileResponse, Http404, HttpResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.core.errors import ForbiddenError

from . import hooks, services
from .models import MediaPurpose
from .serializers import MediaSerializer, SignedUrlSerializer, UploadRequestSerializer, UploadTicketSerializer
from .storage import LocalStorage, get_storage

# Purposes uploaded for a host workspace: the workspace is checked when the client names one.
WORKSPACE_PURPOSES = {MediaPurpose.DOCUMENT, MediaPurpose.LISTING_PHOTO, MediaPurpose.LOGO}


class UploadThrottle(UserRateThrottle):
    """06-api-design 3.9: at most 120 uploads per hour per user."""

    scope = "media_uploads"  # rate in settings REST_FRAMEWORK DEFAULT_THROTTLE_RATES


def _workspace_id(request, purpose: str):
    """
    Host account id the upload belongs to, checked through the registered resolver.

    Documents always need one (403 ``host_workspace_required`` otherwise);
    photos and logos only when the client sends ``X-Host-Account``.
    """
    if purpose not in WORKSPACE_PURPOSES:
        return None
    if purpose != MediaPurpose.DOCUMENT and not request.headers.get("X-Host-Account"):
        return None
    if hooks.workspace_resolver is None:
        raise ForbiddenError("Host workspaces are not available.", code="host_workspace_required")
    return hooks.workspace_resolver(request)


class UploadCreateView(APIView):
    """``POST /media/uploads``: get a presigned upload URL (createUpload)."""

    serializer_class = UploadRequestSerializer
    throttle_classes = [UploadThrottle]

    @extend_schema(request=UploadRequestSerializer, responses={201: UploadTicketSerializer}, tags=["media"],
                   operation_id="createUpload")
    def post(self, request):
        """Check purpose, type and size (422 ``file_type_not_allowed`` / ``file_too_large``) and open a slot."""
        data = UploadRequestSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        host_account_id = _workspace_id(request, values["purpose"])
        asset, upload = services.create_upload(request.user, host_account_id=host_account_id, **values)
        body = UploadTicketSerializer({"media_id": asset.id, "upload": upload}).data
        return Response(body, status=status.HTTP_201_CREATED)


class MediaDetailView(APIView):
    """``GET /media/{media_id}``: upload status and renditions (getMedia)."""

    serializer_class = MediaSerializer

    @extend_schema(responses=MediaSerializer, tags=["media"], operation_id="getMedia")
    def get(self, request, media_id):
        """The caller's own file (admins may read any), else 404."""
        asset = services.get_owned(request.user, media_id, allow_admin=True)
        return Response(MediaSerializer(asset).data)


class MediaCompleteView(APIView):
    """``POST /media/{media_id}/complete``: the client says the upload finished (completeUpload)."""

    serializer_class = MediaSerializer

    @extend_schema(request=None, responses={202: MediaSerializer}, tags=["media"], operation_id="completeUpload")
    def post(self, request, media_id):
        """Run the checks (BR-MED-01, BR-MED-02); 409 ``upload_missing`` or ``upload_already_completed``."""
        asset = services.complete_upload(request.user, media_id)
        return Response(MediaSerializer(asset).data, status=status.HTTP_202_ACCEPTED)


class MediaUrlView(APIView):
    """``GET /media/{media_id}/url``: 5-minute URL of the caller's own file, audited (BR-MED-02)."""

    serializer_class = SignedUrlSerializer

    @extend_schema(responses=SignedUrlSerializer, tags=["media"], operation_id="getPrivateMediaUrl")
    def get(self, request, media_id):
        """Owner only; every call writes an audit row through the ``private_url_issued`` hook."""
        url, expires_at = services.private_url(request.user, media_id, request=request)
        return Response(SignedUrlSerializer({"url": url, "expires_at": expires_at}).data)


@method_decorator(csrf_exempt, name="dispatch")
class LocalFileView(View):
    """
    Dev-only stand-in for the object store (local backend only, 404 otherwise).

    ``PUT`` receives an upload into quarantine, ``GET`` serves a file; both
    need a token signed by :class:`apps.media.storage.LocalStorage` that
    carries its expiry, exactly like a presigned S3 URL. Not in the API
    contract, so hidden from Swagger.
    """

    def _storage(self) -> LocalStorage:
        """The local backend, or 404 when another backend is configured."""
        storage = get_storage()
        if not isinstance(storage, LocalStorage):
            raise Http404
        return storage

    def put(self, request, token):
        """Store the request body when the token allows it and the size is within the slot."""
        storage = self._storage()
        payload = LocalStorage.read_token(token, "put")
        if payload is None:
            return HttpResponse(status=403)
        body = request.body
        if len(body) > payload["n"]:
            return HttpResponse(status=413)
        storage.write(payload["a"], payload["k"], body, mime_type=request.content_type or "")
        return HttpResponse(status=200)

    def get(self, request, token):
        """Serve the file named by a valid, unexpired token."""
        storage = self._storage()
        payload = LocalStorage.read_token(token, "get")
        if payload is None:
            return HttpResponse(status=403)
        path = storage.path(payload["a"], payload["k"])
        if not path.is_file():
            raise Http404
        return FileResponse(path.open("rb"))
