import { getDashboardKPIs, getDashboardCharts, getAttentionItems } from "@/lib/data/analytics";
import { listAuditLogs } from "@/lib/data/audit";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const [kpis, charts, attention, recentAudit] = await Promise.all([
    getDashboardKPIs("30d"),
    getDashboardCharts("30d"),
    getAttentionItems(),
    listAuditLogs({ pageSize: 6 }),
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
