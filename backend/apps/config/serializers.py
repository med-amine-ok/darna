"""Input and output shapes of the platform settings and onboarding flow APIs (BR-CFG-01 to BR-CFG-03)."""

from rest_framework import serializers

from apps.core.money import BP_DENOMINATOR

from .models import DEFAULTS, ONBOARDING_FIELD_TYPES, OnboardingFlowVersion, PlatformSettings


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


# ---------------------------------------------------------------------------
# Settings history and commission rates
# ---------------------------------------------------------------------------
class SettingsAuthorSerializer(serializers.Serializer):
    """OpenAPI shape of a person shown to admins: id and display name (BR-STF-03)."""

    id = serializers.UUIDField()
    display_name = serializers.CharField()


class PlatformSettingsVersionSerializer(serializers.Serializer):
    """One settings version (``GET /admin/settings/versions``): every value it held, its author and date."""

    version = serializers.IntegerField()
    data = serializers.DictField()
    created_by = SettingsAuthorSerializer(allow_null=True)
    created_at = serializers.DateTimeField(allow_null=True)

    def to_representation(self, row: PlatformSettings) -> dict:
        """The stored values on top of the defaults, as they applied while this version was in force."""
        values = {**DEFAULTS, **row.data}
        values["commission_bp"] = {**DEFAULTS["commission_bp"], **row.data.get("commission_bp", {})}
        return admin_settings_data(row, values)


class CommissionRatesBodySerializer(serializers.Serializer):
    """
    ``GET`` and ``PUT /admin/commission-rates``: default rate per host type in basis points (BR-PAY-06).

    ``effective_for`` is always ``new_bookings``: a booking keeps the rate it was created with.
    """

    individual_bp = serializers.IntegerField(min_value=0, max_value=BP_DENOMINATOR)
    agency_bp = serializers.IntegerField(min_value=0, max_value=BP_DENOMINATOR)
    hotel_bp = serializers.IntegerField(min_value=0, max_value=BP_DENOMINATOR)
    hostel_bp = serializers.IntegerField(min_value=0, max_value=BP_DENOMINATOR)
    effective_for = serializers.CharField(read_only=True, default="new_bookings")


def commission_rates_data(rates: dict) -> dict:
    """Turn ``{host_type: bp}`` into the ``CommissionRates`` body of the plan."""
    return {f"{host_type}_bp": int(rates[host_type]) for host_type in ("individual", "agency", "hotel", "hostel")} | {
        "effective_for": "new_bookings"
    }


# ---------------------------------------------------------------------------
# Onboarding flows (BR-CFG-02, BR-CFG-03)
# ---------------------------------------------------------------------------
class LocalizedTextSerializer(serializers.Serializer):
    """The same text in English, French and Arabic."""

    en = serializers.CharField(allow_blank=True, max_length=500)
    fr = serializers.CharField(allow_blank=True, max_length=500)
    ar = serializers.CharField(allow_blank=True, max_length=500)


class OnboardingOptionSerializer(serializers.Serializer):
    """One choice of a ``select`` or ``multi_select`` field."""

    value = serializers.CharField(max_length=120)
    label = LocalizedTextSerializer()


class OnboardingFieldSerializer(serializers.Serializer):
    """
    One question of the wizard. ``type`` is checked by the service so that an
    unknown type answers 422 ``unknown_field_type`` (BR-CFG-03).
    """

    id = serializers.RegexField(r"^[A-Za-z][A-Za-z0-9_]{0,47}$")
    type = serializers.CharField(max_length=20, help_text=f"One of: {', '.join(ONBOARDING_FIELD_TYPES)}.")
    label = LocalizedTextSerializer()
    help = LocalizedTextSerializer(required=False, allow_null=True)
    required = serializers.BooleanField()
    core = serializers.BooleanField(help_text="Core fields cannot be removed or change type (BR-CFG-03).")
    options = OnboardingOptionSerializer(many=True, required=False)
    validation = serializers.DictField(required=False)


class OnboardingStepSerializer(serializers.Serializer):
    """One step of the wizard and its fields."""

    id = serializers.RegexField(r"^[A-Za-z][A-Za-z0-9_]{0,47}$")
    title = LocalizedTextSerializer()
    core = serializers.BooleanField()
    fields = OnboardingFieldSerializer(many=True)


class OnboardingDraftFlowWriteSerializer(serializers.Serializer):
    """Body of ``PUT /admin/onboarding-flows/{host_type}/draft``: the whole list of steps."""

    steps = OnboardingStepSerializer(many=True, allow_empty=False)

    def validate(self, attrs):
        """Refuse unknown top-level keys (the plan sets ``additionalProperties: false``)."""
        unknown = set(self.initial_data) - {"steps"}
        if unknown:
            raise serializers.ValidationError({key: ["Unknown field."] for key in sorted(unknown)})
        return attrs


class OnboardingFlowSerializer(serializers.ModelSerializer):
    """One flow version as served to the website and to admins (``OnboardingFlow`` of the plan)."""

    steps = OnboardingStepSerializer(many=True, read_only=True)

    class Meta:
        """Model and fields this serializer reads."""
        model = OnboardingFlowVersion
        fields = ["host_type", "version", "status", "steps", "published_at"]
        read_only_fields = fields


class OnboardingFlowSummarySerializer(serializers.Serializer):
    """One line of ``GET /admin/onboarding-flows``: version numbers in force and in draft."""

    host_type = serializers.CharField()
    published_version = serializers.IntegerField(allow_null=True)
    draft_version = serializers.IntegerField(allow_null=True)
    published_at = serializers.DateTimeField(allow_null=True)
    draft_updated_at = serializers.DateTimeField(allow_null=True)
