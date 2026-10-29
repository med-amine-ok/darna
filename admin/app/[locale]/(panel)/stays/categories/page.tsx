import { getTranslations } from "next-intl/server";
import { guardPage } from "@/lib/auth/page-guard";
import CategoriesManagerClient from "@/components/management/CategoriesManagerClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("stays_categories");

export default async function StayCategoriesPage() {
  const denied = await guardPage("categories.manage");
  if (denied) return denied;

  const t = await getTranslations("stays");

  return (
    <CategoriesManagerClient
      title={t("categoriesPage.title")}
      subtitle={t("categoriesPage.subtitle")}
      backRoute="/stays"
      defaultVertical="home"
      itemTypeLabel={t("categoriesPage.itemLabel")}
    />
  );
}
