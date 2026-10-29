"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  MapPin,
  Building,
  CheckCircle,
  Percent,
  Compass,
  Car,
  Home,
  Plane,
} from "lucide-react";
import { getDashboardKPIs, getDashboardCharts } from "@/lib/actions/analytics";
import { unwrap } from "@/lib/actions/result";
import { exportKpiReport } from "@/lib/actions/analytics";
import { downloadCsv } from "@/lib/utils/download";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatDzd, formatNumber, intlLocale } from "@/lib/utils/format";
import { getWilayaName } from "@/lib/utils/wilayas";

export interface StatsClientProps {
  locale: string;
  initialTab?: "overview" | "providers" | "services" | "wilayas" | "revenue" | "reports";
}

interface DashboardKpis {
  totalGrossVolumeDzd?: number;
  netPlatformRevenueDzd?: number;
}

// Report ids are sent to the server export action; labels live in stats.reports.items.<key>.
const REPORT_KEYS = [
  "Comptabilite_Mensuelle",
  "Declaration_Tourisme",
  "Audit_Solvabilite",
  "Performance_Territoriale",
] as const;

const MONTHLY_VOLUME = [45, 62, 58, 80, 95, 110, 88, 125, 140, 132, 160, 175];

const VERTICAL_SHARES = [
  { key: "stays", share: 0.52, bar: "bg-primary" },
  { key: "trips", share: 0.22, bar: "bg-secondary" },
  { key: "cars", share: 0.16, bar: "bg-tertiary" },
  { key: "experiences", share: 0.1, bar: "bg-accent" },
] as const;

const PROVIDERS = [
  { key: "individual", count: 326, rate: 12 },
  { key: "agency", count: 48, rate: 15 },
  { key: "hotel", count: 64, rate: 18 },
  { key: "carRental", count: 86, rate: 15 },
] as const;

const WILAYA_ROWS = [
  { code: "16", listings: 420, bookings: 480, volume: 5600000, share: 0.38 },
  { code: "31", listings: 280, bookings: 310, volume: 3800000, share: 0.26 },
  { code: "33", listings: 94, bookings: 160, volume: 2900000, share: 0.2 },
  { code: "06", listings: 120, bookings: 110, volume: 1400000, share: 0.1 },
];

const REVENUE_SPLIT = [
  { key: "individual", amount: 945000 },
  { key: "agency", amount: 540000 },
  { key: "carRental", amount: 360000 },
] as const;

