"""Output shapes of the geo API."""

from rest_framework import serializers

from .models import Commune, Wilaya


def request_locale(request) -> str:
    """
    Language the caller asked for with ``Accept-Language``: ``en``, ``fr`` or ``ar``.

    Django's ``LocaleMiddleware`` already parsed the header; French is used
    when there is no request or the language is not one of ours.
    """
    code = (getattr(request, "LANGUAGE_CODE", "") or "fr")[:2].lower()
    return code if code in {"en", "fr", "ar"} else "fr"


class WilayaSerializer(serializers.ModelSerializer):
    """A wilaya: ``name`` in the caller's language plus the three stored names."""

    name = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads or writes."""
        model = Wilaya
        fields = ["code", "name", "name_fr", "name_ar", "name_en", "legacy_code_58", "latitude", "longitude"]

    def get_name(self, wilaya: Wilaya) -> str:
        """Name in the language of the request."""
        return wilaya.name_for(request_locale(self.context.get("request")))


class CommuneSerializer(serializers.ModelSerializer):
    """A commune with its wilaya; ``name`` and ``wilaya_name`` follow the caller's language."""

    name = serializers.SerializerMethodField()
    wilaya_code = serializers.IntegerField(source="wilaya_id")
    wilaya_name = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads or writes."""
        model = Commune
        fields = [
            "id", "name", "name_fr", "name_ar", "name_en",
            "wilaya_code", "wilaya_name", "postal_code", "latitude", "longitude",
        ]

    def get_name(self, commune: Commune) -> str:
        """Commune name in the language of the request (French when missing)."""
        return commune.name_for(request_locale(self.context.get("request")))

    def get_wilaya_name(self, commune: Commune) -> str:
        """Wilaya name in the language of the request."""
        return commune.wilaya.name_for(request_locale(self.context.get("request")))
