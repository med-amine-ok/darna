"""URL routes of the ledger app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

urlpatterns = [
    path("host/wallet", views.HostWalletView.as_view(), name="host-wallet"),
    path("host/wallet/entries", views.HostWalletEntriesView.as_view(), name="host-wallet-entries"),
    path("admin/wallet-topups", views.AdminTopupListCreateView.as_view(), name="admin-topups"),
    path("admin/wallet-topups/<uuid:pk>/approve", views.AdminTopupApproveView.as_view(), name="admin-topup-approve"),
    path("admin/wallet-topups/<uuid:pk>/reject", views.AdminTopupRejectView.as_view(), name="admin-topup-reject"),
    path("admin/hosts/<uuid:pk>/wallet", views.AdminHostWalletView.as_view(), name="admin-host-wallet"),
]
