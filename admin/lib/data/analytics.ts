import "server-only";

import { api } from "@/lib/api/client";
import { logReadError } from "@/lib/api/mapping";
import {
  emptyAttention,
  emptyCharts,
  emptyKpis,
  toAttention,
  toCharts,
  toKpis,
  type AttentionItems,
  type DashboardCharts,
  type DashboardKpis,
  type RawAttention,
  type RawCharts,
  type RawKpiReport,
} from "@/lib/api/analytics";
import type { AdminActor } from "@/lib/types";
import { toCsv, type CsvExport } from "@/lib/utils/csv";
import { DomainError, ValidationError } from "./errors";
import { logExport } from "./audit";

export type { AttentionItems, DashboardCharts, DashboardKpis, KpiValue, MonthPoint } from "@/lib/api/analytics";

/** Periods the screens offer. "today" is sent as a custom one-day window. */
export const ANALYTICS_PERIODS = ["today", "7d", "30d", "90d", "1y"] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

/** Today's date in Algeria (the backend counts days in Africa/Algiers). */
function algiersToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

function periodQuery(period: string): Record<string, string> {
  if (!(ANALYTICS_PERIODS as readonly string[]).includes(period)) {
    throw new ValidationError(`Unknown period ${period}`);
  }
  if (period === "today") {
    const today = algiersToday();
    return { period: "custom", from: today, to: today };
  }
  return { period };
}

/** KPIs of a period with the previous period. Never throws: a failed read answers `available: false`. */
export async function getDashboardKPIs(period: string = "30d"): Promise<DashboardKpis> {
  try {
    return toKpis(await api<RawKpiReport>("/admin/analytics/kpis", { query: periodQuery(period) }));
  } catch (error) {
    logReadError("analytics.kpis", error);
    return emptyKpis();
  }
}

/** Chart series of a period. Never throws: a failed read answers `available: false`. */
export async function getDashboardCharts(period: string = "30d"): Promise<DashboardCharts> {
  try {
    return toCharts(await api<RawCharts>("/admin/analytics/charts", { query: periodQuery(period) }));
  } catch (error) {
    logReadError("analytics.charts", error);
    return emptyCharts();
  }
}

/** Dashboard "needs your attention" counters. Never throws. */
export async function getAttentionItems(): Promise<AttentionItems> {
  try {
    return toAttention(await api<RawAttention>("/admin/dashboard/attention"));
  } catch (error) {
    logReadError("dashboard.attention", error);
    return emptyAttention();
  }
}

/** KPI summary report as CSV, built server-side from the live KPIs; the export is audited. */
export async function exportKpiReport(reportName: string, period: string, actor: AdminActor): Promise<CsvExport> {
  const k = await getDashboardKPIs(period);
  if (!k.available) throw new DomainError("The statistics cannot be read right now. Try again in a moment.");
  const csv = toCsv(
    [
      "Report",
      "From",
      "To",
      "Bookings",
      "Gross booking value (DZD)",
      "BLADUS net commission (DZD)",
      "Active listings",
      "Hosts with sales",
      "New users",
      "Cancellation rate (%)",
      "Average response time (min)",
      "Generated At",
    ],
    [
      [
        reportName,
        k.from,
        k.to,
        k.bookings.value,
        k.grossBookingValueDzd.value,
        k.commissionNetDzd.value,
        k.activeListings.value,
        k.activeHosts.value,
        k.newUsers.value,
        k.cancellationRatePercent.value,
        k.responseTimeMinutes?.value ?? "",
        new Date().toISOString(),
      ],
    ],
  );
  await logExport(actor, "kpi_report", 1, { reportName, period });
  const slug = reportName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "report";
  return { filename: `darna_${slug}_${new Date().toISOString().slice(0, 10)}.csv`, csv, rowCount: 1 };
}
