import { getLocale } from "next-intl/server";
import StatsClient from "./StatsClient";

export default async function StatsPage() {
  const locale = await getLocale();
  return <StatsClient locale={locale} initialTab="overview" />;
}
