"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  CreditCard,
  Building,
  RefreshCw,
  Download,
  Search,
  Filter,
  PlusCircle,
  Percent,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  listWallets,
  listTransactions,
  rechargeWallet,
  getCommissionRates,
  updateCommissionRates,
  listPayouts,
  approvePayout,
} from "@/lib/data/finance";
import {
  HostWallet,
  WalletTransaction,
  PayoutRequest,
  HostType,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { formatDzd, formatDate } from "@/lib/utils/format";
import { WILAYAS } from "@/lib/utils/wilayas";

interface Props {
  locale: string;
}

export default function FinanceClient({ locale }: Props) {
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = useState<"wallets" | "ledger" | "commissions" | "payouts">("wallets");

  // Wallets State
  const [wallets, setWallets] = useState<HostWallet[]>([]);
  const [walletsTotal, setWalletsTotal] = useState(0);
  const [walletsPage, setWalletsPage] = useState(1);
  const [walletsPageSize, setWalletsPageSize] = useState(10);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [hostTypeFilter, setHostTypeFilter] = useState("all");
  const [wilayaFilter, setWilayaFilter] = useState("all");
  const [negativeOnly, setNegativeOnly] = useState(false);
  const [walletSearch, setWalletSearch] = useState("");

  // Ledger / Transactions State
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [txSearch, setTxSearch] = useState("");
  const [txLoading, setTxLoading] = useState(false);

  // Commission Rates State
  const [commissionRates, setCommissionRates] = useState<Record<HostType, number>>({
    individual: 12,
    agency: 15,
    hotel: 18,
    hostel: 10,
  });
  const [commissionSaving, setCommissionSaving] = useState(false);

  // Payouts State
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);

  // Recharge Dialog State
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<HostWallet | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<number>(50000);
  const [rechargeMethod, setRechargeMethod] = useState("ccp");
  const [rechargeReason, setRechargeReason] = useState("Guaranteed cash deposit / top-up");
  const [rechargeReceipt, setRechargeReceipt] = useState("CCP-REC-2026-9812");
  const [rechargeSubmitting, setRechargeSubmitting] = useState(false);

  const { success, error, info } = useToast();

  const loadWallets = useCallback(async () => {
    setWalletsLoading(true);
    try {
      const res = await listWallets({
        hostType: hostTypeFilter === "all" ? undefined : hostTypeFilter,
        wilayaCode: wilayaFilter === "all" ? undefined : wilayaFilter,
        onlyNegative: negativeOnly,
        search: walletSearch,
        page: walletsPage,
        pageSize: walletsPageSize,
      });
      setWallets(res.rows);
      setWalletsTotal(res.total);
    } catch (err: any) {
      error("Failed to load wallets", err.message);
    } finally {
      setWalletsLoading(false);
    }
  }, [hostTypeFilter, wilayaFilter, negativeOnly, walletSearch, walletsPage, walletsPageSize, error]);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await listTransactions({
        type: txTypeFilter === "all" ? undefined : txTypeFilter,
        search: txSearch,
        page: txPage,
        pageSize: 15,
      });
      setTransactions(res.rows);
      setTxTotal(res.total);
    } catch (err: any) {
      error("Failed to load ledger transactions", err.message);
    } finally {
      setTxLoading(false);
    }
  }, [txTypeFilter, txSearch, txPage, error]);

  const loadCommissions = useCallback(async () => {
    try {
      const rates = await getCommissionRates();
      setCommissionRates(rates);
    } catch (err: any) {
      error("Failed to load rates", err.message);
    }
  }, [error]);

  const loadPayouts = useCallback(async () => {
    setPayoutsLoading(true);
    try {
      const list = await listPayouts();
      setPayouts(list);
    } catch (err: any) {
      error("Failed to load payouts", err.message);
    } finally {
      setPayoutsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    if (activeTab === "wallets") loadWallets();
    else if (activeTab === "ledger") loadTransactions();
    else if (activeTab === "commissions") loadCommissions();
    else if (activeTab === "payouts") loadPayouts();
  }, [activeTab, loadWallets, loadTransactions, loadCommissions, loadPayouts]);

  const handleOpenRecharge = (w: HostWallet) => {
    setSelectedWallet(w);
    setRechargeAmount(50000);
    setRechargeReceipt(`REC-${Math.floor(100000 + Math.random() * 900000)}`);
    setRechargeDialogOpen(true);
  };

  const handleRechargeSubmit = async () => {
    if (!selectedWallet) return;
    if (rechargeAmount <= 0) {
      error("Invalid Amount", "Please enter a positive credit recharge amount.");
      return;
    }
    if (!rechargeReceipt.trim()) {
      error("Missing Receipt", "A valid bank/postal deposit reference is required.");
      return;
    }

    setRechargeSubmitting(true);
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      const res = await rechargeWallet({
        hostId: selectedWallet.hostId,
        amount: rechargeAmount,
        method: rechargeMethod,
        reason: rechargeReason,
        receiptReference: rechargeReceipt,
        actor,
      });

      success(
        `Credited ${formatDzd(rechargeAmount, locale)} to ${selectedWallet.ownerName}`,
        `New strictly derived balance: ${formatDzd(res.newBalance, locale)}. Logged to immutable audit trail.`
      );

      setRechargeDialogOpen(false);
      loadWallets();
    } catch (err: any) {
      error("Recharge Failed", err.message);
    } finally {
      setRechargeSubmitting(false);
    }
  };

  const handleSaveCommissions = async () => {
    setCommissionSaving(true);
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      await updateCommissionRates(commissionRates, actor);
      success("Commission Rates Updated", "New platform rates applied to future bookings.");
    } catch (err: any) {
      error("Update Failed", err.message);
    } finally {
      setCommissionSaving(false);
    }
  };

  const handleApprovePayout = async (payoutId: string) => {
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      await approvePayout(payoutId, actor);
      success("Payout Approved", `Payment order dispatched to treasury for processing.`);
      setPayouts((prev) =>
        prev.map((p) => (p.id === payoutId ? { ...p, status: "approved" as const } : p))
      );
    } catch (err: any) {
      error("Approval Failed", err.message);
    }
  };

  const exportLedgerCsv = () => {
    const headers = "ID,Timestamp,Host,HostType,Type,AmountDZD,BalanceAfter,Reference,AdminActor\n";
    const rows = transactions
      .map(
        (t) =>
          `"${t.id}","${t.createdAt}","${t.hostName}","${t.hostType}","${t.type}",${t.amount},${t.balanceAfter},"${t.reference}","${t.adminActor || "System"}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `darna_transactions_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    info("CSV Export Complete", "Filtered transactions ledger downloaded.");
  };

  return (
    <div className="space-y-6 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">{t("title")}</h1>
          <p className="text-xs text-neutral-500 mt-1">
            {t("subtitle")}
          </p>
        </div>

        {activeTab === "ledger" && (
          <Button variant="outline" size="sm" onClick={exportLedgerCsv} className="text-xs font-bold">
            <Download className="w-3.5 h-3.5 me-1.5" />
            {t("exportLedger")}
          </Button>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-tertiary/60">
        <button
          onClick={() => setActiveTab("wallets")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 -mb-[2px] cursor-pointer ${
            activeTab === "wallets"
              ? "border-primary text-primary bg-white shadow-2xs"
              : "border-transparent text-neutral-500 hover:text-primary"
          }`}
        >
          <Wallet className="w-4 h-4 text-secondary" />
          <span>{t("wallets")}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-neutral-100 font-bold">
            {walletsTotal}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 -mb-[2px] cursor-pointer ${
            activeTab === "ledger"
              ? "border-primary text-primary bg-white shadow-2xs"
              : "border-transparent text-neutral-500 hover:text-primary"
          }`}
        >
          <FileText className="w-4 h-4 text-secondary" />
          <span>{t("ledger")}</span>
        </button>

        <button
          onClick={() => setActiveTab("payouts")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 -mb-[2px] cursor-pointer ${
            activeTab === "payouts"
              ? "border-primary text-primary bg-white shadow-2xs"
              : "border-transparent text-neutral-500 hover:text-primary"
          }`}
        >
          <CreditCard className="w-4 h-4 text-secondary" />
          <span>{t("payouts")}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-accent/15 text-accent font-bold">
            {payouts.filter((p) => p.status === "pending").length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("commissions")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 -mb-[2px] cursor-pointer ${
            activeTab === "commissions"
              ? "border-primary text-primary bg-white shadow-2xs"
              : "border-transparent text-neutral-500 hover:text-primary"
          }`}
        >
          <Percent className="w-4 h-4 text-secondary" />
          <span>{t("commissions")}</span>
        </button>
      </div>

      {/* TAB 1: HOST WALLETS */}
      {activeTab === "wallets" && (
        <div className="space-y-4">
          {/* Wallets Filters */}
          <div className="bg-white p-3.5 rounded-2xl border border-tertiary/70 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={walletSearch}
                  onChange={(e) => setWalletSearch(e.target.value)}
                  placeholder="Search host or business..."
                  className="w-full ps-9 pe-3 py-1.5 text-xs rounded-xl border border-tertiary/80 bg-darnaBg/30 focus:bg-white text-primary focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <select
                  value={hostTypeFilter}
                  onChange={(e) => {
                    setHostTypeFilter(e.target.value);
                    setWalletsPage(1);
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-tertiary/80 bg-white text-primary focus:outline-none focus:border-secondary"
                >
                  <option value="all">All Host Categories</option>
                  <option value="individual">Individual Hosts</option>
                  <option value="agency">Tourism Agencies</option>
                  <option value="hotel">Hotels & Resorts</option>
                  <option value="hostel">Hostels & Lodges</option>
                </select>
              </div>

              <div>
                <select
                  value={wilayaFilter}
                  onChange={(e) => {
                    setWilayaFilter(e.target.value);
                    setWalletsPage(1);
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-tertiary/80 bg-white text-primary focus:outline-none focus:border-secondary"
                >
                  <option value="all">All Wilayas</option>
                  {WILAYAS.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.code} - {w.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={negativeOnly}
                    onChange={(e) => {
                      setNegativeOnly(e.target.checked);
                      setWalletsPage(1);
                    }}
                    className="w-4 h-4 rounded text-accent border-tertiary focus:ring-accent cursor-pointer"
                  />
                  <span>Show Negative Balances Only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Wallets Table */}
          <div className="bg-white rounded-2xl border border-tertiary/70 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-darnaBg/60 border-b border-tertiary/60 text-neutral-600 text-xs font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">Host / Organization</th>
                    <th className="py-3 px-4 text-start">Type</th>
                    <th className="py-3 px-4 text-start">Wilaya</th>
                    <th className="py-3 px-4 text-end">Derived Balance</th>
                    <th className="py-3 px-4 text-start">Commission</th>
                    <th className="py-3 px-4 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tertiary/40">
                  {walletsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        Calculating strict balances from transactions ledger...
                      </td>
                    </tr>
                  ) : wallets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        No host wallets match criteria.
                      </td>
                    </tr>
                  ) : (
                    wallets.map((w) => (
                      <tr key={w.id} className="hover:bg-darnaBg/20 transition-colors">
                        <td className="py-3 px-4 font-semibold text-primary">
                          <div>{w.businessName || w.ownerName}</div>
                          {w.businessName && (
                            <div className="text-[11px] text-neutral-400 font-normal">
                              Rep: {w.ownerName}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 capitalize font-medium text-neutral-600">
                          {w.hostType}
                        </td>
                        <td className="py-3 px-4 text-neutral-600">Wilaya {w.wilayaCode}</td>
                        <td className="py-3 px-4 text-end font-bold tabular-nums">
                          <span
                            className={
                              w.balance < 0
                                ? "text-accent font-extrabold"
                                : "text-secondary font-bold"
                            }
                          >
                            {formatDzd(w.balance, locale)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-neutral-600">{w.commissionRate}%</td>
                        <td className="py-3 px-4 text-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRecharge(w)}
                            className="text-xs font-bold text-secondary border-secondary/40 hover:bg-secondary/10"
                          >
                            <PlusCircle className="w-3.5 h-3.5 me-1" />
                            Credit Recharge
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {walletsTotal > walletsPageSize && (
              <div className="p-3 border-t border-tertiary/40">
                <Pagination
                  currentPage={walletsPage}
                  totalPages={Math.ceil(walletsTotal / walletsPageSize)}
                  pageSize={walletsPageSize}
                  totalItems={walletsTotal}
                  onPageChange={setWalletsPage}
                  onPageSizeChange={setWalletsPageSize}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS LEDGER */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-tertiary/70 shadow-2xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Search by transaction reference, booking ref, or host..."
                className="w-full ps-9 pe-3 py-1.5 text-xs rounded-xl border border-tertiary/80 bg-darnaBg/30 focus:bg-white text-primary focus:outline-none focus:border-secondary"
              />
            </div>

            <div className="sm:w-56">
              <select
                value={txTypeFilter}
                onChange={(e) => {
                  setTxTypeFilter(e.target.value);
                  setTxPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-tertiary/80 bg-white text-primary focus:outline-none focus:border-secondary"
              >
                <option value="all">All Transaction Types</option>
                <option value="booking_payout">Booking Payout (+)</option>
                <option value="platform_commission">Platform Commission (-)</option>
                <option value="cancellation_refund">Cancellation Refund (-)</option>
                <option value="wallet_recharge">Manual Recharge (+)</option>
                <option value="penalty_fee">Penalty Fee (-)</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-tertiary/70 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-darnaBg/60 border-b border-tertiary/60 text-neutral-600 text-xs font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">Reference</th>
                    <th className="py-3 px-4 text-start">Date</th>
                    <th className="py-3 px-4 text-start">Host</th>
                    <th className="py-3 px-4 text-start">Type & Description</th>
                    <th className="py-3 px-4 text-end">Amount</th>
                    <th className="py-3 px-4 text-end">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tertiary/40">
                  {txLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        Loading transaction logs...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-darnaBg/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          {t.reference}
                        </td>
                        <td className="py-3 px-4 text-neutral-500">
                          {formatDate(t.createdAt, locale)}
                        </td>
                        <td className="py-3 px-4 font-medium text-primary">
                          <div>{t.hostName}</div>
                          <div className="text-[10px] text-neutral-400 capitalize">{t.hostType}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize font-semibold text-neutral-700">
                            {t.type.replace("_", " ")}
                          </span>
                          <div className="text-[11px] text-neutral-400 truncate max-w-xs">
                            {t.description}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-end font-bold tabular-nums">
                          <span className={t.amount >= 0 ? "text-secondary" : "text-accent"}>
                            {t.amount >= 0 ? "+" : ""}
                            {formatDzd(t.amount, locale)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-end font-mono text-neutral-600 tabular-nums">
                          {formatDzd(t.balanceAfter, locale)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {txTotal > 15 && (
              <div className="p-3 border-t border-tertiary/40">
                <Pagination
                  currentPage={txPage}
                  totalPages={Math.ceil(txTotal / 15)}
                  pageSize={15}
                  totalItems={txTotal}
                  onPageChange={setTxPage}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PAYOUT REQUESTS */}
      {activeTab === "payouts" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-tertiary/70 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-tertiary/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-primary">Host CCP & Bank Payout Queue</h3>
                <p className="text-xs text-neutral-500">
                  Review and release escrow payouts to verified Algerian accounts.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-darnaBg/60 border-b border-tertiary/60 text-neutral-600 text-xs font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">Payout ID</th>
                    <th className="py-3 px-4 text-start">Host</th>
                    <th className="py-3 px-4 text-start">Disbursement Method</th>
                    <th className="py-3 px-4 text-start">Account / RIP / Phone</th>
                    <th className="py-3 px-4 text-end">Amount</th>
                    <th className="py-3 px-4 text-start">Status</th>
                    <th className="py-3 px-4 text-end">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tertiary/40">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-darnaBg/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">{p.id}</td>
                      <td className="py-3 px-4 font-medium text-primary">
                        <div>{p.hostName}</div>
                        <div className="text-[10px] text-neutral-400 capitalize">{p.hostType}</div>
                      </td>
                      <td className="py-3 px-4 uppercase font-bold text-neutral-700">
                        {p.payoutMethod.replace("_", " ")}
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-600">
                        {p.accountDetails.ccpRip ||
                          p.accountDetails.rib ||
                          p.accountDetails.phone ||
                          "Verified Account"}
                      </td>
                      <td className="py-3 px-4 text-end font-bold text-secondary tabular-nums">
                        {formatDzd(p.amountDzd, locale)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === "approved"
                              ? "bg-secondary/15 text-secondary"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-end">
                        {p.status === "pending" ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprovePayout(p.id)}
                            className="text-xs font-bold"
                          >
                            <CheckCircle className="w-3.5 h-3.5 me-1" />
                            Approve Payout
                          </Button>
                        ) : (
                          <span className="text-[11px] text-neutral-400 font-semibold">
                            Dispatched
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMMISSION RATES MATRIX */}
      {activeTab === "commissions" && (
        <div className="max-w-3xl space-y-5">
          <div className="bg-white p-6 rounded-2xl border border-tertiary/80 shadow-2xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-primary">Standard Commission Tiers</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Default platform take-rate deducted automatically on confirmed reservation payouts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-tertiary/70 bg-darnaBg/30 space-y-2">
                <label className="block text-xs font-bold text-primary">
                  Individual Stays & Villas
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={commissionRates.individual}
                    onChange={(e) =>
                      setCommissionRates({
                        ...commissionRates,
                        individual: Number(e.target.value),
                      })
                    }
                    className="w-24 p-2 rounded-xl border border-tertiary text-xs font-bold text-primary text-center"
                  />
                  <span className="text-xs text-neutral-500">% per completed stay</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-tertiary/70 bg-darnaBg/30 space-y-2">
                <label className="block text-xs font-bold text-primary">
                  Licensed Tourism Agencies
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={commissionRates.agency}
                    onChange={(e) =>
                      setCommissionRates({
                        ...commissionRates,
                        agency: Number(e.target.value),
                      })
                    }
                    className="w-24 p-2 rounded-xl border border-tertiary text-xs font-bold text-primary text-center"
                  />
                  <span className="text-xs text-neutral-500">% per expedition/trip</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-tertiary/70 bg-darnaBg/30 space-y-2">
                <label className="block text-xs font-bold text-primary">
                  Hotels & Registered Resorts
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={commissionRates.hotel}
                    onChange={(e) =>
                      setCommissionRates({
                        ...commissionRates,
                        hotel: Number(e.target.value),
                      })
                    }
                    className="w-24 p-2 rounded-xl border border-tertiary text-xs font-bold text-primary text-center"
                  />
                  <span className="text-xs text-neutral-500">% per room booking</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-tertiary/70 bg-darnaBg/30 space-y-2">
                <label className="block text-xs font-bold text-primary">
                  Youth Hostels & Backpacker Stays
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={commissionRates.hostel}
                    onChange={(e) =>
                      setCommissionRates({
                        ...commissionRates,
                        hostel: Number(e.target.value),
                      })
                    }
                    className="w-24 p-2 rounded-xl border border-tertiary text-xs font-bold text-primary text-center"
                  />
                  <span className="text-xs text-neutral-500">% per bed booking</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                onClick={handleSaveCommissions}
                disabled={commissionSaving}
                className="text-xs font-bold"
              >
                {commissionSaving ? "Saving..." : "Save Commission Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RECHARGE WALLET MODAL DIALOG */}
      <Dialog
        isOpen={rechargeDialogOpen}
        onClose={() => setRechargeDialogOpen(false)}
        title={`Recharge Wallet: ${selectedWallet?.businessName || selectedWallet?.ownerName}`}
        size="md"
      >
        <div className="space-y-4 text-start">
          <p className="text-xs text-neutral-600">
            Crediting a wallet records a guaranteed credit transaction and updates the strictly calculated balance.
          </p>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              Credit Amount (DZD)
            </label>
            <input
              type="number"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              Deposit / Top-up Channel
            </label>
            <select
              value={rechargeMethod}
              onChange={(e) => setRechargeMethod(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary"
            >
              <option value="ccp">Algerie Poste (CCP / BaridiMob)</option>
              <option value="bank_transfer">Bank Wire Transfer (BNA / BEA / CPA / BADR)</option>
              <option value="cash_deposit">Certified Branch Cash Receipt</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              Postal/Bank Receipt Number (Mandatory)
            </label>
            <input
              type="text"
              value={rechargeReceipt}
              onChange={(e) => setRechargeReceipt(e.target.value)}
              placeholder="e.g. CCP-REC-2026-9812"
              className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              Internal Reason / Audit Note
            </label>
            <input
              type="text"
              value={rechargeReason}
              onChange={(e) => setRechargeReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRechargeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRechargeSubmit}
              disabled={rechargeSubmitting}
              className="font-bold text-xs"
            >
              {rechargeSubmitting ? "Processing..." : "Confirm Ledger Credit"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
