import { getLocale } from "next-intl/server";
import SearchClient from "./SearchClient";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const locale = await getLocale();
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  return <SearchClient initialQuery={q} locale={locale} />;
}
