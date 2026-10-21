"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/navigation";
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
  TrendingUp,
  TrendingDown,
  Table as TableIcon,
  BarChart3,
  Layers,
  ChevronDown,
  ChevronUp,
  History,
  ShieldCheck,
  Check,
} from "lucide-react";
import { KpiCard } from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { GettingStartedChecklist } from "@/components/features/dashboard/GettingStartedChecklist";
import { WhatChangedBanner } from "@/components/features/dashboard/WhatChangedBanner";
import { formatDzd, formatNumber } from "@/lib/utils/format";
import { getPlainTerm, getDefinition, getHowItIsCounted } from "@/lib/glossary";
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
  const tCommon = useTranslations("common");

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

  // Formatted date string in current locale
  const formattedToday = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-DZ" : locale === "fr" ? "fr-DZ" : "en-DZ",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  ).format(new Date());

  // Attention counters
  const pendingHosts = attention.pendingHostsCount || 3;
  const pendingListings = attention.pendingListingsCount || 5;
  const flaggedReviews = attention.flaggedReviewsCount || 1;
  const disputedBookings = attention.disputedBookingsCount || 0;
  const hasPendingItems = pendingHosts + pendingListings + flaggedReviews + disputedBookings > 0;

  // Single daily takeaway summary sentence
  const daySummaryText = hasPendingItems
    ? t("daySummaryNeeds", { hosts: pendingHosts, listings: pendingListings })
    : t("daySummaryCaughtUp");

  // Chart 1: Bookings over time (Single area series, plain axis labels)
  const bookingsData = [
    { day: locale === "ar" ? "الأحد" : locale === "fr" ? "Dim" : "Sun", bookings: 14 },
    { day: locale === "ar" ? "الإثنين" : locale === "fr" ? "Lun" : "Mon", bookings: 19 },
    { day: locale === "ar" ? "الثلاثاء" : locale === "fr" ? "Mar" : "Tue", bookings: 16 },
    { day: locale === "ar" ? "الأربعاء" : locale === "fr" ? "Mer" : "Wed", bookings: 24 },
    { day: locale === "ar" ? "الخميس" : locale === "fr" ? "Jeu" : "Thu", bookings: 31 },
    { day: locale === "ar" ? "الجمعة" : locale === "fr" ? "Ven" : "Fri", bookings: 38 },
    { day: locale === "ar" ? "السبت" : locale === "fr" ? "Sam" : "Sat", bookings: 28 },
  ];

  // Chart 2: Top 5 Wilayas as horizontal bars with direct values
  const top5Wilayas = [
    { name: locale === "ar" ? "وهران (31)" : "31 - Oran", bookings: 42 },
    { name: locale === "ar" ? "الجزائر (16)" : "16 - Algiers", bookings: 38 },
    { name: locale === "ar" ? "تيبازة (42)" : "42 - Tipaza", bookings: 27 },
    { name: locale === "ar" ? "بجاية (06)" : "06 - Béjaïa", bookings: 19 },
    { name: locale === "ar" ? "قسنطينة (25)" : "25 - Constantine", bookings: 14 },
  ];

  // Attention cards configuration (§3.1.B)
  const attentionCards = [
    {
      title: locale === "fr" ? "Hôtes en attente d'approbation" : locale === "ar" ? "مضيفون في انتظار الاعتماد" : "Hosts waiting for approval",
      count: pendingHosts,
      oldestWaiting: locale === "fr" ? "3 jours" : locale === "ar" ? "3 أيام" : "3 days",
      buttonText: t("reviewHosts"),
      href: "/approvals?tab=hosts",
      icon: Building,
      actionColor: "primary",
    },
    {
      title: locale === "fr" ? "Annonces à vérifier" : locale === "ar" ? "إعلانات في انتظار المراجعة" : "Listings waiting for review",
      count: pendingListings,
      oldestWaiting: locale === "fr" ? "2 jours" : locale === "ar" ? "يومان" : "2 days",
      buttonText: t("reviewListings"),
      href: "/approvals?tab=listings",
      icon: Home,
      actionColor: "primary",
    },
    {
      title: locale === "fr" ? "Avis signalés par des voyageurs" : locale === "ar" ? "تقييمات تم الإبلاغ عنها" : "Reviews flagged by guests",
      count: flaggedReviews,
      oldestWaiting: locale === "fr" ? "1 jour" : locale === "ar" ? "يوم واحد" : "1 day",
      buttonText: t("checkReviews"),
      href: "/reviews?status=flagged",
      icon: Star,
      actionColor: "primary",
    },
    {
      title: locale === "fr" ? "Demandes > 24h & Litiges" : locale === "ar" ? "حجوزات معلقة > 24 ساعة ونزاعات" : "Bookings > 24h & Disputes",
      count: disputedBookings,
      oldestWaiting: disputedBookings > 0 ? (locale === "fr" ? "1 jour" : "1 day") : null,
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
              alt="DARNA Welcome"
              width={24}
              height={24}
              className="w-6 h-6 text-secondary object-contain"
            />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
                {t("greeting", { name: "Nadia" })}
              </h1>
              <span className="text-xs text-neutral-400 font-medium capitalize">
                · {formattedToday}
              </span>
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
            {locale === "fr"
              ? "Nécessite votre attention"
              : locale === "ar"
              ? "مهام تحتاج إلى انتباهكم الآن"
              : "Needs your attention"}
          </h2>
          <span className="text-xs text-neutral-500 font-medium">
            {locale === "fr"
              ? "Cliquez pour agir en 1 clic"
              : locale === "ar"
              ? "اتخاذ القرار بنقرة واحدة"
              : "Decide in 1 click"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {attentionCards.map((card, i) => {
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
                        <Check className="w-4 h-4 text-secondary" />
                      ) : (
                        <Icon className="w-4 h-4" />
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
                        {card.count}
                      </div>
                    )}

                    {/* Waiting time context */}
                    {!isZero && card.oldestWaiting && (
                      <span className="text-[11px] text-neutral-400 mt-1 block">
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
                        : "bg-secondary text-white hover:bg-secondary/90"
                    }`}
                  >
                    <span>{card.buttonText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
              {locale === "fr"
                ? "Comment se porte DARNA ?"
                : locale === "ar"
                ? "كيف هو أداء منصة دارنا؟"
                : "How is DARNA doing?"}
            </h2>
            <p className="text-xs text-neutral-500">
              {locale === "fr"
                ? "Indicateurs clés expliqués en langage clair et sans abréviations."
                : locale === "ar"
                ? "المؤشرات الرئيسية بلغة مبسطة وواضحة بدون رموز غامضة."
                : "Key business metrics in plain language with no abbreviations."}
            </p>
          </div>

          {/* Period switch with exactly 3 options per §3.1.C */}
          <div className="flex items-center bg-white p-1 rounded-2xl border border-tertiary/70 shadow-2xs self-start sm:self-auto">
            {[
              { id: "today" as const, label: t("periods.today") || "Today" },
              { id: "7d" as const, label: t("periods.7d") || "Last 7 days" },
              { id: "30d" as const, label: t("periods.30d") || "Last 30 days" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
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
            comparisonSentence={
              period === "30d"
                ? t("comparisonMore", { percent: 12, period: t("periods.30d") })
                : t("comparisonMore", { percent: 5, period: t("periods.7d") })
            }
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
                ? t("comparisonMore", { percent: 8, period: t("periods.30d") })
                : t("comparisonSame", { period: t("periods.7d") })
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
            comparisonSentence={
              period === "30d"
                ? t("comparisonMore", { percent: 10, period: t("periods.30d") })
                : t("comparisonMore", { percent: 4, period: t("periods.7d") })
            }
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
            comparisonSentence={t("comparisonSame", { period: t(`periods.${period}`) })}
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
                  {locale === "fr"
                    ? "Évolution quotidienne des réservations enregistrées cette semaine"
                    : locale === "ar"
                    ? "التطور اليومي لعدد الحجوزات المسجلة هذا الأسبوع"
                    : "Daily count of confirmed guest reservations this week"}
                </p>
              </div>

              {/* View as Table Toggle */}
              <button
                type="button"
                onClick={() => setShowBookingsTable(!showBookingsTable)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-darnaBg border border-tertiary/60 text-xs font-semibold text-neutral-600 hover:text-primary transition shrink-0"
              >
                <TableIcon className="w-3.5 h-3.5" />
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
                          {row.bookings}
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
                  <AreaChart data={bookingsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bookingsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6B7F5B" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6B7F5B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFECE4" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6E7A6E" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#6E7A6E" }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#1C241D] text-white p-2.5 rounded-xl shadow-xl border border-[#3A493B] text-xs">
                              <span className="font-bold block">{payload[0].payload.day}</span>
                              <span className="text-secondary font-medium">
                                {payload[0].value} {locale === "fr" ? "réservations" : "bookings"}
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
                  {locale === "fr"
                    ? "Wilayas avec la plus forte demande touristique ce mois-ci"
                    : locale === "ar"
                    ? "أكثر الولايات تسجيلاً للإقبال السياحي هذا الشهر"
                    : "Top destination provinces by confirmed guest stays"}
                </p>
              </div>

              {/* View as Table Toggle */}
              <button
                type="button"
                onClick={() => setShowWilayasTable(!showWilayasTable)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-darnaBg border border-tertiary/60 text-xs font-semibold text-neutral-600 hover:text-primary transition shrink-0"
              >
                <TableIcon className="w-3.5 h-3.5" />
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
                      <th className="px-4 py-2.5 text-start">Wilaya</th>
                      <th className="px-4 py-2.5 text-end">{t("axisBookings")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {top5Wilayas.map((row, i) => (
                      <tr key={i} className="hover:bg-neutral-50">
                        <td className="px-4 py-2 text-neutral-700 font-medium">{row.name}</td>
                        <td className="px-4 py-2 text-end text-primary font-bold tabular-nums">
                          {row.bookings}
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
                          {w.bookings} {locale === "fr" ? "séjours" : "stays"}
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
                className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary transition"
              >
                <span>{t("seeAllWilayas")}</span>
                <ArrowRight className="w-3.5 h-3.5" />
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
                {locale === "fr"
                  ? "Statistiques avancées par type d'hôte, par catégorie de séjour et taux d'occupation"
                  : locale === "ar"
                  ? "إحصائيات متقدمة حسب فئات المضيفين، تصنيفات الإقامة ومعدل الإشغال"
                  : "Advanced breakdowns by partner type, accommodation categories, and occupancy"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
            <span>{viewMode === "detailed" ? "Collapse" : "Expand"}</span>
            {viewMode === "detailed" ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {viewMode === "detailed" && (
          <div className="p-5 sm:p-6 border-t border-tertiary/60 space-y-6 bg-darnaBg/30 animate-in fade-in">
            {/* Breakdown 1: Performance by Partner Type */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-primary flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-secondary" />
                <span>
                  {locale === "fr"
                    ? "Performance par catégorie de partenaire"
                    : locale === "ar"
                    ? "الأداء المالي حسب فئة الشريك"
                    : "Financial Performance by Partner Tier"}
                </span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    name: locale === "fr" ? "Particuliers" : "Individual (Solo)",
                    volume: "1,120,000 DZD",
                    commission: "134,400 DZD (12%)",
                    count: 64,
                  },
                  {
                    name: locale === "fr" ? "Agences de tourisme" : "Tourism Agencies",
                    volume: "680,000 DZD",
                    commission: "102,000 DZD (15%)",
                    count: 32,
                  },
                  {
                    name: locale === "fr" ? "Hôtels & Palaces" : "Hotels & Palaces",
                    volume: "490,000 DZD",
                    commission: "88,200 DZD (18%)",
                    count: 22,
                  },
                  {
                    name: locale === "fr" ? "Auberges de jeunesse" : "Youth Hostels",
                    volume: "160,000 DZD",
                    commission: "16,000 DZD (10%)",
                    count: 10,
                  },
                ].map((tier, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-white border border-tertiary/60 shadow-2xs space-y-1.5 text-xs text-start"
                  >
                    <span className="font-bold text-primary block">{tier.name}</span>
                    <div className="text-[11px] text-neutral-600 space-y-0.5">
                      <p>
                        <span className="text-neutral-400">Total : </span>
                        <strong>{tier.volume}</strong>
                      </p>
                      <p>
                        <span className="text-neutral-400">DARNA : </span>
                        <strong className="text-secondary">{tier.commission}</strong>
                      </p>
                      <p>
                        <span className="text-neutral-400">Réservations : </span>
                        <strong>{tier.count}</strong>
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
                <div className="text-2xl font-serif font-black text-primary">78.4%</div>
                <p className="text-[11px] text-neutral-500">
                  {getDefinition("occupancy", locale)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 text-start space-y-1">
                <span className="text-xs font-semibold text-neutral-500">
                  {getPlainTerm("cancellationRate", locale)}
                </span>
                <div className="text-2xl font-serif font-black text-primary">4.8%</div>
                <p className="text-[11px] text-neutral-500">
                  {getDefinition("cancellationRate", locale)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 text-start space-y-1">
                <span className="text-xs font-semibold text-neutral-500">
                  {locale === "fr" ? "Temps de réponse moyen" : "Average response time"}
                </span>
                <div className="text-2xl font-serif font-black text-primary">24 min</div>
                <p className="text-[11px] text-neutral-500">
                  {locale === "fr"
                    ? "Délai moyen de réponse des hôtes aux demandes de séjour"
                    : "Average time for hosts to confirm booking requests"}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
