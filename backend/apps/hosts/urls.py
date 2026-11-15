"""URL routes of the hosts app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

# Admin decisions on a host account share one view; the URL names the action (BR-HST-04).
ADMIN_HOST_ACTIONS = ("approve", "reject", "request-changes", "suspend", "unsuspend", "ban")
ADMIN_HOST = "admin/hosts/<uuid:host_account_id>"

urlpatterns = [
    # Becoming a host: onboarding drafts, submit creates the host account (HST-01, HST-02)
    path("host/onboarding/drafts", views.OnboardingDraftListView.as_view(), name="host-onboarding-drafts"),
    path(
        "host/onboarding/drafts/<str:host_type>",
        views.OnboardingDraftDetailView.as_view(),
        name="host-onboarding-draft",
    ),
    path(
        "host/onboarding/drafts/<str:host_type>/submit",
        views.OnboardingSubmitView.as_view(),
        name="host-onboarding-submit",
    ),
    # Public organisations
    path("organizations", views.OrganizationDirectoryView.as_view(), name="organization-directory"),
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
    path("host/payout-accounts", views.PayoutAccountListView.as_view(), name="host-payout-accounts"),
    path(
        "host/payout-accounts/<uuid:payout_account_id>",
        views.PayoutAccountDetailView.as_view(),
        name="host-payout-account",
    ),
    path("host/integrations", views.IntegrationListView.as_view(), name="host-integrations"),
    path("host/integrations/<uuid:integration_id>", views.IntegrationDetailView.as_view(), name="host-integration"),
    path(
        "host/integrations/<uuid:integration_id>/sync",
        views.IntegrationSyncView.as_view(),
        name="host-integration-sync",
    ),
    path(
        "host/integrations/<uuid:integration_id>/runs",
        views.IntegrationRunListView.as_view(),
        name="host-integration-runs",
    ),
    # Admin
    path("admin/hosts", views.AdminHostListView.as_view(), name="admin-hosts"),
    path(ADMIN_HOST, views.AdminHostDetailView.as_view(), name="admin-host"),
    *[
        path(
            f"{ADMIN_HOST}/{action}",
            views.AdminHostActionView.as_view(action_name=action),
            name=f"admin-host-{action}",
        )
        for action in ADMIN_HOST_ACTIONS
    ],
    path(f"{ADMIN_HOST}/restore", views.AdminHostRestoreView.as_view(), name="admin-host-restore"),
    path(
        f"{ADMIN_HOST}/commission-override",
        views.AdminCommissionOverrideView.as_view(),
        name="admin-host-commission-override",
    ),
    path(
        f"{ADMIN_HOST}/credit-limit-override",
        views.AdminCreditLimitView.as_view(),
        name="admin-host-credit-limit-override",
    ),
    path("admin/documents/<uuid:document_id>/url", views.AdminDocumentUrlView.as_view(), name="admin-document-url"),
    path(
        "admin/documents/<uuid:document_id>/approve",
        views.AdminDocumentReviewView.as_view(approve=True),
        name="admin-document-approve",
    ),
    path(
        "admin/documents/<uuid:document_id>/reject",
        views.AdminDocumentReviewView.as_view(approve=False),
        name="admin-document-reject",
    ),
    # Target of the signed URL of GET admin/documents/{id}/url (token-protected, BR-MED-02).
    path("admin/documents/<uuid:document_id>/file", views.DocumentFileView.as_view(), name="admin-document-file"),
]
