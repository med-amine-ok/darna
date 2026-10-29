import { getTranslations } from "next-intl/server";
import { guardPage } from "@/lib/auth/page-guard";
import CategoriesManagerClient from "@/components/management/CategoriesManagerClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("trips_categories");

export default async function TripCategoriesPage() {
  const denied = await guardPage("categories.manage");
  if (denied) return denied;
  const t = await getTranslations("trips");

  return (
    <CategoriesManagerClient
      title={t("categoriesPage.title")}
      subtitle={t("categoriesPage.subtitle")}
      backRoute="/trips"
      defaultVertical="trip"
      itemTypeLabel={t("categoriesPage.itemType")}
    />
  );
}
