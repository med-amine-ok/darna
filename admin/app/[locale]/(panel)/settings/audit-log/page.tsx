import { guardPage } from "@/lib/auth/page-guard";
import { getLocale } from "next-intl/server";
import AuditLogClient from "./AuditLogClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("settings_auditlog");

export default async function SettingsAuditLogPage() {
  const denied = await guardPage("audit.view");
  if (denied) return denied;

  const locale = await getLocale();
  return <AuditLogClient locale={locale} />;
}
