import { getLocale } from "next-intl/server";
import StatsClient from "../StatsClient";

export default async function ReportsStatsPage() {
  const locale = await getLocale();
  return <StatsClient locale={locale} initialTab="reports" />;
}
