"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Wallet,
  ArrowUpRight,
  DollarSign,
  CreditCard,
  Download,
  Search,
  PlusCircle,
  Percent,
  FileText,
  Clock,
  RotateCcw,
} from "lucide-react";
import {
  listWallets,
  listTransactions,
  rechargeWallet,
  getCommissionRates,
  updateCommissionRates,
  listPayouts,
  approvePayout,
  rejectPayout,
  getFinanceSummary,
  listRefunds,
  exportTransactions,
  exportWallets,
} from "@/lib/actions/finance";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import type { HostWallet, WalletTransaction, PayoutRequest, HostType, TransactionType } from "@/lib/types";
import type { FinanceSummary } from "@/lib/data/finance";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { Pagination } from "@/components/ui/Pagination";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { formatDzd, formatDate, maskAccount } from "@/lib/utils/format";
import { downloadCsv } from "@/lib/utils/download";
import { WILAYAS, getWilayaLabel, getWilayaName } from "@/lib/utils/wilayas";
import {
  DEFAULT_COMMISSION_RATES,
  MAX_RECHARGE_DZD,
  isValidCommissionRate,
  isValidDzdAmount,
} from "@/lib/pricing";

type TabId = "overview" | "wallets" | "transactions" | "commissions" | "payouts" | "refunds";

export interface PaymentsClientProps {
  locale: string;
  initialTab?: TabId;
}

const TX_TYPES: TransactionType[] = [
  "booking_payment",
  "commission_deduction",
  "host_payout",
  "wallet_recharge",
  "booking_refund",
  "adjustment",
];
const HOST_TYPES: HostType[] = ["individual", "agency", "hotel", "hostel"];
const RECHARGE_METHODS = ["ccp", "bank_transfer", "cash_guarantee"] as const;

type RefundRow = {
  id: string;
  reference: string;
  guestName: string;
  hostName: string;
  totalAmountDzd: number;
  refundedAmountDzd: number;
  paymentStatus: string;
  status: string;
  date: string;
};

/** Account identifier for a payout, masked to its last 4 characters. */
function payoutAccount(p: PayoutRequest): string {
  return maskAccount(p.accountDetails?.ccpRip ?? p.accountDetails?.rib ?? p.accountDetails?.phone);
}

const inputCls =
  "w-full text-xs rounded-xl bg-darnaBg/50 border border-tertiary/60 py-2 ps-9 pe-3 text-primary focus:outline-none focus:border-secondary focus-visible:ring-2 focus-visible:ring-accent-600/40";
const selectCls =
  "text-xs rounded-xl bg-white border border-tertiary/60 p-2 text-primary focus:outline-none focus:border-secondary focus-visible:ring-2 focus-visible:ring-accent-600/40 cursor-pointer";
const fieldCls =
  "w-full rounded-xl bg-white border border-tertiary/70 p-2.5 text-primary focus:outline-none focus:border-secondary focus-visible:ring-2 focus-visible:ring-accent-600/40";

