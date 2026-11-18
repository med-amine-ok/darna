"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { m } from "framer-motion";
import { ease } from "@/lib/motion";
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
  RefreshCw,
} from "lucide-react";
import { getDashboardKPIs, getDashboardCharts } from "@/lib/actions/analytics";
import { unwrap } from "@/lib/actions/result";
import { exportKpiReport } from "@/lib/actions/analytics";
import type { DashboardCharts, DashboardKpis } from "@/lib/data/analytics";
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

// Report ids are sent to the server export action; labels live in stats.reports.items.<key>.
const REPORT_KEYS = [
  "Comptabilite_Mensuelle",
  "Declaration_Tourisme",
  "Audit_Solvabilite",
  "Performance_Territoriale",
] as const;

/** Offers sold (API keys) grouped into the four business verticals of the screen. */
const VERTICAL_GROUPS = [
  { key: "stays", offers: ["stays", "home", "hotel", "hostel"], icon: Home, iconClass: "text-secondary" },
  { key: "trips", offers: ["trip"], icon: Plane, iconClass: "text-primary" },
  { key: "cars", offers: ["vehicle"], icon: Car, iconClass: "text-tertiary" },
  { key: "experiences", offers: ["experience"], icon: Compass, iconClass: "text-accent" },
] as const;

const HOST_TYPES = ["individual", "agency", "hotel", "hostel"] as const;

type LoadState = "loading" | "ready" | "error";

