"use client";

import React, { useState, useEffect, useMemo, useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Wallet } from "@/types";
import { getMyMoneyOverviewAction, getMyWalletAction } from "@/app/actions/wallet";
import { formatAmountNumber, formatDzd } from "@/lib/currency";
import { formatDate, formatNumber } from "@/lib/i18n/date-locale";
import {
  Accordion,
  Badge,
  Banner,
  Button,
  Card,
  Dialog,
  DialogFooter,
  KitEmptyState,
  Popover,
  SegmentedControl,
  Skeleton,
  StatCard,
  cn,
  focusRing,
} from "@/components/ui";
import {
  BrandAlertCircleIcon,
  BrandReceiptIcon,
  BrandArrowUpIcon,
  BrandArrowDownIcon,
  BrandCashIcon,
  WalletWarningIcon,
  WalletSolventIcon,
} from "@/components/icons";

interface HostWalletWidgetProps {
  className?: string;
  /**
   * "full": balance StatCard with a running-balance sparkline (Today dashboard side column).
   * "compact": one slim row so listings stay first on /host/listings.
   */
  variant?: "full" | "compact";
}

type LedgerFilter = "all" | "recharge" | "commission_deduction" | "adjustment";

interface WalletStatusView {
  creditLimit: number;
  canAcceptBookings: boolean;
}

interface MoneyOverview {
  invoices: { id: string; number: string; periodStart: string; periodEnd: string; amountTtc: number; status: string; pdfUrl: string | null }[];
  earnings: { upcoming: number; completed: number; commissionPaid: number; refundsOwed: number } | null;
  payoutsEnabled: boolean;
}

/**
 * Shows the current host's prepaid wallet. The wallet owner (user or org) is
 * resolved on the server from the session, the browser never chooses it.
 */
