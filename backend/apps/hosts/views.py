"""
HTTP endpoints of the hosts app.

Groups: becoming a host, the workspace switcher (``/me/workspaces``), the
active workspace (``/host/*``, always through ``get_host_context`` so a
request can only touch the host account the user really holds, BR-ORG-01),
invitations, the public organisation profile and the admin review
(``/admin/*``, admins only). Views stay thin: validate, call a service,
format the answer.
"""

from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.accounts.views import client_ip
from apps.core.errors import DomainError, NotFoundError

from . import selectors, services
from .context import get_host_context
from .models import VerificationStatus
from .serializers import (
    AdminHostAccountDetailSerializer,
    AdminHostAccountSerializer,
    CommissionOverrideSerializer,
    HostAccountUpdateSerializer,
    HostDocumentCreateSerializer,
    HostDocumentSerializer,
    InvitationAcceptSerializer,
    InvitationCreateSerializer,
    InvitationSerializer,
    MemberSerializer,
    MemberUpdateSerializer,
    OrganizationCreateSerializer,
    OrganizationSerializer,
    OrganizationWriteSerializer,
    OwnershipTransferSerializer,
    PropertyIntegrationCreateSerializer,
    PropertyIntegrationSerializer,
    PublicOrganizationSerializer,
    ReasonSerializer,
    WorkspaceSwitchSerializer,
    host_account_data,
    workspace_data,
)


def active_id(request):
    """Workspace id remembered on the caller's session (``None`` when never chosen)."""
    return getattr(request.auth, "active_host_account_id", None)


def context_account_data(request) -> dict:
    """``GET /host/account`` body for the active workspace of ``request``."""
    ctx = get_host_context(request)
    return host_account_data(ctx.host_account, ctx.membership, ctx.host_account.id)


# ---------------------------------------------------------------------------
# Becoming a host
# ---------------------------------------------------------------------------
class IndividualHostCreateView(APIView):
    """``POST /host/accounts/individual``: become a solo host (needs a verified phone)."""

    serializer_class = OrganizationSerializer

    def post(self, request):
        """Create the solo host account and return it as the active workspace."""
        account = services.become_individual_host(request.user)
        return Response(host_account_data(account, None, account.id), status=status.HTTP_201_CREATED)


class OrganizationCreateView(APIView):
    """``POST /organizations``: create an agency, hotel or hostel; the caller becomes its owner."""

    serializer_class = OrganizationCreateSerializer

    def post(self, request):
        """Create organisation, host account and owner membership in one transaction."""
        data = OrganizationCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        account = services.create_organization(request.user, **data.validated_data)
        membership = account.organization.memberships.get(user=request.user, is_active=True)
        return Response(host_account_data(account, membership, account.id), status=status.HTTP_201_CREATED)


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

    def get(self, request):
        """Full profile including legal numbers (team only); 404 for a solo host."""
        org = services.require_organization(get_host_context(request))
        return Response(OrganizationSerializer(org).data)

    def patch(self, request):
        """Edit the profile (``org.edit``); a legal change sends the host back to review (BR-ORG-06)."""
        ctx = get_host_context(request)
        org = services.require_organization(ctx)
        data = OrganizationWriteSerializer(org, data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        org = services.update_organization(ctx, request.user, data.validated_data, ip=client_ip(request))
        return Response(OrganizationSerializer(org).data)


class MemberListView(APIView):
    """``GET /host/organization/members``: the active team (any member may see it)."""

    def get(self, request):
        """Owner first, then by join date."""
        org = services.require_organization(get_host_context(request))
        return Response({"results": MemberSerializer(selectors.members_of(org), many=True).data})


class MemberDetailView(APIView):
    """``PATCH`` (change role) and ``DELETE`` (remove) ``/host/organization/members/{id}``."""

    def patch(self, request, membership_id):
        """Change a member's role (``members.manage``; never to or from owner)."""
        data = MemberUpdateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        member = services.change_member_role(
            get_host_context(request), request.user, membership_id, data.validated_data["role"], ip=client_ip(request)
        )
        return Response(MemberSerializer(member).data)

    def delete(self, request, membership_id):
        """Remove a member (``members.manage``; the owner cannot be removed)."""
        services.remove_member(get_host_context(request), request.user, membership_id, ip=client_ip(request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class OwnershipTransferView(APIView):
    """``POST /host/organization/transfer-ownership``: the owner hands over (BR-ORG-04)."""

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

    def get(self, request):
        """Every invitation, newest first."""
        ctx = get_host_context(request)
        ctx.require("members.manage")
        org = services.require_organization(ctx)
        return Response({"results": InvitationSerializer(selectors.invitations_of(org), many=True).data})

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

    def delete(self, request, invitation_id):
        """Mark the invitation revoked; the token stops working."""
        services.revoke_invitation(get_host_context(request), request.user, invitation_id, ip=client_ip(request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class InvitationAcceptView(APIView):
    """``POST /invitations/accept``: join a team with the token received (BR-ORG-03)."""

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
    """``POST /admin/host-documents/{id}/approve`` or ``/reject`` (reject needs a reason)."""

    permission_classes = [IsAdmin]
    serializer_class = ReasonSerializer
    approve = True  # set per route in urls.py

    def post(self, request, document_id):
        """Record the review of one document (BR-HST-03)."""
        data = ReasonSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        document = services.admin_review_document(
            request.user, document_id, approve=self.approve,
            reason=data.validated_data.get("reason", ""), ip=client_ip(request),
        )
        return Response(HostDocumentSerializer(document).data)


class AdminCommissionView(APIView):
    """``PATCH /admin/hosts/{id}/commission``: set or clear the host's own commission rate."""

    permission_classes = [IsAdmin]
    serializer_class = CommissionOverrideSerializer

    def patch(self, request, host_account_id):
        """Save the override (or ``null`` to clear it) and return the host account."""
        data = CommissionOverrideSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        account = services.admin_set_commission(
            request.user, host_account_id, data.validated_data["commission_rate_override_bp"], ip=client_ip(request)
        )
        return Response(AdminHostAccountDetailSerializer(account).data)
