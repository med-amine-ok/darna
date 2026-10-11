import { getAdminAuditLogs } from "@/lib/data/admin";
import AdminAuditLogClient from "@/components/admin/AdminAuditLogClient";

export default async function AdminAuditLogPage() {
  const logs = await getAdminAuditLogs();
  return <AdminAuditLogClient initialLogs={logs} />;
}
