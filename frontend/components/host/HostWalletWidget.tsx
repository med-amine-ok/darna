"use client";

import React, { useState, useEffect } from "react";
import { Wallet, Transaction, HostType } from "@/types";
import { getWalletByOwner, getRateForHostType } from "@/lib/data/wallet";
import PriceDisplay from "@/components/common/PriceDisplay";
import {
  HiOutlineCreditCard,
  HiOutlineExclamation,
  HiOutlineDocumentText,
  HiOutlineArrowUp,
  HiOutlineArrowDown,
  HiOutlineX,
  HiOutlineInformationCircle,
  HiOutlineShieldCheck,
} from "react-icons/hi";

interface HostWalletWidgetProps {
  ownerId?: string;
  ownerType?: "user" | "organization";
  hostType?: HostType;
  className?: string;
}

export default function HostWalletWidget({
  ownerId = "usr_amina",
  ownerType = "user",
  hostType = "individual",
  className = "",
}: HostWalletWidgetProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState<string>("all");

  useEffect(() => {
    let isMounted = true;
    getWalletByOwner(ownerId, ownerType)
      .then((w) => {
        if (isMounted) setWallet(w);
      })
      .catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [ownerId, ownerType]);

  if (!wallet) {
    return null;
  }

  const isNegative = wallet.balance < 0;
  const currentRate = getRateForHostType(wallet.hostType || hostType);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* High-visibility Negative Balance Alert Banner */}
      {isNegative && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-3xl flex flex-col sm:flex-row items-start gap-4 text-rose-950 shadow-sm animate-in fade-in">
          <div className="p-2 rounded-2xl bg-rose-100 text-rose-700 shrink-0">
            <HiOutlineExclamation size={26} />
          </div>
          <div className="text-xs space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-rose-900">
                Action Required: Negative Host Balance (-{Math.abs(wallet.balance).toLocaleString("fr-DZ")} DZD)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-900">
                Overdue
              </span>
            </div>
            <p className="text-rose-800 leading-relaxed">
              Your platform commission deductions currently exceed your prepaid deposit funds. Please complete an offline CCP or bank transfer to DARNA platform administration to restore your deposit and prevent temporary listing reservation pauses.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] font-mono text-rose-900">
              <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-rose-200">
                CCP Account: <strong>0021445982 Clé 41</strong>
              </span>
              <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-rose-200">
                BaridiMob RIP: <strong>00799999002144598241</strong>
              </span>
              <span className="text-rose-700 font-sans">
                Admin Support: <strong>+213 21 74 12 00</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Balance Card */}
      <div className="bg-white rounded-3xl border border-tertiary/70 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-tertiary/60">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
              isNegative ? "bg-rose-100 text-rose-700" : "bg-primary text-white"
            }`}>
              <HiOutlineCreditCard size={20} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">
                Host Prepaid Wallet & Balance
              </h3>
              <p className="text-xs text-neutral-500">
                Prepaid commission deposit ledger (Platform Take-Rate: <span className="font-mono font-bold text-primary">{currentRate}%</span>)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLedgerOpen(true)}
              className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-primary rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <HiOutlineDocumentText size={15} />
              <span>Statement & History</span>
            </button>
          </div>
        </div>

        {/* Balance metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-neutral-50/80 p-4 rounded-2xl border border-tertiary/60 space-y-1">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
              Current Deposit Balance
            </span>
            <div className={`text-2xl font-serif font-black ${isNegative ? "text-rose-700" : "text-primary"}`}>
              {wallet.balance < 0 ? "-" : ""}
              {Math.abs(wallet.balance).toLocaleString("fr-DZ")} DZD
            </div>
            <span className={`text-[11px] font-semibold block ${isNegative ? "text-rose-600 font-bold" : "text-emerald-700"}`}>
              {isNegative ? "⚠️ Deposit Deficit" : "✓ Active & Solvent"}
            </span>
          </div>

          <div className="bg-neutral-50/80 p-4 rounded-2xl border border-tertiary/60 space-y-1">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
              Applicable Commission
            </span>
            <div className="text-2xl font-serif font-black text-primary">
              {currentRate}%
            </div>
            <span className="text-[11px] text-neutral-500 block capitalize">
              Deducted per confirmed booking ({wallet.hostType} rate)
            </span>
          </div>

          <div className="bg-neutral-50/80 p-4 rounded-2xl border border-tertiary/60 space-y-1">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
              Recharge Process
            </span>
            <span className="text-xs font-bold text-primary block">
              Offline CCP / Bank Wire
            </span>
            <span className="text-[11px] text-neutral-500 block leading-tight">
              Credited manually by platform admins upon receipt validation
            </span>
          </div>
        </div>

        {/* Note banner */}
        <div className="p-3 bg-neutral-50/60 rounded-xl border border-tertiary/40 flex items-start gap-2.5 text-xs text-neutral-600">
          <HiOutlineInformationCircle size={16} className="text-secondary shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>How DARNA Host Balance Works:</strong> In compliance with Algerian banking practices, commission is deducted from your offline deposit rather than direct automated guest payouts. To recharge your balance, submit a transfer via BaridiMob or CCP and send the receipt to support.
          </p>
        </div>
      </div>

      {/* Read-Only Transaction Ledger Modal */}
      {isLedgerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-tertiary shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 my-8 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-tertiary/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-bold">
                  <HiOutlineDocumentText size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-black text-primary">
                    Host Transaction Statement
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Append-only ledger of deposits and booking commission deductions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLedgerOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center"
              >
                <HiOutlineX size={16} />
              </button>
            </div>

            {/* Current Summary */}
            <div className="p-3.5 bg-neutral-50 rounded-2xl border border-tertiary/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-neutral-400 block font-bold uppercase tracking-wider text-[10px]">
                  Net Current Balance
                </span>
                <span className={`text-lg font-serif font-black ${isNegative ? "text-rose-700" : "text-primary"}`}>
                  {wallet.balance.toLocaleString("fr-DZ")} DZD
                </span>
              </div>
              <div className="text-end">
                <span className="text-neutral-400 block font-bold uppercase tracking-wider text-[10px]">
                  Take Rate
                </span>
                <span className="font-bold text-primary font-mono">{currentRate}%</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              {[
                { id: "all", label: "All Activity" },
                { id: "recharge", label: "Deposits (+)" },
                { id: "commission_deduction", label: "Commissions (-)" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLedgerFilter(tab.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                    ledgerFilter === tab.id
                      ? "bg-primary text-white"
                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="border border-tertiary/70 rounded-2xl overflow-hidden max-h-72 overflow-y-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Activity</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tertiary/40">
                  {wallet.transactions
                    .filter((tx) => (ledgerFilter === "all" ? true : tx.type === ledgerFilter))
                    .map((tx) => {
                      const isCredit = tx.amount > 0;
                      return (
                        <tr key={tx.id} className="hover:bg-neutral-50/50">
                          <td className="py-2.5 px-3 text-neutral-500 font-mono whitespace-nowrap">
                            {new Date(tx.timestamp).toLocaleDateString("fr-DZ")}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {tx.type === "recharge" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                <HiOutlineArrowUp size={12} /> Deposit
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                                <HiOutlineArrowDown size={12} /> Commission
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                            <span className={isCredit ? "text-emerald-700" : "text-rose-700"}>
                              {isCredit ? "+" : ""}{tx.amount.toLocaleString("fr-DZ")} DZD
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-neutral-600">
                            <div>{tx.note || "—"}</div>
                            {tx.relatedBookingId && (
                              <span className="text-[10px] text-neutral-400 font-mono">
                                Booking: {tx.relatedBookingId}
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
                onClick={() => setIsLedgerOpen(false)}
                className="px-5 py-2 bg-neutral-100 hover:bg-neutral-200 text-primary font-bold rounded-xl text-xs transition"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
