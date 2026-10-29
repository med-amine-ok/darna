"use client";

import React from "react";
import { ImageCarousel } from "./ImageCarousel";
import { MapPin, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatDzd, intlLocale } from "@/lib/utils/format";

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
}) => {
  const locale = useLocale();
  const t = useTranslations("uiKit.livePreview");
  const imageList = images && images.length > 0 ? images : [imageSrc || "/placeholder-stay.jpg"];
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
      className={`bg-white rounded-2xl border border-tertiary-200/80 shadow-darna-card overflow-hidden ${className}`}
    >
      <div className="p-3 border-b border-neutral-100 flex items-center justify-between">
        <span className="text-xs font-bold text-primary">{previewTitle ?? t("title")}</span>
        <span className="text-[10px] text-neutral-500 font-medium">{t("live")}</span>
      </div>

      {/* Hero Image Carousel */}
      <ImageCarousel images={imageList} statusBadge={statusBadge} alt={headingTitle} />

      {/* Card Info */}
      <div className="p-4 space-y-3">
        <div>
          {propertyType && (
            <span className="text-[11px] font-semibold text-secondary-700 uppercase tracking-wider block mb-1">
              {propertyType}
            </span>
          )}
          <h3 className="font-bold text-sm text-primary leading-tight">
            {headingTitle}
          </h3>
          <div className="flex items-center justify-between text-xs text-neutral-500 mt-1">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
              <span>{loc}</span>
            </span>
            {priceDzd ? (
              <span className="font-bold text-primary text-xs">
                {formatDzd(priceDzd, locale)}
              </span>
            ) : rating ? (
              <span className="inline-flex items-center gap-1 font-semibold text-neutral-700">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" aria-hidden="true" />
                <span>{rating}</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Badges / Specs */}
        {badges.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5 py-1.5 border-y border-neutral-100">
            {badges.map((b, idx) => (
              <div
                key={idx}
                className="flex items-center justify-center gap-1 p-1.5 rounded-lg bg-neutral-50 text-[11px] font-semibold text-neutral-700 text-center"
              >
                {b.icon}
                <span className="truncate">{b.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Short Description */}
        {description && (
          <p className="text-xs text-neutral-500 line-clamp-3 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};
