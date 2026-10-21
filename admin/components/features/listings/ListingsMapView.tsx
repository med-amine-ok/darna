"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Listing } from "@/lib/types";
import { formatDzd } from "@/lib/utils/format";
import { MapPin, Star, Building } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface ListingsMapViewProps {
  listings: Listing[];
  onSelectListing: (listing: Listing) => void;
  selectedListingId?: string | null;
}

export default function ListingsMapView({ listings, onSelectListing }: ListingsMapViewProps) {
  const [selectedListing, setSelectedListing] = useState<Listing | null>(listings[0] || null);

  return (
    <div className="relative w-full h-[600px] rounded-3xl overflow-hidden border border-tertiary/70 shadow-darna-card bg-[#E5E0D5] flex flex-col md:flex-row text-start">
      {/* Map Interactive Canvas / Stylized View */}
      <div className="flex-1 relative bg-[#EFECE0] overflow-hidden p-6 flex flex-col justify-between">
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#2E3A2F_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Top Floating Controls */}
        <div className="relative z-10 flex items-center justify-between gap-3 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-tertiary/70 shadow-xs max-w-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <MapPin className="w-4 h-4 text-accent" />
            <span>Interactive Algerian Territory Map</span>
          </div>
          <span className="text-[11px] font-bold text-secondary tabular-nums">
            {listings.length} Pins
          </span>
        </div>

        {/* Pins Cluster Visualization across Algeria Coordinates */}
        <div className="relative flex-1 w-full my-4">
          {listings.slice(0, 30).map((l, idx) => {
            // Project lat/lng (Algeria roughly 19-37°N, -8-12°E) to relative percent
            const latPercent = Math.max(10, Math.min(90, ((37 - l.coordinates.lat) / 18) * 100));
            const lngPercent = Math.max(10, Math.min(90, ((l.coordinates.lng + 8) / 20) * 100));
            const isSelected = selectedListing?.id === l.id;

            return (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setSelectedListing(l);
                  onSelectListing(l);
                }}
                style={{ top: `${latPercent}%`, left: `${lngPercent}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group transition-transform ${
                  isSelected ? "scale-125 z-30" : "hover:scale-115"
                }`}
                title={l.title}
              >
                <div
                  className={`px-2 py-1 rounded-full text-[10px] font-bold shadow-xs transition-colors flex items-center gap-1 ${
                    isSelected
                      ? "bg-accent text-white ring-2 ring-white"
                      : "bg-white text-primary hover:bg-secondary hover:text-white border border-tertiary/80"
                  }`}
                >
                  <span className="tabular-nums">{Math.round(l.price / 1000)}k</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Territory Guide */}
        <div className="relative z-10 text-[10px] text-neutral-400">
          * Pins distributed across Algerian wilayas from Coastal Tell to Sahara Plateau.
        </div>
      </div>

      {/* Side Preview Card */}
      {selectedListing && (
        <div className="w-full md:w-80 bg-white p-5 border-t md:border-t-0 md:border-s border-tertiary/60 flex flex-col justify-between shrink-0">
          <div>
            <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-3 bg-neutral-100">
              <Image
                src={selectedListing.imageSrc[0] || "/assets/house.png"}
                alt={selectedListing.title}
                fill
                className="object-cover"
              />
              <span className="absolute top-2 start-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-black/60 text-white backdrop-blur-xs">
                {selectedListing.category}
              </span>
            </div>

            <h4 className="text-sm font-bold text-primary leading-tight line-clamp-2">
              {selectedListing.title}
            </h4>
            <p className="text-xs text-neutral-500 mt-1">
              {selectedListing.city} · Host: {selectedListing.hostName}
            </p>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="font-bold font-mono text-primary text-sm">
                {formatDzd(selectedListing.price)}
              </span>
              <span className="font-semibold text-amber-600 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {selectedListing.rating.toFixed(1)}
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onSelectListing(selectedListing)}
            className="w-full mt-4"
          >
            Moderate Listing Details
          </Button>
        </div>
      )}
    </div>
  );
}
