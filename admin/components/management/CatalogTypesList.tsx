import { getLocale, getTranslations } from "next-intl/server";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { listListings } from "@/lib/data/listings";
import {
  EXPERIENCE_TYPES,
  TRIP_TYPES,
  EXPERIENCE_TYPE_LABELS,
  TRIP_TYPE_LABELS,
} from "@/lib/catalog-types";

/**
 * Read-only list of the canonical experience or trip types (lib/catalog-types.ts) with
 * the number of listings per type. The list is shared with the website (search filters,
 * host creation flows), so it is changed in code, not from the back office.
 */
export default async function CatalogTypesList({ kind }: { kind: "experience" | "trip" }) {
  const t = await getTranslations("catalogTypes");
  const locale = (await getLocale()) as "en" | "fr" | "ar";
  const { facets } = await listListings({ vertical: kind, page: 1, pageSize: 1 });
  const counts = (kind === "experience" ? facets?.experienceType : facets?.tripType) ?? {};
  const ids: readonly string[] = kind === "experience" ? EXPERIENCE_TYPES : TRIP_TYPES;
  const labels = (kind === "experience" ? EXPERIENCE_TYPE_LABELS : TRIP_TYPE_LABELS) as Record<
    string,
    { en: string; fr: string; ar: string }
  >;
  const total = ids.reduce((sum, id) => sum + (counts[id] ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={kind === "experience" ? t("experienceTitle") : t("tripTitle")}
        subtitle={kind === "experience" ? t("experienceSubtitle") : t("tripSubtitle")}
        actions={[
          {
            label: kind === "experience" ? t("backToExperiences") : t("backToTrips"),
            href: kind === "experience" ? "/experiences" : "/trips",
            variant: "outline",
          },
        ]}
      />

      <p className="flex items-start gap-2 rounded-xl bg-white p-4 text-xs text-primary-800 shadow-e1">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-secondary-700" aria-hidden="true" />
        <span>{t("sharedNote")}</span>
      </p>

      <div className="overflow-hidden rounded-2xl bg-white shadow-e1">
        <table className="w-full text-start text-sm">
          <caption className="sr-only">{kind === "experience" ? t("experienceTitle") : t("tripTitle")}</caption>
          <thead className="bg-darnaBg-50 text-xs text-primary-700">
            <tr>
              <th scope="col" className="px-4 py-3 text-start font-semibold">{t("columns.label")}</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">{t("columns.id")}</th>
              <th scope="col" className="px-4 py-3 text-end font-semibold">{t("columns.listings")}</th>
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => (
              <tr key={id} className="border-t border-primary/[0.06]">
                <td className="px-4 py-3">
                  <span className="block font-semibold text-primary-900">{labels[id][locale]}</span>
                  {locale !== "en" && <span className="block text-xs text-primary-600">{labels[id].en}</span>}
                </td>
                <td className="px-4 py-3">
                  <code className="rounded bg-darnaBg-100 px-1.5 py-0.5 text-xs text-primary-800">{id}</code>
                </td>
                <td className="px-4 py-3 text-end tabular-nums text-primary-900">{counts[id] ?? 0}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-primary/[0.1] bg-darnaBg-50">
              <th scope="row" colSpan={2} className="px-4 py-3 text-start text-xs font-semibold text-primary-700">
                {t("total")}
              </th>
              <td className="px-4 py-3 text-end font-semibold tabular-nums text-primary-900">{total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
