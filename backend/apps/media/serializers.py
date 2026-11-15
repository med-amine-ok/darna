"""Input and output shapes of the media API (openapi.yaml: UploadRequest, UploadTicket, Media, SignedUrl)."""

from rest_framework import serializers

from .models import MediaAsset, MediaPurpose
from .services import rendition_urls


class UploadRequestSerializer(serializers.Serializer):
    """``POST /media/uploads`` body: what the client is about to upload (BR-MED-01, BR-MED-02)."""

    purpose = serializers.ChoiceField(choices=MediaPurpose.choices)
    filename = serializers.CharField(max_length=200)
    mime_type = serializers.CharField(max_length=64)
    size_bytes = serializers.IntegerField(min_value=1, max_value=15 * 1024 * 1024)
    sha256 = serializers.RegexField(r"^[a-f0-9]{64}$")


class UploadSlotSerializer(serializers.Serializer):
    """Where and how to send the file (presigned request)."""

    method = serializers.ChoiceField(choices=["PUT", "POST"])
    url = serializers.URLField()
    headers = serializers.DictField(child=serializers.CharField(), required=False)
    fields = serializers.DictField(child=serializers.CharField(), required=False)
    expires_at = serializers.DateTimeField()


class UploadTicketSerializer(serializers.Serializer):
    """``201`` answer of ``POST /media/uploads``: the new media id and the presigned upload."""

    media_id = serializers.UUIDField()
    upload = UploadSlotSerializer()


class MediaSerializer(serializers.ModelSerializer):
    """Upload status and, for public photos, the rendition URLs."""

    renditions = serializers.SerializerMethodField()
    rejection_code = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads."""

        model = MediaAsset
        fields = ["id", "purpose", "bucket", "status", "mime_type", "size_bytes", "width", "height",
                  "renditions", "rejection_code", "created_at"]

    def get_renditions(self, asset: MediaAsset) -> dict[str, str]:
        """Public photos only: thumb, card, large."""
        return rendition_urls(asset)

    def get_rejection_code(self, asset: MediaAsset) -> str | None:
        """Why the file was rejected (``virus_found``, ``file_type_mismatch``...), else null."""
        return asset.rejection_code or None


class SignedUrlSerializer(serializers.Serializer):
    """A short-lived URL of a private file (BR-MED-02)."""

    url = serializers.URLField()
    expires_at = serializers.DateTimeField()
