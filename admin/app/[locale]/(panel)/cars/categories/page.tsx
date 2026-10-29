import { getTranslations } from "next-intl/server";
import { guardPage } from "@/lib/auth/page-guard";
import CategoriesManagerClient from "@/components/management/CategoriesManagerClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("cars_categories");

export default async function CarCategoriesPage() {
  const denied = await guardPage("categories.manage");
  if (denied) return denied;
  const t = await getTranslations("cars");

  return (
    <CategoriesManagerClient
      title={t("categoriesPage.title")}
      subtitle={t("categoriesPage.subtitle")}
      backRoute="/cars"
      defaultVertical="vehicle"
      itemTypeLabel={t("categoriesPage.itemType")}
    />
  );
}