export default function StatsClient({
  locale,
  initialTab = "overview",
}: StatsClientProps) {
  const t = useTranslations("stats");
  const tHostTypes = useTranslations("hostTypes");
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [period] = useState("30d");
  const tActionsExport = useTranslations("actions");
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [yearCharts, setYearCharts] = useState<DashboardCharts | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const { success, error: errorToast } = useToast();

  const loadData = useCallback(async () => {
    setState("loading");
    try {
      const [kpiData, chartData, yearData] = await Promise.all([
        getDashboardKPIs(period).then(unwrap),
        getDashboardCharts(period).then(unwrap),
        getDashboardCharts("1y").then(unwrap),
      ]);
      setKpis(kpiData);
      setCharts(chartData);
      setYearCharts(yearData);
      setState(kpiData.available || chartData.available ? "ready" : "error");
    } catch {
      setState("error");
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

  const ready = state === "ready";
  const kpisOk = ready && !!kpis?.available;
  const chartsOk = ready && !!charts?.available;
  const dash = "-";

  // Sold bookings of the period (confirmed and completed), from the cross tab.
  const soldBookings = charts?.bookingsByOffer.reduce((s, o) => s + o.bookings, 0) ?? 0;
  const wilayaRows = charts?.bookingsByWilaya ?? [];
  const wilayaTotal = wilayaRows.reduce((s, w) => s + w.bookings, 0);

  const monthly = yearCharts?.available ? yearCharts.monthly : [];
  const monthFormatter = new Intl.DateTimeFormat(intlLocale(locale), { month: "short", timeZone: "UTC" });
  const monthLabel = (ym: string) => {
    const [y, mo] = ym.split("-").map(Number);
    return monthFormatter.format(new Date(Date.UTC(y, (mo || 1) - 1, 1)));
  };
  const monthlyMax = Math.max(0, ...monthly.map((p) => p.grossDzd));

  const verticals = VERTICAL_GROUPS.map((g) => {
    const offers = g.offers as readonly string[];
    return {
      ...g,
      bookings: (charts?.bookingsByOffer ?? []).filter((o) => offers.includes(o.key)).reduce((s, o) => s + o.bookings, 0),
      commission: (charts?.revenueByVertical ?? []).filter((o) => offers.includes(o.key)).reduce((s, o) => s + o.commissionDzd, 0),
    };
  });

  const providers = HOST_TYPES.map((key) => ({
    key,
    bookings: charts?.bookingsByHostType.find((b) => b.key === key)?.bookings ?? 0,
    commission: charts?.revenueByHostType.find((r) => r.key === key)?.commissionDzd ?? 0,
  }));

  const statKpis = [
    {
      id: "volume",
      label: t("kpi.grossVolume"),
      value: kpisOk ? formatDzd(kpis!.grossBookingValueDzd.value, locale) : dash,
      icon: TrendingUp,
      colorVariant: "primary" as const,
      active: activeTab === "revenue",
      onClick: () => setActiveTab("revenue"),
    },
    {
      id: "commissions",
      label: t("kpi.netCommissions"),
      value: kpisOk ? formatDzd(kpis!.commissionNetDzd.value, locale) : dash,
      icon: Percent,
      colorVariant: "secondary" as const,
      active: activeTab === "revenue",
      onClick: () => setActiveTab("revenue"),
    },
    {
      id: "bookings",
      label: t("kpi.confirmedBookings"),
      value: chartsOk ? formatNumber(soldBookings, locale) : dash,
      icon: CheckCircle,
      colorVariant: "tertiary" as const,
      active: activeTab === "services",
      onClick: () => setActiveTab("services"),
    },
    {
      id: "wilayas",
      label: t("kpi.activeWilayas"),
      value: chartsOk ? formatNumber(wilayaRows.length, locale) : dash,
      icon: MapPin,
      colorVariant: "primary" as const,
      active: activeTab === "wilayas",
      onClick: () => setActiveTab("wilayas"),
    },
  ];

  /** Loading, error or empty message for a block; null when the block has data. */
  const blockState = (ok: boolean, hasData: boolean) => {
    if (state === "loading") {
      return <p className="text-sm text-primary-500 py-8 text-center" role="status">{t("live.loading")}</p>;
    }
    if (!ok) {
      return (
        <div className="py-8 text-center space-y-3" role="alert">
          <p className="text-sm text-primary-600">{t("live.loadError")}</p>
          <Button variant="outline" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}>
            {t("live.retry")}
          </Button>
        </div>
      );
    }
    if (!hasData) return <p className="text-sm text-primary-500 py-8 text-center">{t("live.noData")}</p>;
    return null;
  };

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
      <p className="text-xs text-primary-500">{t("live.periodNote")}</p>

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
          <div className="p-6 rounded-2xl bg-white space-y-4 shadow-e1">
            <h3 className="font-semibold text-primary-900 text-base">{t("overview.volumeTitle")}</h3>
            {blockState(ready && !!yearCharts?.available, monthlyMax > 0) ?? (
              <div
                role="img"
                aria-label={t("live.volumeChartLabel", {
                  values: monthly.map((p) => `${monthLabel(p.month)}: ${formatDzd(p.grossDzd, locale)}`).join(", "),
                })}
                className="relative h-64 pt-6"
              >
                {/* Quiet gridlines */}
                <div aria-hidden="true" className="absolute inset-x-0 top-6 bottom-6 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3].map((g) => (
                    <div key={g} className="border-t border-primary/[0.06]" />
                  ))}
                </div>
                <div className="relative h-full flex items-end justify-between gap-1.5 sm:gap-2 px-1">
                  {monthly.map((p, i) => (
                    <div key={p.month} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 group" aria-hidden="true">
                      <m.div
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.7, ease: ease.out, delay: i * 0.03 }}
                        style={{ height: `${monthlyMax ? (p.grossDzd / monthlyMax) * 100 : 0}%`, originY: 1 }}
                        title={formatDzd(p.grossDzd, locale)}
                        className={`w-full max-w-[28px] rounded-t-md transition-colors duration-fast ${
                          i === monthly.length - 1 ? "bg-primary-800" : "bg-secondary-600/80 group-hover:bg-secondary-600"
                        }`}
                      />
                      <span className="text-[11px] text-primary-500 tabular-nums h-4 leading-4">{monthLabel(p.month)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-white space-y-4 shadow-e1">
            <h3 className="font-semibold text-primary-900 text-base">{t("overview.verticalTitle")}</h3>
            {blockState(chartsOk, soldBookings > 0) ?? (
              <div className="space-y-3 pt-2">
                {verticals.map((v) => {
                  const share = soldBookings ? v.bookings / soldBookings : 0;
                  return (
                    <div key={v.key}>
                      <div className="flex justify-between text-xs font-medium text-primary-700 mb-1.5">
                        <span>{t(`overview.verticals.${v.key}`)}</span>
                        <span className="tabular-nums text-primary-900">{percent(share)}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-darnaBg-300 overflow-hidden" aria-hidden="true">
                        <m.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.7, ease: ease.out }}
                          className="h-full bg-primary-800 rounded-full origin-left rtl:origin-right"
                          style={{ width: `${share * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* By Provider Type */}
      {activeTab === "providers" &&
        (blockState(chartsOk, true) ?? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {providers.map((p) => (
              <div key={p.key} className="p-5 rounded-2xl bg-white space-y-2 shadow-e1">
                <span className="font-semibold text-xs text-primary block">{tHostTypes(p.key)}</span>
                <p className="text-2xl font-serif text-primary-900 tabular-nums">
                  {t("live.bookings", { count: p.bookings, value: formatNumber(p.bookings, locale) })}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {t("live.commission", { value: formatDzd(p.commission, locale) })}
                </p>
              </div>
            ))}
          </div>
        ))}

      {/* By Service */}
      {activeTab === "services" &&
        (blockState(chartsOk, true) ?? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {verticals.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.key} className="p-5 rounded-2xl bg-white space-y-2 shadow-e1">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                    <Icon className={`w-4 h-4 ${v.iconClass}`} aria-hidden="true" /> {t(`services.${v.key}`)}
                  </div>
                  <p className="text-2xl font-serif text-primary-900 tabular-nums">
                    {t("live.bookings", { count: v.bookings, value: formatNumber(v.bookings, locale) })}
                  </p>
                  <p className="text-xs text-neutral-500">{t("live.commission", { value: formatDzd(v.commission, locale) })}</p>
                </div>
              );
            })}
          </div>
        ))}

      {/* By Wilaya */}
      {activeTab === "wilayas" && (
        <div className="bg-white rounded-2xl p-6 space-y-4 shadow-e1">
          <h3 id="stats-wilayas-title" className="font-semibold text-primary-900 text-base">{t("wilayas.title")}</h3>
          {blockState(chartsOk, wilayaRows.length > 0) ?? (
            <div className="relative overflow-x-auto">
              <table className="w-full text-xs text-start" aria-labelledby="stats-wilayas-title">
                <thead className="bg-darnaBg-100 text-primary-600 font-semibold">
                  <tr>
                    <th scope="col" className="py-2.5 px-3 text-start">{t("wilayas.cols.wilaya")}</th>
                    <th scope="col" className="py-2.5 px-3 text-start">{t("wilayas.cols.bookings30d")}</th>
                    <th scope="col" className="py-2.5 px-3 text-start">{t("wilayas.cols.share")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/[0.06]">
                  {wilayaRows.map((row) => (
                    <tr key={row.wilayaCode} className="hover:bg-darnaBg-100">
                      <td className="py-2.5 px-3 font-semibold text-primary">
                        {getWilayaName(row.wilayaCode, locale) || row.wilayaName}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums whitespace-nowrap">{formatNumber(row.bookings, locale)}</td>
                      <td className="py-2.5 px-3 font-semibold text-primary">
                        {percent(wilayaTotal ? row.bookings / wilayaTotal : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Revenue */}
      {activeTab === "revenue" && (
        <div className="bg-white rounded-2xl p-6 space-y-4 shadow-e1">
          <h3 className="font-semibold text-primary-900 text-base">{t("revenue.title")}</h3>
          <p className="text-xs text-neutral-500">{t("revenue.subtitle")}</p>
          {blockState(chartsOk, true) ?? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              {providers.map((r) => (
                <div key={r.key} className="p-4 rounded-xl bg-darnaBg-100 space-y-1">
                  <span className="text-xs text-neutral-500">{tHostTypes(r.key)}</span>
                  <p className="text-2xl font-serif text-primary-900 tabular-nums whitespace-nowrap">{formatDzd(r.commission, locale)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports & Exports */}
      {activeTab === "reports" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORT_KEYS.map((key) => {
            const title = t(`reports.items.${key}.title`);
            return (
              <div key={key} className="p-5 rounded-2xl bg-white flex items-start justify-between gap-4 shadow-e1">
                <div className="space-y-1">
                  <span className="font-semibold text-sm text-primary block">{title}</span>
                  <p className="text-xs text-neutral-500 leading-relaxed">{t(`reports.items.${key}.desc`)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  aria-label={t("reports.exportAria", { report: title })}
                  onClick={() => handleExport(key, title)} leftIcon={<Download className="w-3.5 h-3.5" aria-hidden="true" />}>
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
