"""URL routes of the hosts app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

# Admin decisions on a host account share one view; the URL names the action (BR-HST-04).
ADMIN_HOST_ACTIONS = ("approve", "reject", "request-changes", "suspend", "unsuspend", "ban")

urlpatterns = [
    # Becoming a host
    path("host/accounts/individual", views.IndividualHostCreateView.as_view(), name="host-individual-create"),
    path("organizations", views.OrganizationCreateView.as_view(), name="organization-create"),
    path("organizations/<slug:slug>", views.PublicOrganizationView.as_view(), name="organization-public"),
    # Workspaces
    path("me/workspaces", views.WorkspaceListView.as_view(), name="me-workspaces"),
    path("me/workspaces/active", views.WorkspaceActiveView.as_view(), name="me-workspaces-active"),
    # Invitations: the short path asked for, plus the path of openapi.yaml (same view).
    path("invitations/accept", views.InvitationAcceptView.as_view(), name="invitation-accept"),
    path("me/invitations/accept", views.InvitationAcceptView.as_view(), name="me-invitation-accept"),
    # Active workspace
    path("host/account", views.HostAccountView.as_view(), name="host-account"),
    path("host/organization", views.HostOrganizationView.as_view(), name="host-organization"),
    path("host/organization/members", views.MemberListView.as_view(), name="host-members"),
    path("host/organization/members/<uuid:membership_id>", views.MemberDetailView.as_view(), name="host-member"),
    path("host/organization/transfer-ownership", views.OwnershipTransferView.as_view(), name="host-transfer-ownership"),
    path("host/organization/invitations", views.InvitationListView.as_view(), name="host-invitations"),
    path(
        "host/organization/invitations/<uuid:invitation_id>",
        views.InvitationDetailView.as_view(),
        name="host-invitation",
    ),
    path("host/documents", views.DocumentListView.as_view(), name="host-documents"),
    path("host/documents/<uuid:document_id>", views.DocumentDetailView.as_view(), name="host-document"),
    path("host/verification/submit", views.VerificationSubmitView.as_view(), name="host-verification-submit"),
    path("host/integrations", views.IntegrationListView.as_view(), name="host-integrations"),
    path("host/integrations/<uuid:integration_id>", views.IntegrationDetailView.as_view(), name="host-integration"),
    # Admin
    path("admin/hosts", views.AdminHostListView.as_view(), name="admin-hosts"),
    path("admin/hosts/<uuid:host_account_id>", views.AdminHostDetailView.as_view(), name="admin-host"),
    *[
        path(
            f"admin/hosts/<uuid:host_account_id>/{action}",
            views.AdminHostActionView.as_view(action_name=action),
            name=f"admin-host-{action}",
        )
        for action in ADMIN_HOST_ACTIONS
    ],
    path(
        "admin/hosts/<uuid:host_account_id>/commission",
        views.AdminCommissionView.as_view(),
        name="admin-host-commission",
    ),
    path(
        "admin/host-documents/<uuid:document_id>/approve",
        views.AdminDocumentReviewView.as_view(approve=True),
        name="admin-host-document-approve",
    ),
    path(
        "admin/host-documents/<uuid:document_id>/reject",
        views.AdminDocumentReviewView.as_view(approve=False),
        name="admin-host-document-reject",
    ),
]