export default function StatsClient({
  locale,
  initialTab = "overview",
}: StatsClientProps) {
  const t = useTranslations("stats");
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [period] = useState("30d");
  const tActionsExport = useTranslations("actions");
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);

  const { success, error: errorToast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [kpiData] = await Promise.all([
        getDashboardKPIs(period).then(unwrap),
        getDashboardCharts(period).then(unwrap),
      ]);
      setKpis(kpiData as DashboardKpis);
    } catch {
      // Keep the demo figures when the analytics action is unavailable.
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const percent = (value: number) =>
    new Intl.NumberFormat(intlLocale(locale), { style: "percent", maximumFractionDigits: 1 }).format(value);

  /** KPI report built and audited on the server (CSV-injection safe). */
  const handleExport = async (reportName: string, label: string) => {
    try {
      const res = unwrap(await exportKpiReport(reportName, period));
      downloadCsv(res.filename, res.csv);
      success(tActionsExport("exportStarted"), label);
    } catch (err) {
      errorToast(tActionsExport("exportFailed"), err instanceof Error ? err.message : undefined);
    }
  };

  const statKpis = [
    {
      id: "volume",
      label: t("kpi.grossVolume"),
      value: formatDzd(kpis?.totalGrossVolumeDzd || 14850000, locale),
      icon: TrendingUp,
      colorVariant: "primary" as const,
      active: activeTab === "revenue",
      onClick: () => setActiveTab("revenue"),
    },
    {
      id: "commissions",
      label: t("kpi.netCommissions"),
      value: formatDzd(kpis?.netPlatformRevenueDzd || 1845000, locale),
      icon: Percent,
      colorVariant: "secondary" as const,
      active: activeTab === "revenue",
      onClick: () => setActiveTab("revenue"),
    },
    {
      id: "bookings",
      label: t("kpi.confirmedBookings"),
      value: formatNumber(1248, locale),
      icon: CheckCircle,
      colorVariant: "tertiary" as const,
      active: activeTab === "services",
      onClick: () => setActiveTab("services"),
    },
    {
      id: "wilayas",
      label: t("kpi.activeWilayas"),
      value: formatNumber(58, locale),
      icon: MapPin,
      colorVariant: "primary" as const,
      active: activeTab === "wilayas",
      onClick: () => setActiveTab("wilayas"),
    },
  ];

  return (
    <div className="space-y-6 text-start">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={[
          {
            label: t("periodLast30"),
            icon: <Calendar className="w-4 h-4" aria-hidden="true" />,
            variant: "outline",
            onClick: () => {},
          },
          {
            label: t("exportCsv"),
            icon: <Download className="w-4 h-4" aria-hidden="true" />,
            variant: "primary",
            onClick: () => handleExport("Rapport_General_Darna", t("generalReport")),
          },
        ]}
      />

      <KpiStrip cards={statKpis} />

      <Tabs
        items={[
          { id: "overview", label: t("tabs.overview"), icon: <BarChart3 className="w-4 h-4" aria-hidden="true" /> },
          { id: "providers", label: t("tabs.providers"), icon: <Building className="w-4 h-4" aria-hidden="true" /> },
          { id: "services", label: t("tabs.services"), icon: <Home className="w-4 h-4" aria-hidden="true" /> },
          { id: "wilayas", label: t("tabs.wilayas"), icon: <MapPin className="w-4 h-4" aria-hidden="true" /> },
          { id: "revenue", label: t("tabs.revenue"), icon: <Percent className="w-4 h-4" aria-hidden="true" /> },
          { id: "reports", label: t("tabs.reports"), icon: <FileSpreadsheet className="w-4 h-4" aria-hidden="true" /> },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-tertiary/40 space-y-4">
            <h3 className="font-bold text-primary text-base">{t("overview.volumeTitle")}</h3>
            <div
              role="img"
              aria-label={t("overview.volumeChartLabel", {
                values: MONTHLY_VOLUME.map((v) => formatNumber(v, locale)).join(", "),
              })}
              className="h-64 flex items-end justify-between gap-2 pt-8 px-2 border-b border-neutral-100"
            >
              {MONTHLY_VOLUME.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group" aria-hidden="true">
                  <div
                    style={{ height: `${val * 1.2}px` }}
                    className="w-full rounded-t-lg bg-secondary/80 group-hover:bg-secondary transition-all"
                  />
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {t("overview.monthShort", { n: i + 1 })}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-500 text-center">
              {t("overview.avgGrowth", { value: percent(0.184) })}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-tertiary/40 space-y-4">
            <h3 className="font-bold text-primary text-base">{t("overview.verticalTitle")}</h3>
            <div className="space-y-3 pt-2">
              {VERTICAL_SHARES.map((v) => (
                <div key={v.key}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>{t(`overview.verticals.${v.key}`)}</span>
                    <span className="font-mono">{percent(v.share)}</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-neutral-100 overflow-hidden" aria-hidden="true">
                    <div className={`h-full ${v.bar} rounded-full`} style={{ width: `${v.share * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* By Provider Type */}
      {activeTab === "providers" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {PROVIDERS.map((p) => (
            <div key={p.key} className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-2">
              <span className="font-bold text-xs text-primary block">{t(`providers.${p.key}.label`)}</span>
              <p className="text-xl font-serif font-black text-primary">
                {t(`providers.${p.key}.count`, { count: p.count, value: formatNumber(p.count, locale) })}
              </p>
              <p className="text-[11px] text-neutral-500">
                {t("providers.avgRate", { rate: percent(p.rate / 100) })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* By Service */}
      {activeTab === "services" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <Home className="w-4 h-4 text-secondary" aria-hidden="true" /> {t("services.stays")}
            </div>
            <p className="text-lg font-mono font-bold text-primary">
              {t("services.listingsCount", { count: 1248, value: formatNumber(1248, locale) })}
            </p>
            <p className="text-xs text-neutral-500">
              {t("services.avgRating", { value: formatNumber(4.8, locale) })}
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <Plane className="w-4 h-4 text-primary" aria-hidden="true" /> {t("services.trips")}
            </div>
            <p className="text-lg font-mono font-bold text-primary">
              {t("services.tripsCount", { count: 156, value: formatNumber(156, locale) })}
            </p>
            <p className="text-xs text-neutral-500">{t("services.fillRate", { value: percent(0.88) })}</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <Car className="w-4 h-4 text-tertiary" aria-hidden="true" /> {t("services.cars")}
            </div>
            <p className="text-lg font-mono font-bold text-primary">
              {t("services.vehiclesCount", { count: 1024, value: formatNumber(1024, locale) })}
            </p>
            <p className="text-xs text-neutral-500">
              {t("services.availability", { value: formatNumber(542, locale) })}
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <Compass className="w-4 h-4 text-accent" aria-hidden="true" /> {t("services.experiences")}
            </div>
            <p className="text-lg font-mono font-bold text-primary">
              {t("services.activitiesCount", { count: 238, value: formatNumber(238, locale) })}
            </p>
            <p className="text-xs text-neutral-500">{t("services.satisfaction", { value: percent(0.98) })}</p>
          </div>
        </div>
      )}

      {/* By Wilaya */}
      {activeTab === "wilayas" && (
        <div className="bg-white rounded-2xl border border-tertiary/40 p-6 space-y-4">
          <h3 id="stats-wilayas-title" className="font-bold text-primary text-base">{t("wilayas.title")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start" aria-labelledby="stats-wilayas-title">
              <thead className="bg-darnaBg/60 text-neutral-600 font-semibold border-b border-tertiary/40">
                <tr>
                  <th scope="col" className="py-2.5 px-3 text-start">{t("wilayas.cols.wilaya")}</th>
                  <th scope="col" className="py-2.5 px-3 text-start">{t("wilayas.cols.listings")}</th>
                  <th scope="col" className="py-2.5 px-3 text-start">{t("wilayas.cols.bookings30d")}</th>
                  <th scope="col" className="py-2.5 px-3 text-end">{t("wilayas.cols.volume")}</th>
                  <th scope="col" className="py-2.5 px-3 text-start">{t("wilayas.cols.share")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {WILAYA_ROWS.map((row) => (
                  <tr key={row.code} className="hover:bg-neutral-50/50">
                    <td className="py-2.5 px-3 font-bold text-primary">{getWilayaName(row.code, locale)}</td>
                    <td className="py-2.5 px-3">{formatNumber(row.listings, locale)}</td>
                    <td className="py-2.5 px-3 font-mono">{formatNumber(row.bookings, locale)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-end text-primary">
                      {formatDzd(row.volume, locale)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-primary">{percent(row.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue */}
      {activeTab === "revenue" && (
        <div className="bg-white rounded-2xl border border-tertiary/40 p-6 space-y-4">
          <h3 className="font-bold text-primary text-base">{t("revenue.title")}</h3>
          <p className="text-xs text-neutral-500">{t("revenue.subtitle")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {REVENUE_SPLIT.map((r) => (
              <div key={r.key} className="p-4 rounded-xl bg-darnaBg/40 border border-tertiary/40 space-y-1">
                <span className="text-xs text-neutral-500">{t(`revenue.items.${r.key}`)}</span>
                <p className="text-xl font-mono font-bold text-primary">{formatDzd(r.amount, locale)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports & Exports */}
      {activeTab === "reports" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORT_KEYS.map((key) => {
            const title = t(`reports.items.${key}.title`);
            return (
              <div key={key} className="p-5 rounded-2xl bg-white border border-tertiary/40 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-sm text-primary block">{title}</span>
                  <p className="text-xs text-neutral-500 leading-relaxed">{t(`reports.items.${key}.desc`)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  aria-label={t("reports.exportAria", { report: title })}
                  onClick={() => handleExport(key, title)}
                >
                  <Download className="w-3.5 h-3.5 me-1.5" aria-hidden="true" />
                  {t("reports.export")}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
