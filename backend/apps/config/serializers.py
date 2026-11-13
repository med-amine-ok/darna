"""Input and output shapes of the platform settings API (BR-CFG-01)."""

from rest_framework import serializers

from apps.core.money import BP_DENOMINATOR

from .models import DEFAULTS, PlatformSettings


class PublicSettingsSerializer(serializers.Serializer):
    """Body of ``GET /settings/public``: what the websites and apps need to know."""

    commission_bp = serializers.DictField(child=serializers.IntegerField())
    request_ttl_hours = serializers.IntegerField()
    instant_booking_enabled = serializers.BooleanField()
    maintenance_mode = serializers.BooleanField()


class CommissionRatesSerializer(serializers.Serializer):
    """Commission by host type in basis points (BR-PAY-06). Every key is optional in a PATCH."""

    individual = serializers.IntegerField(required=False, min_value=0, max_value=BP_DENOMINATOR)
    agency = serializers.IntegerField(required=False, min_value=0, max_value=BP_DENOMINATOR)
    hotel = serializers.IntegerField(required=False, min_value=0, max_value=BP_DENOMINATOR)
    hostel = serializers.IntegerField(required=False, min_value=0, max_value=BP_DENOMINATOR)

    def to_internal_value(self, data):
        """Refuse host types that do not exist (a typo would otherwise be silently ignored)."""
        unknown = set(data) - set(DEFAULTS["commission_bp"]) if isinstance(data, dict) else set()
        if unknown:
            raise serializers.ValidationError(f"Unknown host types: {', '.join(sorted(unknown))}.")
        # Plain dict: the value is stored as JSON in PlatformSettings.data.
        return dict(super().to_internal_value(data))


class SettingsUpdateSerializer(serializers.Serializer):
    """
    Body of ``PATCH /admin/settings``: only whitelisted keys, each validated (BR-CFG-01).

    Every field is optional; only the keys sent are changed.
    """

    commission_bp = CommissionRatesSerializer(required=False)
    request_ttl_hours = serializers.IntegerField(required=False, min_value=1, max_value=168)  # BR-BKG-04
    credit_limit_minor = serializers.IntegerField(required=False, min_value=0)  # BR-PAY-10
    topup_four_eyes_minor = serializers.IntegerField(required=False, min_value=0)  # BR-PAY-07
    instant_booking_enabled = serializers.BooleanField(required=False)  # BR-BKG-02
    maintenance_mode = serializers.BooleanField(required=False)

    def validate(self, attrs):
        """Refuse unknown keys and an empty body, so a typo never looks like a success."""
        unknown = set(self.initial_data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({key: ["Unknown setting."] for key in sorted(unknown)})
        if not attrs:
            raise serializers.ValidationError("Send at least one setting to change.")
        return attrs


def admin_settings_data(row: PlatformSettings | None, values: dict) -> dict:
    """
    Body of ``GET`` and ``PATCH /admin/settings``: every value plus the version that holds it.

    ``version`` is 0 and ``created_by`` is ``None`` while only the defaults
    exist (no row yet). ``created_by`` carries the admin's id (BR-STF-03).
    """
    return {
        "version": row.version if row else 0,
        "data": values,
        "created_by": (
            {"id": str(row.created_by_id), "display_name": row.created_by.display_name}
            if row and row.created_by_id else None
        ),
        "created_at": row.created_at.isoformat() if row else None,
    }
