import { guardPage } from "@/lib/auth/page-guard";
import { getLocale } from "next-intl/server";
import SearchClient from "./SearchClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("search");

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const denied = await guardPage("listings.view");
  if (denied) return denied;

  const locale = await getLocale();
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  return <SearchClient initialQuery={q} locale={locale} />;
}
