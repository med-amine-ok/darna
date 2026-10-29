"use server";

import * as analytics from "@/lib/data/analytics";
import { runAction, str } from "@/lib/auth/run-action";

export async function getDashboardKPIs(period: string = "30d") {
  return runAction("reports.export", () => analytics.getDashboardKPIs(str(period, "period", 20)));
}

export async function getDashboardCharts(period: string = "30d") {
  return runAction("reports.export", () => analytics.getDashboardCharts(str(period, "period", 20)));
}

export async function exportKpiReport(reportName: string, period: string = "30d") {
  return runAction("reports.export", (actor) =>
    analytics.exportKpiReport(str(reportName, "reportName", 200), str(period, "period", 20), actor)
  );
}
