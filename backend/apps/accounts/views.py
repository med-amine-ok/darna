"""
HTTP endpoints of the accounts app.

Groups: website sign-in (``/auth/*``), my profile and privacy (``/me``,
``/me/consents``, ``/me/data-requests``, ``/me/favorites``), the public
profile (``/users/{id}``), staff sign-in (``/admin/auth/*``) and the admin
screens for staff, users and data protection requests (``/admin/*``,
``IsAdmin`` plus one staff permission per endpoint, BR-STF-01).

Views are thin: validate the body with a serializer, call a function of
``services.py`` or ``selectors.py``, return JSON. Sign-in endpoints are rate
limited.
"""

from django.conf import settings
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.errors import DomainError, NotFoundError
from apps.core.pagination import PageNumberPagination

from . import selectors, services
from .models import CodePurpose, DsrKind, FavoriteTarget, SessionScope, StaffRole, UserStatus
from .permissions import IsAdmin, IsStaffSession, staff_session_complete
from .serializers import (
    AuthProvidersSerializer,
    GoogleSignInSerializer,
    SocialAccountSerializer,
    AdminLoginSerializer,
    AdminUserSerializer,
    AuthenticatorCreatedSerializer,
    AuthenticatorSerializer,
    CodeConfirmSerializer,
    CodeRequestSerializer,
    ConsentCreateSerializer,
    ConsentSerializer,
    DataSubjectRequestAdminSerializer,
    DataSubjectRequestCompleteSerializer,
    DataSubjectRequestCreateSerializer,
    DataSubjectRequestSerializer,
    EmailVerifySerializer,
    FavoritePageSerializer,
    LoginSerializer,
    MeSerializer,
    MeUpdateSerializer,
    MfaAuthenticateSerializer,
    PasswordChangeSerializer,
    PasswordResetRequestSerializer,
    PasswordResetSerializer,
    PhoneSerializer,
    PhoneVerifySerializer,
    PublicUserSerializer,
    UserActionReasonSerializer,
    SessionSerializer,
    SignupSerializer,
    StaffInviteAcceptSerializer,
    StaffInviteSerializer,
    StaffMemberSerializer,
    StaffRoleSerializer,
    StaffSessionSerializer,
    StaffUpdateSerializer,
    TotpCodeSerializer,
    TotpSetupSerializer,
)


def client_ip(request) -> str | None:
    """
    IP address of the caller, used for rate limits and the audit log (BR-SYS-07).

    ``X-Forwarded-For`` can be written by anyone, so it is read only when
    ``settings.TRUSTED_PROXY_HOPS`` says how many proxies we run in front of
    Django (for example the website and admin servers, then Caddy). Each of
    them appends the address it saw, so the client is the entry that many
    places from the right; anything further left was sent by the caller and is
    ignored. With 0 (the default) only the socket address counts.
    """
    hops = getattr(settings, "TRUSTED_PROXY_HOPS", 0)
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if hops > 0 and forwarded:
        parts = [part.strip() for part in forwarded.split(",") if part.strip()]
        if len(parts) >= hops:
            return parts[-hops][:45]
    return request.META.get("REMOTE_ADDR")


def user_agent(request) -> str:
    """User agent of the caller, for the session row."""
    return request.META.get("HTTP_USER_AGENT", "")


def session_payload(user, token: str | None, session=None, *, mfa_enrolled: bool | None = None) -> dict:
    """
    Body of openapi ``Session`` after sign-up, sign-in or password reset.

    While the second factor is due (BR-ACC-04) ``status`` is ``pending_flow``
    with the flow ``mfa_authenticate`` and no user. ``token`` repeats
    ``session_token`` for older clients.
    """
    pending = bool(session is not None and session.mfa_pending)
    body = {
        "status": "pending_flow" if pending else "authenticated",
        "user": None if pending else MeSerializer(user).data,
        "pending_flows": [{"id": "mfa_authenticate", "is_pending": True}] if pending else [],
        "expires_at": session.expires_at if session is not None else None,
    }
    if token:
        body["session_token"] = token
        body["token"] = token
    if mfa_enrolled is not None:
        body["mfa_enrolled"] = mfa_enrolled
    return body


def staff_session_payload(session, token: str | None = None) -> dict:
    """Body of openapi ``StaffSession``: the staff member, permissions read from the database, MFA state."""
    profile = selectors.staff_member(session.user_id)
    body = {
        "user": StaffMemberSerializer(profile).data,
        "permissions": sorted(selectors.staff_permission_codes(profile.user)),
        "mfa_verified": staff_session_complete(session),
        "expires_at": session.expires_at,
    }
    if token:
        body["session_token"] = token
    return body


