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

  const [kpis, charts, attention, recentAudit] = await Promise.all([
    getDashboardKPIs("30d"),
    getDashboardCharts("30d"),
    getAttentionItems(),
    canViewAudit ? listAuditLogs({ pageSize: 6 }) : Promise.resolve({ rows: [] }),
  ]);

  return (
    <DashboardClient
      initialKpis={kpis}
      initialCharts={charts}
      attention={attention}
      recentAudit={recentAudit.rows}
    />
  );
}
