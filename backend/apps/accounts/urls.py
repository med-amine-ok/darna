"""URL routes of the accounts app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

urlpatterns = [
    path("auth/signup", views.SignupView.as_view(), name="auth-signup"),
    path("auth/login", views.LoginView.as_view(), name="auth-login"),
    path("auth/code/request", views.CodeRequestView.as_view(), name="auth-code-request"),
    path("auth/code/confirm", views.CodeConfirmView.as_view(), name="auth-code-confirm"),
    path("auth/session", views.SessionView.as_view(), name="auth-session"),
    path("auth/phone/verify", views.PhoneVerifyView.as_view(), name="auth-phone-verify"),
    path("me", views.MeView.as_view(), name="me"),
    path("me/phone", views.MePhoneView.as_view(), name="me-phone"),
    path("me/password", views.MePasswordView.as_view(), name="me-password"),
]
