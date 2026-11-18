import "server-only";
import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPublicListingsByHost } from "@/lib/data/listings";
import { getTrips } from "@/lib/data/trips";
import { getPublicOrganization, toPublicOrganizationFromApi } from "@/lib/api/public-organization";
import { OG_LOCALE, localeAlternates } from "@/lib/site";
import { ORG_PROFILE_PATH } from "@/lib/host-profile";
import type { PublicOrganization } from "@/types";
import AgencyProfileClient from "./AgencyProfileClient";

/**
 * Shared server side of the organization profile routes: /agencies, /hotels and /hostels,
 * from the API's public organisation (GET /organizations/{slug}). Each route only serves its
 * own category; a mismatched or id-based link redirects to the right route and slug.
 */
type Category = PublicOrganization["businessCategory"];

export interface OrgProfileParams {
  params: { organizationId: string; locale: string };
}

// Shared by generateMetadata and the page so the organization is fetched once per request.
const loadOrganization = cache(async (key: string) => {
  const raw = await getPublicOrganization(decodeURIComponent(key));
  return raw ? toPublicOrganizationFromApi(raw) : null;
});

const pathOf = (org: PublicOrganization) => `${ORG_PROFILE_PATH[org.businessCategory]}/${encodeURIComponent(org.slug || org.id)}`;

function excerpt(text: string | undefined, max = 160) {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export async function orgProfileMetadata({ params }: OrgProfileParams, category: Category): Promise<Metadata> {
  const { locale, organizationId } = params;
  const t = await getTranslations({ locale, namespace: "agencyPublic" });
  const organization = await loadOrganization(organizationId);
  if (!organization || organization.businessCategory !== category) {
    return { title: t(`metaTitleFallback.${category}`), robots: { index: false } };
  }

  const path = pathOf(organization);
  const title = organization.name;
  const description = excerpt(organization.description) || t(`metaDescription.${category}`, { name: organization.name });

  return {
    title,
    description,
    alternates: localeAlternates(locale, path),
    openGraph: { title, description, url: `/${locale}${path}`, locale: OG_LOCALE[locale], type: "profile" },
    twitter: { card: "summary", title, description },
  };
}

export async function OrgProfilePage({ params }: OrgProfileParams, category: Category) {
  const organization = await loadOrganization(params.organizationId);
  if (!organization) notFound();
  const canonicalKey = organization.slug || organization.id;
  if (organization.businessCategory !== category || decodeURIComponent(params.organizationId) !== canonicalKey) {
    permanentRedirect(`/${params.locale}${pathOf(organization)}`);
  }

  const [listings, trips] = await Promise.all([
    getPublicListingsByHost({ hostAccountId: organization.hostAccountId }),
    category === "agency" && organization.hostAccountId
      ? getTrips({ hostAccountId: organization.hostAccountId, limit: 100 })
      : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-darnaBg pb-20 pt-6 sm:pt-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* The API publishes no team list: members stay empty and the team card is hidden. */}
        <AgencyProfileClient organization={organization} members={[]} listings={listings} trips={trips} />
      </div>
    </div>
  );
}
