import { getLocale } from "next-intl/server";
import AuditLogClient from "../../audit-log/AuditLogClient";

export default async function SettingsAuditLogPage() {
  const locale = await getLocale();
  return <AuditLogClient locale={locale} />;
}
