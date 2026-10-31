import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getOrganizationById, getOrganizationMembers } from "@/lib/data/organizations";
import { getHostListings } from "@/lib/data/listings";
import { toPublicMembers, toPublicOrganization } from "@/lib/server/dto";
import { OG_LOCALE, localeAlternates } from "@/lib/site";
import AgencyProfileClient from "@/components/agency/AgencyProfileClient";

export const dynamic = "force-dynamic";

interface AgencyPageProps {
  params: { organizationId: string; locale: string };
}

// Shared by generateMetadata and the page so the organization is fetched once per request.
const loadOrganization = cache((id: string) => getOrganizationById(id));

function excerpt(text: string | undefined, max = 160) {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export async function generateMetadata({ params }: AgencyPageProps): Promise<Metadata> {
  const { locale, organizationId } = params;
  const t = await getTranslations({ locale, namespace: "agencyPublic" });
  const organization = await loadOrganization(organizationId);
  if (!organization) {
    return { title: t("metaTitleFallback"), robots: { index: false } };
  }

  const path = `/agencies/${encodeURIComponent(organization.id)}`;
  const title = organization.name;
  const description = excerpt(organization.description) || t("metaDescription", { name: organization.name });
  const images = organization.logo ? [{ url: organization.logo, alt: t("logoAlt", { name: organization.name }) }] : undefined;

  return {
    title,
    description,
    alternates: localeAlternates(locale, path),
    openGraph: {
      title,
      description,
      url: `/${locale}${path}`,
      locale: OG_LOCALE[locale],
      type: "profile",
      images,
    },
    twitter: { card: "summary", title, description, images: organization.logo ? [organization.logo] : undefined },
  };
}

export default async function AgencyPublicProfilePage({ params }: AgencyPageProps) {
  const organization = await loadOrganization(params.organizationId);

  if (!organization) {
    notFound();
  }

  const [members, listings] = await Promise.all([
    getOrganizationMembers(organization.id),
    getHostListings({ organizationId: organization.id }),
  ]);

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-darnaBg pb-20 pt-6 sm:pt-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <AgencyProfileClient
          organization={toPublicOrganization(organization)}
          members={toPublicMembers(members)}
          listings={listings.filter((l) => l.status === "active")}
        />
      </div>
    </div>
  );
}