def step_one_token(request) -> str | None:
    """Token of a sign-in waiting for its second factor: ``X-Session-Token`` header or ``Authorization: Bearer``."""
    token = request.META.get("HTTP_X_SESSION_TOKEN")
    if token:
        return token.strip()
    parts = request.META.get("HTTP_AUTHORIZATION", "").split()
    if len(parts) == 2 and parts[0] == "Bearer":
        return parts[1]
    return None


def query_bool(request, name: str) -> bool | None:
    """Optional boolean query parameter (``true``/``false``/``1``/``0``); 400 when unreadable."""
    raw = request.query_params.get(name)
    if raw in (None, ""):
        return None
    if raw.lower() in ("1", "true", "yes"):
        return True
    if raw.lower() in ("0", "false", "no"):
        return False
    raise DomainError("Invalid query parameter.", code="invalid", errors={name: ["Must be true or false."]})


def query_int(request, name: str, *, minimum: int = 0) -> int | None:
    """Optional whole number query parameter; 400 when unreadable or below ``minimum``."""
    raw = request.query_params.get(name)
    if raw in (None, ""):
        return None
    try:
        value = int(raw)
    except ValueError as exc:
        raise DomainError("Invalid query parameter.", code="invalid", errors={name: ["Must be a whole number."]}) from exc
    if value < minimum:
        raise DomainError("Invalid query parameter.", code="invalid", errors={name: [f"Must be at least {minimum}."]})
    return value


def query_list(request, name: str) -> list[str]:
    """Comma separated (``?status=active,suspended``) or repeated query parameter."""
    values: list[str] = []
    for raw in request.query_params.getlist(name):
        values.extend(part.strip() for part in raw.split(",") if part.strip())
    return values


def paginated(request, items, serializer_class, *, context: dict | None = None):
    """Numbered page ``{"count", "page", "page_size", "results"}`` with the project paginator."""
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(items, request)
    data = serializer_class(page, many=True, context={"request": request, **(context or {})}).data
    return paginator.get_paginated_response(data)


def page_schema(item_serializer):
    """OpenAPI shape of a :func:`paginated` answer (same as ``apps.catalog.api.page_schema``, a higher app)."""
    name = item_serializer.__name__.removesuffix("Serializer")
    return inline_serializer(
        name=f"{name}Page",
        fields={
            "count": serializers.IntegerField(),
            "page": serializers.IntegerField(),
            "page_size": serializers.IntegerField(),
            "results": item_serializer(many=True),
        },
    )


def results_schema(name: str, item_serializer):
    """OpenAPI shape ``{"results": [...]}`` of a short, unpaginated list."""
    return inline_serializer(name=name, fields={"results": item_serializer(many=True)})


# ---------------------------------------------------------------------------
# Website sign-in (/auth/*)
# ---------------------------------------------------------------------------
class SignupView(APIView):
    """``POST /auth/signup``: create an account and open a session."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "auth"
    serializer_class = SignupSerializer

    @extend_schema(request=SignupSerializer, responses={201: SessionSerializer})
    def post(self, request):
        """Create the user, record consent and return a session: the person then completes their profile (ACC-01, ACC-11)."""
        data = SignupSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        ip, agent = client_ip(request), user_agent(request)
        user = services.signup(**data.validated_data, ip=ip, user_agent=agent)
        token = services.start_session(user, ip=ip, user_agent=agent)
        return Response(session_payload(user, token), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """``POST /auth/login``: sign in with email and password."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "auth"
    serializer_class = LoginSerializer

    @extend_schema(request=LoginSerializer, responses={200: SessionSerializer})
    def post(self, request):
        """Return a session token (waiting for the second factor when the user has one), or 401 for any failure."""
        data = LoginSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user, session, token = services.login_with_password(
            **data.validated_data, ip=client_ip(request), user_agent=user_agent(request)
        )
        return Response(session_payload(user, token, session))


class CodeRequestView(APIView):
    """``POST /auth/code/request``: send a sign-in code by SMS."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "otp"
    serializer_class = CodeRequestSerializer

    @extend_schema(request=CodeRequestSerializer, responses={204: None})
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

    @extend_schema(request=CodeConfirmSerializer, responses={200: SessionSerializer})
    def post(self, request):
        """Return a session token; the phone becomes verified."""
        data = CodeConfirmSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user, session, token = services.login_with_code(
            **data.validated_data, ip=client_ip(request), user_agent=user_agent(request)
        )
        return Response(session_payload(user, token, session))


class SessionView(APIView):
    """``GET /auth/session`` (who am I) and ``DELETE /auth/session`` (sign out)."""

    permission_classes = [IsAuthenticated]
    serializer_class = MeSerializer

    @extend_schema(responses={200: inline_serializer(name="SessionUser", fields={"user": MeSerializer()})})
    def get(self, request):
        """Return the signed-in user's profile."""
        return Response({"user": MeSerializer(request.user).data})

    @extend_schema(responses={204: None})
    def delete(self, request):
        """Revoke the current session token."""
        services.logout(request.auth)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PhoneVerifyView(APIView):
    """``POST /auth/phone/verify``: confirm the code sent to my phone."""

    permission_classes = [IsAuthenticated]
    throttle_scope = "auth"
    serializer_class = PhoneVerifySerializer

    @extend_schema(request=PhoneVerifySerializer, responses={200: MeSerializer})
    def post(self, request):
        """Mark the phone as verified (needed before the first booking)."""
        data = PhoneVerifySerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.verify_phone(request.user, data.validated_data["code"])
        return Response(MeSerializer(request.user).data)


