"use client";

import React from "react";
import { ImageCarousel } from "./ImageCarousel";
import { MapPin, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatDzd, intlLocale } from "@/lib/utils/format";
import { listingImages, type PlaceholderKind } from "@/lib/placeholders";

export interface LivePreviewCardProps {
  title: string;
  previewTitle?: string;
  images?: string[];
  imageSrc?: string;
  propertyType?: string;
  location?: string;
  locationText?: string;
  priceDzd?: number;
  guestCapacity?: number;
  bedroomCount?: number;
  surfaceM2?: number;
  ratingText?: string;
  badges?: { icon?: React.ReactNode; label: string }[];
  description?: string;
  statusBadge?: React.ReactNode;
  className?: string;
  /** Branded placeholder kind when no real photo is available yet. */
  placeholderKind?: PlaceholderKind;
}

export const LivePreviewCard: React.FC<LivePreviewCardProps> = ({
  title,
  previewTitle,
  images,
  imageSrc,
  propertyType,
  location,
  locationText,
  priceDzd,
  guestCapacity,
  bedroomCount,
  surfaceM2,
  ratingText,
  badges = [],
  description,
  statusBadge,
  className = "",
  placeholderKind = "stay",
}) => {
  const locale = useLocale();
  const t = useTranslations("uiKit.livePreview");
  const imageList = listingImages(images && images.length > 0 ? images : [imageSrc], placeholderKind);
  const loc = location || locationText || t("sampleLocation");
  const rating =
    ratingText ??
    t("sampleRating", {
      rating: new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 1 }).format(4.9),
      count: 128,
    });
  const headingTitle = title || t("untitled");
  return (
    <div
      className={`bg-white rounded-2xl shadow-e1 overflow-hidden ${className}`}
    >
      <div className="px-4 py-3 border-b border-primary/[0.06] flex items-center justify-between">
        <span className="text-xs font-semibold text-primary-900">{previewTitle ?? t("title")}</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-secondary-800 font-semibold"><span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-secondary-600 animate-pulse" />{t("live")}</span>
      </div>

      {/* Hero Image Carousel */}
      <ImageCarousel images={imageList} statusBadge={statusBadge} alt={headingTitle} placeholderKind={placeholderKind} />

      {/* Card Info */}
      <div className="p-4 space-y-3">
        <div>
          {propertyType && (
            <span className="text-eyebrow font-semibold text-secondary-700 uppercase block mb-1">
              {propertyType}
            </span>
          )}
          <h3 className="font-semibold text-sm text-primary-900 leading-snug">
            {headingTitle}
          </h3>
          <div className="flex items-center justify-between gap-2 text-xs text-primary-600 mt-1">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-secondary-600 shrink-0" aria-hidden="true" />
              <span>{loc}</span>
            </span>
            {priceDzd ? (
              <span className="font-semibold text-primary-900 text-xs tabular-nums whitespace-nowrap">
                {formatDzd(priceDzd, locale)}
              </span>
            ) : rating ? (
              <span className="inline-flex items-center gap-1 font-semibold text-primary-800">
                <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" aria-hidden="true" />
                <span>{rating}</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Badges / Specs */}
        {badges.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5 py-2 border-y border-primary/[0.06]">
            {badges.map((b, idx) => (
              <div
                key={idx}
                className="flex items-center justify-center gap-1 p-1.5 rounded-lg bg-darnaBg-100 text-[11px] font-semibold text-primary-800 text-center"
              >
                {b.icon}
                <span className="truncate">{b.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Short Description */}
        {description && (
          <p className="text-xs text-primary-600 line-clamp-3 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};
