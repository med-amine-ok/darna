"""API shapes of the notifications app (openapi.yaml: Notification, NotificationPreference)."""

from django.utils import translation
from rest_framework import serializers

from .catalogue import render
from .models import Channel, Notification


class NotificationSerializer(serializers.ModelSerializer):
    """One notification, title and body rendered in the request language (Accept-Language)."""

    title = serializers.SerializerMethodField()
    body = serializers.SerializerMethodField()

    class Meta:
        """Fields of the ``Notification`` schema."""

        model = Notification
        fields = ("id", "kind", "title", "body", "params", "link", "read_at", "created_at")

    def _rendered(self, obj) -> tuple[str, str]:
        """Render once per row in the active language (set by LocaleMiddleware from Accept-Language)."""
        cache = self.context.setdefault("_rendered", {})
        if obj.id not in cache:
            cache[obj.id] = render(obj.kind, obj.params, (translation.get_language() or "fr")[:2])
        return cache[obj.id]

    def get_title(self, obj) -> str:
        """Localized title."""
        return self._rendered(obj)[0]

    def get_body(self, obj) -> str:
        """Localized body."""
        return self._rendered(obj)[1]


class NotificationPreferenceSerializer(serializers.Serializer):
    """One switch: kind x channel (``locked`` is read only, BR-PRV-03)."""

    kind = serializers.CharField(max_length=48)
    channel = serializers.ChoiceField(choices=Channel.choices)
    enabled = serializers.BooleanField()
    locked = serializers.BooleanField(read_only=True)


class NotificationPreferenceListSerializer(serializers.Serializer):
    """Body and answer of ``/me/notification-preferences``: ``{"results": [...]}``."""

    results = NotificationPreferenceSerializer(many=True)