class EmailVerifyView(APIView):
    """``POST /auth/email/verify``: confirm my email with the key of the emailed link (ACC-01)."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "auth"
    serializer_class = EmailVerifySerializer

    @extend_schema(request=EmailVerifySerializer, responses={200: SessionSerializer})
    def post(self, request):
        """Mark the email verified; 400 ``invalid_key`` for a wrong or expired key. No session is opened."""
        data = EmailVerifySerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user = services.verify_email(data.validated_data["key"])
        return Response(session_payload(user, None))


class EmailResendView(APIView):
    """``POST /auth/email/resend``: email the verification link again to the signed-in user (ACC-01)."""

    permission_classes = [IsAuthenticated]
    throttle_scope = "otp"

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        """Always 204; nothing is sent when there is no email or it is already verified."""
        services.send_email_verification(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordRequestView(APIView):
    """``POST /auth/password/request``: email a reset link or text a reset code (ACC-04)."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "otp"
    serializer_class = PasswordResetRequestSerializer

    @extend_schema(request=PasswordResetRequestSerializer, responses={204: None})
    def post(self, request):
        """Always 204, even for unknown accounts."""
        data = PasswordResetRequestSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.request_password_reset(**data.validated_data, ip=client_ip(request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetView(APIView):
    """``POST /auth/password/reset``: set a new password with the reset key (ACC-04, BR-ACC-03)."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "auth"
    serializer_class = PasswordResetSerializer

    @extend_schema(request=PasswordResetSerializer, responses={200: SessionSerializer})
    def post(self, request):
        """Every other session is revoked; a new one is opened (waiting for the second factor if any)."""
        data = PasswordResetSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user, session, token = services.reset_password(
            **data.validated_data, ip=client_ip(request), user_agent=user_agent(request)
        )
        return Response(session_payload(user, token, session))


class PasswordChangeView(APIView):
    """``POST /auth/password/change``: change my password (was ``POST /me/password``)."""

    permission_classes = [IsAuthenticated]
    throttle_scope = "auth"
    serializer_class = PasswordChangeSerializer

    @extend_schema(request=PasswordChangeSerializer, responses={204: None})
    def post(self, request):
        """Change the password and sign out every other device (BR-ACC-03); 400 ``invalid_current_password``."""
        data = PasswordChangeSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.change_password(request.user, **data.validated_data, keep_session=request.auth)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MfaAuthenticateView(APIView):
    """``POST /auth/2fa/authenticate``: second step of a website sign-in (BR-ACC-04)."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "auth"
    serializer_class = MfaAuthenticateSerializer

    @extend_schema(
        request=MfaAuthenticateSerializer,
        responses={200: SessionSerializer},
        parameters=[OpenApiParameter("X-Session-Token", str, OpenApiParameter.HEADER, description="Token of step 1.")],
    )
    def post(self, request):
        """Check the TOTP or recovery code sent with the step 1 token; the same token becomes a full session."""
        data = MfaAuthenticateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        token = step_one_token(request)
        session = services.complete_mfa(token, data.validated_data["code"], scope=SessionScope.WEB, ip=client_ip(request))
        return Response(session_payload(session.user, token, session))


class AuthenticatorListView(APIView):
    """``GET /auth/authenticators``: my second factors."""

    permission_classes = [IsAuthenticated]
    serializer_class = AuthenticatorSerializer

    @extend_schema(responses={200: results_schema("AuthenticatorList", AuthenticatorSerializer)})
    def get(self, request):
        """Confirmed authenticators only; secrets are never shown."""
        rows = selectors.authenticators_of(request.user)
        return Response({"results": AuthenticatorSerializer(rows, many=True).data})


def _enrolment_answer(authenticator, codes: list[str]) -> dict:
    """Enrolment answer: the authenticator and its recovery codes, shown once."""
    return {**AuthenticatorSerializer(authenticator).data, "recovery_codes": codes}


class TotpView(APIView):
    """
    ``GET /auth/authenticators/totp`` (a secret to enrol) and ``POST`` (enrol it with a first code).

    Works on a session still waiting for its second factor, so a staff member
    can enrol during the first sign-in (BR-ACC-04).
    """

    permission_classes = [IsAuthenticated]
    allow_mfa_pending = True
    serializer_class = TotpCodeSerializer

    @extend_schema(responses={200: TotpSetupSerializer})
    def get(self, request):
        """Secret and ``otpauth://`` URL to show as a QR code."""
        return Response(services.totp_setup(request.user))

    @extend_schema(request=TotpCodeSerializer, responses={201: AuthenticatorCreatedSerializer})
    def post(self, request):
        """Confirm the app; returns the authenticator and 10 recovery codes (shown once)."""
        data = TotpCodeSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        row, codes = services.enrol_totp(
            request.user, data.validated_data["code"], session=request.auth, ip=client_ip(request)
        )
        return Response(_enrolment_answer(row, codes), status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# My profile, privacy and favourites (/me*)
# ---------------------------------------------------------------------------
class MeView(APIView):
    """``GET /me`` and ``PATCH /me``: my profile."""

    permission_classes = [IsAuthenticated]
    serializer_class = MeUpdateSerializer

    @extend_schema(responses={200: MeSerializer})
    def get(self, request):
        """Return my private profile."""
        return Response(MeSerializer(request.user).data)

    @extend_schema(request=MeUpdateSerializer, responses={200: MeSerializer})
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

    @extend_schema(request=PhoneSerializer, responses={202: MeSerializer})
    def put(self, request):
        """Store the new phone as unverified and send the code."""
        data = PhoneSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.set_phone(request.user, data.validated_data["phone"], ip=client_ip(request))
        return Response(MeSerializer(request.user).data, status=status.HTTP_202_ACCEPTED)


class MeConsentsView(APIView):
    """``GET /me/consents`` (current consents) and ``POST`` (accept or withdraw one), BR-PRV-01."""

    permission_classes = [IsAuthenticated]
    serializer_class = ConsentCreateSerializer

    @extend_schema(responses={200: results_schema("ConsentList", ConsentSerializer)})
    def get(self, request):
        """The latest row per document."""
        return Response({"results": ConsentSerializer(selectors.current_consents(request.user), many=True).data})

    @extend_schema(request=ConsentCreateSerializer, responses={201: ConsentSerializer})
    def post(self, request):
        """Append a new row with time and IP (the history is never changed)."""
        data = ConsentCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        row = services.record_consent(
            request.user, **data.validated_data, ip=client_ip(request), user_agent=user_agent(request)
        )
        return Response(ConsentSerializer(row).data, status=status.HTTP_201_CREATED)


class MeDataRequestsView(APIView):
    """``GET /me/data-requests`` and ``POST`` (access, correction, deletion, opposition), BR-PRV-02."""

    permission_classes = [IsAuthenticated]
    serializer_class = DataSubjectRequestCreateSerializer

    @extend_schema(responses={200: results_schema("DataSubjectRequestList", DataSubjectRequestSerializer)})
    def get(self, request):
        """My requests, newest first, with their deadlines."""
        rows = selectors.data_requests_of(request.user)
        return Response({"results": DataSubjectRequestSerializer(rows, many=True).data})

    @extend_schema(request=DataSubjectRequestCreateSerializer, responses={201: DataSubjectRequestSerializer})
    def post(self, request):
        """Open a request due in 30 days; 409 ``data_request_open`` when one of the same kind is open."""
        data = DataSubjectRequestCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        row = services.create_data_request(request.user, **data.validated_data, ip=client_ip(request))
        return Response(DataSubjectRequestSerializer(row).data, status=status.HTTP_201_CREATED)


def _target_type(value: str) -> str:
    """Path ``target_type`` must be ``listing`` or ``trip`` (400 otherwise)."""
    if value not in FavoriteTarget.values:
        raise DomainError("Unknown target type.", code="invalid", errors={"target_type": ["Use listing or trip."]})
    return value


class MeFavoritesView(APIView):
    """``GET /me/favorites``: my favourites, newest first, by cursor (ACC-09)."""

    permission_classes = [IsAuthenticated]
    serializer_class = FavoritePageSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter("target_type", str, enum=FavoriteTarget.values, required=False),
            OpenApiParameter("cursor", str, required=False),
            OpenApiParameter("limit", int, required=False, description="1 to 50, default 20."),
        ],
        responses={200: FavoritePageSerializer},
    )
    def get(self, request):
        """One page with the card of each item when its app provides it."""
        target_type = request.query_params.get("target_type") or ""
        if target_type:
            _target_type(target_type)
        limit = min(query_int(request, "limit", minimum=1) or 20, 50)
        rows, next_cursor = selectors.favorites_page(
            request.user, target_type=target_type, cursor=request.query_params.get("cursor", ""), limit=limit
        )
        cards = selectors.favorite_cards(rows, request)
        results = []
        for row in rows:
            card, available = cards[(row.target_type, row.target_id)]
            results.append({
                "target_type": row.target_type,
                "target_id": str(row.target_id),
                "listing": card if row.target_type == FavoriteTarget.LISTING else None,
                "trip": card if row.target_type == FavoriteTarget.TRIP else None,
                "is_available": available,
                "created_at": row.created_at,
            })
        return Response({"results": results, "next_cursor": next_cursor, "has_more": next_cursor is not None})


class MeFavoriteDetailView(APIView):
    """``PUT`` (add) and ``DELETE`` (remove) ``/me/favorites/{target_type}/{target_id}``; both idempotent."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def put(self, request, target_type: str, target_id):
        """Save the item; 404 when its app says it does not exist."""
        services.add_favorite(request.user, target_type=_target_type(target_type), target_id=target_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(responses={204: None})
    def delete(self, request, target_type: str, target_id):
        """Remove the item (204 even when it was not saved)."""
        services.remove_favorite(request.user, target_type=_target_type(target_type), target_id=target_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicUserView(APIView):
    """``GET /users/{user_id}``: public profile by id or handle (no email, phone or address)."""

    permission_classes = [AllowAny]
    serializer_class = PublicUserSerializer

    @extend_schema(responses={200: PublicUserSerializer})
    def get(self, request, user_id):
        """404 for unknown, suspended, banned, deleted and staff accounts."""
        user = selectors.public_user(user_id)
        if user is None:
            raise NotFoundError("User not found.")
        return Response(PublicUserSerializer(user).data)


# ---------------------------------------------------------------------------
# Staff sign-in (/admin/auth/*, STF-05)
# ---------------------------------------------------------------------------
class AdminLoginView(APIView):
    """``POST /admin/auth/login``: staff sign-in step 1 (password); always asks for the second factor."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "auth"
    serializer_class = AdminLoginSerializer

    @extend_schema(request=AdminLoginSerializer, responses={200: SessionSerializer})
    def post(self, request):
        """Return a pending staff session; ``mfa_enrolled`` says whether to ask for a code or for the enrolment."""
        data = AdminLoginSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user, session, token = services.staff_login(
            **data.validated_data, ip=client_ip(request), user_agent=user_agent(request)
        )
        return Response(session_payload(user, token, session, mfa_enrolled=selectors.user_has_mfa(user)))


class AdminMfaAuthenticateView(APIView):
    """``POST /admin/auth/2fa/authenticate``: staff sign-in step 2 (TOTP or recovery code)."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "auth"
    serializer_class = MfaAuthenticateSerializer

    @extend_schema(
        request=MfaAuthenticateSerializer,
        responses={200: StaffSessionSerializer},
        parameters=[OpenApiParameter("X-Session-Token", str, OpenApiParameter.HEADER, description="Token of step 1.")],
    )
    def post(self, request):
        """The step 1 token becomes a complete staff session (8 h absolute, 30 min idle, BR-ACC-03)."""
        data = MfaAuthenticateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        token = step_one_token(request)
        session = services.complete_mfa(token, data.validated_data["code"], scope=SessionScope.STAFF, ip=client_ip(request))
        return Response(staff_session_payload(session, token))


class AdminSessionView(APIView):
    """``GET /admin/auth/session`` (current staff and permissions) and ``DELETE`` (sign out)."""

    permission_classes = [IsAdmin]
    serializer_class = StaffSessionSerializer

    @extend_schema(responses={200: StaffSessionSerializer})
    def get(self, request):
        """Permissions are read from the database on every request (BR-STF-01)."""
        return Response(staff_session_payload(request.auth))

    @extend_schema(responses={204: None})
    def delete(self, request):
        """Revoke this staff session at once (BR-ACC-03)."""
        services.logout(request.auth)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminInvitationAcceptView(APIView):
    """``POST /admin/auth/invitations/accept``: set my staff password; the TOTP enrolment comes next."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "auth"
    serializer_class = StaffInviteAcceptSerializer

    @extend_schema(request=StaffInviteAcceptSerializer, responses={200: SessionSerializer})
    def post(self, request):
        """Return a pending staff session to call the enrolment with."""
        data = StaffInviteAcceptSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user, session, token = services.accept_staff_invitation(
            **data.validated_data, ip=client_ip(request), user_agent=user_agent(request)
        )
        return Response(session_payload(user, token, session, mfa_enrolled=False))


class AdminTotpEnrolView(APIView):
    """
    ``POST /admin/auth/authenticators/totp``: enrol the authenticator app (BR-ACC-04).

    Accepts the pending session of step 1 or of the invitation; the secret
    comes from ``GET /auth/authenticators/totp`` with the same token.
    Completes the session and activates an invited staff member.
    """

    permission_classes = [IsStaffSession]
    allow_mfa_pending = True
    serializer_class = TotpCodeSerializer

    @extend_schema(request=TotpCodeSerializer, responses={201: AuthenticatorCreatedSerializer})
    def post(self, request):
        """Confirm the app with its first code; returns the 10 recovery codes once."""
        data = TotpCodeSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        row, codes = services.enrol_totp(
            request.user, data.validated_data["code"], session=request.auth, ip=client_ip(request)
        )
        return Response(_enrolment_answer(row, codes), status=status.HTTP_201_CREATED)


class AdminPasswordChangeView(APIView):
    """``POST /admin/auth/password/change``: change my staff password."""

    permission_classes = [IsAdmin]
    throttle_scope = "auth"
    serializer_class = PasswordChangeSerializer

    @extend_schema(request=PasswordChangeSerializer, responses={204: None})
    def post(self, request):
        """Change the password and revoke every other session (BR-ACC-03)."""
        data = PasswordChangeSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.change_password(request.user, **data.validated_data, keep_session=request.auth)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Admin: staff (STF-01, STF-02), permission team.manage
# ---------------------------------------------------------------------------
class AdminStaffListView(APIView):
    """``GET /admin/staff``: every staff member."""

    permission_classes = [IsAdmin]
    staff_permission = "team.manage"
    serializer_class = StaffMemberSerializer

    @extend_schema(responses={200: results_schema("StaffMemberList", StaffMemberSerializer)})
    def get(self, request):
        """Active first, then by invitation date."""
        rows = list(selectors.staff_members())
        context = {"mfa_user_ids": selectors.users_with_mfa(row.user_id for row in rows)}
        return Response({"results": StaffMemberSerializer(rows, many=True, context=context).data})


class AdminStaffRolesView(APIView):
    """``GET /admin/staff/roles``: roles and their permissions, from the database (BR-STF-01)."""

    permission_classes = [IsAdmin]
    staff_permission = "team.manage"
    serializer_class = StaffRoleSerializer

    @extend_schema(responses={200: results_schema("StaffRoleList", StaffRoleSerializer)})
    def get(self, request):
        """One role today: admin, with every permission (DEC-016)."""
        grants = selectors.role_permissions()
        results = [{"role": role, "label": label, "permissions": grants.get(role, [])} for role, label in StaffRole.choices]
        return Response({"results": results})


class AdminStaffInviteView(APIView):
    """``POST /admin/staff/invitations``: invite a staff member (one-time link by email)."""

    permission_classes = [IsAdmin]
    staff_permission = "team.manage"
    serializer_class = StaffInviteSerializer

    @extend_schema(request=StaffInviteSerializer, responses={201: StaffMemberSerializer})
    def post(self, request):
        """Create the invited account; 409 ``email_taken``."""
        data = StaffInviteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        profile = services.invite_staff(actor=request.user, **data.validated_data, ip=client_ip(request))
        return Response(StaffMemberSerializer(profile).data, status=status.HTTP_201_CREATED)


class AdminStaffDetailView(APIView):
    """``PATCH /admin/staff/{staff_id}``: change a staff role."""

    permission_classes = [IsAdmin]
    staff_permission = "team.manage"
    serializer_class = StaffUpdateSerializer

    @extend_schema(request=StaffUpdateSerializer, responses={200: StaffMemberSerializer})
    def patch(self, request, staff_id):
        """409 ``last_super_admin`` when no admin would remain."""
        data = StaffUpdateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        profile = services.change_staff_role(
            actor=request.user, staff_id=staff_id, role=data.validated_data["role"], ip=client_ip(request)
        )
        return Response(StaffMemberSerializer(profile).data)


class AdminStaffActionView(APIView):
    """
    ``POST /admin/staff/{staff_id}/deactivate|activate|reset-mfa``.

    The URL sets the action. Deactivation and MFA reset revoke the member's
    sessions at once (BR-ACC-03, BR-ACC-04).
    """

    permission_classes = [IsAdmin]
    staff_permission = "team.manage"
    serializer_class = StaffMemberSerializer
    staff_action = "deactivate"

    @extend_schema(request=None, responses={200: StaffMemberSerializer})
    def post(self, request, staff_id):
        """Run the action and return the staff member."""
        handler = {
            "deactivate": services.deactivate_staff,
            "activate": services.activate_staff,
            "reset-mfa": services.reset_staff_mfa,
        }[self.staff_action]
        profile = handler(actor=request.user, staff_id=staff_id, ip=client_ip(request))
        return Response(StaffMemberSerializer(profile).data)


# ---------------------------------------------------------------------------
# Admin: users (ACC-08, STF-03)
# ---------------------------------------------------------------------------
class AdminUserListView(APIView):
    """``GET /admin/users``: guests and hosts as people (staff are under /admin/staff)."""

    permission_classes = [IsAdmin]
    staff_permission = "users.view"
    serializer_class = AdminUserSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter("status", str, required=False, description="Comma list of user statuses."),
            OpenApiParameter("is_host", bool, required=False),
            OpenApiParameter("email_verified", bool, required=False),
            OpenApiParameter("phone_verified", bool, required=False),
            OpenApiParameter("wilaya", str, required=False, description="Comma list of wilaya codes (home commune)."),
            OpenApiParameter("min_bookings", int, required=False),
            OpenApiParameter("min_spend_minor", int, required=False),
            OpenApiParameter("flagged", bool, required=False),
            OpenApiParameter("q", str, required=False, description="Name, email, phone."),
            OpenApiParameter(
                "ordering", str, required=False,
                enum=["joined", "-joined", "bookings", "-bookings", "spend", "-spend", "activity", "-activity"],
            ),
            OpenApiParameter("page", int, required=False),
            OpenApiParameter("page_size", int, required=False),
        ],
        responses={200: page_schema(AdminUserSerializer)},
    )
    def get(self, request):
        """Filters on the user table here; booking, spend, host and flag filters through the other apps' hooks."""
        statuses = query_list(request, "status")
        bad = [value for value in statuses if value not in UserStatus.values]
        if bad:
            raise DomainError("Invalid query parameter.", code="invalid", errors={"status": [f"Unknown: {', '.join(bad)}."]})
        try:
            wilayas = [int(value) for value in query_list(request, "wilaya")]
        except ValueError as exc:
            raise DomainError("Invalid query parameter.", code="invalid", errors={"wilaya": ["Whole numbers."]}) from exc
        ordering = request.query_params.get("ordering") or "-joined"
        allowed = {"joined", "bookings", "spend", "activity"}
        if ordering.lstrip("-") not in allowed:
            raise DomainError("Invalid query parameter.", code="invalid", errors={"ordering": ["Unknown ordering."]})
        rows = selectors.admin_users(
            statuses=statuses,
            q=request.query_params.get("q", "").strip(),
            email_verified=query_bool(request, "email_verified"),
            phone_verified=query_bool(request, "phone_verified"),
            wilayas=wilayas,
            extra_filters={
                "is_host": query_bool(request, "is_host"),
                "min_bookings": query_int(request, "min_bookings"),
                "min_spend_minor": query_int(request, "min_spend_minor"),
                "flagged": query_bool(request, "flagged"),
            },
            ordering=ordering,
        )
        return paginated(request, rows, AdminUserSerializer)


