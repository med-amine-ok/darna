import { getTranslations } from "next-intl/server";
import { guardPage } from "@/lib/auth/page-guard";
import CategoriesManagerClient from "@/components/management/CategoriesManagerClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("experiences_categories");

export default async function ExperienceCategoriesPage() {
  const denied = await guardPage("categories.manage");
  if (denied) return denied;
  const t = await getTranslations("experiences");

  return (
    <CategoriesManagerClient
      title={t("categoriesPage.title")}
      subtitle={t("categoriesPage.subtitle")}
      backRoute="/experiences"
      defaultVertical="experience"
      itemTypeLabel={t("categoriesPage.itemType")}
    />
  );
}
