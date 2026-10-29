"use client";

import React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { PublicOrganization, PublicMember, Listing } from "@/types";
import { formatNumber } from "@/lib/i18n/date-locale";
import ListingCard from "@/components/listing/ListingCard";
import Avatar from "@/components/Avatar";
import {
  BrandClockIcon,
  BrandShieldIcon,
  BrandPinIcon,
  BrandUsersIcon,
  BrandMessageIcon,
  BrandStarIcon,
} from "@/components/icons";

/** Public agency page: receives public projections only (no emails, phones or legal ids). */
interface AgencyProfileClientProps {
  organization: PublicOrganization;
  members: PublicMember[];
  listings: Listing[];
}

export default function AgencyProfileClient({
  organization,
  members,
  listings,
}: AgencyProfileClientProps) {
  const t = useTranslations("agencyPublic");
  const locale = useLocale();
  const isPending = !organization.isVerified;
  const hasRating = typeof organization.rating === "number" && organization.rating > 0;

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-tertiary shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-tertiary bg-neutral-50 shrink-0">
              <Image
                src={organization.logo || "/assets/logo-vertical.png"}
                alt={t("logoAlt", { name: organization.name })}
                fill
                sizes="96px"
                className="object-contain p-2"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-3xl font-bold text-primary font-serif">{organization.name}</h1>
                {isPending ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-200">
                    <BrandClockIcon size={14} aria-hidden="true" /> {t("pendingVerification")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">
                    <BrandShieldIcon size={14} aria-hidden="true" /> {t(`verified.${organization.businessCategory}`)}
                  </span>
                )}
              </div>

              <div className="text-xs text-neutral-500 flex flex-wrap items-center gap-3">
                {organization.businessType && (
                  <span className="font-semibold text-primary">{organization.businessType}</span>
                )}
                {organization.country && (
                  <>
                    {organization.businessType && <span aria-hidden="true">·</span>}
                    <span className="flex items-center gap-1">
                      <BrandPinIcon size={14} className="text-secondary" aria-hidden="true" />
                      {organization.country}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Verification Alert if Pending */}
        {isPending && (
          <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
            <BrandClockIcon size={18} className="shrink-0 mt-0.5 text-amber-700" aria-hidden="true" />
            <div>
              <div className="font-bold">{t("reviewTitle")}</div>
              <div className="text-amber-800 mt-0.5">{t("reviewBody")}</div>
            </div>
          </div>
        )}

        {/* Bio */}
        {organization.description && (
          <p className="mt-6 text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-3xl">
            {organization.description}
          </p>
        )}

        {/* Quick Stats Grid */}
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-tertiary/40">
          <div>
            <dt className="text-xs text-neutral-500 font-medium">{t("propertiesManaged")}</dt>
            <dd className="text-2xl font-bold text-primary font-serif mt-0.5">
              {formatNumber(listings.length, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 font-medium">{t("teamMembers")}</dt>
            <dd className="text-2xl font-bold text-primary font-serif mt-0.5">
              {formatNumber(members.length, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 font-medium">{t("rating")}</dt>
            <dd className="text-2xl font-bold text-primary font-serif mt-0.5 flex items-center gap-1.5">
              <BrandStarIcon size={20} className="text-accent fill-accent" aria-hidden="true" />
              <span>
                {hasRating
                  ? formatNumber(organization.rating as number, locale, { maximumFractionDigits: 2 })
                  : t("noRating")}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 font-medium">{t("reviewsReceived")}</dt>
            <dd className="text-2xl font-bold text-primary font-serif mt-0.5">
              {formatNumber(organization.reviewCount || 0, locale)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Start column: Team & Contact */}
        <div className="lg:col-span-4 space-y-6">
          {/* Team Members Card */}
          <section className="bg-white rounded-3xl p-6 border border-tertiary shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-primary text-base font-serif flex items-center gap-2">
                <BrandUsersIcon size={18} className="text-secondary" aria-hidden="true" />
                <span>{t("team")}</span>
              </h2>
              <span className="text-xs text-neutral-500 font-medium">
                {t("memberCount", { count: members.length })}
              </span>
            </div>

            <ul className="divide-y divide-tertiary/40">
              {members.map((mem) => (
                <li key={mem.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <Avatar src={mem.avatar} size={36} />
                    <div className="font-bold text-primary">{mem.name}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-tertiary/30 text-primary">
                    {t(`roles.${mem.role}`)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Contact Agency Card */}
          <section className="bg-white rounded-3xl p-6 border border-tertiary shadow-sm space-y-3.5 text-xs text-neutral-700">
            <h2 className="font-bold text-primary text-base font-serif">{t("contactAgency")}</h2>
            <div className="flex items-center gap-2.5">
              <BrandMessageIcon size={16} className="text-secondary shrink-0" aria-hidden="true" />
              <span>{t(`contactNote.${organization.businessCategory}`)}</span>
            </div>
          </section>
        </div>

        {/* End column: Managed Fleet & Properties */}
        <section className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary font-serif">
              {t("listingsBy", { name: organization.name })}
            </h2>
            <span className="text-xs text-neutral-500">{t("listingCount", { count: listings.length })}</span>
          </div>

          {listings.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-tertiary text-center text-xs text-neutral-500 shadow-xs">
              {t("noListings")}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {listings.map((item) => (
                <ListingCard key={item.id} data={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
