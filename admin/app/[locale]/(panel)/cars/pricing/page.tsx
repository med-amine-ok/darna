import { getTranslations } from "next-intl/server";
import { guardPage } from "@/lib/auth/page-guard";
import CategoriesManagerClient from "@/components/management/CategoriesManagerClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("cars_pricing");

export default async function CarPricingPage() {
  const denied = await guardPage("listings.view");
  if (denied) return denied;
  const t = await getTranslations("cars");

  return (
    <CategoriesManagerClient
      title={t("pricingPage.title")}
      subtitle={t("pricingPage.subtitle")}
      backRoute="/cars"
      defaultVertical="vehicle"
      itemTypeLabel={t("pricingPage.itemType")}
    />
  );
}
