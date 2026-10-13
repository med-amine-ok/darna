import { getAdminKPIs, getAdminCharts, getAdminAnalyticsDetailed } from "@/lib/data/admin";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export default async function AdminDashboardPage() {
  const [kpis, charts, detailed] = await Promise.all([
    getAdminKPIs(),
    getAdminCharts("30d"),
    getAdminAnalyticsDetailed("30d"),
  ]);

  return <AdminDashboardClient kpis={kpis} charts={charts} detailed={detailed} />;
}
