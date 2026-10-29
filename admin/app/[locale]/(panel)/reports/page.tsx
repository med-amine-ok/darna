import { guardPage } from "@/lib/auth/page-guard";
import { getLocale } from "next-intl/server";
import StatsClient from "../stats/StatsClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("reports");

export default async function ReportsPage() {
  const denied = await guardPage("reports.export");
  if (denied) return denied;

  const locale = await getLocale();
  return <StatsClient locale={locale} initialTab="reports" />;
}
