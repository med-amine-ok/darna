import { getLocale } from "next-intl/server";
import PromotionsClient from "../PromotionsClient";

export default async function FeaturedPage() {
  const locale = await getLocale();
  return <PromotionsClient locale={locale} initialTab="featured" />;
}
