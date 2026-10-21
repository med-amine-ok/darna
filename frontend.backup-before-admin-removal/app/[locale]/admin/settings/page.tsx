import { getPlatformSettings } from "@/lib/data/admin";
import AdminSettingsClient from "@/components/admin/AdminSettingsClient";

export default async function AdminSettingsPage() {
  const settings = await getPlatformSettings();
  return <AdminSettingsClient initialSettings={settings} />;
}
