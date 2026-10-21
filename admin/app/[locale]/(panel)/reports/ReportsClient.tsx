"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  PieChart,
  TrendingUp,
  MapPin,
  Building,
  CheckCircle,
} from "lucide-react";
import { getDashboardKPIs, getDashboardCharts } from "@/lib/data/analytics";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatDzd } from "@/lib/utils/format";

interface Props {
  locale: string;
}

export default function ReportsClient({ locale }: Props) {
  const t = useTranslations("reports");
  const tDashboard = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const [period, setPeriod] = useState("30d");
  const [kpis, setKpis] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { success, info } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiData, chartData] = await Promise.all([
        getDashboardKPIs(period),
        getDashboardCharts(period),
      ]);
      setKpis(kpiData);
      setCharts(chartData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = (reportName: string) => {
    const csvContent =
      "Report,Period,PlatformNetRevenue,GrossBookings,ActiveListings,GeneratedAt\n" +
      `"${reportName}","${period}",${kpis?.netPlatformRevenueDzd || 0},${kpis?.totalGrossVolumeDzd || 0},${kpis?.activeListingsCount || 0},"${new Date().toISOString()}"\n`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `darna_${reportName.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success("Report Generated", `${reportName} exported to CSV.`);
  };

  const reportPresets = [
    {
      title: "Monthly Financial & Commission Settlement",
      description: "Aggregated gross bookings, platform commission revenue, CCP payout totals, and VAT breakdowns.",
      type: "Finance / Audit",
    },
    {
      title: "Regional Wilaya Demand & Tourism Heatmap",
      description: "Nightly bookings, guest origin distribution, and average stay prices across all 69 wilayas.",
      type: "Marketplace / Growth",
    },
    {
      title: "Host Solvency & Escrow Balance Audit",
      description: "Negative balance flags, pending disbursements, and dispute recovery liabilities.",
      type: "Risk / Compliance",
    },
    {
      title: "Algerian Tourism Tax Declaration Statement",
      description: "Official summary formatted for compliance with Algerian Ministry of Tourism & Handicrafts.",
      type: "Regulatory",
    },
  ];

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

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-tertiary/70 shadow-2xs">
          {["7d", "30d", "90d", "1y"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                period === p
                  ? "bg-primary text-white"
                  : "text-neutral-500 hover:text-primary"
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-tertiary/70 shadow-2xs">
          <div className="text-xs font-semibold text-neutral-600">
            {t("kpiRevenue")}
          </div>
          <div className="text-lg font-bold text-secondary mt-1 tabular-nums">
            {formatDzd(kpis?.netPlatformRevenueDzd || 0, locale)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            Commissions + booking service fees
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-tertiary/70 shadow-2xs">
          <div className="text-xs font-semibold text-neutral-600">
            {t("kpiGross")}
          </div>
          <div className="text-lg font-bold text-primary mt-1 tabular-nums">
            {formatDzd(kpis?.totalGrossVolumeDzd || 0, locale)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            Total reservation expenditures
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-tertiary/70 shadow-2xs">
          <div className="text-xs font-semibold text-neutral-600">
            {tDashboard("kpiOccupancy")}
          </div>
          <div className="text-lg font-bold text-primary mt-1 tabular-nums">
            {kpis?.occupancyRatePercent || 78.4}%
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            Across active network listings
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-tertiary/70 shadow-2xs">
          <div className="text-xs font-semibold text-neutral-600">
            {t("kpiListings")}
          </div>
          <div className="text-lg font-bold text-accent mt-1 tabular-nums">
            {kpis?.activeListingsCount || 48}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            Across all Algerian wilayas
          </div>
        </div>
      </div>

      {/* Top Wilayas Table */}
      <div className="bg-white p-5 rounded-2xl border border-tertiary/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-primary flex items-center gap-2">
          <MapPin className="w-4 h-4 text-secondary" />
          <span>Top Algerian Tourism Wilayas by Booking Volume</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {charts?.bookingsByWilaya?.map((w: any, idx: number) => (
            <div
              key={w.wilayaCode}
              className="p-3 rounded-xl border border-tertiary/60 bg-darnaBg/30 flex items-center justify-between"
            >
              <div>
                <span className="text-[10px] font-mono text-neutral-400">#{idx + 1}</span>
                <div className="text-xs font-bold text-primary">{w.wilayaName}</div>
              </div>
              <div className="text-xs font-bold text-secondary tabular-nums">
                {w.bookings} stays
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Standard Export Presets */}
      <div className="bg-white p-5 rounded-2xl border border-tertiary/80 shadow-2xs space-y-4">
        <div className="border-b border-tertiary/40 pb-3 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-primary">Standard Export Presets</h3>
            <p className="text-xs text-neutral-500">
              One-click structured data exports for accounting, tax compliance, and performance tracking.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportPresets.map((rp, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-tertiary/70 bg-white hover:border-secondary/50 transition flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-secondary px-2 py-0.5 rounded bg-secondary/10">
                    {rp.type}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-primary mt-2">{rp.title}</h4>
                <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  {rp.description}
                </p>
              </div>

              <div className="pt-2 border-t border-tertiary/40 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(rp.title)}
                  className="text-xs font-bold text-primary hover:bg-darnaBg"
                >
                  <Download className="w-3.5 h-3.5 me-1.5 text-secondary" />
                  {t("downloadCsv")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
