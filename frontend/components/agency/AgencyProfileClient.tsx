"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { PublicOrganization, PublicMember, Listing, Trip } from "@/types";
import { formatDate, formatNumber } from "@/lib/i18n/date-locale";
import { imagery } from "@/lib/imagery";
import ListingCard from "@/components/listing/ListingCard";
import TripCard from "@/components/trips/TripCard";
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
  BrandLightningIcon,
  BrandCompassIcon,
} from "@/components/icons";

/**
 * Public organization profile, one layout per host category:
 *  - agency  (/agencies/[id]): trips and circuits first, then its stays, vehicles and experiences
 *  - hotel   (/hotels/[id]):   star class, rooms, check-in times and hotel amenities
 *  - hostel  (/hostels/[id]):  house rules (curfew, ages), check-in times and facilities
 * Receives public projections only (no emails, phones or legal ids).
 */
interface AgencyProfileClientProps {
  organization: PublicOrganization;
  members: PublicMember[];
  listings: Listing[];
  trips?: Trip[];
}

const COVERS: Record<PublicOrganization["businessCategory"], string> = {
  agency: imagery.carvedArch,
  hotel: imagery.riadPool,
  hostel: imagery.ghardaiaStreet,
};

function SectionTitle({ id, eyebrow, title, count }: { id: string; eyebrow: string; title: string; count?: string }) {
  return (
    <Reveal as="header" className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-eyebrow uppercase font-semibold text-secondary-700">
          <span aria-hidden="true" className="h-px w-6 bg-secondary-600/60" />
          {eyebrow}
        </p>
        <h2 id={id} className="mt-3 font-serif text-display-md text-primary-900 [text-wrap:balance]">
          {title}
        </h2>
      </div>
      {count && <span className="text-meta text-primary-600">{count}</span>}
    </Reveal>
  );
}

