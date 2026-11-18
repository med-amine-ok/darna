"use server";

import * as analytics from "@/lib/data/analytics";
import { runAction, str, oneOf } from "@/lib/auth/run-action";

const period = (value: unknown) => oneOf(value ?? "30d", analytics.ANALYTICS_PERIODS, "period");

export async function getDashboardKPIs(p: string = "30d") {
  return runAction("reports.export", () => analytics.getDashboardKPIs(period(p)));
}

export async function getDashboardCharts(p: string = "30d") {
  return runAction("reports.export", () => analytics.getDashboardCharts(period(p)));
}

export async function exportKpiReport(reportName: string, p: string = "30d") {
  return runAction("reports.export", (actor) =>
    analytics.exportKpiReport(str(reportName, "reportName", 200), period(p), actor)
  );
}
