"use client";

import React, { useState, useMemo } from "react";
import { Wallet, Transaction, HostType } from "@/types";
import { rechargeWallet, resetWalletsToDefault } from "@/lib/data/wallet";
import PriceDisplay from "@/components/common/PriceDisplay";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import { toast } from "react-toastify";
import {
  BrandCreditCardIcon,
  BrandSearchIcon,
  BrandPlusIcon,
  BrandDocumentTextIcon,
  BrandExclamationIcon,
  BrandCheckCircleIcon,
  BrandArrowUpIcon,
  BrandArrowDownIcon,
  BrandRefreshIcon,
  BrandCashIcon,
  BrandCrossIcon,
  BrandBuildingIcon,
  CategoryHouseIcon,
} from "@/components/icons";

interface AdminWalletsClientProps {
  initialWallets: Wallet[];
}

export default function AdminWalletsClient({ initialWallets }: AdminWalletsClientProps) {
  const [wallets, setWallets] = useState<Wallet[]>(initialWallets);
  const [searchQuery, setSearchQuery] = useState("");
  const [hostTypeFilter, setHostTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "healthy" | "negative">("all");

  // Selected for Ledger Drawer
  const [ledgerWallet, setLedgerWallet] = useState<Wallet | null>(null);

  // Selected for Recharge Modal
  const [rechargeTarget, setRechargeTarget] = useState<Wallet | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<number>(50000);
  const [rechargeNote, setRechargeNote] = useState<string>("");
  const [isSubmittingRecharge, setIsSubmittingRecharge] = useState<boolean>(false);
  const [showConfirmRecharge, setShowConfirmRecharge] = useState<boolean>(false);

  // Ledger filter
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>("all");

  // Metrics calculation
  const totalHostBalance = useMemo(() => {
    return wallets.reduce((sum, w) => sum + (w.balance > 0 ? w.balance : 0), 0);
  }, [wallets]);

  const totalCommissionCollected = useMemo(() => {
    return wallets.reduce((sum, w) => {
      const commTxs = w.transactions.filter((tx) => tx.type === "commission_deduction");
      return sum + Math.abs(commTxs.reduce((tSum, tx) => tSum + tx.amount, 0));
    }, 0);
  }, [wallets]);

  const negativeWalletsCount = useMemo(() => {
    return wallets.filter((w) => w.balance < 0).length;
  }, [wallets]);

  const filteredWallets = useMemo(() => {
    return wallets.filter((w) => {
      if (hostTypeFilter !== "all" && w.hostType !== hostTypeFilter) return false;
      if (statusFilter === "negative" && w.balance >= 0) return false;
      if (statusFilter === "healthy" && w.balance < 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !w.ownerName.toLowerCase().includes(q) &&
          !w.ownerId.toLowerCase().includes(q) &&
          !w.id.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [wallets, hostTypeFilter, statusFilter, searchQuery]);

  const handleOpenRecharge = (wallet: Wallet) => {
    setRechargeTarget(wallet);
    setRechargeAmount(50000);
    setRechargeNote("");
    setShowConfirmRecharge(false);
  };

  const handleConfirmRechargeSubmit = async () => {
    if (!rechargeTarget || rechargeAmount <= 0) return;
    setIsSubmittingRecharge(true);
    try {
      const { wallet: updatedWallet, transaction } = await rechargeWallet({
        walletId: rechargeTarget.id,
        amount: rechargeAmount,
        note: rechargeNote || `Offline recharge credited via admin portal`,
        adminUserId: "usr_admin",
      });

      setWallets((prev) => prev.map((w) => (w.id === updatedWallet.id ? updatedWallet : w)));
      if (ledgerWallet?.id === updatedWallet.id) {
        setLedgerWallet(updatedWallet);
      }
      toast.success(
        `Successfully credited +${rechargeAmount.toLocaleString("fr-DZ")} DZD to ${rechargeTarget.ownerName}`
      );
      setRechargeTarget(null);
      setShowConfirmRecharge(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to process manual recharge");
    } finally {
      setIsSubmittingRecharge(false);
    }
  };

  const handleResetToDefault = () => {
    const defaults = resetWalletsToDefault();
    setWallets(defaults);
    setLedgerWallet(null);
    setRechargeTarget(null);
    toast.info("Host wallets & transaction ledger reset to seed defaults.");
  };

  const getHostTypeBadge = (type: HostType) => {
    switch (type) {
      case "individual":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary/15 text-primary">Individual Host</span>;
      case "agency":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900">Tourism Agency</span>;
      case "hotel":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">Hotel & Resort</span>;
      case "hostel":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900">Youth Hostel</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Host Wallets & Financial Ledger
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Offline prepaid deposits, append-only transaction ledger, and automatic booking commission deductions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            title="Reset wallets to default seed state"
          >
            <BrandRefreshIcon size={15} />
            <span>Reset Ledger</span>
          </button>
        </div>
      </div>

      {/* Negative Balance System Alert if any exist */}
      {negativeWalletsCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3.5 text-rose-900 shadow-2xs">
          <BrandExclamationIcon className="text-rose-600 shrink-0 mt-0.5" size={22} />
          <div className="text-xs space-y-1">
            <span className="font-bold text-sm block">Action Required: Negative Host Balance Detected</span>
            <p className="text-rose-800">
              {negativeWalletsCount} host account currently has a negative balance because commission deductions exceed prepaid deposit funds.
              The host has been notified via their workspace banner to complete an offline bank or CCP transfer.
            </p>
          </div>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-tertiary/70 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-bold uppercase tracking-wider">Host Deposits Held</span>
            <BrandCashIcon className="text-primary" size={20} />
          </div>
          <div className="text-2xl font-serif font-black text-primary">
            <PriceDisplay price={totalHostBalance} showEur={false} priceClassName="font-serif font-black text-2xl text-primary" />
          </div>
          <span className="text-[11px] text-neutral-400 block">Total positive prepaid host balances</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-tertiary/70 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-bold uppercase tracking-wider">Commission Deducted</span>
            <BrandArrowDownIcon className="text-emerald-700" size={20} />
          </div>
          <div className="text-2xl font-serif font-black text-emerald-800">
            <PriceDisplay price={totalCommissionCollected} showEur={false} priceClassName="font-serif font-black text-2xl text-emerald-800" />
          </div>
          <span className="text-[11px] text-neutral-400 block">Platform earnings via confirmed bookings</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-tertiary/70 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active Host Wallets</span>
            <BrandCreditCardIcon className="text-secondary" size={20} />
          </div>
          <div className="text-2xl font-serif font-black text-primary">
            {wallets.length} <span className="text-xs font-sans text-neutral-500 font-semibold">Ledgers</span>
          </div>
          <span className="text-[11px] text-neutral-400 block">Covering Individual, Agency, Hotel & Hostel</span>
        </div>

        <div className={`p-5 rounded-3xl border shadow-2xs space-y-2 ${negativeWalletsCount > 0 ? "bg-rose-50/50 border-rose-200" : "bg-white border-tertiary/70"}`}>
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-bold uppercase tracking-wider">Negative Balances</span>
            <BrandExclamationIcon className={negativeWalletsCount > 0 ? "text-rose-600" : "text-emerald-600"} size={20} />
          </div>
          <div className={`text-2xl font-serif font-black ${negativeWalletsCount > 0 ? "text-rose-700" : "text-emerald-700"}`}>
            {negativeWalletsCount} <span className="text-xs font-sans text-neutral-500 font-semibold">Flagged</span>
          </div>
          <span className="text-[11px] text-neutral-400 block">
            {negativeWalletsCount > 0 ? "Requires manual recharge reminder" : "All host balances solvent"}
          </span>
        </div>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="bg-white rounded-3xl border border-tertiary/70 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <BrandSearchIcon size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search host name, organization, or wallet ID..."
            className="w-full ps-10 pe-4 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Host Type Filter */}
          <select
            value={hostTypeFilter}
            onChange={(e) => setHostTypeFilter(e.target.value)}
            className="px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:outline-none"
          >
            <option value="all">All Host Types</option>
            <option value="individual">Individual Hosts</option>
            <option value="agency">Tourism Agencies</option>
            <option value="hotel">Hotels & Resorts</option>
            <option value="hostel">Youth Hostels</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:outline-none"
          >
            <option value="all">All Solvency Statuses</option>
            <option value="healthy">Healthy Balances (≥ 0 DZD)</option>
            <option value="negative">Negative Balances (&lt; 0 DZD)</option>
          </select>
        </div>
      </div>

      {/* Wallets Table */}
      <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Host / Organization</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Current Balance</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Transactions</th>
                <th className="py-3.5 px-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/40">
              {filteredWallets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    No host wallets match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredWallets.map((wallet) => {
                  const isNegative = wallet.balance < 0;
                  const isLow = wallet.balance >= 0 && wallet.balance < 15000;

                  return (
                    <tr key={wallet.id} className="hover:bg-neutral-50/70 transition">
                      {/* Host & ID */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isNegative ? "bg-rose-100 text-rose-800" : "bg-neutral-100 text-primary"
                          }`}>
                            {wallet.ownerType === "organization" ? (
                              <BrandBuildingIcon size={18} />
                            ) : (
                              <CategoryHouseIcon size={18} />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-primary block">{wallet.ownerName}</span>
                            <span className="text-[11px] text-neutral-400 font-mono">
                              {wallet.id} • {wallet.ownerId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">
                        {getHostTypeBadge(wallet.hostType)}
                      </td>

                      {/* Balance */}
                      <td className="py-4 px-4 font-mono font-bold">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${
                            isNegative ? "text-rose-700 font-black" : "text-primary"
                          }`}>
                            {wallet.balance < 0 ? "-" : ""}
                            {Math.abs(wallet.balance).toLocaleString("fr-DZ")} DZD
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        {isNegative ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                            <BrandExclamationIcon size={12} />
                            <span>Negative / Action Needed</span>
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            <span>Low Deposit</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <BrandCheckCircleIcon size={12} />
                            <span>Solvent</span>
                          </span>
                        )}
                      </td>

                      {/* Transaction Count */}
                      <td className="py-4 px-4 text-center text-neutral-500 font-mono">
                        {wallet.transactions.length} records
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-end">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenRecharge(wallet)}
                            className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                          >
                            <BrandPlusIcon size={15} />
                            <span>Recharge Balance</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setLedgerWallet(wallet)}
                            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-primary rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <BrandDocumentTextIcon size={15} />
                            <span>Ledger</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Recharge Modal */}
      {rechargeTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-tertiary shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 my-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-tertiary/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-secondary/20 text-primary flex items-center justify-center font-bold">
                  <BrandCashIcon size={22} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-black text-primary">Recharge Host Balance</h3>
                  <p className="text-xs text-neutral-500">Credit offline CCP or bank transfer to host ledger</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRechargeTarget(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center"
              >
                <BrandCrossIcon size={16} />
              </button>
            </div>

            {/* Target Details */}
            <div className="bg-neutral-50 p-4 rounded-2xl border border-tertiary/60 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-medium">Host / Org:</span>
                <span className="font-bold text-primary">{rechargeTarget.ownerName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-medium">Category:</span>
                <div>{getHostTypeBadge(rechargeTarget.hostType)}</div>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-medium">Current Balance:</span>
                <span className={`font-mono font-bold ${rechargeTarget.balance < 0 ? "text-rose-700" : "text-primary"}`}>
                  {rechargeTarget.balance.toLocaleString("fr-DZ")} DZD
                </span>
              </div>
            </div>

            {/* Amount Form */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-primary block mb-1.5">
                  Deposit Amount (DZD) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1000"
                    step="5000"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-xl font-mono text-base font-bold text-primary focus:outline-none focus:border-primary"
                    placeholder="e.g. 50000"
                    required
                  />
                  <span className="absolute end-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-neutral-400">
                    DZD
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {[10000, 25000, 50000, 100000, 250000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRechargeAmount(preset)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold transition ${
                        rechargeAmount === preset
                          ? "bg-primary text-white"
                          : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                      }`}
                    >
                      +{preset.toLocaleString("fr-DZ")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-primary block mb-1.5">
                  Offline Reference / Payment Note
                </label>
                <textarea
                  rows={2}
                  value={rechargeNote}
                  onChange={(e) => setRechargeNote(e.target.value)}
                  placeholder="e.g. BaridiMob transfer ref #901442, or CCP deposit receipt #DZ-8812"
                  className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none focus:border-primary"
                />
                <span className="text-[11px] text-neutral-400 block mt-1">
                  Recorded in the append-only ledger for audit and host reconciliation.
                </span>
              </div>
            </div>

            {/* Projected Balance */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-emerald-900 font-medium">New Balance After Recharge:</span>
              <span className="font-mono font-black text-emerald-800 text-sm">
                {(rechargeTarget.balance + rechargeAmount).toLocaleString("fr-DZ")} DZD
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-tertiary/60">
              <button
                type="button"
                onClick={() => setRechargeTarget(null)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rechargeAmount <= 0 || isSubmittingRecharge}
                onClick={() => setShowConfirmRecharge(true)}
                className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-2xs"
              >
                Review & Confirm Recharge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog via Premium ConfirmDialog */}
      {showConfirmRecharge && rechargeTarget && (
        <ConfirmDialog
          isOpen={showConfirmRecharge}
          variant="success"
          title="Confirm Host Balance Credit"
          message={`Are you sure you want to credit ${rechargeAmount.toLocaleString("fr-DZ")} DZD to ${rechargeTarget.ownerName}?`}
          description={
            rechargeNote
              ? `Payment Reference: ${rechargeNote}`
              : "This append-only transaction will be permanently recorded in the host's financial ledger."
          }
          confirmLabel="Confirm Credit"
          cancelLabel="Go Back"
          isLoading={isSubmittingRecharge}
          onConfirm={handleConfirmRechargeSubmit}
          onCancel={() => setShowConfirmRecharge(false)}
        />
      )}

      {/* Full Transaction Ledger Drawer */}
      {ledgerWallet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-tertiary shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 my-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-tertiary/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-bold">
                  <BrandDocumentTextIcon size={22} />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-black text-primary">
                    Audit Ledger: {ledgerWallet.ownerName}
                  </h3>
                  <div className="text-xs text-neutral-500 font-mono flex items-center gap-2 mt-0.5">
                    <span>{ledgerWallet.id}</span>
                    <span>•</span>
                    <div>{getHostTypeBadge(ledgerWallet.hostType)}</div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLedgerWallet(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center"
              >
                <BrandCrossIcon size={16} />
              </button>
            </div>

            {/* Current Balance Banner */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-tertiary/60 flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-400 block font-bold uppercase tracking-wider">
                  Current Net Balance
                </span>
                <span className={`text-2xl font-serif font-black ${
                  ledgerWallet.balance < 0 ? "text-rose-700" : "text-primary"
                }`}>
                  {ledgerWallet.balance.toLocaleString("fr-DZ")} DZD
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const target = ledgerWallet;
                  setLedgerWallet(null);
                  handleOpenRecharge(target);
                }}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <BrandPlusIcon size={15} />
                <span>Recharge Balance</span>
              </button>
            </div>

            {/* Ledger Filter */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-500 uppercase tracking-wider">
                Append-Only Transactions ({ledgerWallet.transactions.length})
              </span>
              <div className="flex gap-1.5">
                {[
                  { id: "all", label: "All" },
                  { id: "recharge", label: "Recharges" },
                  { id: "commission_deduction", label: "Commissions" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setLedgerTypeFilter(tab.id)}
                    className={`px-3 py-1 rounded-xl font-bold transition ${
                      ledgerTypeFilter === tab.id
                        ? "bg-primary text-white"
                        : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ledger Table */}
            <div className="border border-tertiary/70 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Note / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tertiary/40">
                  {ledgerWallet.transactions
                    .filter((tx) => (ledgerTypeFilter === "all" ? true : tx.type === ledgerTypeFilter))
                    .map((tx) => {
                      const isCredit = tx.amount > 0;
                      return (
                        <tr key={tx.id} className="hover:bg-neutral-50/50">
                          <td className="py-3 px-3 text-neutral-500 font-mono whitespace-nowrap">
                            {new Date(tx.timestamp).toLocaleDateString("fr-DZ", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {tx.type === "recharge" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                <BrandArrowUpIcon size={13} /> Recharge
                              </span>
                            ) : tx.type === "commission_deduction" ? (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                                <BrandArrowDownIcon size={13} /> Commission
                              </span>
                            ) : (
                              <span className="text-neutral-600 capitalize">{tx.type}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold whitespace-nowrap">
                            <span className={isCredit ? "text-emerald-700" : "text-rose-700"}>
                              {isCredit ? "+" : ""}
                              {tx.amount.toLocaleString("fr-DZ")} DZD
                            </span>
                          </td>
                          <td className="py-3 px-3 text-neutral-600">
                            <div>{tx.note || "—"}</div>
                            {tx.relatedBookingId && (
                              <span className="text-[10px] text-neutral-400 font-mono block">
                                Ref Booking: {tx.relatedBookingId}
                              </span>
                            )}
                            {tx.adminUserId && (
                              <span className="text-[10px] text-neutral-400 font-mono block">
                                Performed by: {tx.adminUserId}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-tertiary/60">
              <button
                type="button"
                onClick={() => setLedgerWallet(null)}
                className="px-5 py-2 bg-neutral-100 hover:bg-neutral-200 text-primary font-bold rounded-xl text-xs transition"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
