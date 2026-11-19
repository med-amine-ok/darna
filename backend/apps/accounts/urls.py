"""URL routes of the accounts app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

# Admin user actions: URL word -> staff permission (BR-STF-01, openapi x-staff-permission).
ADMIN_USER_ACTIONS = {"suspend": "users.suspend", "unsuspend": "users.suspend", "ban": "users.ban", "restore": "users.delete"}
# Admin staff actions, all under team.manage.
ADMIN_STAFF_ACTIONS = ("deactivate", "activate", "reset-mfa")

urlpatterns = [
    # Website sign-in
    path("auth/signup", views.SignupView.as_view(), name="auth-signup"),
    path("auth/login", views.LoginView.as_view(), name="auth-login"),
    path("auth/providers", views.AuthProvidersView.as_view(), name="auth-providers"),
    path("auth/google", views.GoogleSignInView.as_view(), name="auth-google"),
    path("me/social-accounts", views.SocialAccountListView.as_view(), name="me-social-accounts"),
    path("me/profile/complete", views.ProfileCompleteView.as_view(), name="me-profile-complete"),
    path("me/social-accounts/<uuid:account_id>", views.SocialAccountDetailView.as_view(), name="me-social-account"),
    path("auth/code/request", views.CodeRequestView.as_view(), name="auth-code-request"),
    path("auth/code/confirm", views.CodeConfirmView.as_view(), name="auth-code-confirm"),
    path("auth/session", views.SessionView.as_view(), name="auth-session"),
    path("auth/phone/verify", views.PhoneVerifyView.as_view(), name="auth-phone-verify"),
    path("auth/email/verify", views.EmailVerifyView.as_view(), name="auth-email-verify"),
    path("auth/email/resend", views.EmailResendView.as_view(), name="auth-email-resend"),
    path("auth/password/request", views.PasswordRequestView.as_view(), name="auth-password-request"),
    path("auth/password/reset", views.PasswordResetView.as_view(), name="auth-password-reset"),
    path("auth/password/change", views.PasswordChangeView.as_view(), name="auth-password-change"),
    path("auth/2fa/authenticate", views.MfaAuthenticateView.as_view(), name="auth-2fa-authenticate"),
    path("auth/authenticators", views.AuthenticatorListView.as_view(), name="auth-authenticators"),
    path("auth/authenticators/totp", views.TotpView.as_view(), name="auth-authenticators-totp"),
    # My profile, privacy, favourites
    path("me", views.MeView.as_view(), name="me"),
    path("me/phone", views.MePhoneView.as_view(), name="me-phone"),
    path("me/consents", views.MeConsentsView.as_view(), name="me-consents"),
    path("me/data-requests", views.MeDataRequestsView.as_view(), name="me-data-requests"),
    path("me/favorites", views.MeFavoritesView.as_view(), name="me-favorites"),
    path(
        "me/favorites/<str:target_type>/<uuid:target_id>",
        views.MeFavoriteDetailView.as_view(),
        name="me-favorite",
    ),
    # Public profile
    path("users/<str:user_id>", views.PublicUserView.as_view(), name="user-public"),
    # Staff sign-in
    path("admin/auth/login", views.AdminLoginView.as_view(), name="admin-auth-login"),
    path("admin/auth/2fa/authenticate", views.AdminMfaAuthenticateView.as_view(), name="admin-auth-2fa"),
    path("admin/auth/session", views.AdminSessionView.as_view(), name="admin-auth-session"),
    path("admin/auth/invitations/accept", views.AdminInvitationAcceptView.as_view(), name="admin-auth-invitation-accept"),
    path("admin/auth/authenticators/totp", views.AdminTotpEnrolView.as_view(), name="admin-auth-totp"),
    path("admin/auth/password/change", views.AdminPasswordChangeView.as_view(), name="admin-auth-password-change"),
    # Admin: staff
    path("admin/staff", views.AdminStaffListView.as_view(), name="admin-staff"),
    path("admin/staff/roles", views.AdminStaffRolesView.as_view(), name="admin-staff-roles"),
    path("admin/staff/invitations", views.AdminStaffInviteView.as_view(), name="admin-staff-invite"),
    path("admin/staff/<uuid:staff_id>", views.AdminStaffDetailView.as_view(), name="admin-staff-detail"),
    *[
        path(
            f"admin/staff/<uuid:staff_id>/{action}",
            views.AdminStaffActionView.as_view(staff_action=action),
            name=f"admin-staff-{action}",
        )
        for action in ADMIN_STAFF_ACTIONS
    ],
    # Admin: users and data protection requests
    path("admin/users", views.AdminUserListView.as_view(), name="admin-users"),
    path("admin/users/<uuid:user_id>", views.AdminUserDetailView.as_view(), name="admin-user"),
    *[
        path(
            f"admin/users/<uuid:user_id>/{action}",
            views.AdminUserActionView.as_view(user_action=action, staff_permission=permission),
            name=f"admin-user-{action}",
        )
        for action, permission in ADMIN_USER_ACTIONS.items()
    ],
    path("admin/data-requests", views.AdminDataRequestListView.as_view(), name="admin-data-requests"),
    path(
        "admin/data-requests/<uuid:data_request_id>/complete",
        views.AdminDataRequestCompleteView.as_view(),
        name="admin-data-request-complete",
    ),
]
