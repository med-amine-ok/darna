"use client";

import React, { useState } from "react";
import Image from "next/image";
import { listingImageSrc } from "@/lib/placeholders";
import { useLocale, useTranslations } from "next-intl";
import { Listing } from "@/lib/types";
import { formatDzd, intlLocale } from "@/lib/utils/format";
import { MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface ListingsMapViewProps {
  listings: Listing[];
  onSelectListing?: (listing: Listing) => void;
  selectedListingId?: string | null;
}

export default function ListingsMapView({ listings, onSelectListing }: ListingsMapViewProps) {
  const t = useTranslations("listings.map");
  const tVerticals = useTranslations("verticals");
  const locale = useLocale();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(listings[0] || null);
  const compact = new Intl.NumberFormat(intlLocale(locale), {
    notation: "compact",
    maximumFractionDigits: 0,
  });

  return (
    <div className="relative w-full h-[600px] rounded-3xl overflow-hidden border border-primary/[0.08] shadow-darna-card bg-darnaBg-400 flex flex-col md:flex-row text-start">
      {/* Map Interactive Canvas / Stylized View */}
      <div className="flex-1 relative bg-darnaBg-300 overflow-hidden p-6 flex flex-col justify-between">
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#2E3A2F_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Top Floating Controls */}
        <div className="relative z-10 flex items-center justify-between gap-3 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-primary/[0.08] shadow-xs max-w-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <MapPin className="w-4 h-4 text-accent" aria-hidden="true" />
            <span id="listings-map-title">{t("title")}</span>
          </div>
          <span className="text-[11px] font-semibold text-secondary-700 tabular-nums">
            {t("pins", { count: listings.length })}
          </span>
        </div>

        {/* Pins Cluster Visualization across Algeria Coordinates */}
        <div className="relative flex-1 w-full my-4" role="group" aria-labelledby="listings-map-title">
          {listings.slice(0, 30).map((l) => {
            // Project lat/lng (Algeria roughly 19-37°N, -8-12°E) to relative percent.
            // Geographic projection: intentionally physical `left` (west → east), not mirrored in RTL.
            const latPercent = Math.max(10, Math.min(90, ((37 - l.coordinates.lat) / 18) * 100));
            const lngPercent = Math.max(10, Math.min(90, ((l.coordinates.lng + 8) / 20) * 100));
            const isSelected = selectedListing?.id === l.id;

            return (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setSelectedListing(l);
                  onSelectListing?.(l);
                }}
                style={{ top: `${latPercent}%`, left: `${lngPercent}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group transition-transform rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
                  isSelected ? "scale-125 z-30" : "hover:scale-115"
                }`}
                title={l.title}
                aria-label={t("pinLabel", { title: l.title, price: formatDzd(l.price, locale) })}
                aria-pressed={isSelected}
              >
                <div
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold shadow-xs transition-colors flex items-center gap-1 ${
                    isSelected
                      ? "bg-accent-600 text-white ring-2 ring-white"
                      : "bg-white text-primary hover:bg-secondary-700 hover:text-white border border-tertiary/80"
                  }`}
                >
                  <span className="tabular-nums" dir="ltr">{compact.format(l.price)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Territory Guide */}
        <div className="relative z-10 text-[11px] text-primary-700">
          {t("legend")}
        </div>
      </div>

      {/* Side Preview Card */}
      {selectedListing && (
        <div className="w-full md:w-80 bg-white p-5 border-t md:border-t-0 md:border-s border-primary/[0.08] flex flex-col justify-between shrink-0">
          <div>
            <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-3 bg-neutral-100">
              <Image
                src={listingImageSrc(selectedListing.imageSrc[0], selectedListing.category === "vehicle" ? "car" : selectedListing.category === "experience" ? "experience" : selectedListing.category === "trip" ? "trip" : "stay")}
                alt={selectedListing.title}
                fill
                sizes="(min-width: 768px) 320px, 100vw"
                className="object-cover"
              />
              <span className="absolute top-2 start-2 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase bg-primary-950/60 text-white backdrop-blur-xs">
                {tVerticals.has(selectedListing.category) ? tVerticals(selectedListing.category) : selectedListing.category}
              </span>
            </div>

            <h4 className="text-sm font-semibold text-primary leading-tight line-clamp-2">
              {selectedListing.title}
            </h4>
            <p className="text-xs text-primary-600 mt-1">
              {t("cityHost", { city: selectedListing.city, host: selectedListing.hostName })}
            </p>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="font-semibold tabular-nums text-primary text-sm">
                {formatDzd(selectedListing.price, locale)}
              </span>
              <span className="font-semibold text-amber-700 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                <span className="sr-only">{t("rating")}</span>
                {selectedListing.rating.toFixed(1)}
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onSelectListing?.(selectedListing)}
            className="w-full mt-4"
          >
            {t("moderate")}
          </Button>
        </div>
      )}
    </div>
  );
}
