import { getLocale } from "next-intl/server";
import StatsClient from "../StatsClient";

export default async function ServicesStatsPage() {
  const locale = await getLocale();
  return <StatsClient locale={locale} initialTab="services" />;
}
