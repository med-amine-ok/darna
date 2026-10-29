import { guardPage } from "@/lib/auth/page-guard";
import { getLocale } from "next-intl/server";
import PromotionsClient from "../PromotionsClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("promotions_featured");

export default async function FeaturedPage() {
  const denied = await guardPage("promotions.manage");
  if (denied) return denied;

  const locale = await getLocale();
  return <PromotionsClient locale={locale} initialTab="featured" />;
}
