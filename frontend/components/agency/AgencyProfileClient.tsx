"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { PublicOrganization, PublicMember, Listing } from "@/types";
import { formatDate, formatNumber } from "@/lib/i18n/date-locale";
import { imagery } from "@/lib/imagery";
import ListingCard from "@/components/listing/ListingCard";
import { RevealGroup, RevealItem, Reveal } from "@/components/motion/Reveal";
import { Avatar, Badge, Banner, Card, KitEmptyState } from "@/components/ui";
import ProfileHero, { realImage } from "@/components/profile/ProfileHero";
import {
  BrandClockIcon,
  BrandShieldIcon,
  BrandPinIcon,
  BrandUsersIcon,
  BrandMessageIcon,
  BrandStarIcon,
  BrandBuildingIcon,
} from "@/components/icons";

/** Public agency page: receives public projections only (no emails, phones or legal ids). */
interface AgencyProfileClientProps {
  organization: PublicOrganization;
  members: PublicMember[];
  listings: Listing[];
}

const COVERS: Record<PublicOrganization["businessCategory"], string> = {
  agency: imagery.carvedArch,
  hotel: imagery.riadPool,
  hostel: imagery.ghardaiaStreet,
};

export default function AgencyProfileClient({ organization, members, listings }: AgencyProfileClientProps) {
  const t = useTranslations("agencyPublic");
  const locale = useLocale();
  const isPending = !organization.isVerified;
  const hasRating = typeof organization.rating === "number" && organization.rating > 0;
  const num = (n: number) => formatNumber(n, locale);
  const since = formatDate(organization.createdAt, locale, { year: "numeric" });

  return (
    <div className="space-y-10">
      <ProfileHero
        name={organization.name}
        eyebrow={t(`category.${organization.businessCategory}`)}
        coverSrc={`${COVERS[organization.businessCategory]}?auto=format&fit=crop&w=1600&q=78`}
        portraitSrc={realImage(organization.logo)}
        portraitAlt={t("logoAlt", { name: organization.name })}
        portraitFit="contain"
        meta={
          <>
            {organization.businessType && (
              <span className="inline-flex items-center gap-1.5">
                <BrandBuildingIcon size={14} className="text-secondary-700" aria-hidden="true" />
                {organization.businessType}
              </span>
            )}
            {organization.country && (
              <>
                {organization.businessType && <span aria-hidden="true" className="text-primary-300">·</span>}
                <span className="inline-flex items-center gap-1.5">
                  <BrandPinIcon size={14} className="text-secondary-700" aria-hidden="true" />
                  {organization.country}
                </span>
              </>
            )}
            <span aria-hidden="true" className="text-primary-300">·</span>
            <span>{t("onDarnaSince", { year: since })}</span>
          </>
        }
        badges={
          isPending ? (
            <Badge tone="warning" icon={<BrandClockIcon size={13} />}>
              {t("pendingVerification")}
            </Badge>
          ) : (
            <Badge tone="success" icon={<BrandShieldIcon size={13} />}>
              {t(`verified.${organization.businessCategory}`)}
            </Badge>
          )
        }
        stats={[
          { label: t("propertiesManaged"), value: listings.length, format: num },
          { label: t("teamMembers"), value: members.length, format: num },
          {
            label: t("rating"),
            text: hasRating
              ? formatNumber(organization.rating as number, locale, { maximumFractionDigits: 2 })
              : t("noRating"),
            icon: hasRating ? <BrandStarIcon size={18} className="text-accent-600" aria-hidden="true" /> : undefined,
          },
          { label: t("reviewsReceived"), value: organization.reviewCount || 0, format: num },
        ]}
        statsLabel={t("statsLabel")}
      >
        {isPending && (
          <Banner tone="warning" title={t("reviewTitle")} className="mt-6">
            {t("reviewBody")}
          </Banner>
        )}
        {organization.description && (
          <p className="enter-up mt-6 max-w-3xl text-body-lg text-primary-700 [text-wrap:pretty]" style={{ animationDelay: "260ms" }}>
            {organization.description}
          </p>
        )}
      </ProfileHero>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Listings */}
        <section aria-labelledby="agency-listings" className="space-y-6 lg:order-2 lg:col-span-8">
          <Reveal as="header" className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-eyebrow uppercase font-semibold text-secondary-700">
                <span aria-hidden="true" className="h-px w-6 bg-secondary-600/60" />
                {t("listingsEyebrow")}
              </p>
              <h2 id="agency-listings" className="mt-3 font-serif text-display-md text-primary-900 [text-wrap:balance]">
                {t("listingsBy", { name: organization.name })}
              </h2>
            </div>
            <span className="text-meta text-primary-600">{t("listingCount", { count: listings.length })}</span>
          </Reveal>

          {listings.length === 0 ? (
            <Card padding="none">
              <KitEmptyState compact variant="search" title={t("noListings")} />
            </Card>
          ) : (
            <RevealGroup className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2">
              {listings.map((item) => (
                <RevealItem key={item.id}>
                  <ListingCard data={item} />
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </section>

        {/* Team & contact */}
        <aside className="space-y-6 lg:order-1 lg:col-span-4">
          <Reveal>
            <Card as="section" aria-labelledby="agency-team">
              <div className="flex items-center justify-between gap-3">
                <h2 id="agency-team" className="flex items-center gap-2 text-title font-semibold text-primary-900">
                  <BrandUsersIcon size={18} className="text-secondary-700" aria-hidden="true" />
                  <span>{t("team")}</span>
                </h2>
                <span className="shrink-0 text-meta text-primary-500">{t("memberCount", { count: members.length })}</span>
              </div>
              <ul className="mt-4 divide-y divide-primary/[0.08]">
                {members.map((mem) => (
                  <li key={mem.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={mem.name} src={realImage(mem.avatar)} size="md" decorative />
                      <span className="truncate text-body font-semibold text-primary-900">{mem.name}</span>
                    </div>
                    <Badge tone="sand">{t(`roles.${mem.role}`)}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>

          <Reveal delay={0.06}>
            <Card as="section" variant="sunken" aria-labelledby="agency-contact" className="relative overflow-hidden">
              <div aria-hidden="true" className="absolute -top-10 -end-10 h-32 w-32 rounded-full texture-zellige opacity-80" />
              <h2 id="agency-contact" className="relative font-serif text-heading text-primary-900">
                {t("contactAgency")}
              </h2>
              <p className="relative mt-3 flex items-start gap-3 text-body text-primary-700">
                <BrandMessageIcon size={18} className="mt-0.5 shrink-0 text-accent-600" aria-hidden="true" />
                <span>{t(`contactNote.${organization.businessCategory}`)}</span>
              </p>
            </Card>
          </Reveal>
        </aside>
      </div>
    </div>
  );
}
