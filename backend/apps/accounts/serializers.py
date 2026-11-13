"""Input and output shapes of the accounts API."""

from rest_framework import serializers

from apps.geo.models import Commune

from .models import CodePurpose, User, phone_validator


class SignupSerializer(serializers.Serializer):
    """Body of ``POST /auth/signup``."""

    email = serializers.EmailField(required=False, allow_null=True)
    phone = serializers.CharField(required=False, allow_null=True, validators=[phone_validator])
    password = serializers.CharField(required=False, allow_null=True, write_only=True, min_length=8, max_length=128)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=80)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=80)
    locale = serializers.ChoiceField(choices=["en", "fr", "ar"], default="fr")
    accept_terms_version = serializers.CharField(max_length=32, help_text="Version of the terms the person accepted.")


class LoginSerializer(serializers.Serializer):
    """Body of ``POST /auth/login`` (email and password)."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, max_length=128)


class CodeRequestSerializer(serializers.Serializer):
    """Body of ``POST /auth/code/request``: ask for a sign-in code by SMS."""

    phone = serializers.CharField(validators=[phone_validator])


class CodeConfirmSerializer(serializers.Serializer):
    """Body of ``POST /auth/code/confirm``: sign in with the code received."""

    phone = serializers.CharField(validators=[phone_validator])
    code = serializers.RegexField(r"^[0-9]{6}$")


class PhoneSerializer(serializers.Serializer):
    """Body of ``PUT /me/phone``."""

    phone = serializers.CharField(validators=[phone_validator])


class PhoneVerifySerializer(serializers.Serializer):
    """Body of ``POST /auth/phone/verify``."""

    code = serializers.RegexField(r"^[0-9]{6}$")


class PasswordChangeSerializer(serializers.Serializer):
    """Body of ``POST /me/password``."""

    current_password = serializers.CharField(write_only=True, max_length=128)
    new_password = serializers.CharField(write_only=True, min_length=8, max_length=128)


class MeSerializer(serializers.ModelSerializer):
    """The signed-in user's own profile (private view)."""

    display_name = serializers.CharField(read_only=True)
    email_verified = serializers.SerializerMethodField()
    phone = serializers.CharField(source="phone_e164", read_only=True)
    phone_verified = serializers.BooleanField(read_only=True)
    is_admin = serializers.BooleanField(read_only=True)
    is_host = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads or writes."""
        model = User
        fields = [
            "id", "email", "email_verified", "phone", "phone_verified",
            "first_name_latin", "last_name_latin", "full_name_ar", "display_name",
            "bio", "spoken_languages", "home_commune", "address_line",
            "preferred_locale", "status", "is_admin", "is_host", "date_joined",
        ]
        read_only_fields = fields

    def get_email_verified(self, user: User) -> bool:
        """True when the email was confirmed."""
        return user.email_verified_at is not None

    def get_is_host(self, user: User) -> bool:
        """True when the user hosts alone or belongs to an organisation."""
        from apps.hosts.selectors import user_is_host  # local import: hosts is a higher layer

        return user_is_host(user)


class MeUpdateSerializer(serializers.Serializer):
    """Body of ``PATCH /me``. Only these fields can be edited; email and phone have their own endpoints."""

    first_name_latin = serializers.CharField(required=False, allow_blank=True, max_length=80)
    last_name_latin = serializers.CharField(required=False, allow_blank=True, max_length=80)
    full_name_ar = serializers.CharField(required=False, allow_blank=True, max_length=160)
    bio = serializers.CharField(required=False, allow_blank=True, max_length=500)
    spoken_languages = serializers.ListField(child=serializers.RegexField(r"^[a-z]{2}$"), required=False, max_length=10)
    home_commune = serializers.PrimaryKeyRelatedField(queryset=Commune.objects.all(), required=False, allow_null=True)
    address_line = serializers.CharField(required=False, allow_blank=True, max_length=255)
    preferred_locale = serializers.ChoiceField(choices=["en", "fr", "ar"], required=False)


class PublicUserSerializer(serializers.ModelSerializer):
    """What other people may see of a user: no email, phone, address or family name."""

    display_name = serializers.CharField(read_only=True)
    joined_year = serializers.SerializerMethodField()

    class Meta:
        """Model and fields this serializer reads or writes."""
        model = User
        fields = ["id", "display_name", "bio", "spoken_languages", "joined_year"]

    def get_joined_year(self, user: User) -> int:
        """Year the account was created."""
        return user.date_joined.year


__all__ = [
    "CodePurpose", "SignupSerializer", "LoginSerializer", "CodeRequestSerializer", "CodeConfirmSerializer",
    "PhoneSerializer", "PhoneVerifySerializer", "PasswordChangeSerializer", "MeSerializer",
    "MeUpdateSerializer", "PublicUserSerializer",
]
