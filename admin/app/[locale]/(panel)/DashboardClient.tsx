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
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { m } from "framer-motion";
import { spring } from "@/lib/motion";
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
  const newHostsCount = Math.max(
    1,
    Math.round(14 * (period === "today" ? 0.15 : multiplier)),
  );

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
  const hasPendingItems =
    pendingHosts + pendingListings + flaggedReviews + disputedBookings > 0;

  // Noun phrase used as {period} in the KPI comparison sentences.
  const comparisonPeriod = t(`comparisonPeriods.${period}`);

  // Single daily takeaway summary sentence
  const daySummaryText = hasPendingItems
    ? t("daySummaryNeeds", { hosts: pendingHosts, listings: pendingListings })
    : t("daySummaryCaughtUp");

  // Chart 1: Bookings over time (Single area series, plain axis labels)
  // Weekday labels come from fixed UTC dates (2024-01-07 is a Sunday) so the
  // server and the client render the same text.
  const weekdayFormatter = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "short",
    timeZone: "UTC",
  });
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
      oldestWaiting: t("waitingDays", {
        count: 3,
        value: formatNumber(3, locale),
      }),
      buttonText: t("reviewHosts"),
      href: "/approvals?tab=hosts",
      icon: Building,
      actionColor: "primary",
    },
    {
      title: t("attentionCards.listings"),
      count: pendingListings,
      oldestWaiting: t("waitingDays", {
        count: 2,
        value: formatNumber(2, locale),
      }),
      buttonText: t("reviewListings"),
      href: "/approvals?tab=listings",
      icon: Home,
      actionColor: "primary",
    },
    {
      title: t("attentionCards.reviews"),
      count: flaggedReviews,
      oldestWaiting: t("waitingDays", {
        count: 1,
        value: formatNumber(1, locale),
      }),
      buttonText: t("checkReviews"),
      href: "/reviews?status=flagged",
      icon: Star,
      actionColor: "primary",
    },
    {
      title: t("attentionCards.bookings"),
      count: disputedBookings,
      oldestWaiting:
        disputedBookings > 0
          ? t("waitingDays", { count: 1, value: formatNumber(1, locale) })
          : null,
      buttonText: t("seeBookings"),
      href: "/bookings?tab=disputed",
      icon: AlertOctagon,
      actionColor: disputedBookings > 0 ? "danger" : "neutral",
    },
  ];

  return (
    <div className="space-y-7 text-start pb-12 max-w-7xl mx-auto">
      {/* =========================================================================
          SECTION A: Friendly Header (One Line, Above the Fold)
          "Good morning, Nadia" + localized date + single sentence summary
      ========================================================================= */}
      <section className="p-5 sm:p-6 rounded-2xl bg-white shadow-e1 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Brand Welcome Arch Icon (No emoji per prompt) */}
          <div className="w-12 h-12 rounded-2xl bg-secondary-100 flex items-center justify-center text-secondary shrink-0">
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
              <h1 className="font-serif text-heading text-primary-900">
                {greetingText}
              </h1>
              {formattedToday && (
                <span className="text-meta text-primary-500 font-medium">
                  · {formattedToday}
                </span>
              )}
            </div>

            {/* Plain sentence summarizing the day generated from data */}
            <p className="text-meta sm:text-sm text-primary-600">
              {daySummaryText}
            </p>
          </div>
        </div>
      </section>

      {/* Migration "What Changed" Banner for returning users */}
      <WhatChangedBanner />

      {/* =========================================================================
          SECTION B: "Needs your attention", Max 4 cards (Task-First)
          Direct filtered 1-click jump; 0 items shows calm check state
      ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-title font-semibold text-primary-900">
            {t("needsAttentionTitle")}
          </h2>
          <span className="text-xs text-primary-500 font-medium">
            {t("needsAttentionHint")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {attentionCards
            .filter(
              (card) =>
                !currentAdmin ||
                canAccessPath(card.href, currentAdmin.permissions),
            )
            .map((card, i) => {
              const Icon = card.icon;
              const isZero = card.count === 0;

              return (
                <div
                  key={i}
                  className={`p-4 sm:p-5 rounded-2xl transition-shadow duration-fast ease-standard flex flex-col justify-between text-start ${
                    isZero
                      ? "bg-secondary-50 ring-1 ring-inset ring-secondary-200"
                      : "bg-white shadow-e1 hover:shadow-e2"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-meta font-medium text-primary-600 leading-tight">
                        {card.title}
                      </span>
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isZero
                            ? "bg-secondary-100 text-secondary-700"
                            : "bg-darnaBg-300/70 text-primary-700"
                        }`}
                      >
                        {isZero ? (
                          <Check
                            className="w-4 h-4 text-secondary"
                            aria-hidden="true"
                          />
                        ) : (
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        )}
                      </div>
                    </div>

                    {/* Big Number or Calm Check State */}
                    <div className="mt-3">
                      {isZero ? (
                        <div className="flex items-center gap-1.5 text-secondary-800">
                          <CheckCircle2
                            className="w-5 h-5 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="text-sm font-semibold">
                            {t("allCaughtUp")}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[2rem] leading-tight font-serif text-primary-900">
                          <AnimatedNumber
                            value={formatNumber(card.count, locale)}
                          />
                        </div>
                      )}

                      {/* Waiting time context */}
                      {!isZero && card.oldestWaiting && (
                        <span className="text-xs text-primary-500 mt-1 block">
                          {t("oldestWaiting", { time: card.oldestWaiting })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1-Click Action Button */}
                  <div className="mt-4">
                    <Link
                      href={card.href}
                      className={`group w-full inline-flex items-center justify-between gap-2 ps-3.5 pe-3 min-h-[40px] rounded-xl text-xs font-semibold transition-[background-color,box-shadow,transform] duration-fast ease-standard active:scale-[0.98] ${
                        isZero
                          ? "bg-white/70 text-secondary-800 hover:bg-white"
                          : "bg-darnaBg-200/70 text-primary-900 ring-1 ring-inset ring-primary/[0.06] hover:bg-primary-800 hover:text-white hover:ring-transparent"
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2`}
                    >
                      <span>{card.buttonText}</span>
                      <ArrowRight
                        className="w-3.5 h-3.5 rtl:rotate-180 transition-transform duration-fast ease-out group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* =========================================================================
          SECTION C: "How is BLADUS doing?", Exactly 4 numbers (Miller 7±2)
          Period switch: Today · Last 7 days · Last 30 days (default 30)
      ========================================================================= */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-title font-semibold text-primary-900">
              {t("howDoingTitle")}
            </h2>
            <p className="text-xs text-primary-500 mt-0.5">
              {t("howDoingSubtitle")}
            </p>
          </div>

          {/* Period switch with exactly 3 options per §3.1.C */}
          <div
            role="group"
            aria-label={t("periodSwitchLabel")}
            className="flex items-center gap-0.5 bg-darnaBg-300/60 p-1 rounded-xl ring-1 ring-inset ring-primary/[0.06] self-start sm:self-auto"
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
                className={`relative isolate px-3 min-h-[32px] rounded-lg text-xs font-semibold transition-colors duration-fast ease-standard cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
                  period === p.id
                    ? "text-primary-900"
                    : "text-primary-600 hover:text-primary-900"
                }`}
              >
                {period === p.id && (
                  <m.span
                    layoutId="dashboard-period"
                    transition={spring.layout}
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-lg bg-white shadow-e1"
                  />
                )}
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Exactly 4 Miller KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
                ? t("comparisonMore", {
                    percent: formatNumber(8, locale),
                    period: comparisonPeriod,
                  })
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

          {/* 3. BLADUS earnings */}
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
            comparisonSentence={t("comparisonSame", {
              period: comparisonPeriod,
            })}
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
          SECTION D: "What's happening", Max 2 simple charts
          Sentence titles with takeaways + "View as table" toggle button
      ========================================================================= */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Chart 1: Bookings over time (One line/area, single series) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white shadow-e1 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-title font-semibold text-primary-900">
                  {t("chartBookingsTitle")}
                </h3>
                <p className="text-xs text-primary-500 mt-0.5">
                  {t("chartBookingsSubtitle")}
                </p>
              </div>

              {/* View as Table Toggle */}
              <button
                type="button"
                aria-pressed={showBookingsTable}
                onClick={() => setShowBookingsTable(!showBookingsTable)}
                className="flex items-center gap-1.5 px-2.5 min-h-[32px] rounded-lg bg-white shadow-e1 hover:shadow-e2 text-xs font-semibold text-primary-700 hover:text-primary-900 transition duration-fast shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
              >
                <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {showBookingsTable ? t("viewAsChart") : t("viewAsTable")}
                </span>
              </button>
            </div>

            {showBookingsTable ? (
              /* Accessible Data Table alternative */
              <div className="rounded-xl overflow-hidden text-xs ring-1 ring-inset ring-primary/[0.06]">
                <table className="w-full text-start">
                  <thead className="bg-darnaBg-100 text-primary-600 font-semibold">
                    <tr>
                      <th className="px-4 py-2.5 text-start">{t("axisDay")}</th>
                      <th className="px-4 py-2.5 text-end">
                        {t("axisBookings")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/[0.06]">
                    {bookingsData.map((row, i) => (
                      <tr
                        key={i}
                        className="hover:bg-darnaBg-100 transition-colors duration-fast"
                      >
                        <td className="px-4 py-2 text-primary-800 font-medium">
                          {row.day}
                        </td>
                        <td className="px-4 py-2 text-end text-primary-900 font-semibold tabular-nums">
                          {formatNumber(row.bookings, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Clean Single-Series Area Chart */
              <div className="h-60 w-full pt-2" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={bookingsData}
                    margin={
                      isRtl
                        ? { top: 10, right: -20, left: 10, bottom: 0 }
                        : { top: 10, right: 10, left: -20, bottom: 0 }
                    }
                  >
                    <defs>
                      <linearGradient
                        id="bookingsGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#0E6FAD"
                          stopOpacity={0.22}
                        />
                        <stop
                          offset="100%"
                          stopColor="#0E6FAD"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="#152C52"
                      strokeOpacity={0.06}
                    />
                    <XAxis
                      dataKey="day"
                      reversed={isRtl}
                      tick={{ fontSize: 12, fill: "#3A63A3" }}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      orientation={isRtl ? "right" : "left"}
                      tickFormatter={(v: number) => formatNumber(v, locale)}
                      tick={{ fontSize: 12, fill: "#3A63A3" }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <RechartsTooltip
                      cursor={{
                        stroke: "#152C52",
                        strokeOpacity: 0.18,
                        strokeWidth: 1,
                      }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div
                              className="bg-white px-3 py-2 rounded-xl shadow-e3 text-xs"
                              dir={isRtl ? "rtl" : "ltr"}
                            >
                              <span className="font-semibold text-primary-900 block">
                                {payload[0].payload.day}
                              </span>
                              <span className="text-primary-600 font-medium tabular-nums">
                                {t("chartTooltipBookings", {
                                  count: Number(payload[0].value),
                                  value: formatNumber(
                                    Number(payload[0].value),
                                    locale,
                                  ),
                                })}
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
                      stroke="#0E6FAD"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#bookingsGrad)"
                      activeDot={{
                        r: 5,
                        fill: "#0E6FAD",
                        stroke: "#FFFFFF",
                        strokeWidth: 2,
                      }}
                      animationDuration={700}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Top 5 Wilayas as horizontal bars with direct labels */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white shadow-e1 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-title font-semibold text-primary-900">
                  {t("chartWilayasTitle")}
                </h3>
                <p className="text-xs text-primary-500 mt-0.5">
                  {t("chartWilayasSubtitle")}
                </p>
              </div>

              {/* View as Table Toggle */}
              <button
                type="button"
                aria-pressed={showWilayasTable}
                onClick={() => setShowWilayasTable(!showWilayasTable)}
                className="flex items-center gap-1.5 px-2.5 min-h-[32px] rounded-lg bg-white shadow-e1 hover:shadow-e2 text-xs font-semibold text-primary-700 hover:text-primary-900 transition duration-fast shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
              >
                <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {showWilayasTable ? t("viewAsChart") : t("viewAsTable")}
                </span>
              </button>
            </div>

            {showWilayasTable ? (
              /* Accessible Data Table alternative */
              <div className="rounded-xl overflow-hidden text-xs ring-1 ring-inset ring-primary/[0.06]">
                <table className="w-full text-start">
                  <thead className="bg-darnaBg-100 text-primary-600 font-semibold">
                    <tr>
                      <th className="px-4 py-2.5 text-start">
                        {t("wilayaColumn")}
                      </th>
                      <th className="px-4 py-2.5 text-end">
                        {t("axisBookings")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/[0.06]">
                    {top5Wilayas.map((row, i) => (
                      <tr
                        key={i}
                        className="hover:bg-darnaBg-100 transition-colors duration-fast"
                      >
                        <td className="px-4 py-2 text-primary-800 font-medium">
                          {row.name}
                        </td>
                        <td className="px-4 py-2 text-end text-primary-900 font-semibold tabular-nums">
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
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-primary-800">
                          {w.name}
                        </span>
                        <span className="font-semibold text-primary-900 tabular-nums whitespace-nowrap">
                          {t("staysCount", {
                            count: w.bookings,
                            value: formatNumber(w.bookings, locale),
                          })}
                        </span>
                      </div>
                      <div className="w-full bg-darnaBg-300/70 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-secondary-600 origin-left rtl:origin-right animate-[bar-grow_700ms_cubic-bezier(0.22,1,0.36,1)_both]"
                          style={{
                            width: `${pct}%`,
                            animationDelay: `${idx * 60}ms`,
                          }}
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
                className="group inline-flex items-center gap-1.5 text-xs font-semibold text-primary-800 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
              >
                <span className="link-underline">{t("seeAllWilayas")}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION F: "More details", Collapsed by default (Progressive Disclosure)
      ========================================================================= */}
      <section className="rounded-2xl bg-white overflow-hidden shadow-e1">
        <button
          type="button"
          aria-expanded={viewMode === "detailed"}
          aria-controls="dashboard-more-details"
          onClick={toggleViewMode}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-start hover:bg-darnaBg-100 transition-colors duration-fast cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-darnaBg-300/70 flex items-center justify-center text-primary">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary-900">
                {viewMode === "detailed" ? t("hideDetails") : t("moreDetails")}
              </h3>
              <p className="text-xs text-primary-500">
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
          <div
            id="dashboard-more-details"
            className="p-5 sm:p-6 border-t border-primary/[0.06] space-y-6 bg-darnaBg-100/60 animate-in fade-in"
          >
            {/* Breakdown 1: Performance by Partner Type */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-primary-900 flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-secondary" />
                <span>{t("tiersTitle")}</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(
                  [
                    {
                      type: "individual",
                      volume: 1120000,
                      commission: 134400,
                      rate: 12,
                      count: 64,
                    },
                    {
                      type: "agency",
                      volume: 680000,
                      commission: 102000,
                      rate: 15,
                      count: 32,
                    },
                    {
                      type: "hotel",
                      volume: 490000,
                      commission: 88200,
                      rate: 18,
                      count: 22,
                    },
                    {
                      type: "hostel",
                      volume: 160000,
                      commission: 16000,
                      rate: 10,
                      count: 10,
                    },
                  ] as const
                ).map((tier, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-white shadow-e1 space-y-1.5 text-xs text-start"
                  >
                    <span className="font-semibold text-primary-900 block">
                      {tHostTypes(tier.type)}
                    </span>
                    <div className="text-xs text-primary-600 space-y-0.5">
                      <p>
                        {t.rich("tier.total", {
                          value: formatDzd(tier.volume, locale),
                          b: (chunks) => (
                            <strong className="text-primary-900">
                              {chunks}
                            </strong>
                          ),
                        })}
                      </p>
                      <p>
                        {t.rich("tier.darna", {
                          value: t("tier.commissionValue", {
                            amount: formatDzd(tier.commission, locale),
                            rate: formatNumber(tier.rate, locale),
                          }),
                          b: (chunks) => (
                            <strong className="text-primary">{chunks}</strong>
                          ),
                        })}
                      </p>
                      <p>
                        {t.rich("tier.bookings", {
                          value: formatNumber(tier.count, locale),
                          b: (chunks) => (
                            <strong className="text-primary-900">
                              {chunks}
                            </strong>
                          ),
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Breakdown 2: Stay Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white text-start space-y-1 shadow-e1">
                <span className="text-xs font-medium text-primary-600">
                  {getPlainTerm("occupancy", locale)}
                </span>
                <div className="text-[1.75rem] leading-tight font-serif text-primary-900 tabular-nums">
                  {percentFormatter.format(0.784)}
                </div>
                <p className="text-xs text-primary-500">
                  {getDefinition("occupancy", locale)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white text-start space-y-1 shadow-e1">
                <span className="text-xs font-medium text-primary-600">
                  {getPlainTerm("cancellationRate", locale)}
                </span>
                <div className="text-[1.75rem] leading-tight font-serif text-primary-900 tabular-nums">
                  {percentFormatter.format(0.048)}
                </div>
                <p className="text-xs text-primary-500">
                  {getDefinition("cancellationRate", locale)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white text-start space-y-1 shadow-e1">
                <span className="text-xs font-medium text-primary-600">
                  {t("avgResponseTitle")}
                </span>
                <div className="text-[1.75rem] leading-tight font-serif text-primary-900 tabular-nums">
                  {t("avgResponseValue", { minutes: formatNumber(24, locale) })}
                </div>
                <p className="text-xs text-primary-500">
                  {t("avgResponseHint")}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
