"""Shapes of the audit log and CSV export APIs (BR-STF-02, BR-STF-04)."""

from rest_framework import serializers

from .exports import DATASETS
from .models import AuditEvent, ExportJob
from .services import download_token


class AuditEventSerializer(serializers.ModelSerializer):
    """One audit row as shown to admins. ``actor`` is an id plus a display name (BR-STF-03)."""

    actor = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads or writes."""
        model = AuditEvent
        fields = [
            "id", "occurred_at", "actor", "actor_kind", "action",
            "object_type", "object_id", "before", "after", "note", "ip",
        ]
        read_only_fields = fields

    def get_actor(self, event: AuditEvent) -> dict | None:
        """Who acted, or ``None`` for the system."""
        if event.actor_id is None:
            return None
        return {"id": str(event.actor_id), "display_name": event.actor.display_name}


class ExportCreateSerializer(serializers.Serializer):
    """Body of ``POST /admin/exports``: which dataset, which filters (BR-STF-04)."""

    dataset = serializers.ChoiceField(choices=sorted(DATASETS))
    filters = serializers.DictField()
    format = serializers.ChoiceField(choices=["csv"], default="csv", required=False)

    def validate(self, attrs):
        """Refuse unknown keys (the plan sets ``additionalProperties: false``)."""
        unknown = set(self.initial_data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({key: ["Unknown field."] for key in sorted(unknown)})
        return attrs


class ExportJobSerializer(serializers.ModelSerializer):
    """
    One export and, when it is done, a download link that works 5 minutes.

    The view passes ``request`` in the context to build the absolute link.
    """

    download_url = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads."""
        model = ExportJob
        fields = ["id", "dataset", "filters", "status", "row_count", "download_url", "created_at", "completed_at"]
        read_only_fields = fields

    def get_download_url(self, job: ExportJob) -> str | None:
        """Signed link to the file (5 minutes), or ``None`` until the export is done."""
        token = download_token(job)
        request = self.context.get("request")
        if token is None or request is None:
            return None
        return request.build_absolute_uri(f"/api/v1/admin/exports/{job.pk}/download?token={token}")
