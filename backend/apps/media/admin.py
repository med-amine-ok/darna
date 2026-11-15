"""Django admin console registration of the media table (internal tool, read mostly)."""

from django.contrib import admin

from .models import MediaAsset


@admin.register(MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    """Uploads with their check results; filter by status and purpose."""

    list_display = ("id", "purpose", "bucket", "status", "mime_type", "size_bytes", "created_at")
    list_filter = ("status", "purpose", "bucket")
    search_fields = ("id", "sha256", "storage_key")
