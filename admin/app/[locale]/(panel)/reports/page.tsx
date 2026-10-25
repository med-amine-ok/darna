import { getLocale } from "next-intl/server";
import StatsClient from "../stats/StatsClient";

export default async function ReportsPage() {
  const locale = await getLocale();
  return <StatsClient locale={locale} initialTab="reports" />;
}
