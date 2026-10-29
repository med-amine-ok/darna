import { getTranslations } from "next-intl/server";
import { guardPage } from "@/lib/auth/page-guard";
import CategoriesManagerClient from "@/components/management/CategoriesManagerClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("cars_insurance");

export default async function CarInsurancePage() {
  const denied = await guardPage("listings.view");
  if (denied) return denied;
  const t = await getTranslations("cars");

  return (
    <CategoriesManagerClient
      title={t("insurancePage.title")}
      subtitle={t("insurancePage.subtitle")}
      backRoute="/cars"
      defaultVertical="vehicle"
      itemTypeLabel={t("insurancePage.itemType")}
    />
  );
}
