"use client";

import React from "react";
import Image from "next/image";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/i18n/date-locale";
import { Trip } from "@/types";
import { tripTypeLabel } from "@/lib/catalog-types";
import PriceDisplay from "@/components/common/PriceDisplay";
import { BrandCalendarIcon, BrandStarIcon, BrandShieldIcon, BrandUsersIcon, BrandArrowRightIcon } from "@/components/icons";

interface TripCardProps {
  trip: Trip;
  onHover?: (id: string | null) => void;
  isHovered?: boolean;
  customHref?: string;
}

/**
 * Editorial portrait card for agency trips: 4:5 cover with scrim, serif title on the
 * photo, glass chips, price row underneath. Lifts and slowly zooms on hover.
 */
export default function TripCard({ trip, onHover, isHovered = false, customHref }: TripCardProps) {
  const nights = Math.max(1, trip.durationDays - 1);
  const t = useTranslations("trips");
  const locale = useLocale();
  const ratingText = trip.rating ? formatNumber(trip.rating, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  const agencyName = trip.organization?.name || t("card.verifiedAgency");
  const typeLabel = tripTypeLabel(trip.tripType, locale);

  return (
    <Link
      href={customHref || `/trips/${trip.id}`}
      onMouseEnter={() => onHover && onHover(trip.id)}
      onMouseLeave={() => onHover && onHover(null)}
      className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-4 focus-visible:ring-offset-darnaBg"
    >
      <div
        className={`relative aspect-[4/5] w-full rounded-3xl overflow-hidden bg-tertiary-100 transition-[box-shadow,transform] duration-base ease-out ${
          isHovered ? "shadow-e4 -translate-y-1.5" : "shadow-e1 group-hover:shadow-e3 group-hover:-translate-y-1"
        }`}
      >
        <Image
          src={trip.coverPhoto}
          alt=""
          fill
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 25vw"
          className={`object-cover transition-transform [transition-duration:800ms] ease-out group-hover:scale-[1.05]`}
        />
        <div aria-hidden="true" className="absolute inset-0 scrim-bottom" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary-900/35 to-transparent" />

        {/* Top chips */}
        <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between gap-2">
          <span className="glass-chip rounded-full ps-2 pe-3 py-1 text-[11px] font-semibold text-primary-900 flex items-center gap-1.5 shadow-e1 min-w-0">
            <BrandCalendarIcon size={13} className="text-secondary-700 shrink-0" aria-hidden="true" />
            <span className="truncate">{t("card.duration", { days: trip.durationDays, nights })}</span>
          </span>
          {trip.rating ? (
            <span className="glass-chip rounded-full px-2.5 py-1 text-[11px] font-semibold text-primary-900 flex items-center gap-1 shadow-e1 shrink-0 tabular-nums">
              <BrandStarIcon size={12} className="text-accent-600" aria-hidden="true" />
              <span className="sr-only">{t("card.ratingLabel", { rating: ratingText })}</span>
              <span aria-hidden="true">{ratingText}</span>
            </span>
          ) : (
            <span className="rounded-full px-2.5 py-1 bg-accent-600 text-[11px] font-semibold text-white shrink-0">{t("card.newBadge")}</span>
          )}
        </div>

        {/* Title block on the photo */}
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-eyebrow uppercase font-semibold text-tertiary-200">
            {typeLabel && (
              <>
                <span>{typeLabel}</span>
                <span aria-hidden="true"> · </span>
              </>
            )}
            {t("locationLine", { city: trip.city, country: t("countryAlgeria") })}
          </p>
          <h3 className="mt-2 font-serif text-[1.375rem] leading-tight line-clamp-2">{trip.title}</h3>
          <div className="mt-3 flex items-center gap-3 text-meta text-white/85">
            <span className="flex items-center gap-1.5 min-w-0">
              <BrandShieldIcon size={13} className="text-secondary-200 shrink-0" aria-hidden="true" />
              <span className="truncate">{agencyName}</span>
            </span>
            <span aria-hidden="true" className="text-white/40">·</span>
            <span className="flex items-center gap-1 shrink-0">
              <BrandUsersIcon size={13} className="shrink-0" aria-hidden="true" />
              <span className="sr-only">{t("card.maxGroupLabel", { count: trip.maxGroupSize })}</span>
              <span aria-hidden="true">{t("card.maxGroup", { count: trip.maxGroupSize })}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-end justify-between gap-3 px-1 pt-3.5">
        <div>
          <span className="block text-[11px] font-medium text-primary-500">{t("card.startingFrom")}</span>
          <PriceDisplay
            price={trip.pricePerPerson}
            period={t("card.perPerson")}
            priceClassName="text-[1.0625rem] font-semibold text-primary-900 tabular-nums"
            eurClassName="text-meta text-primary-500 tabular-nums"
          />
        </div>
        <span className="flex items-center gap-1 text-sm font-semibold text-primary-800">
          <span className="link-underline pb-0.5">{t("card.details")}</span>
          <BrandArrowRightIcon
            size={15}
            className="rtl:rotate-180 transition-transform duration-fast ease-out group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
