import { getLocale } from "next-intl/server";
import StatsClient from "../StatsClient";

export default async function WilayasStatsPage() {
  const locale = await getLocale();
  return <StatsClient locale={locale} initialTab="wilayas" />;
}
