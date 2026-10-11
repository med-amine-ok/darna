import { getAdminKPIs, getAdminCharts } from "@/lib/data/admin";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export default async function AdminDashboardPage() {
  const [kpis, charts] = await Promise.all([
    getAdminKPIs(),
    getAdminCharts("30d"),
  ]);

  return <AdminDashboardClient kpis={kpis} charts={charts} />;
}
