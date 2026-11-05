import { guardPage } from "@/lib/auth/page-guard";
import CatalogTypesList from "@/components/management/CatalogTypesList";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("experiences_categories");

/** Canonical experience types (shared with the website), read-only with listing counts. */
export default async function ExperienceCategoriesPage() {
  const denied = await guardPage("categories.manage");
  if (denied) return denied;
  return <CatalogTypesList kind="experience" />;
}
