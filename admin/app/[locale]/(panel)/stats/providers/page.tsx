import { guardPage } from "@/lib/auth/page-guard";
import { getLocale } from "next-intl/server";
import StatsClient from "../StatsClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("stats_providers");

export default async function ProvidersStatsPage() {
  const denied = await guardPage("reports.export");
  if (denied) return denied;

  const locale = await getLocale();
  return <StatsClient locale={locale} initialTab="providers" />;
}