export default function HostWalletWidget({ className = "", variant = "full" }: HostWalletWidgetProps) {
  const t = useTranslations("hostWallet");
  const locale = useLocale();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRate, setCurrentRate] = useState<number>(0);
  const [status, setStatus] = useState<WalletStatusView | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [overview, setOverview] = useState<MoneyOverview | null>(null);
  const [overviewState, setOverviewState] = useState<"idle" | "loading" | "failed">("idle");
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("all");
  const titleId = useId();

  useEffect(() => {
    let isMounted = true;
    getMyWalletAction()
      .then((result) => {
        if (!isMounted) return;
        if (!result.ok) {
          setLoadFailed(result.code !== "FORBIDDEN" && result.code !== "UNAUTHENTICATED");
          return;
        }
        setWallet(result.data.wallet);
        setCurrentRate(result.data.commissionRate);
        setStatus(result.data.status);
      })
      .catch(() => {
        if (isMounted) setLoadFailed(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Running balance after each movement, oldest first, walked back from the current balance
  // (the statement holds the newest lines only, so it cannot start from zero).
  const balanceTrail = useMemo(() => {
    if (!wallet) return [];
    const newestFirst = [...wallet.transactions].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    let running = wallet.balance;
    const trail: number[] = [];
    for (const tx of newestFirst) {
      trail.push(running);
      running -= tx.amount;
    }
    return trail.reverse();
  }, [wallet]);

  // Invoices, earnings and payouts load with the statement.
  useEffect(() => {
    if (!isLedgerOpen || overviewState !== "idle") return;
    setOverviewState("loading");
    getMyMoneyOverviewAction()
      .then((result) => {
        if (result.ok) {
          setOverview(result.data);
          setOverviewState("idle");
        } else setOverviewState("failed");
      })
      .catch(() => setOverviewState("failed"));
  }, [isLedgerOpen, overviewState]);

  if (!wallet) {
    if (!loading) {
      return loadFailed ? (
        <Banner tone="danger" title={t("loadFailedTitle")} className={className}>
          {t("loadFailedBody")}
        </Banner>
      ) : null;
    }
    return variant === "compact" ? (
      <Skeleton className={cn("h-[4.5rem] w-full rounded-2xl", className)} />
    ) : (
      <Skeleton className={cn("h-56 w-full rounded-2xl", className)} />
    );
  }

  const isNegative = wallet.balance < 0;
  const rate = formatNumber(currentRate / 100, locale, { style: "percent", maximumFractionDigits: 2 });
  const dzdUnit = locale === "ar" ? "د.ج" : "DZD";
  const filters: { value: LedgerFilter; label: string }[] = [
    { value: "all", label: t("filters.all") },
    { value: "recharge", label: t("filters.recharge") },
    { value: "commission_deduction", label: t("filters.commission") },
    { value: "adjustment", label: t("filters.adjustment") },
  ];
  const visibleTransactions = wallet.transactions.filter((tx) =>
    ledgerFilter === "all" ? true : tx.type === ledgerFilter
  );

  const statusBadge = isNegative ? (
    <Badge tone="danger" icon={<WalletWarningIcon size={12} aria-hidden="true" />}>
      {t("deficit")}
    </Badge>
  ) : (
    <Badge tone="success" icon={<WalletSolventIcon size={12} aria-hidden="true" />}>
      {t("solvent")}
    </Badge>
  );

  const explainer = (
    <div className="space-y-3 text-meta text-primary-700">
      <p className="text-pretty">{t("howItWorksBody")}</p>
      <dl className="space-y-1 rounded-xl bg-darnaBg p-3">
        <dt className="font-semibold text-primary-900">{t("rechargeProcess")}</dt>
        <dd>{t("offlineTransfer")}</dd>
        <dd className="text-primary-600">{t("creditedManually")}</dd>
      </dl>
      {status && status.creditLimit > 0 && (
        <p className="text-primary-600">{t("creditLimitLine", { amount: formatDzd(status.creditLimit, locale) })}</p>
      )}
    </div>
  );

  const negativeAlert = isNegative && (
    <Banner tone="danger" title={t("negativeNoticeAmount", { amount: formatDzd(wallet.balance, locale) })}>
      <p className="text-pretty">{t("negativeBody")}</p>
      <p className="mt-2 text-pretty">{t("contactSupportToTopUp")}</p>
    </Banner>
  );
  const blockedAlert = status && !status.canAcceptBookings && (
    <Banner tone="warning" title={t("bookingsPausedTitle")}>
      {t("bookingsPausedBody")}
    </Banner>
  );

  const statementButton = (
    <Button
      variant="tertiary"
      size="sm"
      onClick={() => setIsLedgerOpen(true)}
      aria-haspopup="dialog"
      leadingIcon={<BrandReceiptIcon size={16} aria-hidden="true" />}
    >
      {t("statementHistory")}
    </Button>
  );

  return (
    <div className={cn("space-y-3", className)}>
      {negativeAlert}
      {blockedAlert}

      {variant === "compact" ? (
        <Card
          as="section"
          padding="sm"
          aria-labelledby={titleId}
          className="flex flex-wrap items-center gap-x-5 gap-y-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                isNegative ? "bg-accent-100 text-accent-700" : "bg-secondary-100 text-secondary-800"
              )}
            >
              <BrandCashIcon size={20} />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="text-meta font-medium text-primary-600">
                {t("currentBalance")}
              </h2>
              <p
                className={cn(
                  "font-serif text-heading leading-tight tabular-nums",
                  isNegative ? "text-accent-700" : "text-primary-900"
                )}
              >
                {formatDzd(wallet.balance, locale)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge}
            <Badge tone="sand">
              {t("applicableCommission")} · <bdi className="tabular-nums">{rate}</bdi>
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
            <Popover
              ariaLabel={t("howItWorksShort")}
              align="end"
              className="w-80 max-w-[calc(100vw-2rem)]"
              trigger={
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-meta font-semibold text-primary-700 hover:bg-primary/[0.05]",
                    "transition-colors duration-fast ease-standard",
                    focusRing
                  )}
                >
                  <BrandAlertCircleIcon size={16} aria-hidden="true" className="text-secondary-700" />
                  {t("howItWorksShort")}
                </button>
              }
            >
              {explainer}
            </Popover>
            {statementButton}
          </div>
        </Card>
      ) : (
        <Card as="section" padding="none" aria-labelledby={titleId} className="overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <div className="min-w-0">
              <h2 id={titleId} className="font-serif text-heading text-primary-900">
                {t("title")}
              </h2>
              <p className="mt-0.5 text-meta text-primary-600">{t("ledgerSubtitle", { rate })}</p>
            </div>
            {statusBadge}
          </div>
          <StatCard
            label={t("currentBalance")}
            value={wallet.balance}
            unit={dzdUnit}
            format={(n) => formatAmountNumber(n, locale)}
            sparkline={balanceTrail.length > 1 ? balanceTrail : undefined}
            hint={t(`deductedPer.${wallet.hostType}`)}
            icon={<BrandCashIcon size={18} />}
            className="shadow-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/[0.06] px-5 py-3">
            <p className="text-meta text-primary-600">
              {t("applicableCommission")}{" "}
              <strong className="font-semibold text-primary-900 tabular-nums">{rate}</strong>
            </p>
            {statementButton}
          </div>
          <div className="border-t border-primary/[0.06] px-2 pb-1">
            <Accordion
              appearance="plain"
              headingLevel={3}
              items={[{ id: "how", title: t("howItWorksShort"), content: explainer }]}
            />
          </div>
        </Card>
      )}

      {/* Read-only transaction ledger */}
      <Dialog
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        title={t("statementTitle")}
        description={t("statementSubtitle")}
        size="lg"
        showClose
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-darnaBg p-4">
            <div>
              <p className="text-meta text-primary-600">{t("netBalance")}</p>
              <p
                className={cn(
                  "font-serif text-heading tabular-nums",
                  isNegative ? "text-accent-700" : "text-primary-900"
                )}
              >
                {formatDzd(wallet.balance, locale)}
              </p>
            </div>
            <div className="text-end">
              <p className="text-meta text-primary-600">{t("takeRate")}</p>
              <p className="text-title text-primary-900 tabular-nums">{rate}</p>
            </div>
          </div>

          <SegmentedControl
            options={filters}
            value={ledgerFilter}
            onChange={setLedgerFilter}
            ariaLabel={t("filterLabel")}
            size="sm"
            className="max-w-full overflow-x-auto scrollbar-none"
          />

          {visibleTransactions.length === 0 ? (
            <KitEmptyState compact variant="generic" title={t("noTransactions")} />
          ) : (
            <div className="max-h-80 overflow-auto rounded-2xl ring-1 ring-primary/[0.08]">
              <table className="w-full border-collapse text-meta">
                <caption className="sr-only">{t("table.caption")}</caption>
                <thead className="sticky top-0 bg-white text-primary-600 shadow-[0_1px_0_rgba(30,38,31,0.08)]">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 text-start font-semibold">
                      {t("table.date")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-semibold">
                      {t("table.activity")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-semibold">
                      {t("table.amount")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-semibold">
                      {t("table.reference")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/[0.06]">
                  {visibleTransactions.map((tx) => {
                    const isCredit = tx.amount > 0;
                    return (
                      <tr key={tx.id} className="transition-colors duration-fast hover:bg-darnaBg/60">
                        <td className="whitespace-nowrap px-3 py-2.5 text-primary-600 tabular-nums">
                          <time dateTime={tx.timestamp}>{formatDate(tx.timestamp, locale)}</time>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          {tx.type === "recharge" ? (
                            <Badge tone="success" icon={<BrandArrowUpIcon size={12} aria-hidden="true" />}>
                              {t("deposit")}
                            </Badge>
                          ) : tx.type === "adjustment" ? (
                            <Badge tone="sand">{t("adjustment")}</Badge>
                          ) : (
                            <Badge tone="terracotta" icon={<BrandArrowDownIcon size={12} aria-hidden="true" />}>
                              {t("commission")}
                            </Badge>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-end font-semibold tabular-nums">
                          <bdi dir="ltr" className={isCredit ? "text-secondary-800" : "text-accent-700"}>
                            {isCredit ? "+" : ""}
                            {formatDzd(tx.amount, locale)}
                          </bdi>
                        </td>
                        <td className="px-3 py-2.5 text-primary-700">
                          {tx.note && <div>{tx.note}</div>}
                          {tx.relatedBookingId && !tx.note && (
                            <span className="text-[0.6875rem] text-primary-500 tabular-nums" dir="ltr">
                              {t("bookingRef", { id: tx.relatedBookingId.slice(0, 8).toUpperCase() })}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <section className="mt-6 space-y-3" aria-labelledby={`${titleId}-money`}>
          <h3 id={`${titleId}-money`} className="text-title text-primary-900">
            {t("overviewTitle")}
          </h3>
          {overviewState === "loading" && <Skeleton className="h-24 w-full rounded-2xl" />}
          {overviewState === "failed" && (
            <Banner tone="danger" title={t("loadFailedTitle")}>
              {t("loadFailedBody")}
            </Banner>
          )}
          {overview && (
            <>
              {overview.earnings && (
                <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-darnaBg p-4 text-meta sm:grid-cols-4">
                  {(
                    [
                      ["earningsCompleted", overview.earnings.completed],
                      ["earningsUpcoming", overview.earnings.upcoming],
                      ["earningsCommission", overview.earnings.commissionPaid],
                      ["earningsRefundsOwed", overview.earnings.refundsOwed],
                    ] as const
                  ).map(([key, amount]) => (
                    <div key={key}>
                      <dt className="text-primary-600">{t(key)}</dt>
                      <dd className="font-semibold tabular-nums text-primary-900">{formatDzd(amount, locale)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <div>
                <p className="mb-2 text-meta font-semibold text-primary-700">{t("invoicesTitle")}</p>
                {overview.invoices.length === 0 ? (
                  <p className="text-meta text-primary-600">{t("noInvoices")}</p>
                ) : (
                  <ul className="divide-y divide-primary/[0.06] rounded-2xl ring-1 ring-primary/[0.08]">
                    {overview.invoices.map((inv) => (
                      <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-meta">
                        <span className="font-semibold text-primary-900" dir="ltr">
                          {inv.number}
                        </span>
                        <span className="text-primary-600">
                          {formatDate(inv.periodStart, locale)} - {formatDate(inv.periodEnd, locale)}
                        </span>
                        <span className="font-semibold tabular-nums text-primary-900">{formatDzd(inv.amountTtc, locale)}</span>
                        {inv.pdfUrl && (
                          <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-700 underline">
                            {t("invoicePdf")}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {!overview.payoutsEnabled && (
                <Banner tone="info" title={t("payoutsOffTitle")}>
                  {t("payoutsOffBody")}
                </Banner>
              )}
            </>
          )}
        </section>
        <DialogFooter>
          <Button variant="tertiary" onClick={() => setIsLedgerOpen(false)}>
            {t("closeStatement")}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
