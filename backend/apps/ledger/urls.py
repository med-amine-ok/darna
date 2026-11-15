"""URL routes of the ledger app, mounted under ``/api/v1/``."""

from django.urls import path

from . import views

urlpatterns = [
    # Host
    path("host/wallet", views.HostWalletView.as_view(), name="host-wallet"),
    path("host/wallet/entries", views.HostWalletEntriesView.as_view(), name="host-wallet-entries"),
    path("host/invoices", views.HostInvoiceListView.as_view(), name="host-invoices"),
    path("host/payouts", views.HostPayoutListCreateView.as_view(), name="host-payouts"),
    # Admin: overview, wallets, transactions
    path("admin/finance/summary", views.AdminFinanceSummaryView.as_view(), name="admin-finance-summary"),
    path("admin/wallets", views.AdminWalletListView.as_view(), name="admin-wallets"),
    path("admin/wallets/<uuid:host_account_id>", views.AdminWalletDetailView.as_view(), name="admin-wallet"),
    path("admin/wallets/<uuid:host_account_id>/topups", views.AdminWalletTopupCreateView.as_view(),
         name="admin-wallet-topup-create"),
    path("admin/ledger/transactions", views.AdminLedgerTransactionListView.as_view(), name="admin-ledger-transactions"),
    # Admin: top-ups (BR-PAY-07)
    path("admin/topups", views.AdminTopupListView.as_view(), name="admin-topups"),
    path("admin/topups/<uuid:topup_id>/approve", views.AdminTopupApproveView.as_view(), name="admin-topup-approve"),
    path("admin/topups/<uuid:topup_id>/reject", views.AdminTopupRejectView.as_view(), name="admin-topup-reject"),
    # Admin: manual adjustments (BR-PAY-13)
    path("admin/wallet-adjustments", views.AdminAdjustmentListCreateView.as_view(), name="admin-adjustments"),
    path("admin/wallet-adjustments/<uuid:pk>/approve", views.AdminAdjustmentApproveView.as_view(), name="admin-adjustment-approve"),
    path("admin/wallet-adjustments/<uuid:pk>/reject", views.AdminAdjustmentRejectView.as_view(), name="admin-adjustment-reject"),
    # Admin: invoices (R2) and payouts (dormant)
    path("admin/invoices", views.AdminInvoiceListView.as_view(), name="admin-invoices"),
    path("admin/payouts", views.AdminPayoutListView.as_view(), name="admin-payouts"),
    path("admin/payouts/<uuid:payout_id>/approve", views.AdminPayoutApproveView.as_view(), name="admin-payout-approve"),
    path("admin/payouts/<uuid:payout_id>/reject", views.AdminPayoutRejectView.as_view(), name="admin-payout-reject"),
    path("admin/payouts/<uuid:payout_id>/mark-sent", views.AdminPayoutMarkSentView.as_view(), name="admin-payout-mark-sent"),
    # Gateway webhook (dormant)
    path("webhooks/gateway/<str:provider>", views.GatewayWebhookView.as_view(), name="gateway-webhook"),
]