/** Label/value rows for the facts card. */
function Facts({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="mt-4 divide-y divide-primary/[0.08]">
      {rows.map((r) => (
        <div key={r.label} className="flex items-start justify-between gap-4 py-3">
          <dt className="text-body text-primary-600">{r.label}</dt>
          <dd className="text-end text-body font-semibold text-primary-900">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function AgencyProfileClient({ organization, members, listings, trips = [] }: AgencyProfileClientProps) {
  const t = useTranslations("agencyPublic");
  const locale = useLocale();
  const category = organization.businessCategory;
  const isPending = !organization.isVerified;
  const hasRating = typeof organization.rating === "number" && organization.rating > 0;
  const num = (n: number) => formatNumber(n, locale);
  const since = formatDate(organization.createdAt, locale, { year: "numeric" });

  const ratingStat = {
    label: t("rating"),
    text: hasRating ? formatNumber(organization.rating as number, locale, { maximumFractionDigits: 2 }) : t("noRating"),
    icon: hasRating ? <BrandStarIcon size={18} className="text-accent-600" aria-hidden="true" /> : undefined,
  };
  const reviewsStat = { label: t("reviewsReceived"), value: organization.reviewCount || 0, format: num };
  const stats =
    category === "agency"
      ? [{ label: t("tripsStat"), value: trips.length, format: num }, { label: t("propertiesManaged"), value: listings.length, format: num }, ratingStat, reviewsStat]
      : category === "hotel"
        ? [
            { label: t("hotelClass"), text: organization.hotelStarRating ? t("stars", { count: organization.hotelStarRating }) : t("notRated") },
            { label: t("roomsStat"), value: organization.totalRoomCount ?? listings.length, format: num },
            ratingStat,
            reviewsStat,
          ]
        : [
            { label: t("roomsAndDorms"), value: organization.totalRoomCount ?? listings.length, format: num },
            { label: t("teamMembers"), value: members.length, format: num },
            ratingStat,
            reviewsStat,
          ];

  /** Amenity / facility keys from host settings ("breakfast_included") to labels. */
  const facilityLabel = (key: string) =>
    t.has(`facilities.${key}`) ? t(`facilities.${key}`) : key.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  const facilities = category === "hotel" ? organization.hotelAmenities ?? [] : category === "hostel" ? organization.hostelFacilities ?? [] : [];

  const times = (organization.checkInTime || organization.checkOutTime) && [
    ...(organization.checkInTime ? [{ label: t("checkIn"), value: <span className="tabular-nums">{organization.checkInTime}</span> }] : []),
    ...(organization.checkOutTime ? [{ label: t("checkOut"), value: <span className="tabular-nums">{organization.checkOutTime}</span> }] : []),
  ];
  const confirmation = {
    label: t("confirmation"),
    value: organization.bookingApprovalMode === "request" ? t("onRequest") : (
      <span className="inline-flex items-center gap-1 text-secondary-700">
        <BrandLightningIcon size={14} aria-hidden="true" />
        {t("instant")}
      </span>
    ),
  };

  const factsRows =
    category === "hotel"
      ? [
          {
            label: t("hotelClass"),
            value: organization.hotelStarRating ? (
              <span className="inline-flex items-center gap-0.5 text-accent-600" aria-label={t("stars", { count: organization.hotelStarRating })}>
                {Array.from({ length: organization.hotelStarRating }).map((_, i) => (
                  <BrandStarIcon key={i} size={14} aria-hidden="true" />
                ))}
              </span>
            ) : (
              t("notRated")
            ),
          },
          ...(organization.totalRoomCount ? [{ label: t("roomsStat"), value: num(organization.totalRoomCount) }] : []),
          ...(times || []),
          confirmation,
        ]
      : category === "hostel"
        ? [
            ...(times || []),
            ...(organization.curfewPolicy ? [{ label: t("curfew"), value: organization.curfewPolicy }] : []),
            ...(organization.agePolicy ? [{ label: t("ages"), value: organization.agePolicy }] : []),
            confirmation,
          ]
        : [
            ...(organization.businessType ? [{ label: t("licence"), value: organization.businessType }] : []),
            { label: t("tripsStat"), value: num(trips.length) },
            confirmation,
          ];

  return (
    <div className="space-y-10">
      <ProfileHero
        name={organization.name}
        eyebrow={t(`category.${category}`)}
        coverSrc={`${COVERS[category]}?auto=format&fit=crop&w=1600&q=78`}
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
          <>
            {isPending ? (
              <Badge tone="warning" icon={<BrandClockIcon size={13} />}>
                {t("pendingVerification")}
              </Badge>
            ) : (
              <Badge tone="success" icon={<BrandShieldIcon size={13} />}>
                {t(`verified.${category}`)}
              </Badge>
            )}
            {category === "hotel" && organization.hotelStarRating ? (
              <Badge tone="sand" icon={<BrandStarIcon size={13} />}>
                {t("stars", { count: organization.hotelStarRating })}
              </Badge>
            ) : null}
          </>
        }
        stats={stats}
        statsLabel={t(`statsLabel.${category}`)}
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
        <div className="space-y-14 lg:order-2 lg:col-span-8">
          {/* Agency trips */}
          {category === "agency" && (
            <section aria-labelledby="org-trips" className="space-y-6">
              <SectionTitle
                id="org-trips"
                eyebrow={t("tripsEyebrow")}
                title={t("tripsBy", { name: organization.name })}
                count={t("tripCount", { count: trips.length })}
              />
              {trips.length === 0 ? (
                <Card padding="none">
                  <KitEmptyState compact variant="search" title={t("noTrips")} />
                </Card>
              ) : (
                <RevealGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {trips.map((trip) => (
                    <RevealItem key={trip.id}>
                      <TripCard trip={trip} customHref={`/trips/${trip.slug || trip.id}`} />
                    </RevealItem>
                  ))}
                </RevealGroup>
              )}
            </section>
          )}

          {/* Listings */}
          <section aria-labelledby="org-listings" className="space-y-6">
            <SectionTitle
              id="org-listings"
              eyebrow={t(`listingsEyebrow.${category}`)}
              title={t(`listingsBy.${category}`, { name: organization.name })}
              count={t("listingCount", { count: listings.length })}
            />
            {listings.length === 0 ? (
              <Card padding="none">
                <KitEmptyState compact variant="search" title={t(`noListings.${category}`)} />
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
        </div>

        {/* Facts, facilities, team & contact */}
        <aside className="space-y-6 lg:order-1 lg:col-span-4">
          <Reveal>
            <Card as="section" aria-labelledby="org-facts">
              <h2 id="org-facts" className="flex items-center gap-2 text-title font-semibold text-primary-900">
                {category === "agency" ? (
                  <BrandCompassIcon size={18} className="text-secondary-700" aria-hidden="true" />
                ) : (
                  <BrandBuildingIcon size={18} className="text-secondary-700" aria-hidden="true" />
                )}
                <span>{t(`factsTitle.${category}`)}</span>
              </h2>
              <Facts rows={factsRows} />
            </Card>
          </Reveal>

          {facilities.length > 0 && (
            <Reveal delay={0.04}>
              <Card as="section" aria-labelledby="org-facilities">
                <h2 id="org-facilities" className="text-title font-semibold text-primary-900">
                  {t(`facilitiesTitle.${category}`)}
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {facilities.map((f) => (
                    <li key={f}>
                      <Badge tone="sand">{facilityLabel(f)}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          )}

          <Reveal delay={0.06}>
            <Card as="section" aria-labelledby="org-team">
              <div className="flex items-center justify-between gap-3">
                <h2 id="org-team" className="flex items-center gap-2 text-title font-semibold text-primary-900">
                  <BrandUsersIcon size={18} className="text-secondary-700" aria-hidden="true" />
                  <span>{t(`team.${category}`)}</span>
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

          <Reveal delay={0.08}>
            <Card as="section" variant="sunken" aria-labelledby="org-contact" className="relative overflow-hidden">
              <div aria-hidden="true" className="absolute -top-10 -end-10 h-32 w-32 rounded-full texture-zellige opacity-80" />
              <h2 id="org-contact" className="relative font-serif text-heading text-primary-900">
                {t(`contactTitle.${category}`)}
              </h2>
              <p className="relative mt-3 flex items-start gap-3 text-body text-primary-700">
                <BrandMessageIcon size={18} className="mt-0.5 shrink-0 text-accent-600" aria-hidden="true" />
                <span>{t(`contactNote.${category}`)}</span>
              </p>
            </Card>
          </Reveal>
        </aside>
      </div>
    </div>
  );
}
