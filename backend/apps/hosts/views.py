"""
HTTP endpoints of the hosts app.

Groups: onboarding drafts (becoming a host), the workspace switcher
(``/me/workspaces``), the active workspace (``/host/*``, always through ``get_host_context`` so a
request can only touch the host account the user really holds, BR-ORG-01),
payout accounts, hotel system sync, invitations, the public organisation
profile and directory, and the admin review (``/admin/*``, admins only). Views stay thin: validate, call a service,
format the answer.
"""

import uuid

from django.http import HttpResponseRedirect
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.accounts.views import client_ip
from apps.core import idempotency
from apps.core.errors import DomainError, NotFoundError

from . import selectors, services
from .context import get_host_context
from .models import BusinessCategory, VerificationStatus
from .serializers import (
    AdminHostAccountDetailSerializer,
    AdminHostAccountSerializer,
    CommissionOverrideSerializer,
    CreditLimitSerializer,
    HostAccountUpdateSerializer,
    HostDocumentCreateSerializer,
    HostDocumentSerializer,
    IntegrationSyncRunSerializer,
    InvitationAcceptSerializer,
    InvitationCreateSerializer,
    InvitationCreatedSerializer,
    InvitationSerializer,
    MemberSerializer,
    MemberUpdateSerializer,
    OnboardingDraftSerializer,
    OnboardingDraftWriteSerializer,
    OnboardingResultSerializer,
    OrganizationSerializer,
    OrganizationWriteSerializer,
    OwnershipTransferSerializer,
    PayoutAccountCreateSerializer,
    PayoutAccountSerializer,
    PropertyIntegrationCreateSerializer,
    PropertyIntegrationSerializer,
    PublicOrganizationSerializer,
    ReasonSerializer,
    DocumentSignedUrlSerializer,
    WorkspaceSerializer,
    WorkspaceSwitchSerializer,
    host_account_data,
    workspace_data,
)

# Logical name of onboarding submission in the idempotency table (BR-SYS-01).
SUBMIT_ENDPOINT = "hosts.onboarding.submit"
# Directory page size (Limit parameter of the plan: default 20, max 50).
DIRECTORY_DEFAULT_LIMIT, DIRECTORY_MAX_LIMIT = 20, 50


def active_id(request):
    """Workspace id remembered on the caller's session (``None`` when never chosen)."""
    return getattr(request.auth, "active_host_account_id", None)


def context_account_data(request) -> dict:
    """``GET /host/account`` body for the active workspace of ``request``."""
    ctx = get_host_context(request)
    return host_account_data(ctx.host_account, ctx.membership, ctx.host_account.id)


# ---------------------------------------------------------------------------
# Workspaces (ORG-02)
# ---------------------------------------------------------------------------
class WorkspaceListView(APIView):
    """``GET /me/workspaces``: every host account the caller can act for."""

    serializer_class = WorkspaceSwitchSerializer

    def get(self, request):
        """Solo host account first (if any), then organisations by join date."""
        chosen = active_id(request)
        results = [workspace_data(acc, mem, chosen) for acc, mem in selectors.host_accounts_for(request.user)]
        return Response({"results": results, "active_host_account_id": str(chosen) if chosen else None})


class WorkspaceActiveView(APIView):
    """``PUT /me/workspaces/active``: remember which workspace this session acts for."""

    serializer_class = WorkspaceSwitchSerializer

    def put(self, request):
        """Store the choice on the session token; 404 when the user does not hold that account."""
        data = WorkspaceSwitchSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        account, membership = services.switch_workspace(request.user, request.auth, data.validated_data["host_account_id"])
        return Response(workspace_data(account, membership, account.id))