export default function PaymentsClient({ locale, initialTab = "overview" }: PaymentsClientProps) {
  const t = useTranslations("payments");
  const tActions = useTranslations("actions");
  const tHostTypes = useTranslations("hostTypes");
  const { success, error, info } = useToast();
  const can = useCan();

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Server-side aggregates (over all rows)
  const [summary, setSummary] = useState<FinanceSummary | null>(null);

  // Wallets
  const [wallets, setWallets] = useState<HostWallet[]>([]);
  const [walletsTotal, setWalletsTotal] = useState(0);
  const [walletsPage, setWalletsPage] = useState(1);
  const [walletsPageSize, setWalletsPageSize] = useState(10);
  const [hostTypeFilter, setHostTypeFilter] = useState("all");
  const [wilayaFilter, setWilayaFilter] = useState("all");
  const [negativeOnly, setNegativeOnly] = useState(false);
  const [walletSearch, setWalletSearch] = useState("");

  // Ledger
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [txSearch, setTxSearch] = useState("");

  // Commissions
  const [commissionRates, setCommissionRates] = useState<Record<HostType, number>>({ ...DEFAULT_COMMISSION_RATES });
  const [commissionSaving, setCommissionSaving] = useState(false);

  // Payouts
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [payoutToApprove, setPayoutToApprove] = useState<PayoutRequest | null>(null);
  const [payoutToReject, setPayoutToReject] = useState<PayoutRequest | null>(null);
  const [payoutBusy, setPayoutBusy] = useState(false);

  // Refunds
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [refundsTotal, setRefundsTotal] = useState(0);
  const [refundsPage, setRefundsPage] = useState(1);

  // Recharge dialog
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<HostWallet | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<string>("50000");
  const [rechargeMethod, setRechargeMethod] = useState<(typeof RECHARGE_METHODS)[number]>("ccp");
  const [rechargeReason, setRechargeReason] = useState("");
  const [rechargeReceipt, setRechargeReceipt] = useState("");
  const [rechargeSubmitting, setRechargeSubmitting] = useState(false);

  const [exporting, setExporting] = useState(false);

  const fail = useCallback(
    (err: unknown) => error(t("loadError"), err instanceof Error ? err.message : String(err)),
    [error, t]
  );

  const loadSummary = useCallback(async () => {
    try {
      setSummary(unwrap(await getFinanceSummary()));
    } catch (err) {
      fail(err);
    }
  }, [fail]);

  const loadWallets = useCallback(async () => {
    try {
      const res = unwrap(
        await listWallets({
          hostType: hostTypeFilter === "all" ? undefined : hostTypeFilter,
          wilayaCode: wilayaFilter === "all" ? undefined : wilayaFilter,
          onlyNegative: negativeOnly || undefined,
          search: walletSearch || undefined,
          page: walletsPage,
          pageSize: walletsPageSize,
        })
      );
      setWallets(res.rows);
      setWalletsTotal(res.total);
    } catch (err) {
      fail(err);
    }
  }, [hostTypeFilter, wilayaFilter, negativeOnly, walletSearch, walletsPage, walletsPageSize, fail]);

  const loadTransactions = useCallback(async () => {
    try {
      const res = unwrap(
        await listTransactions({
          type: txTypeFilter === "all" ? undefined : txTypeFilter,
          search: txSearch || undefined,
          page: txPage,
          pageSize: 10,
        })
      );
      setTransactions(res.rows);
      setTxTotal(res.total);
    } catch (err) {
      fail(err);
    }
  }, [txTypeFilter, txSearch, txPage, fail]);

  const loadCommissions = useCallback(async () => {
    try {
      setCommissionRates(unwrap(await getCommissionRates()));
    } catch (err) {
      fail(err);
    }
  }, [fail]);

  const loadPayouts = useCallback(async () => {
    try {
      setPayouts(unwrap(await listPayouts()));
    } catch (err) {
      fail(err);
    }
  }, [fail]);

  const loadRefunds = useCallback(async () => {
    try {
      const res = unwrap(await listRefunds({ page: refundsPage, pageSize: 10 }));
      setRefunds(res.rows);
      setRefundsTotal(res.total);
    } catch (err) {
      fail(err);
    }
  }, [refundsPage, fail]);

  useEffect(() => {
    loadSummary();
    loadCommissions();
    loadPayouts();
  }, [loadSummary, loadCommissions, loadPayouts]);
  useEffect(() => {
    loadWallets();
  }, [loadWallets]);
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);
  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  // ---- Commissions -------------------------------------------------------
  const ratesValid = HOST_TYPES.every((h) => isValidCommissionRate(commissionRates[h]));

  const handleSaveCommissions = async () => {
    if (!ratesValid) {
      error(t("invalidRate"));
      return;
    }
    setCommissionSaving(true);
    try {
      setCommissionRates(unwrap(await updateCommissionRates(commissionRates)));
      success(t("ratesSaved"));
    } catch (err) {
      error(tActions("actionFailed"), err instanceof Error ? err.message : String(err));
    } finally {
      setCommissionSaving(false);
    }
  };

  // ---- Recharge ------------------------------------------------------------
  const parsedRecharge = Number(rechargeAmount);
  const rechargeValid =
    rechargeAmount.trim() !== "" &&
    isValidDzdAmount(parsedRecharge, 1, MAX_RECHARGE_DZD) &&
    rechargeReceipt.trim().length > 0;

  const openRecharge = (w: HostWallet) => {
    setSelectedWallet(w);
    setRechargeAmount("50000");
    setRechargeReason("");
    setRechargeReceipt("");
    setRechargeDialogOpen(true);
  };

  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet || !rechargeValid) return;
    setRechargeSubmitting(true);
    try {
      unwrap(
        await rechargeWallet({
          hostId: selectedWallet.hostId,
          amount: parsedRecharge,
          method: rechargeMethod,
          reason: rechargeReason,
          receiptReference: rechargeReceipt,
        })
      );
      success(t("rechargeDone"), formatDzd(parsedRecharge, locale));
      setRechargeDialogOpen(false);
      loadWallets();
      loadTransactions();
      loadSummary();
    } catch (err) {
      error(tActions("actionFailed"), err instanceof Error ? err.message : String(err));
    } finally {
      setRechargeSubmitting(false);
    }
  };

  // ---- Payouts -------------------------------------------------------------
  const refreshAfterPayout = () => {
    loadPayouts();
    loadWallets();
    loadTransactions();
    loadSummary();
  };

  const confirmApprovePayout = async () => {
    if (!payoutToApprove || payoutBusy) return;
    setPayoutBusy(true);
    try {
      unwrap(await approvePayout(payoutToApprove.id));
      success(t("payoutApproved"), formatDzd(payoutToApprove.amountDzd, locale));
    } catch (err) {
      error(tActions("actionFailed"), err instanceof Error ? err.message : String(err));
    } finally {
      setPayoutToApprove(null);
      setPayoutBusy(false);
      refreshAfterPayout();
    }
  };

  const confirmRejectPayout = async (reason: string) => {
    if (!payoutToReject) return;
    try {
      unwrap(await rejectPayout(payoutToReject.id, reason));
      success(t("payoutRejected"));
      setPayoutToReject(null);
    } catch (err) {
      error(tActions("actionFailed"), err instanceof Error ? err.message : String(err));
    } finally {
      refreshAfterPayout();
    }
  };

  // ---- Exports (full filtered dataset, server-side, audited) ---------------
  const canExport = can("reports.export");

  const runExport = async (kind: "ledger" | "wallets") => {
    setExporting(true);
    try {
      const res = unwrap(
        kind === "ledger"
          ? await exportTransactions({
              type: txTypeFilter === "all" ? undefined : txTypeFilter,
              search: txSearch || undefined,
            })
          : await exportWallets({
              hostType: hostTypeFilter === "all" ? undefined : hostTypeFilter,
              wilayaCode: wilayaFilter === "all" ? undefined : wilayaFilter,
              onlyNegative: negativeOnly || undefined,
              search: walletSearch || undefined,
            })
      );
      downloadCsv(res.filename, res.csv);
      info(tActions("exportStarted"), tActions("exportRows", { count: res.rowCount }));
    } catch (err) {
      error(tActions("exportFailed"), err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  // ---- KPIs ------------------------------------------------------------------
  const dash = "—";
  const kpis = [
    {
      id: "wallets",
      label: t("kpi.wallets"),
      value: summary ? formatDzd(summary.totalWalletBalanceDzd, locale) : dash,
      icon: Wallet,
      colorVariant: "primary" as const,
      active: activeTab === "wallets",
      onClick: () => setActiveTab("wallets"),
    },
    {
      id: "payouts",
      label: t("kpi.pendingPayouts"),
      value: summary ? formatDzd(summary.pendingPayoutsDzd, locale) : dash,
      icon: Clock,
      colorVariant: "tertiary" as const,
      active: activeTab === "payouts",
      onClick: () => setActiveTab("payouts"),
    },
    {
      id: "commissions",
      label: t("kpi.monthCommissions"),
      value: summary ? formatDzd(summary.monthCommissionsDzd, locale) : dash,
      icon: Percent,
      colorVariant: "secondary" as const,
      active: activeTab === "commissions",
      onClick: () => setActiveTab("commissions"),
    },
    {
      id: "refunds",
      label: t("kpi.refunds"),
      value: summary ? formatDzd(summary.refundsTotalDzd, locale) : dash,
      icon: RotateCcw,
      colorVariant: "accent" as const,
      active: activeTab === "refunds",
      onClick: () => setActiveTab("refunds"),
    },
  ];

  const pendingCount = payouts.filter((p) => p.status === "pending").length;
  const tabsList = [
    { id: "overview", label: t("tabs.overview"), icon: <DollarSign className="w-4 h-4" aria-hidden="true" /> },
    { id: "wallets", label: t("tabs.wallets"), count: walletsTotal, icon: <Wallet className="w-4 h-4" aria-hidden="true" /> },
    { id: "transactions", label: t("tabs.transactions"), count: txTotal, icon: <FileText className="w-4 h-4" aria-hidden="true" /> },
    { id: "commissions", label: t("tabs.commissions"), icon: <Percent className="w-4 h-4" aria-hidden="true" /> },
    { id: "payouts", label: t("tabs.payouts"), count: pendingCount, icon: <ArrowUpRight className="w-4 h-4" aria-hidden="true" /> },
    { id: "refunds", label: t("tabs.refunds"), count: refundsTotal, icon: <RotateCcw className="w-4 h-4" aria-hidden="true" /> },
  ];

  const txTypeLabel = (type: string) => (TX_TYPES.includes(type as TransactionType) ? t(`txTypes.${type}`) : type);
  const hostTypeLabel = (type: string) => (HOST_TYPES.includes(type as HostType) ? tHostTypes(type) : type);

  const headerActions = [
    ...(canExport
      ? [
          {
            label: t("exportLedger"),
            icon: <Download className="w-4 h-4" aria-hidden="true" />,
            variant: "outline" as const,
            onClick: () => runExport("ledger"),
          },
        ]
      : []),
    ...(can("wallets.recharge")
      ? [
          {
            label: t("rechargeWallet"),
            icon: <PlusCircle className="w-4 h-4" aria-hidden="true" />,
            variant: "primary" as const,
            onClick: () => {
              if (wallets.length > 0) openRecharge(wallets[0]);
              else info(t("noWallet"));
            },
          },
        ]
      : []),
  ];

  const ledgerTable = (rows: WalletTransaction[], withBalance: boolean) => (
    <table className="w-full text-xs text-start">
      <thead className="bg-darnaBg/60 text-neutral-600 font-semibold border-b border-tertiary/40">
        <tr>
          <th scope="col" className="py-3 px-4 text-start">{t("cols.date")}</th>
          <th scope="col" className="py-3 px-4 text-start">{t("cols.reference")}</th>
          <th scope="col" className="py-3 px-4 text-start">{t("cols.host")}</th>
          <th scope="col" className="py-3 px-4 text-start">{t("cols.type")}</th>
          <th scope="col" className="py-3 px-4 text-start">{t("cols.description")}</th>
          <th scope="col" className="py-3 px-4 text-end">{t("cols.amount")}</th>
          {withBalance && <th scope="col" className="py-3 px-4 text-end">{t("cols.balanceAfter")}</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100">
        {rows.length === 0 && (
          <tr>
            <td colSpan={withBalance ? 7 : 6} className="py-6 px-4 text-center text-neutral-500">
              {t("noTransactions")}
            </td>
          </tr>
        )}
        {rows.map((tx) => (
          <tr key={tx.id} className="hover:bg-neutral-50/50">
            <td className="py-3 px-4 font-mono text-neutral-500">{formatDate(tx.createdAt, locale)}</td>
            <td className="py-3 px-4 font-mono font-bold text-primary">{tx.reference}</td>
            <td className="py-3 px-4 font-semibold text-primary">{tx.hostName}</td>
            <td className="py-3 px-4">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700">
                {txTypeLabel(tx.type)}
              </span>
            </td>
            <td className="py-3 px-4 text-neutral-600">{tx.description}</td>
            <td
              className={`py-3 px-4 font-mono font-bold text-end ${tx.amount >= 0 ? "text-secondary-700" : "text-accent-700"}`}
              dir="ltr"
            >
              {tx.amount >= 0 ? "+" : ""}
              {formatDzd(tx.amount, locale)}
            </td>
            {withBalance && (
              <td className="py-3 px-4 font-mono text-end text-neutral-600" dir="ltr">
                {formatDzd(tx.balanceAfter, locale)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6 text-start">
      <PageHeader title={t("title")} subtitle={t("subtitle")} actions={headerActions} />

      <KpiStrip cards={kpis} />

      <Tabs items={tabsList} activeId={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-primary">{t("overview.escrow")}</span>
                <span className="p-2 rounded-xl bg-secondary/10 text-secondary">
                  <CreditCard className="w-5 h-5" aria-hidden="true" />
                </span>
              </div>
              <p className="text-2xl font-serif font-black text-primary">
                {summary ? formatDzd(summary.escrowDzd, locale) : dash}
              </p>
              <p className="text-xs text-neutral-500">{t("overview.escrowHint")}</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-primary">{t("overview.monthPayouts")}</span>
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ArrowUpRight className="w-5 h-5" aria-hidden="true" />
                </span>
              </div>
              <p className="text-2xl font-serif font-black text-primary">
                {summary ? formatDzd(summary.monthPayoutsDzd, locale) : dash}
              </p>
              <p className="text-xs text-neutral-500">
                {t("overview.monthPayoutsHint", { count: summary?.monthPayoutsCount ?? 0 })}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-primary">{t("overview.monthCommissions")}</span>
                <span className="p-2 rounded-xl bg-tertiary/20 text-primary">
                  <Percent className="w-5 h-5" aria-hidden="true" />
                </span>
              </div>
              <p className="text-2xl font-serif font-black text-secondary-700">
                {summary ? formatDzd(summary.monthCommissionsDzd, locale) : dash}
              </p>
              <p className="text-xs text-neutral-500">
                {t("overview.monthCommissionsHint", { date: summary ? formatDate(summary.monthStart, locale) : dash })}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-tertiary/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-primary text-base">{t("overview.latest")}</h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("transactions")}>
                {t("overview.seeAll")}
              </Button>
            </div>
            <div className="overflow-x-auto">{ledgerTable(transactions.slice(0, 5), false)}</div>
          </div>
        </div>
      )}

      {/* Wallets */}
      {activeTab === "wallets" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-tertiary/40">
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <input
                type="search"
                aria-label={t("filters.searchWallets")}
                placeholder={t("filters.searchWallets")}
                value={walletSearch}
                onChange={(e) => {
                  setWalletSearch(e.target.value);
                  setWalletsPage(1);
                }}
                className={inputCls}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label={t("filters.hostType")}
                value={hostTypeFilter}
                onChange={(e) => {
                  setHostTypeFilter(e.target.value);
                  setWalletsPage(1);
                }}
                className={selectCls}
              >
                <option value="all">{t("filters.allHostTypes")}</option>
                {HOST_TYPES.map((h) => (
                  <option key={h} value={h}>
                    {hostTypeLabel(h)}
                  </option>
                ))}
              </select>
              <select
                aria-label={t("filters.wilaya")}
                value={wilayaFilter}
                onChange={(e) => {
                  setWilayaFilter(e.target.value);
                  setWalletsPage(1);
                }}
                className={selectCls}
              >
                <option value="all">{t("filters.allWilayas")}</option>
                {WILAYAS.map((w) => (
                  <option key={w.code} value={w.code}>
                    {getWilayaLabel(w, locale)}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={negativeOnly}
                  onChange={(e) => {
                    setNegativeOnly(e.target.checked);
                    setWalletsPage(1);
                  }}
                />
                {t("filters.negativeOnly")}
                {summary && <span className="text-neutral-600">({summary.negativeWalletCount})</span>}
              </label>
              {canExport && (
                <Button variant="outline" size="sm" onClick={() => runExport("wallets")} disabled={exporting}>
                  <Download className="w-4 h-4" aria-hidden="true" />
                  {t("exportWallets")}
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-tertiary/40 overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-darnaBg/60 text-neutral-600 font-semibold border-b border-tertiary/40">
                <tr>
                  <th scope="col" className="py-3 px-4 text-start">{t("cols.host")}</th>
                  <th scope="col" className="py-3 px-4 text-start">{t("cols.type")}</th>
                  <th scope="col" className="py-3 px-4 text-start">{t("cols.location")}</th>
                  <th scope="col" className="py-3 px-4 text-end">{t("cols.balance")}</th>
                  <th scope="col" className="py-3 px-4 text-end">{t("cols.commissionsPaid")}</th>
                  <th scope="col" className="py-3 px-4 text-end">{t("cols.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {wallets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 px-4 text-center text-neutral-500">
                      {t("noWallets")}
                    </td>
                  </tr>
                )}
                {wallets.map((w) => (
                  <tr key={w.hostId} className="hover:bg-neutral-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-primary">{w.businessName || w.ownerName}</div>
                      <div className="text-[11px] text-neutral-500">{w.hostId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 text-primary">
                        {hostTypeLabel(w.hostType)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">{getWilayaName(w.wilayaCode, locale)}</td>
                    <td
                      className={`py-3 px-4 font-mono font-bold text-end ${w.balance < 0 ? "text-accent-700" : "text-primary"}`}
                      dir="ltr"
                    >
                      {formatDzd(w.balance, locale)}
                    </td>
                    <td className="py-3 px-4 font-mono text-end text-neutral-500" dir="ltr">
                      {formatDzd(w.totalCommissionsPaid, locale)}
                    </td>
                    <td className="py-3 px-4 text-end">
                      {can("wallets.recharge") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRecharge(w)}
                          aria-label={t("rechargeFor", { host: w.businessName || w.ownerName })}
                        >
                          {t("recharge")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={walletsPage}
            totalPages={Math.max(1, Math.ceil(walletsTotal / walletsPageSize))}
            totalItems={walletsTotal}
            pageSize={walletsPageSize}
            itemLabel={t("itemLabels.wallets")}
            onPageChange={setWalletsPage}
            onPageSizeChange={(s) => {
              setWalletsPageSize(s);
              setWalletsPage(1);
            }}
          />
        </div>
      )}

      {/* Ledger */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-tertiary/40">
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <input
                type="search"
                aria-label={t("filters.searchTransactions")}
                placeholder={t("filters.searchTransactions")}
                value={txSearch}
                onChange={(e) => {
                  setTxSearch(e.target.value);
                  setTxPage(1);
                }}
                className={inputCls}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label={t("filters.txType")}
                value={txTypeFilter}
                onChange={(e) => {
                  setTxTypeFilter(e.target.value);
                  setTxPage(1);
                }}
                className={selectCls}
              >
                <option value="all">{t("filters.allTxTypes")}</option>
                {TX_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {txTypeLabel(type)}
                  </option>
                ))}
              </select>
              {canExport && (
                <Button variant="outline" size="sm" onClick={() => runExport("ledger")} disabled={exporting}>
                  <Download className="w-4 h-4" aria-hidden="true" />
                  {t("exportLedger")}
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-tertiary/40 overflow-x-auto">{ledgerTable(transactions, true)}</div>

          <Pagination
            currentPage={txPage}
            totalPages={Math.max(1, Math.ceil(txTotal / 10))}
            totalItems={txTotal}
            pageSize={10}
            itemLabel={t("itemLabels.transactions")}
            onPageChange={setTxPage}
          />
        </div>
      )}

      {/* Commissions */}
      {activeTab === "commissions" && (
        <div className="max-w-2xl bg-white rounded-2xl border border-tertiary/40 p-6 space-y-6">
          <div>
            <h3 className="font-bold text-primary text-base">{t("commissionsTitle")}</h3>
            <p className="text-xs text-neutral-500 mt-1">{t("commissionsHint")}</p>
          </div>

          <div className="space-y-4">
            {HOST_TYPES.map((h) => {
              const value = commissionRates[h];
              const valid = isValidCommissionRate(value);
              return (
                <div
                  key={h}
                  className="flex items-center justify-between p-3 rounded-xl bg-darnaBg/40 border border-tertiary/40"
                >
                  <label htmlFor={`rate-${h}`} className="font-bold text-xs text-primary">
                    {t(`commissionLabels.${h}`)}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id={`rate-${h}`}
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      inputMode="decimal"
                      aria-invalid={!valid}
                      aria-describedby={!ratesValid ? "commission-rates-error" : undefined}
                      value={Number.isFinite(value) ? value : ""}
                      disabled={!can("commissions.manage")}
                      onChange={(e) =>
                        setCommissionRates({
                          ...commissionRates,
                          [h]: e.target.value === "" ? NaN : Number(e.target.value),
                        })
                      }
                      className={`w-20 text-center font-mono font-bold text-xs rounded-lg border py-1 bg-white ${
                        valid ? "border-tertiary/70" : "border-accent-700 text-accent-700"
                      } focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600/40`}
                    />
                    <span className="font-bold text-xs text-primary" aria-hidden="true">%</span>
                  </div>
                </div>
              );
            })}
            {!ratesValid && (
              <p id="commission-rates-error" className="text-[11px] text-accent-700" role="alert">
                {t("invalidRate")}
              </p>
            )}
          </div>

          {can("commissions.manage") && (
            <div className="pt-2 flex justify-end">
              <Button variant="primary" onClick={handleSaveCommissions} disabled={commissionSaving || !ratesValid}>
                {t("saveRates")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Payouts */}
      {activeTab === "payouts" && (
        <div className="bg-white rounded-2xl border border-tertiary/40 overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-darnaBg/60 text-neutral-600 font-semibold border-b border-tertiary/40">
              <tr>
                <th scope="col" className="py-3 px-4 text-start">{t("cols.requestedAt")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("cols.host")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("cols.method")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("cols.account")}</th>
                <th scope="col" className="py-3 px-4 text-end">{t("cols.amount")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("cols.status")}</th>
                <th scope="col" className="py-3 px-4 text-end">{t("cols.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 px-4 text-center text-neutral-500">
                    {t("noPayouts")}
                  </td>
                </tr>
              )}
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50/50">
                  <td className="py-3 px-4 font-mono text-neutral-500">{formatDate(p.requestedAt, locale)}</td>
                  <td className="py-3 px-4 font-bold text-primary">{p.hostName}</td>
                  <td className="py-3 px-4 text-neutral-600">{t(`payoutMethods.${p.payoutMethod}`)}</td>
                  <td className="py-3 px-4 font-mono text-neutral-600" dir="ltr">
                    {payoutAccount(p)}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-end text-primary" dir="ltr">
                    {formatDzd(p.amountDzd, locale)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusPill status={p.status} />
                    {p.status === "rejected" && p.rejectionReason && (
                      <div className="text-[10px] text-neutral-500 mt-1 max-w-[220px]">{p.rejectionReason}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-end">
                    {p.status === "pending" && can("payouts.approve") ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPayoutToApprove(p)}
                          aria-label={t("approvePayoutFor", { host: p.hostName })}
                        >
                          {t("approvePayout")}
                        </Button>
                        <Button
                          variant="dangerOutline"
                          size="sm"
                          onClick={() => setPayoutToReject(p)}
                          aria-label={t("rejectPayoutFor", { host: p.hostName })}
                        >
                          {t("rejectPayout")}
                        </Button>
                      </div>
                    ) : p.processedAt ? (
                      <span className="text-[11px] text-neutral-500">
                        {p.processedBy
                          ? t("processedOnBy", { date: formatDate(p.processedAt, locale), name: p.processedBy })
                          : formatDate(p.processedAt, locale)}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Refunds */}
      {activeTab === "refunds" && (
        <div className="bg-white rounded-2xl border border-tertiary/40 p-6 space-y-4">
          <h3 className="font-bold text-primary text-base">{t("refundsTitle")}</h3>
          <p className="text-xs text-neutral-500">{t("refundsHint")}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-darnaBg/60 text-neutral-600 font-semibold border-b border-tertiary/40">
                <tr>
                  <th scope="col" className="py-2.5 px-3 text-start">{t("cols.date")}</th>
                  <th scope="col" className="py-2.5 px-3 text-start">{t("cols.booking")}</th>
                  <th scope="col" className="py-2.5 px-3 text-start">{t("cols.guest")}</th>
                  <th scope="col" className="py-2.5 px-3 text-start">{t("cols.host")}</th>
                  <th scope="col" className="py-2.5 px-3 text-end">{t("cols.total")}</th>
                  <th scope="col" className="py-2.5 px-3 text-end">{t("cols.refunded")}</th>
                  <th scope="col" className="py-2.5 px-3 text-start">{t("cols.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {refunds.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 px-3 text-center text-neutral-500">
                      {t("noRefunds")}
                    </td>
                  </tr>
                )}
                {refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/50">
                    <td className="py-2.5 px-3 font-mono text-neutral-500">{formatDate(r.date, locale)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-primary">{r.reference}</td>
                    <td className="py-2.5 px-3 font-semibold text-primary">{r.guestName}</td>
                    <td className="py-2.5 px-3 text-neutral-600">{r.hostName}</td>
                    <td className="py-2.5 px-3 font-mono text-end text-neutral-600" dir="ltr">
                      {formatDzd(r.totalAmountDzd, locale)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-end text-accent-700" dir="ltr">
                      {formatDzd(r.refundedAmountDzd, locale)}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusPill status={r.paymentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={refundsPage}
            totalPages={Math.max(1, Math.ceil(refundsTotal / 10))}
            totalItems={refundsTotal}
            pageSize={10}
            itemLabel={t("itemLabels.refunds")}
            onPageChange={setRefundsPage}
          />
        </div>
      )}

      {/* Payout approval confirmation (always shows amount, host and account) */}
      <ConfirmDialog
        isOpen={!!payoutToApprove}
        variant="primary"
        title={t("approveTitle")}
        description={
          payoutToApprove
            ? t("approveDescription", {
                amount: formatDzd(payoutToApprove.amountDzd, locale),
                host: payoutToApprove.hostName,
                account: payoutAccount(payoutToApprove),
                method: t(`payoutMethods.${payoutToApprove.payoutMethod}`),
              })
            : ""
        }
        confirmLabel={payoutToApprove ? t("approveConfirm", { amount: formatDzd(payoutToApprove.amountDzd, locale) }) : ""}
        cancelLabel={tActions("cancel")}
        isLoading={payoutBusy}
        onConfirm={confirmApprovePayout}
        onCancel={() => setPayoutToApprove(null)}
      />

      <ReasonDialog
        isOpen={!!payoutToReject}
        title={t("rejectTitle")}
        description={
          payoutToReject
            ? t("rejectDescription", { amount: formatDzd(payoutToReject.amountDzd, locale), host: payoutToReject.hostName })
            : undefined
        }
        confirmLabel={t("rejectPayout")}
        onCancel={() => setPayoutToReject(null)}
        onConfirm={confirmRejectPayout}
      />

      {/* Recharge */}
      <Dialog
        isOpen={rechargeDialogOpen}
        onClose={() => setRechargeDialogOpen(false)}
        title={t("rechargeTitle")}
        description={t("rechargeDescription")}
      >
        <form onSubmit={handleRechargeSubmit} className="space-y-4 text-xs text-start">
          <div>
            <label className="block font-bold text-primary mb-1" htmlFor="recharge-host">
              {t("rechargeHost")}
            </label>
            <select
              id="recharge-host"
              value={selectedWallet?.hostId ?? ""}
              onChange={(e) => setSelectedWallet(wallets.find((w) => w.hostId === e.target.value) ?? selectedWallet)}
              className={`${fieldCls} font-bold`}
            >
              {selectedWallet && !wallets.some((w) => w.hostId === selectedWallet.hostId) && (
                <option value={selectedWallet.hostId}>{selectedWallet.businessName || selectedWallet.ownerName}</option>
              )}
              {wallets.map((w) => (
                <option key={w.hostId} value={w.hostId}>
                  {w.businessName || w.ownerName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-primary mb-1" htmlFor="recharge-amount">
              {t("rechargeAmount")}
            </label>
            <input
              id="recharge-amount"
              type="number"
              min={1}
              max={MAX_RECHARGE_DZD}
              step={1}
              inputMode="numeric"
              required
              aria-invalid={!isValidDzdAmount(parsedRecharge, 1, MAX_RECHARGE_DZD)}
              aria-describedby="recharge-amount-hint"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              className={`${fieldCls} font-mono font-bold`}
            />
            <p
              id="recharge-amount-hint"
              role={rechargeAmount && !isValidDzdAmount(parsedRecharge, 1, MAX_RECHARGE_DZD) ? "alert" : undefined}
              className={`mt-1 text-[11px] ${
                rechargeAmount && !isValidDzdAmount(parsedRecharge, 1, MAX_RECHARGE_DZD) ? "text-accent-700" : "text-neutral-500"
              }`}
            >
              {rechargeAmount && !isValidDzdAmount(parsedRecharge, 1, MAX_RECHARGE_DZD)
                ? t("invalidAmount", { max: formatDzd(MAX_RECHARGE_DZD, locale) })
                : t("rechargeAmountHint", { max: formatDzd(MAX_RECHARGE_DZD, locale) })}
            </p>
          </div>

          <div>
            <label className="block font-bold text-primary mb-1" htmlFor="recharge-method">
              {t("rechargeMethod")}
            </label>
            <select
              id="recharge-method"
              value={rechargeMethod}
              onChange={(e) => setRechargeMethod(e.target.value as (typeof RECHARGE_METHODS)[number])}
              className={`${fieldCls} cursor-pointer`}
            >
              {RECHARGE_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`rechargeMethods.${m}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-primary mb-1" htmlFor="recharge-receipt">
              {t("rechargeReceipt")}
            </label>
            <input
              id="recharge-receipt"
              type="text"
              required
              maxLength={200}
              value={rechargeReceipt}
              onChange={(e) => setRechargeReceipt(e.target.value)}
              className={`${fieldCls} font-mono`}
            />
          </div>

          <div>
            <label className="block font-bold text-primary mb-1" htmlFor="recharge-reason">
              {t("rechargeReason")}
            </label>
            <input
              id="recharge-reason"
              type="text"
              maxLength={2000}
              value={rechargeReason}
              onChange={(e) => setRechargeReason(e.target.value)}
              className={fieldCls}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setRechargeDialogOpen(false)}>
              {tActions("cancel")}
            </Button>
            <Button type="submit" variant="primary" disabled={rechargeSubmitting || !rechargeValid}>
              {t("rechargeConfirm")}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