class AdminUserDetailView(APIView):
    """``GET /admin/users/{user_id}`` and ``DELETE`` (soft delete, anonymisation follows, BR-PRV-02)."""

    permission_classes = [IsAdmin]
    staff_permissions = {"GET": "users.view", "DELETE": "users.delete"}
    serializer_class = AdminUserSerializer

    @extend_schema(responses={200: AdminUserSerializer})
    def get(self, request, user_id):
        """One user, deleted ones included."""
        user = selectors.admin_user(user_id)
        if user is None:
            raise NotFoundError("User not found.")
        return Response(AdminUserSerializer(user).data)

    @extend_schema(responses={204: None})
    def delete(self, request, user_id):
        """Soft-delete and revoke every session; 409 when already deleted. Audited."""
        services.admin_set_user_status(actor=request.user, user_id=user_id, action="delete", ip=client_ip(request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminUserActionView(APIView):
    """
    ``POST /admin/users/{user_id}/suspend|unsuspend|ban|restore``.

    The URL sets the action and its staff permission. Suspend and ban need a
    reason and revoke every session at once (BR-ACC-03). Audited with ids
    and statuses only (BR-STF-02).
    """

    permission_classes = [IsAdmin]
    staff_permission = "users.suspend"
    serializer_class = UserActionReasonSerializer
    user_action = "suspend"

    @extend_schema(request=UserActionReasonSerializer, responses={200: AdminUserSerializer})
    def post(self, request, user_id):
        """Run the action and return the user."""
        reason, reason_code = "", None
        if self.user_action in ("suspend", "ban") or request.data:
            data = UserActionReasonSerializer(data=request.data)
            data.is_valid(raise_exception=True)
            reason, reason_code = data.validated_data["reason"], data.validated_data.get("reason_code")
        user = services.admin_set_user_status(
            actor=request.user, user_id=user_id, action=self.user_action, reason=reason, reason_code=reason_code,
            ip=client_ip(request),
        )
        return Response(AdminUserSerializer(user).data)


# ---------------------------------------------------------------------------
# Admin: data protection requests (BR-PRV-02), permission privacy.handle_requests
# ---------------------------------------------------------------------------
class AdminDataRequestListView(APIView):
    """``GET /admin/data-requests``: requests with their deadlines, the nearest first."""

    permission_classes = [IsAdmin]
    staff_permission = "privacy.handle_requests"
    serializer_class = DataSubjectRequestAdminSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter("status", str, required=False),
            OpenApiParameter("kind", str, required=False, enum=DsrKind.values),
            OpenApiParameter("page", int, required=False),
            OpenApiParameter("page_size", int, required=False),
        ],
        responses={200: page_schema(DataSubjectRequestAdminSerializer)},
    )
    def get(self, request):
        """Filter by status and kind."""
        rows = selectors.admin_data_requests(
            status=request.query_params.get("status", ""), kind=request.query_params.get("kind", "")
        )
        return paginated(request, rows, DataSubjectRequestAdminSerializer)


