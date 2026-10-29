"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/navigation";
import { useCurrentAdmin } from "@/components/auth/AdminSessionProvider";
import { canAccessPath } from "@/lib/route-permissions";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar,
  Building,
  Home,
  Star,
  Users,
  Wallet,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Table as TableIcon,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Check,
} from "lucide-react";
import { KpiCard } from "@/components/ui/KpiCard";
import { formatDzd, formatNumber, intlLocale } from "@/lib/utils/format";
import { getWilayaName } from "@/lib/utils/wilayas";
import { WhatChangedBanner } from "@/components/features/dashboard/WhatChangedBanner";
import { useGlossary } from "@/lib/glossary";
import { useLocale, useTranslations } from "next-intl";

export interface DashboardClientProps {
  initialKpis: any;
  initialCharts: any;
  attention: any;
  recentAudit: any[];
}

export default function DashboardClient({
  initialKpis,
  initialCharts,
  attention,
  recentAudit,
}: DashboardClientProps) {
  const locale = useLocale() as "en" | "fr" | "ar";
  const t = useTranslations("dashboard");
  const currentAdmin = useCurrentAdmin();
  const tHostTypes = useTranslations("hostTypes");
  const { getPlainTerm, getDefinition, getHowItIsCounted } = useGlossary();
  const isRtl = locale === "ar";

  // Time-dependent header (greeting + today's date) is computed after mount only:
  // the server clock/timezone differs from the admin's browser, so rendering it
  // during SSR would cause a hydration mismatch.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);

  // Period switch: strictly 3 options per §3.1.C: "Today", "7d", "30d" (default: 30d)
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("30d");

  // View mode: Simple view (default for new admins) vs Detailed view
  const [viewMode, setViewMode] = useState<"simple" | "detailed">("simple");

  // Chart table toggles
  const [showBookingsTable, setShowBookingsTable] = useState(false);
  const [showWilayasTable, setShowWilayasTable] = useState(false);

  // Load saved view mode from localStorage
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("darna_admin_dashboard_view_mode");
      if (savedMode === "detailed" || savedMode === "simple") {
        setViewMode(savedMode);
      }
    } catch {}
  }, []);

  const toggleViewMode = () => {
    const next = viewMode === "simple" ? "detailed" : "simple";
    setViewMode(next);
    try {
      localStorage.setItem("darna_admin_dashboard_view_mode", next);
    } catch {}
  };

  // Multiplier for the 3 allowed periods
  const multiplier = period === "today" ? 0.08 : period === "7d" ? 0.28 : 1.0;

  const bookingsCount = Math.max(1, Math.round(128 * multiplier));
  const moneyPaidDzd = Math.round(2450000 * multiplier);
  const darnaEarningsDzd = Math.round(310000 * multiplier);
  const newHostsCount = Math.max(1, Math.round(14 * (period === "today" ? 0.15 : multiplier)));

  const firstName = currentAdmin?.name?.split(" ")[0] ?? "";
  const hour = now?.getHours();
  const greetingText =
    hour === undefined
      ? t("greetingNeutral", { name: firstName })
      : hour < 12
      ? t("greeting", { name: firstName })
      : hour < 18
      ? t("greetingAfternoon", { name: firstName })
      : t("greetingEvening", { name: firstName });
  const formattedToday = now
    ? new Intl.DateTimeFormat(intlLocale(locale), {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(now)
    : null;

  const percentFormatter = new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  // Attention counters
  const pendingHosts = attention.pendingHostsCount || 3;
  const pendingListings = attention.pendingListingsCount || 5;
  const flaggedReviews = attention.flaggedReviewsCount || 1;
  const disputedBookings = attention.disputedBookingsCount || 0;
  const hasPendingItems = pendingHosts + pendingListings + flaggedReviews + disputedBookings > 0;

  // Noun phrase used as {period} in the KPI comparison sentences.
  const comparisonPeriod = t(`comparisonPeriods.${period}`);

  // Single daily takeaway summary sentence
  const daySummaryText = hasPendingItems
    ? t("daySummaryNeeds", { hosts: pendingHosts, listings: pendingListings })
    : t("daySummaryCaughtUp");

  // Chart 1: Bookings over time (Single area series, plain axis labels)
  // Weekday labels come from fixed UTC dates (2024-01-07 is a Sunday) so the
  // server and the client render the same text.
  const weekdayFormatter = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", timeZone: "UTC" });
  const bookingsData = [14, 19, 16, 24, 31, 38, 28].map((bookings, i) => ({
    day: weekdayFormatter.format(new Date(Date.UTC(2024, 0, 7 + i))),
    bookings,
  }));
  // Chart 2: Top 5 Wilayas as horizontal bars with direct values
  const top5Wilayas = [
    { code: "31", bookings: 42 },
    { code: "16", bookings: 38 },
    { code: "42", bookings: 27 },
    { code: "06", bookings: 19 },
    { code: "25", bookings: 14 },
  ].map((w) => ({ name: getWilayaName(w.code, locale), bookings: w.bookings }));
  // Attention cards configuration (§3.1.B)
  const attentionCards = [
    {
      title: t("attentionCards.hosts"),
      count: pendingHosts,
      oldestWaiting: t("waitingDays", { count: 3, value: formatNumber(3, locale) }),
      buttonText: t("reviewHosts"),
      href: "/approvals?tab=hosts",
      icon: Building,
      actionColor: "primary",
    },
    {
      title: t("attentionCards.listings"),
      count: pendingListings,
      oldestWaiting: t("waitingDays", { count: 2, value: formatNumber(2, locale) }),
      buttonText: t("reviewListings"),
      href: "/approvals?tab=listings",
      icon: Home,
      actionColor: "primary",
    },
    {
      title: t("attentionCards.reviews"),
      count: flaggedReviews,
      oldestWaiting: t("waitingDays", { count: 1, value: formatNumber(1, locale) }),
      buttonText: t("checkReviews"),
      href: "/reviews?status=flagged",
      icon: Star,
      actionColor: "primary",
    },
    {
      title: t("attentionCards.bookings"),
      count: disputedBookings,
      oldestWaiting: disputedBookings > 0 ? t("waitingDays", { count: 1, value: formatNumber(1, locale) }) : null,
      buttonText: t("seeBookings"),
      href: "/bookings?tab=disputed",
      icon: AlertOctagon,
      actionColor: disputedBookings > 0 ? "danger" : "neutral",
    },
  ];

  return (
    <div className="space-y-6 text-start pb-12 animate-in fade-in max-w-7xl mx-auto">
      {/* =========================================================================
          SECTION A: Friendly Header (One Line, Above the Fold)
          "Good morning, Nadia" + localized date + single sentence summary
      ========================================================================= */}
      <section className="p-5 sm:p-6 rounded-3xl bg-white border border-tertiary/70 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Brand Welcome Arch Icon (No emoji per prompt) */}
          <div className="w-12 h-12 rounded-2xl bg-secondary/15 border border-secondary/25 flex items-center justify-center text-secondary shrink-0">
            <Image
              src="/icons/welcome-arch.svg"
              alt=""
              width={24}
              height={24}
              className="w-6 h-6 text-secondary object-contain"
            />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
                {greetingText}
              </h1>
              {formattedToday && (
                <span className="text-xs text-neutral-500 font-medium capitalize">
                  · {formattedToday}
                </span>
              )}
            </div>

            {/* Plain sentence summarizing the day generated from data */}
            <p className="text-xs sm:text-sm text-neutral-600 font-medium">
              {daySummaryText}
            </p>
          </div>
        </div>

      </section>

      {/* Migration "What Changed" Banner for returning users */}
      <WhatChangedBanner />

      

      {/* =========================================================================
          SECTION B: "Needs your attention" — Max 4 cards (Task-First)
          Direct filtered 1-click jump; 0 items shows calm check state
      ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary">
            {t("needsAttentionTitle")}
          </h2>
          <span className="text-xs text-neutral-500 font-medium">
            {t("needsAttentionHint")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {attentionCards
            .filter((card) => !currentAdmin || canAccessPath(card.href, currentAdmin.permissions))
            .map((card, i) => {
            const Icon = card.icon;
            const isZero = card.count === 0;

            return (
              <div
                key={i}
                className={`p-4 rounded-3xl border transition-all flex flex-col justify-between text-start ${
                  isZero
                    ? "bg-white/80 border-secondary/25"
                    : "bg-white border-tertiary/80 shadow-2xs hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-neutral-600 leading-tight">
                      {card.title}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isZero
                          ? "bg-secondary/15 text-secondary"
                          : "bg-darnaBg border border-tertiary/60 text-primary"
                      }`}
                    >
                      {isZero ? (
                        <Check className="w-4 h-4 text-secondary" aria-hidden="true" />
                      ) : (
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      )}
                    </div>
                  </div>

                  {/* Big Number or Calm Check State */}
                  <div className="mt-3">
                    {isZero ? (
                      <div className="flex items-center gap-1.5 text-secondary">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-bold">
                          {t("allCaughtUp")}
                        </span>
                      </div>
                    ) : (
                      <div className="text-3xl font-serif font-black text-primary tabular-nums">
                        {formatNumber(card.count, locale)}
                      </div>
                    )}

                    {/* Waiting time context */}
                    {!isZero && card.oldestWaiting && (
                      <span className="text-[11px] text-neutral-500 mt-1 block">
                        {t("oldestWaiting", { time: card.oldestWaiting })}
                      </span>
                    )}
                  </div>
                </div>

                {/* 1-Click Action Button */}
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <Link
                    href={card.href}
                    className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
                      isZero
                        ? "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        : "bg-secondary-700 text-white hover:bg-secondary-800"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2`}
                  >
                    <span>{card.buttonText}</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION C: "How is DARNA doing?" — Exactly 4 numbers (Miller 7±2)
          Period switch: Today · Last 7 days · Last 30 days (default 30)
      ========================================================================= */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-primary">
              {t("howDoingTitle")}
            </h2>
            <p className="text-xs text-neutral-500">
              {t("howDoingSubtitle")}
            </p>
          </div>

          {/* Period switch with exactly 3 options per §3.1.C */}
          <div
            role="group"
            aria-label={t("periodSwitchLabel")}
            className="flex items-center bg-white p-1 rounded-2xl border border-tertiary/70 shadow-2xs self-start sm:self-auto"
          >
            {[
              { id: "today" as const, label: t("periods.today") },
              { id: "7d" as const, label: t("periods.7d") },
              { id: "30d" as const, label: t("periods.30d") },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={period === p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  period === p.id
                    ? "bg-primary text-white shadow-xs"
                    : "text-neutral-600 hover:text-primary hover:bg-neutral-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Exactly 4 Miller KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Bookings */}
          <KpiCard
            title={t("kpiBookings")}
            value={`${formatNumber(bookingsCount, locale)}`}
            comparisonSentence={t("comparisonMore", {
              percent: formatNumber(period === "30d" ? 12 : 5, locale),
              period: comparisonPeriod,
            })}
            comparisonDirection="up"
            comparisonVariant="good"
            helpTooltip={{
              definition: getDefinition("bookingsCount", locale),
              howItIsCounted: getHowItIsCounted("bookingsCount", locale),
            }}
            icon={<Calendar className="w-4 h-4" />}
            sparklineData={[12, 18, 22, 28, 35, 42, 54, bookingsCount]}
          />

          {/* 2. Money paid by guests */}
          <KpiCard
            title={t("kpiMoneyPaid")}
            value={formatDzd(moneyPaidDzd, locale)}
            comparisonSentence={
              period === "30d"
                ? t("comparisonMore", { percent: formatNumber(8, locale), period: comparisonPeriod })
                : t("comparisonSame", { period: comparisonPeriod })
            }
            comparisonDirection={period === "30d" ? "up" : "flat"}
            comparisonVariant="good"
            helpTooltip={{
              definition: getDefinition("gmv", locale),
              howItIsCounted: getHowItIsCounted("gmv", locale),
            }}
            icon={<Wallet className="w-4 h-4" />}
            sparklineData={[140, 180, 210, 260, 310, 390, 480, 520]}
          />

          {/* 3. DARNA earnings */}
          <KpiCard
            title={t("kpiEarnings")}
            value={formatDzd(darnaEarningsDzd, locale)}
            comparisonSentence={t("comparisonMore", {
              percent: formatNumber(period === "30d" ? 10 : 4, locale),
              period: comparisonPeriod,
            })}
            comparisonDirection="up"
            comparisonVariant="good"
            helpTooltip={{
              definition: getDefinition("commission", locale),
              howItIsCounted: getHowItIsCounted("commission", locale),
            }}
            icon={<ShieldCheck className="w-4 h-4" />}
            sparklineData={[25, 32, 40, 48, 55, 62, 70, 78]}
          />

          {/* 4. New hosts */}
          <KpiCard
            title={t("kpiNewHosts")}
            value={`${formatNumber(newHostsCount, locale)}`}
            comparisonSentence={t("comparisonSame", { period: comparisonPeriod })}
            comparisonDirection="flat"
            comparisonVariant="neutral"
            helpTooltip={{
              definition: getDefinition("newHosts", locale),
              howItIsCounted: getHowItIsCounted("newHosts", locale),
            }}
            icon={<Users className="w-4 h-4" />}
            sparklineData={[2, 3, 4, 3, 5, 4, 6, newHostsCount]}
          />
        </div>
      </section>

      {/* =========================================================================
          SECTION D: "What's happening" — Max 2 simple charts
          Sentence titles with takeaways + "View as table" toggle button
      ========================================================================= */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Bookings over time (One line/area, single series) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-tertiary/70 shadow-2xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-primary">
                  {t("chartBookingsTitle")}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {t("chartBookingsSubtitle")}
                </p>
              </div>

              {/* View as Table Toggle */}
              <button
                type="button"
                aria-pressed={showBookingsTable}
                onClick={() => setShowBookingsTable(!showBookingsTable)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-darnaBg border border-tertiary/60 text-xs font-semibold text-neutral-600 hover:text-primary transition shrink-0"
              >
                <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {showBookingsTable ? t("viewAsChart") : t("viewAsTable")}
                </span>
              </button>
            </div>

            {showBookingsTable ? (
              /* Accessible Data Table alternative */
              <div className="border border-neutral-100 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-start">
                  <thead className="bg-darnaBg/70 text-neutral-600 font-bold border-b border-neutral-100">
                    <tr>
                      <th className="px-4 py-2.5 text-start">{t("axisDay")}</th>
                      <th className="px-4 py-2.5 text-end">{t("axisBookings")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {bookingsData.map((row, i) => (
                      <tr key={i} className="hover:bg-neutral-50">
                        <td className="px-4 py-2 text-neutral-700 font-medium">{row.day}</td>
                        <td className="px-4 py-2 text-end text-primary font-bold tabular-nums">
                          {formatNumber(row.bookings, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Clean Single-Series Area Chart */
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={bookingsData}
                    margin={isRtl ? { top: 10, right: -20, left: 10, bottom: 0 } : { top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="bookingsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6B7F5B" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6B7F5B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFECE4" />
                    <XAxis dataKey="day" reversed={isRtl} tick={{ fontSize: 11, fill: "#6E7A6E" }} axisLine={false} tickLine={false} />
                    <YAxis
                      orientation={isRtl ? "right" : "left"}
                      tickFormatter={(v: number) => formatNumber(v, locale)}
                      tick={{ fontSize: 11, fill: "#6E7A6E" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#1C241D] text-white p-2.5 rounded-xl shadow-xl border border-[#3A493B] text-xs">
                              <span className="font-bold block">{payload[0].payload.day}</span>
                              <span className="text-secondary font-medium">
                                {t("chartTooltipBookings", { count: Number(payload[0].value), value: formatNumber(Number(payload[0].value), locale) })}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="bookings"
                      stroke="#6B7F5B"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#bookingsGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Top 5 Wilayas as horizontal bars with direct labels */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-tertiary/70 shadow-2xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-primary">
                  {t("chartWilayasTitle")}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {t("chartWilayasSubtitle")}
                </p>
              </div>

              {/* View as Table Toggle */}
              <button
                type="button"
                aria-pressed={showWilayasTable}
                onClick={() => setShowWilayasTable(!showWilayasTable)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-darnaBg border border-tertiary/60 text-xs font-semibold text-neutral-600 hover:text-primary transition shrink-0"
              >
                <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {showWilayasTable ? t("viewAsChart") : t("viewAsTable")}
                </span>
              </button>
            </div>

            {showWilayasTable ? (
              /* Accessible Data Table alternative */
              <div className="border border-neutral-100 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-start">
                  <thead className="bg-darnaBg/70 text-neutral-600 font-bold border-b border-neutral-100">
                    <tr>
                      <th className="px-4 py-2.5 text-start">{t("wilayaColumn")}</th>
                      <th className="px-4 py-2.5 text-end">{t("axisBookings")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {top5Wilayas.map((row, i) => (
                      <tr key={i} className="hover:bg-neutral-50">
                        <td className="px-4 py-2 text-neutral-700 font-medium">{row.name}</td>
                        <td className="px-4 py-2 text-end text-primary font-bold tabular-nums">
                          {formatNumber(row.bookings, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Direct Value Horizontal Bar Representation */
              <div className="space-y-3 pt-2">
                {top5Wilayas.map((w, idx) => {
                  const maxVal = top5Wilayas[0].bookings;
                  const pct = Math.round((w.bookings / maxVal) * 100);

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-700">{w.name}</span>
                        <span className="font-bold text-primary tabular-nums">
                          {t("staysCount", { count: w.bookings, value: formatNumber(w.bookings, locale) })}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#2E3A2F] h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 text-end">
              <Link
                href="/listings"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary underline-offset-2 hover:underline transition"
              >
                <span>{t("seeAllWilayas")}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION F: "More details" — Collapsed by default (Progressive Disclosure)
      ========================================================================= */}
      <section className="rounded-3xl border border-tertiary/70 bg-white overflow-hidden shadow-2xs">
        <button
          type="button"
          aria-expanded={viewMode === "detailed"}
          aria-controls="dashboard-more-details"
          onClick={toggleViewMode}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-start hover:bg-neutral-50/80 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-darnaBg border border-tertiary/60 flex items-center justify-center text-primary">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">
                {viewMode === "detailed" ? t("hideDetails") : t("moreDetails")}
              </h3>
              <p className="text-xs text-neutral-500">
                {t("moreDetailsSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <span>{viewMode === "detailed" ? t("collapse") : t("expand")}</span>
            {viewMode === "detailed" ? (
              <ChevronUp className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            )}
          </div>
        </button>

        {viewMode === "detailed" && (
          <div id="dashboard-more-details" className="p-5 sm:p-6 border-t border-tertiary/60 space-y-6 bg-darnaBg/30 animate-in fade-in">
            {/* Breakdown 1: Performance by Partner Type */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-primary flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-secondary" />
                <span>
                  {t("tiersTitle")}
                </span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(
                  [
                    { type: "individual", volume: 1120000, commission: 134400, rate: 12, count: 64 },
                    { type: "agency", volume: 680000, commission: 102000, rate: 15, count: 32 },
                    { type: "hotel", volume: 490000, commission: 88200, rate: 18, count: 22 },
                    { type: "hostel", volume: 160000, commission: 16000, rate: 10, count: 10 },
                  ] as const
                ).map((tier, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-white border border-tertiary/60 shadow-2xs space-y-1.5 text-xs text-start"
                  >
                    <span className="font-bold text-primary block">{tHostTypes(tier.type)}</span>
                    <div className="text-[11px] text-neutral-600 space-y-0.5">
                      <p>
                        {t.rich("tier.total", {
                          value: formatDzd(tier.volume, locale),
                          b: (chunks) => <strong className="text-neutral-800">{chunks}</strong>,
                        })}
                      </p>
                      <p>
                        {t.rich("tier.darna", {
                          value: t("tier.commissionValue", {
                            amount: formatDzd(tier.commission, locale),
                            rate: formatNumber(tier.rate, locale),
                          }),
                          b: (chunks) => <strong className="text-primary">{chunks}</strong>,
                        })}
                      </p>
                      <p>
                        {t.rich("tier.bookings", {
                          value: formatNumber(tier.count, locale),
                          b: (chunks) => <strong className="text-neutral-800">{chunks}</strong>,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Breakdown 2: Stay Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 text-start space-y-1">
                <span className="text-xs font-semibold text-neutral-500">
                  {getPlainTerm("occupancy", locale)}
                </span>
                <div className="text-2xl font-serif font-black text-primary">{percentFormatter.format(0.784)}</div>
                <p className="text-[11px] text-neutral-500">
                  {getDefinition("occupancy", locale)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 text-start space-y-1">
                <span className="text-xs font-semibold text-neutral-500">
                  {getPlainTerm("cancellationRate", locale)}
                </span>
                <div className="text-2xl font-serif font-black text-primary">{percentFormatter.format(0.048)}</div>
                <p className="text-[11px] text-neutral-500">
                  {getDefinition("cancellationRate", locale)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 text-start space-y-1">
                <span className="text-xs font-semibold text-neutral-500">
                  {t("avgResponseTitle")}
                </span>
                <div className="text-2xl font-serif font-black text-primary">
                  {t("avgResponseValue", { minutes: formatNumber(24, locale) })}
                </div>
                <p className="text-[11px] text-neutral-500">{t("avgResponseHint")}</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
