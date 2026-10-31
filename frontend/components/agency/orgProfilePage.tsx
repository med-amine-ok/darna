import "server-only";
import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getOrganizationById, getOrganizationMembers } from "@/lib/data/organizations";
import { getHostListings } from "@/lib/data/listings";
import { getTrips } from "@/lib/data/trips";
import { toPublicMembers, toPublicOrganization } from "@/lib/server/dto";
import { OG_LOCALE, localeAlternates } from "@/lib/site";
import { orgProfileHref } from "@/lib/host-profile";
import type { PublicOrganization } from "@/types";
import AgencyProfileClient from "./AgencyProfileClient";

/**
 * Shared server side of the organization profile routes: /agencies, /hotels and /hostels.
 * Each route only serves its own category; a mismatched id redirects to the right route.
 */
type Category = PublicOrganization["businessCategory"];

export interface OrgProfileParams {
  params: { organizationId: string; locale: string };
}

// Shared by generateMetadata and the page so the organization is fetched once per request.
const loadOrganization = cache((id: string) => getOrganizationById(id));

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

  const path = orgProfileHref(organization);
  const title = organization.name;
  const description = excerpt(organization.description) || t(`metaDescription.${category}`, { name: organization.name });
  const images = organization.logo ? [{ url: organization.logo, alt: t("logoAlt", { name: organization.name }) }] : undefined;

  return {
    title,
    description,
    alternates: localeAlternates(locale, path),
    openGraph: { title, description, url: `/${locale}${path}`, locale: OG_LOCALE[locale], type: "profile", images },
    twitter: { card: "summary", title, description, images: organization.logo ? [organization.logo] : undefined },
  };
}

export async function OrgProfilePage({ params }: OrgProfileParams, category: Category) {
  const organization = await loadOrganization(params.organizationId);
  if (!organization) notFound();
  if (organization.businessCategory !== category) {
    permanentRedirect(`/${params.locale}${orgProfileHref(organization)}`);
  }

  const [members, listings, trips] = await Promise.all([
    getOrganizationMembers(organization.id),
    getHostListings({ organizationId: organization.id }),
    category === "agency" ? getTrips({ organizationId: organization.id }) : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-darnaBg pb-20 pt-6 sm:pt-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <AgencyProfileClient
          organization={toPublicOrganization(organization)}
          members={toPublicMembers(members)}
          listings={listings.filter((l) => l.status === "active")}
          trips={trips}
        />
      </div>
    </div>
  );
}