class AdminDataRequestCompleteView(APIView):
    """``POST /admin/data-requests/{data_request_id}/complete``: close a request (a completed deletion anonymises)."""

    permission_classes = [IsAdmin]
    staff_permission = "privacy.handle_requests"
    serializer_class = DataSubjectRequestCompleteSerializer

    @extend_schema(request=DataSubjectRequestCompleteSerializer, responses={200: DataSubjectRequestAdminSerializer})
    def post(self, request, data_request_id):
        """409 ``data_request_closed`` when already closed. Audited."""
        data = DataSubjectRequestCompleteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        row = services.complete_data_request(
            actor=request.user, request_id=data_request_id, **data.validated_data, ip=client_ip(request)
        )
        return Response(DataSubjectRequestAdminSerializer(row).data)


# ---------------------------------------------------------------------------
# Continue with Google (ACC-10)
# ---------------------------------------------------------------------------
class AuthProvidersView(APIView):
    """``GET /auth/providers``: which outside sign-ins are on (the Google client id is public by design)."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    @extend_schema(responses={200: AuthProvidersSerializer})
    def get(self, request):
        """Google is on when its client id and secret are configured."""
        from . import google

        enabled = google.is_configured()
        return Response({
            "google_enabled": enabled,
            "google_client_id": settings.GOOGLE_CLIENT_ID if enabled else "",
            "phone_otp_required": settings.PHONE_OTP_REQUIRED,
        })


class GoogleSignInView(APIView):
    """``POST /auth/google``: finish "Continue with Google" with the one-time code (ACC-10)."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "auth"
    serializer_class = GoogleSignInSerializer

    @extend_schema(request=GoogleSignInSerializer, responses={200: SessionSerializer})
    def post(self, request):
        """A session like a password sign-in (waiting for the code when an authenticator is enrolled); ``created`` for new accounts."""
        data = GoogleSignInSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        user, session, token, created = services.google_sign_in(
            code=values["code"],
            code_verifier=values["code_verifier"],
            redirect_uri=values["redirect_uri"],
            accept_terms_version=values.get("accept_terms_version") or None,
            locale=values["locale"],
            ip=client_ip(request),
            user_agent=user_agent(request),
        )
        return Response({**session_payload(user, token, session), "created": created})


class SocialAccountListView(APIView):
    """``GET /me/social-accounts``: the sign-in accounts connected to mine (ACC-10)."""

    @extend_schema(responses={200: SocialAccountSerializer(many=True)})
    def get(self, request):
        """Connected accounts, oldest first, plus whether the account has a password (needed to disconnect)."""
        rows = request.user.social_accounts.order_by("created_at")
        return Response({
            "results": SocialAccountSerializer(rows, many=True).data,
            "has_password": request.user.has_usable_password(),
        })


class SocialAccountDetailView(APIView):
    """``DELETE /me/social-accounts/{id}``: disconnect it (409 ``last_sign_in_method`` without a password)."""

    @extend_schema(responses={204: None})
    def delete(self, request, account_id):
        """Remove the link; the Google account can be connected again later."""
        services.unlink_social_account(request.user, account_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileCompleteView(APIView):
    """``POST /me/profile/complete``: finish 'complete your profile' after sign-up (ACC-11)."""

    @extend_schema(request=None, responses={200: MeSerializer})
    def post(self, request):
        """422 ``profile_incomplete`` (``errors.missing``: name, phone, date_of_birth) until the required steps are done."""
        user = services.complete_profile(request.user)
        return Response(MeSerializer(user).data)