# ---------------------------------------------------------------------------
# Active workspace
# ---------------------------------------------------------------------------
class HostAccountView(APIView):
    """``GET`` and ``PATCH /host/account``: the active host account."""

    serializer_class = HostAccountUpdateSerializer

    def get(self, request):
        """Workspace data, approval mode, commission rate and document checklist."""
        return Response(context_account_data(request))

    def patch(self, request):
        """Change the default approval mode (needs ``org.edit``)."""
        data = HostAccountUpdateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.update_host_account(get_host_context(request), **data.validated_data)
        return Response(context_account_data(request))


class HostOrganizationView(APIView):
    """``GET`` and ``PATCH /host/organization``: the active organisation's private profile."""

    @extend_schema(responses=OrganizationSerializer)
    def get(self, request):
        """Full profile including legal numbers (team only); 404 for a solo host."""
        org = services.require_organization(get_host_context(request))
        return Response(OrganizationSerializer(org).data)

    @extend_schema(request=OrganizationWriteSerializer, responses=OrganizationSerializer)
    def patch(self, request):
        """Edit the profile (``org.edit``); a legal change sends the host back to review (BR-ORG-06)."""
        ctx = get_host_context(request)
        org = services.require_organization(ctx)
        data = OrganizationWriteSerializer(org, data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        org = services.update_organization(ctx, request.user, data.validated_data, ip=client_ip(request))
        return Response(OrganizationSerializer(org).data)

    @extend_schema(
        parameters=[OpenApiParameter("confirm_name", str, OpenApiParameter.QUERY, required=True,
                                     description="Must equal the display name exactly.")],
        responses={204: None},
    )
    def delete(self, request):
        """Soft-delete the organisation (owner, ``org.delete``); 409 while bookings are upcoming (BR-ORG-04)."""
        services.delete_organization(
            get_host_context(request), request.user,
            confirm_name=request.query_params.get("confirm_name", ""), ip=client_ip(request),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class MemberListView(APIView):
    """``GET /host/organization/members``: the active team (any member may see it)."""

    @extend_schema(responses=inline_serializer("MemberList", {"results": MemberSerializer(many=True)}))
    def get(self, request):
        """Owner first, then by join date."""
        org = services.require_organization(get_host_context(request))
        return Response({"results": MemberSerializer(selectors.members_of(org), many=True).data})


class MemberDetailView(APIView):
    """``PATCH`` (change role) and ``DELETE`` (remove) ``/host/organization/members/{id}``."""

    @extend_schema(request=MemberUpdateSerializer, responses=MemberSerializer)
    def patch(self, request, membership_id):
        """Change a member's role (``members.manage``; never to or from owner)."""
        data = MemberUpdateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        member = services.change_member_role(
            get_host_context(request), request.user, membership_id, data.validated_data["role"], ip=client_ip(request)
        )
        return Response(MemberSerializer(member).data)

    @extend_schema(responses={204: None})
    def delete(self, request, membership_id):
        """Remove a member (``members.manage``; the owner cannot be removed)."""
        services.remove_member(get_host_context(request), request.user, membership_id, ip=client_ip(request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class OwnershipTransferView(APIView):
    """``POST /host/organization/transfer-ownership``: the owner hands over (BR-ORG-04)."""

    @extend_schema(request=OwnershipTransferSerializer, responses=MemberSerializer)
    def post(self, request):
        """Promote the chosen member to owner; the caller becomes admin."""
        data = OwnershipTransferSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        new_owner = services.transfer_ownership(
            get_host_context(request), request.user, data.validated_data["membership_id"], ip=client_ip(request)
        )
        return Response(MemberSerializer(new_owner).data)


class InvitationListView(APIView):
    """``GET`` and ``POST /host/organization/invitations`` (``members.manage``)."""

    @extend_schema(responses=inline_serializer("InvitationList", {"results": InvitationSerializer(many=True)}))
    def get(self, request):
        """Every invitation, newest first."""
        ctx = get_host_context(request)
        ctx.require("members.manage")
        org = services.require_organization(ctx)
        return Response({"results": InvitationSerializer(selectors.invitations_of(org), many=True).data})

    @extend_schema(request=InvitationCreateSerializer, responses={201: InvitationCreatedSerializer})
    def post(self, request):
        """
        Invite an email or phone. The raw ``token`` is in this answer only.

        Email and SMS sending are not built yet, so the inviter passes the
        token on; it is never shown again.
        """
        data = InvitationCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        invitation, token = services.create_invitation(
            get_host_context(request), request.user, ip=client_ip(request), **data.validated_data
        )
        return Response({**InvitationSerializer(invitation).data, "token": token}, status=status.HTTP_201_CREATED)


class InvitationDetailView(APIView):
    """``DELETE /host/organization/invitations/{id}``: revoke a pending invitation."""

    @extend_schema(responses={204: None})
    def delete(self, request, invitation_id):
        """Mark the invitation revoked; the token stops working."""
        services.revoke_invitation(get_host_context(request), request.user, invitation_id, ip=client_ip(request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class InvitationAcceptView(APIView):
    """``POST /invitations/accept``: join a team with the token received (BR-ORG-03)."""

    @extend_schema(request=InvitationAcceptSerializer, responses=WorkspaceSerializer)
    def post(self, request):
        """Create the membership and return the new workspace."""
        data = InvitationAcceptSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        membership = services.accept_invitation(request.user, data.validated_data["token"], ip=client_ip(request))
        account = membership.organization.host_account
        return Response(workspace_data(account, membership, active_id(request)))


class DocumentListView(APIView):
    """``GET`` and ``POST /host/documents``: verification documents of the active host account."""

    serializer_class = HostDocumentSerializer

    def get(self, request):
        """Documents not withdrawn, newest first."""
        ctx = get_host_context(request)
        return Response({"results": HostDocumentSerializer(selectors.documents_of(ctx.host_account), many=True).data})

    def post(self, request):
        """Add a document (``org.edit``); it waits for review as ``pending``."""
        data = HostDocumentCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        document = services.add_document(get_host_context(request), **data.validated_data)
        return Response(HostDocumentSerializer(document).data, status=status.HTTP_201_CREATED)


class DocumentDetailView(APIView):
    """``DELETE /host/documents/{id}``: withdraw a pending or rejected document."""

    serializer_class = HostDocumentSerializer

    def delete(self, request, document_id):
        """Soft-delete the document."""
        services.delete_document(get_host_context(request), document_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class VerificationSubmitView(APIView):
    """``POST /host/verification/submit``: send the host account for review."""

    serializer_class = OrganizationSerializer

    def post(self, request):
        """Move to ``under_review`` and return the updated account."""
        services.submit_for_verification(get_host_context(request), request.user)
        return Response(context_account_data(request))


class IntegrationListView(APIView):
    """``GET`` and ``POST /host/integrations``: hotel system connections (DEC-017)."""

    serializer_class = PropertyIntegrationSerializer

    def get(self, request):
        """Connections of the active hotel or hostel (``listings.manage``)."""
        integrations = services.list_integrations(get_host_context(request))
        return Response({"results": PropertyIntegrationSerializer(integrations, many=True).data})

    def post(self, request):
        """Declare a connection; it stays ``pending`` until the sync adapters exist."""
        data = PropertyIntegrationCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        integration = services.create_integration(get_host_context(request), request.user, **data.validated_data)
        return Response(PropertyIntegrationSerializer(integration).data, status=status.HTTP_201_CREATED)


class IntegrationDetailView(APIView):
    """``DELETE /host/integrations/{id}``: remove a connection and its stored credentials."""

    serializer_class = PropertyIntegrationSerializer

    def delete(self, request, integration_id):
        """Delete the connection."""
        services.delete_integration(get_host_context(request), integration_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------
class PublicOrganizationView(APIView):
    """``GET /organizations/{slug}``: public profile of an approved organisation."""

    permission_classes = [AllowAny]
    serializer_class = PublicOrganizationSerializer

    def get(self, request, slug):
        """Public fields only; 404 for an unknown, deleted or unapproved organisation."""
        org = selectors.public_organization(slug)
        if org is None:
            raise NotFoundError("Unknown organisation.", code="organization_not_found")
        return Response(PublicOrganizationSerializer(org).data)


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------
class AdminHostListView(ListAPIView):
    """``GET /admin/hosts``: paginated; filters ``verification_status`` and ``host_type``."""

    permission_classes = [IsAdmin]
    serializer_class = AdminHostAccountSerializer
    # Filtering is done by the selector.
    filter_backends: list = []

    def get_queryset(self):
        """Host accounts matching the query-string filters; unknown values are refused with 400."""
        params = self.request.query_params
        verification_status = params.get("verification_status", "")
        host_type = params.get("host_type", "")
        if verification_status and verification_status not in VerificationStatus.values:
            raise DomainError("Unknown verification status.", code="invalid")
        if host_type and host_type not in {"individual", "agency", "hotel", "hostel"}:
            raise DomainError("Unknown host type.", code="invalid")
        return selectors.admin_host_accounts(verification_status=verification_status, host_type=host_type)


class AdminHostDetailView(APIView):
    """``GET /admin/hosts/{id}``: one host account with its documents."""

    permission_classes = [IsAdmin]
    serializer_class = AdminHostAccountDetailSerializer

    def get(self, request, host_account_id):
        """Full review view of the host account."""
        account = selectors.admin_host_account(host_account_id)
        if account is None:
            raise NotFoundError("Unknown host account.", code="host_account_not_found")
        return Response(AdminHostAccountDetailSerializer(account).data)

    @extend_schema(responses={204: None})
    def delete(self, request, host_account_id):
        """Soft-delete the host account; 409 ``has_future_bookings`` while bookings are upcoming; audited."""
        services.admin_delete_host(request.user, host_account_id, ip=client_ip(request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminHostActionView(APIView):
    """
    ``POST /admin/hosts/{id}/<action>``: approve, reject, request-changes,
    suspend, unsuspend or ban (BR-HST-04). The action comes from the URL.
    """

    permission_classes = [IsAdmin]
    serializer_class = ReasonSerializer
    action_name = ""  # set per route in urls.py

    def post(self, request, host_account_id):
        """Run the decision; the reason rule and the state machine are checked by the service."""
        data = ReasonSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        account = services.admin_host_action(
            request.user, host_account_id, self.action_name,
            reason=data.validated_data.get("reason", ""), ip=client_ip(request),
        )
        return Response(AdminHostAccountDetailSerializer(account).data)


class AdminDocumentReviewView(APIView):
    """``POST /admin/documents/{id}/approve`` or ``/reject`` (reject needs a reason, BR-HST-03)."""

    permission_classes = [IsAdmin]
    serializer_class = ReasonSerializer
    approve = True  # set per route in urls.py

    @extend_schema(request=ReasonSerializer, responses=HostDocumentSerializer)
    def post(self, request, document_id):
        """Record the review of one pending document; 409 when it was already reviewed."""
        data = ReasonSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        document = services.admin_review_document(
            request.user, document_id, approve=self.approve,
            reason=data.validated_data.get("reason", ""), ip=client_ip(request),
        )
        return Response(HostDocumentSerializer(document).data)


class AdminDocumentUrlView(APIView):
    """``GET /admin/documents/{id}/url``: a 5-minute link to a KYC document; every call is audited (BR-MED-02)."""

    permission_classes = [IsAdmin]
    serializer_class = DocumentSignedUrlSerializer

    def get(self, request, document_id):
        """Sign a link to the document file and write ``KYC_DOCUMENT_VIEW`` to the audit log."""
        document, token, expires_at = services.admin_document_view_token(
            request.user, document_id, ip=client_ip(request)
        )
        url = request.build_absolute_uri(f"/api/v1/admin/documents/{document.pk}/file?token={token}")
        return Response(DocumentSignedUrlSerializer({"url": url, "expires_at": expires_at}).data)


class DocumentFileView(APIView):
    """
    ``GET /admin/documents/{id}/file?token=...``: where the signed link of a KYC document leads.

    The signed token is the permission (a browser opening the link sends no
    session header); it works 5 minutes for this document only (BR-MED-02).
    File storage is not built yet (media app): the stored location is
    opened by redirect. Not in openapi.yaml; it is the target of the signed URL.
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    @extend_schema(
        parameters=[OpenApiParameter("token", str, OpenApiParameter.QUERY, required=True)],
        responses={302: None, 404: None},
    )
    def get(self, request, document_id):
        """Redirect to the stored file when the token is valid; 404 ``link_expired`` otherwise."""
        document = services.document_for_token(document_id, request.query_params.get("token", ""))
        if not document.file_url.startswith(("https://", "http://", "/")):
            raise NotFoundError("The file is not available.", code="file_not_available")
        response = HttpResponseRedirect(document.file_url)
        response["Cache-Control"] = "no-store"
        return response


def admin_host_body(account) -> dict:
    """Answer of the admin host write endpoints: the host account as the admin detail shows it."""
    return AdminHostAccountDetailSerializer(account).data


class AdminHostRestoreView(APIView):
    """``POST /admin/hosts/{id}/restore``: undo a soft delete (BR-HST-04)."""

    permission_classes = [IsAdmin]
    serializer_class = AdminHostAccountDetailSerializer

    @extend_schema(request=None, responses=AdminHostAccountDetailSerializer)
    def post(self, request, host_account_id):
        """Restore the account and its organisation; audited."""
        account = services.admin_restore_host(request.user, host_account_id, ip=client_ip(request))
        return Response(admin_host_body(account))


class AdminCommissionOverrideView(APIView):
    """``PUT`` (set) and ``DELETE`` (clear) ``/admin/hosts/{id}/commission-override`` (BR-PAY-06)."""

    permission_classes = [IsAdmin]
    serializer_class = CommissionOverrideSerializer

    @extend_schema(request=CommissionOverrideSerializer, responses=AdminHostAccountDetailSerializer)
    def put(self, request, host_account_id):
        """Set the host's own rate with a reason; new bookings only; audited."""
        data = CommissionOverrideSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        account = services.admin_set_commission(
            request.user, host_account_id, data.validated_data["rate_bp"],
            reason=data.validated_data.get("reason", ""), ip=client_ip(request),
        )
        return Response(admin_host_body(account))

    @extend_schema(request=None, responses={204: None})
    def delete(self, request, host_account_id):
        """Go back to the default rate of the host type; audited."""
        services.admin_set_commission(request.user, host_account_id, None, ip=client_ip(request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCreditLimitView(APIView):
    """``PUT /admin/hosts/{id}/credit-limit-override``: the host's own credit floor (BR-PAY-10)."""

    permission_classes = [IsAdmin]
    serializer_class = CreditLimitSerializer

    @extend_schema(request=CreditLimitSerializer, responses=AdminHostAccountDetailSerializer)
    def put(self, request, host_account_id):
        """Save the floor with a reason; audited."""
        data = CreditLimitSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        money = data.validated_data["credit_limit"]
        account = services.admin_set_credit_limit(
            request.user, host_account_id, amount_minor=money["amount_minor"], currency=money["currency"],
            reason=data.validated_data.get("reason", ""), ip=client_ip(request),
        )
        return Response(admin_host_body(account))


# ---------------------------------------------------------------------------
# Public organisation directory (ORG-07)
# ---------------------------------------------------------------------------
class OrganizationDirectoryView(APIView):
    """``GET /organizations``: approved organisations for the directory and the sitemap (BR-SRC-01)."""

    permission_classes = [AllowAny]
    serializer_class = PublicOrganizationSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter("business_category", str, OpenApiParameter.QUERY, required=False,
                             enum=BusinessCategory.values),
            OpenApiParameter("cursor", str, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("limit", int, OpenApiParameter.QUERY, required=False),
        ],
        responses=inline_serializer("PublicOrganizationCursorPage", {
            "results": PublicOrganizationSerializer(many=True),
            "next_cursor": drf_serializers.CharField(allow_null=True),
            "has_more": drf_serializers.BooleanField(),
        }),
    )
    def get(self, request):
        """Cursor page: pass ``next_cursor`` back as ``cursor`` to continue."""
        params = request.query_params
        category = params.get("business_category", "")
        if category and category not in BusinessCategory.values:
            raise DomainError("Unknown business category.", code="invalid",
                              errors={"business_category": ["Unknown value."]})
        try:
            limit = int(params.get("limit") or DIRECTORY_DEFAULT_LIMIT)
        except ValueError as exc:
            raise DomainError("Invalid query parameter.", code="invalid", errors={"limit": ["A whole number."]}) from exc
        if not 1 <= limit <= DIRECTORY_MAX_LIMIT:
            raise DomainError("Invalid query parameter.", code="invalid",
                              errors={"limit": [f"Between 1 and {DIRECTORY_MAX_LIMIT}."]})
        orgs = selectors.public_organizations(business_category=category)
        cursor = params.get("cursor")
        if cursor:
            try:
                orgs = orgs.filter(id__gt=uuid.UUID(cursor))
            except ValueError as exc:
                raise DomainError("Invalid cursor.", code="invalid", errors={"cursor": ["Unknown cursor."]}) from exc
        page = list(orgs[: limit + 1])
        has_more = len(page) > limit
        page = page[:limit]
        return Response({
            "results": PublicOrganizationSerializer(page, many=True).data,
            "next_cursor": str(page[-1].id) if has_more else None,
            "has_more": has_more,
        })


# ---------------------------------------------------------------------------
# Onboarding drafts (HST-01, HST-02)
# ---------------------------------------------------------------------------
class OnboardingDraftListView(APIView):
    """``GET /host/onboarding/drafts``: the caller's drafts (not abandoned)."""

    serializer_class = OnboardingDraftSerializer

    @extend_schema(responses=inline_serializer("OnboardingDraftList", {"results": OnboardingDraftSerializer(many=True)}))
    def get(self, request):
        """Newest first; works before the caller is a host."""
        drafts = services.list_onboarding_drafts(request.user)
        return Response({"results": OnboardingDraftSerializer(drafts, many=True).data})


class OnboardingDraftDetailView(APIView):
    """``GET``, ``PUT`` and ``DELETE /host/onboarding/drafts/{host_type}`` (BR-HST-02)."""

    serializer_class = OnboardingDraftSerializer

    def get(self, request, host_type):
        """The draft in progress, else the last submitted one; 404 when none."""
        return Response(OnboardingDraftSerializer(services.get_onboarding_draft(request.user, host_type)).data)

    @extend_schema(request=OnboardingDraftWriteSerializer, responses=OnboardingDraftSerializer)
    def put(self, request, host_type):
        """Save the step reached and the answers, checked against the draft's flow version."""
        data = OnboardingDraftWriteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        draft = services.save_onboarding_draft(request.user, host_type, **data.validated_data)
        return Response(OnboardingDraftSerializer(draft).data)

    @extend_schema(responses={204: None})
    def delete(self, request, host_type):
        """Abandon the draft in progress."""
        services.abandon_onboarding_draft(request.user, host_type)
        return Response(status=status.HTTP_204_NO_CONTENT)


class OnboardingSubmitView(APIView):
    """``POST /host/onboarding/drafts/{host_type}/submit``: create the host account (HST-01, BR-HST-01)."""

    serializer_class = OnboardingResultSerializer

    @extend_schema(
        request=None,
        responses={201: OnboardingResultSerializer},
        parameters=[OpenApiParameter("Idempotency-Key", str, OpenApiParameter.HEADER, required=False)],
    )
    def post(self, request, host_type):
        """Validate the draft, create the host account (status ``applied``) and answer the new workspace."""
        key = request.headers.get("Idempotency-Key")
        payload = {"host_type": host_type}
        stored = idempotency.lookup(request.user, SUBMIT_ENDPOINT, key, payload)
        if stored:
            response = Response(stored.response_body, status=stored.response_code)
            response["Idempotency-Replayed"] = "true"
            return response
        account, membership, _ = services.submit_onboarding(request.user, host_type, ip=client_ip(request))
        body = {
            "host_account_id": str(account.id),
            "organization_id": str(account.organization_id) if account.organization_id else None,
            "listing_id": None,
            "verification_status": account.verification_status,
            "workspace": workspace_data(account, membership, active_id(request)),
        }
        idempotency.remember(request.user, SUBMIT_ENDPOINT, key, payload, status.HTTP_201_CREATED, body)
        return Response(body, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Payout accounts (BR-PAY-09)
# ---------------------------------------------------------------------------
class PayoutAccountListView(APIView):
    """``GET`` and ``POST /host/payout-accounts`` (``payout_details.edit``)."""

    serializer_class = PayoutAccountSerializer

    @extend_schema(responses=inline_serializer("PayoutAccountList", {"results": PayoutAccountSerializer(many=True)}))
    def get(self, request):
        """Accounts of the active host, default first; only the last 4 digits are shown."""
        accounts = services.list_payout_accounts(get_host_context(request))
        return Response({"results": PayoutAccountSerializer(accounts, many=True).data})

    @extend_schema(request=PayoutAccountCreateSerializer, responses={201: PayoutAccountSerializer})
    def post(self, request):
        """Add an account: second factor needed, 72-hour hold, contacts told (BR-PAY-09, BR-ACC-04)."""
        data = PayoutAccountCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        payout = services.add_payout_account(
            get_host_context(request), request.user, request.auth, ip=client_ip(request), **data.validated_data
        )
        return Response(PayoutAccountSerializer(payout).data, status=status.HTTP_201_CREATED)


class PayoutAccountDetailView(APIView):
    """``DELETE /host/payout-accounts/{id}``: remove an account (soft)."""

    serializer_class = PayoutAccountSerializer

    @extend_schema(responses={204: None})
    def delete(self, request, payout_account_id):
        """Remove it; a removed default hands over to the newest remaining account, held 72 hours."""
        services.remove_payout_account(
            get_host_context(request), request.user, request.auth, payout_account_id, ip=client_ip(request)
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Hotel system sync (BR-HST-06)
# ---------------------------------------------------------------------------
class IntegrationSyncView(APIView):
    """``POST /host/integrations/{id}/sync``: import rooms, availability, prices and services now."""

    serializer_class = IntegrationSyncRunSerializer

    @extend_schema(request=None, responses={202: IntegrationSyncRunSerializer})
    def post(self, request, integration_id):
        """Run the sync and answer the run (``failed`` with the reason when the import did not work)."""
        run = services.sync_integration(get_host_context(request), request.user, integration_id)
        return Response(IntegrationSyncRunSerializer(run).data, status=status.HTTP_202_ACCEPTED)


class IntegrationRunListView(APIView):
    """``GET /host/integrations/{id}/runs``: history of sync runs, newest first."""

    serializer_class = IntegrationSyncRunSerializer

    @extend_schema(responses=inline_serializer("IntegrationSyncRunList", {
        "results": IntegrationSyncRunSerializer(many=True)
    }))
    def get(self, request, integration_id):
        """The last 50 runs."""
        runs = services.list_sync_runs(get_host_context(request), integration_id)
        return Response({"results": IntegrationSyncRunSerializer(runs, many=True).data})
