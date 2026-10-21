"use client";

import React, { useMemo } from "react";
import { BrandPinIcon } from "@/components/icons";

export interface DestinationItem {
  id: string;
  name: string;
  region: string;
  country: string;
  fullLabel: string;
}

export const POPULAR_DESTINATIONS: DestinationItem[] = [
  { id: "dz-tipaza", name: "Tipaza", region: "Tipaza Coast", country: "Algeria", fullLabel: "Tipaza, Algeria" },
  { id: "dz-algiers", name: "Algiers", region: "Casbah & Bay", country: "Algeria", fullLabel: "Algiers, Algeria" },
  { id: "dz-oran", name: "Oran", region: "Santa Cruz & Waterfront", country: "Algeria", fullLabel: "Oran, Algeria" },
  { id: "dz-constantine", name: "Constantine", region: "City of Bridges", country: "Algeria", fullLabel: "Constantine, Algeria" },
  { id: "dz-taghit", name: "Taghit", region: "Saoura Dunes", country: "Algeria", fullLabel: "Taghit, Algeria" },
  { id: "dz-djanet", name: "Djanet", region: "Tassili n'Ajjer", country: "Algeria", fullLabel: "Djanet, Algeria" },
  { id: "dz-ghardaia", name: "Ghardaïa", region: "M'Zab Valley", country: "Algeria", fullLabel: "Ghardaïa, Algeria" },
  { id: "dz-annaba", name: "Annaba", region: "Seraïdi & Cap de Garde", country: "Algeria", fullLabel: "Annaba, Algeria" },
  { id: "dz-tlemcen", name: "Tlemcen", region: "El Mechouar", country: "Algeria", fullLabel: "Tlemcen, Algeria" },
];

interface WherePopoverProps {
  query: string;
  onSelect: (destination: DestinationItem) => void;
}

export default function WherePopover({ query, onSelect }: WherePopoverProps) {
  const filtered = useMemo(() => {
    if (!query || query.trim() === "") return POPULAR_DESTINATIONS;
    const lower = query.toLowerCase();
    return POPULAR_DESTINATIONS.filter((d) =>
      d.fullLabel.toLowerCase().includes(lower) || d.region.toLowerCase().includes(lower)
    );
  }, [query]);

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-tertiary/70 p-3 w-80 sm:w-96 max-w-[calc(100vw-32px)] max-h-[380px] overflow-y-auto z-50">
      <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
        {!query ? "Popular destinations in Algeria" : "Matching destinations"}
      </div>

      <div className="flex flex-col gap-1">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl hover:bg-darnaBg/70 transition text-start group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-neutral-100 group-hover:bg-accent/10 flex items-center justify-center shrink-0 transition text-neutral-500 group-hover:text-accent">
              <BrandPinIcon
                size={20}
                strokeWidth={1.8}
                className="shrink-0"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-primary group-hover:text-accent transition truncate">
                {item.name}
              </span>
              <span className="text-xs text-neutral-500 truncate">
                {item.region} · {item.country}
              </span>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-neutral-400">
            No destinations found matching &quot;{query}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
