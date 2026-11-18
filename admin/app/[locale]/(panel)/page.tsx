import { guardPage } from "@/lib/auth/page-guard";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { getDashboardKPIs, getDashboardCharts, getAttentionItems } from "@/lib/data/analytics";
import { listAuditLogs } from "@/lib/data/audit";
import DashboardClient from "./DashboardClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("dashboard");

export default async function DashboardPage() {
  const denied = await guardPage(null);
  if (denied) return denied;

  const admin = await getCurrentAdmin();
  const canViewAudit = !!admin?.permissions.includes("audit.view");

  // Data layer reads never throw: a failed read answers `available: false` and the
  // dashboard shows its "cannot load" state for that block.
  const [kpisToday, kpis7d, kpis30d, charts30d, chartsYear, attention, recentAudit] = await Promise.all([
    getDashboardKPIs("today"),
    getDashboardKPIs("7d"),
    getDashboardKPIs("30d"),
    getDashboardCharts("30d"),
    getDashboardCharts("1y"),
    getAttentionItems(),
    canViewAudit ? listAuditLogs({ pageSize: 6 }) : Promise.resolve({ rows: [] }),
  ]);

  return (
    <DashboardClient
      kpisByPeriod={{ today: kpisToday, "7d": kpis7d, "30d": kpis30d }}
      charts={charts30d}
      monthly={chartsYear.available ? chartsYear.monthly : null}
      attention={attention}
      recentAudit={recentAudit.rows}
    />
  );
}
