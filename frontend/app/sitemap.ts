import type { MetadataRoute } from "next";
import { locales } from "@/i18n";
import { SITE_URL } from "@/lib/site";
import { getListings } from "@/lib/data/listings";
import { getTrips } from "@/lib/data/trips";
import { getPublicOrganizations } from "@/lib/api/public-organization";
import { ORG_PROFILE_PATH } from "@/lib/host-profile";

export const revalidate = 3600;

function entry(path: string, priority: number, lastModified?: string): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}/en${path}`,
    lastModified: lastModified ? new Date(lastModified) : undefined,
    priority,
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`])),
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Public reads only return published listings/trips and approved organisations.
  const [listings, trips, organizations] = await Promise.all([
    getListings({ limit: 200 }),
    getTrips({ limit: 200 }),
    getPublicOrganizations(),
  ]);

  return [
    entry("", 1),
    entry("/search", 0.8),
    entry("/help", 0.3),
    ...listings.map((l) => entry(`/listings/${l.id}`, 0.7, l.createdAt || undefined)),
    ...trips.map((t) => entry(`/trips/${t.slug || t.id}`, 0.6, t.createdAt || undefined)),
    ...organizations.map((o) => entry(`${ORG_PROFILE_PATH[o.business_category]}/${encodeURIComponent(o.slug)}`, 0.5)),
  ];
}
