"""
HTTP endpoints of the accounts app (``/api/v1/auth/*`` and ``/api/v1/me``).

Views are thin: validate the body with a serializer, call a function of
``services.py``, return JSON. Sign-in endpoints are rate limited.
"""

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import CodePurpose
from .serializers import (
    CodeConfirmSerializer,
    CodeRequestSerializer,
    LoginSerializer,
    MeSerializer,
    MeUpdateSerializer,
    PasswordChangeSerializer,
    PhoneSerializer,
    PhoneVerifySerializer,
    SignupSerializer,
)


def client_ip(request) -> str | None:
    """IP address of the caller (first address of X-Forwarded-For when behind the proxy)."""
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()[:45]
    return request.META.get("REMOTE_ADDR")


def session_payload(user, token: str) -> dict:
    """Body returned after a successful sign-up or sign-in: the token (once) and the profile."""
    return {"token": token, "user": MeSerializer(user).data}


class SignupView(APIView):
    """``POST /auth/signup``: create an account and open a session."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "auth"
    serializer_class = SignupSerializer

    def post(self, request):
        """Create the user, record consent, return a session token."""
        data = SignupSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        ip, agent = client_ip(request), request.META.get("HTTP_USER_AGENT", "")
        user = services.signup(**data.validated_data, ip=ip, user_agent=agent)
        token = services.start_session(user, ip=ip, user_agent=agent)
        return Response(session_payload(user, token), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """``POST /auth/login``: sign in with email and password."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "auth"
    serializer_class = LoginSerializer

    def post(self, request):
        """Return a session token, or 401 with the same message for every failure."""
        data = LoginSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user, token = services.login_with_password(
            **data.validated_data, ip=client_ip(request), user_agent=request.META.get("HTTP_USER_AGENT", "")
        )
        return Response(session_payload(user, token))


class CodeRequestView(APIView):
    """``POST /auth/code/request``: send a sign-in code by SMS."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "otp"
    serializer_class = CodeRequestSerializer

    def post(self, request):
        """Always answers 204, whether or not the phone has an account."""
        data = CodeRequestSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.request_code(destination=data.validated_data["phone"], purpose=CodePurpose.LOGIN, ip=client_ip(request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class CodeConfirmView(APIView):
    """``POST /auth/code/confirm``: sign in with the SMS code."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "auth"
    serializer_class = CodeConfirmSerializer

    def post(self, request):
        """Return a session token; the phone becomes verified."""
        data = CodeConfirmSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user, token = services.login_with_code(
            **data.validated_data, ip=client_ip(request), user_agent=request.META.get("HTTP_USER_AGENT", "")
        )
        return Response(session_payload(user, token))


class SessionView(APIView):
    """``GET /auth/session`` (who am I) and ``DELETE /auth/session`` (sign out)."""

    permission_classes = [IsAuthenticated]
    serializer_class = MeSerializer

    def get(self, request):
        """Return the signed-in user's profile."""
        return Response({"user": MeSerializer(request.user).data})

    def delete(self, request):
        """Revoke the current session token."""
        services.logout(request.auth)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PhoneVerifyView(APIView):
    """``POST /auth/phone/verify``: confirm the code sent to my phone."""

    permission_classes = [IsAuthenticated]
    throttle_scope = "auth"
    serializer_class = PhoneVerifySerializer

    def post(self, request):
        """Mark the phone as verified (needed before the first booking)."""
        data = PhoneVerifySerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.verify_phone(request.user, data.validated_data["code"])
        return Response(MeSerializer(request.user).data)


class MeView(APIView):
    """``GET /me`` and ``PATCH /me``: my profile."""

    permission_classes = [IsAuthenticated]
    serializer_class = MeUpdateSerializer

    def get(self, request):
        """Return my private profile."""
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        """Update the editable profile fields."""
        data = MeUpdateSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        user = services.update_profile(request.user, **data.validated_data)
        return Response(MeSerializer(user).data)


class MePhoneView(APIView):
    """``PUT /me/phone``: set or change my phone; a verification code is sent."""

    permission_classes = [IsAuthenticated]
    throttle_scope = "otp"
    serializer_class = PhoneSerializer

    def put(self, request):
        """Store the new phone as unverified and send the code."""
        data = PhoneSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.set_phone(request.user, data.validated_data["phone"], ip=client_ip(request))
        return Response(MeSerializer(request.user).data, status=status.HTTP_202_ACCEPTED)


class MePasswordView(APIView):
    """``POST /me/password``: change my password."""

    permission_classes = [IsAuthenticated]
    throttle_scope = "auth"
    serializer_class = PasswordChangeSerializer

    def post(self, request):
        """Change the password and sign out every other device."""
        data = PasswordChangeSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.change_password(request.user, **data.validated_data, keep_session=request.auth)
        return Response(status=status.HTTP_204_NO_CONTENT)
