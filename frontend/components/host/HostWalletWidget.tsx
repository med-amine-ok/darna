"use client";

import React, { useState, useEffect, useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Wallet } from "@/types";
import { getMyWalletAction } from "@/app/actions/wallet";
import Dialog from "@/components/ui/Dialog";
import { formatDzd } from "@/lib/currency";
import { formatDate, formatNumber } from "@/lib/i18n/date-locale";
import {
  BrandAlertCircleIcon,
  BrandReceiptIcon,
  BrandCloseIcon,
  BrandChevronUpIcon,
  BrandChevronDownIcon,
  WalletWarningIcon,
  WalletSolventIcon,
} from "@/components/icons";

interface HostWalletWidgetProps {
  className?: string;
}

type LedgerFilter = "all" | "recharge" | "commission_deduction";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

/**
 * Shows the current host's prepaid wallet. The wallet owner (user or org) is
 * resolved on the server from the session — the browser never chooses it.
 */
export default function HostWalletWidget({ className = "" }: HostWalletWidgetProps) {
  const t = useTranslations("hostWallet");
  const locale = useLocale();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [currentRate, setCurrentRate] = useState<number>(0);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("all");
  const titleId = useId();

  useEffect(() => {
    let isMounted = true;
    getMyWalletAction()
      .then((result) => {
        if (!isMounted || !result.ok) return;
        setWallet(result.data.wallet);
        setCurrentRate(result.data.commissionRate);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  if (!wallet) {
    return null;
  }

  const isNegative = wallet.balance < 0;
  const rate = formatNumber(currentRate / 100, locale, { style: "percent", maximumFractionDigits: 2 });
  const filters: { id: LedgerFilter; label: string }[] = [
    { id: "all", label: t("filters.all") },
    { id: "recharge", label: t("filters.recharge") },
    { id: "commission_deduction", label: t("filters.commission") },
  ];
  const visibleTransactions = wallet.transactions.filter((tx) =>
    ledgerFilter === "all" ? true : tx.type === ledgerFilter
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* High-visibility negative balance alert */}
      {isNegative && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border-2 border-rose-300 rounded-3xl flex flex-col sm:flex-row items-start gap-4 text-rose-950 shadow-sm animate-in fade-in"
        >
          <div className="p-2 rounded-2xl bg-rose-100 text-rose-700 shrink-0">
            <BrandAlertCircleIcon size={26} aria-hidden="true" />
          </div>
          <div className="text-xs space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-rose-900">
                {t("negativeNoticeAmount", { amount: formatDzd(wallet.balance, locale) })}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-900">
                {t("overdue")}
              </span>
            </div>
            <p className="text-rose-800 leading-relaxed">{t("negativeBody")}</p>
            <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] font-mono text-rose-900">
              <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-rose-200">
                {t("ccpAccount")} <strong dir="ltr">0021445982 Clé 41</strong>
              </span>
              <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-rose-200">
                {t("baridiMobRip")} <strong dir="ltr">00799999002144598241</strong>
              </span>
              <span className="text-rose-800 font-sans">
                {t("adminSupport")} <strong dir="ltr">+213 21 74 12 00</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main balance card */}
      <section
        aria-labelledby={titleId}
        className="bg-white rounded-3xl border border-tertiary/70 p-5 sm:p-6 shadow-2xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-tertiary/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                isNegative ? "bg-rose-100 text-rose-700" : "bg-primary text-white"
              }`}
            >
              <BrandReceiptIcon size={20} aria-hidden="true" />
            </div>
            <div>
              <h3 id={titleId} className="font-serif text-lg font-bold text-primary">
                {t("title")}
              </h3>
              <p className="text-xs text-neutral-600">
                {t("ledgerSubtitle", { rate })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLedgerOpen(true)}
              aria-haspopup="dialog"
              className={`px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-primary rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${focusRing}`}
            >
              <BrandReceiptIcon size={15} aria-hidden="true" />
              <span>{t("statementHistory")}</span>
            </button>
          </div>
        </div>

        {/* Balance metrics */}
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-neutral-50/80 p-4 rounded-2xl border border-tertiary/60 space-y-1">
            <dt className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block">
              {t("currentBalance")}
            </dt>
            <dd className={`text-2xl font-serif font-black ${isNegative ? "text-rose-700" : "text-primary"}`}>
              {formatDzd(wallet.balance, locale)}
            </dd>
            <dd
              className={`text-[11px] font-semibold flex items-center gap-1 mt-0.5 ${
                isNegative ? "text-rose-700 font-bold" : "text-emerald-700"
              }`}
            >
              {isNegative ? (
                <>
                  <WalletWarningIcon size={13} className="text-rose-700 shrink-0" aria-hidden="true" />
                  <span>{t("deficit")}</span>
                </>
              ) : (
                <>
                  <WalletSolventIcon size={13} className="text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>{t("solvent")}</span>
                </>
              )}
            </dd>
          </div>

          <div className="bg-neutral-50/80 p-4 rounded-2xl border border-tertiary/60 space-y-1">
            <dt className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block">
              {t("applicableCommission")}
            </dt>
            <dd className="text-2xl font-serif font-black text-primary">{rate}</dd>
            <dd className="text-[11px] text-neutral-600 block">{t(`deductedPer.${wallet.hostType}`)}</dd>
          </div>

          <div className="bg-neutral-50/80 p-4 rounded-2xl border border-tertiary/60 space-y-1">
            <dt className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block">
              {t("rechargeProcess")}
            </dt>
            <dd className="text-xs font-bold text-primary block">{t("offlineTransfer")}</dd>
            <dd className="text-[11px] text-neutral-600 block leading-tight">{t("creditedManually")}</dd>
          </div>
        </dl>

        {/* Note banner */}
        <div className="p-3 bg-neutral-50/60 rounded-xl border border-tertiary/40 flex items-start gap-2.5 text-xs text-neutral-600">
          <BrandAlertCircleIcon size={16} className="text-secondary shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed">
            <strong>{t("howItWorksTitle")}</strong> {t("howItWorksBody")}
          </p>
        </div>
      </section>

      {/* Read-only transaction ledger */}
      <Dialog
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        ariaLabel={t("statementTitle")}
        className="relative bg-white rounded-3xl max-w-2xl w-full border border-tertiary shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 my-8 space-y-5 max-h-[92dvh] overflow-y-auto"
        backdropClassName="fixed inset-0 z-[90] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-tertiary/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-bold">
              <BrandReceiptIcon size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-black text-primary">{t("statementTitle")}</h2>
              <p className="text-xs text-neutral-600">{t("statementSubtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsLedgerOpen(false)}
            aria-label={t("closeStatement")}
            className={`w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center ${focusRing}`}
          >
            <BrandCloseIcon size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Current summary */}
        <div className="p-3.5 bg-neutral-50 rounded-2xl border border-tertiary/60 flex items-center justify-between text-xs">
          <div>
            <span className="text-neutral-600 block font-bold uppercase tracking-wider text-[10px]">
              {t("netBalance")}
            </span>
            <span className={`text-lg font-serif font-black ${isNegative ? "text-rose-700" : "text-primary"}`}>
              {formatDzd(wallet.balance, locale)}
            </span>
          </div>
          <div className="text-end">
            <span className="text-neutral-600 block font-bold uppercase tracking-wider text-[10px]">
              {t("takeRate")}
            </span>
            <span className="font-bold text-primary font-mono">{rate}</span>
          </div>
        </div>

        {/* Filter buttons */}
        <div role="group" aria-label={t("filterLabel")} className="flex items-center gap-2">
          {filters.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLedgerFilter(tab.id)}
              aria-pressed={ledgerFilter === tab.id}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${focusRing} ${
                ledgerFilter === tab.id
                  ? "bg-primary text-white"
                  : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="border border-tertiary/70 rounded-2xl overflow-hidden max-h-72 overflow-y-auto text-xs">
          <table className="w-full text-start border-collapse">
            <caption className="sr-only">{t("table.caption")}</caption>
            <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-600 font-bold sticky top-0">
              <tr>
                <th scope="col" className="py-2.5 px-3 text-start">{t("table.date")}</th>
                <th scope="col" className="py-2.5 px-3 text-start">{t("table.activity")}</th>
                <th scope="col" className="py-2.5 px-3 text-start">{t("table.amount")}</th>
                <th scope="col" className="py-2.5 px-3 text-start">{t("table.reference")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/40">
              {visibleTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 px-3 text-center text-neutral-600">
                    {t("noTransactions")}
                  </td>
                </tr>
              )}
              {visibleTransactions.map((tx) => {
                const isCredit = tx.amount > 0;
                return (
                  <tr key={tx.id} className="hover:bg-neutral-50/50">
                    <td className="py-2.5 px-3 text-neutral-600 font-mono whitespace-nowrap">
                      <time dateTime={tx.timestamp}>{formatDate(tx.timestamp, locale)}</time>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {tx.type === "recharge" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <BrandChevronUpIcon size={12} aria-hidden="true" /> {t("deposit")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                          <BrandChevronDownIcon size={12} aria-hidden="true" /> {t("commission")}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                      <span className={isCredit ? "text-emerald-700" : "text-rose-700"} dir="ltr">
                        {isCredit ? "+" : ""}
                        {formatDzd(tx.amount, locale)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600">
                      <div>{tx.note || "—"}</div>
                      {tx.relatedBookingId && (
                        <span className="text-[10px] text-neutral-600 font-mono">
                          {t("bookingRef", { id: tx.relatedBookingId })}
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
            className={`px-5 py-2 bg-neutral-100 hover:bg-neutral-200 text-primary font-bold rounded-xl text-xs transition ${focusRing}`}
          >
            {t("closeStatement")}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
