"use client";

import React, { useMemo } from "react";
import Image from "next/image";

export interface DestinationItem {
  id: string;
  name: string;
  country: string;
  fullLabel: string;
  code: string;
}

export const popularDestinations: DestinationItem[] = [
  { id: "dz-1", name: "Tipaza", country: "Algeria", fullLabel: "Tipaza, Algeria", code: "DZ" },
  { id: "dz-2", name: "Alger", country: "Algeria", fullLabel: "Alger, Algeria", code: "DZ" },
  { id: "dz-3", name: "Oran", country: "Algeria", fullLabel: "Oran, Algeria", code: "DZ" },
  { id: "dz-4", name: "Constantine", country: "Algeria", fullLabel: "Constantine, Algeria", code: "DZ" },
  { id: "dz-5", name: "Taghit", country: "Algeria", fullLabel: "Taghit, Saoura, Algeria", code: "DZ" },
  { id: "fr-1", name: "Paris", country: "France", fullLabel: "Paris, France", code: "FR" },
  { id: "es-1", name: "Barcelona", country: "Spain", fullLabel: "Barcelona, Spain", code: "ES" },
  { id: "it-1", name: "Rome", country: "Italy", fullLabel: "Rome, Italy", code: "IT" },
  { id: "nl-1", name: "Amsterdam", country: "Netherlands", fullLabel: "Amsterdam, Netherlands", code: "NL" },
];

interface Props {
  query: string;
  onSelect: (destination: DestinationItem) => void;
}

export default function WherePopover({ query, onSelect }: Props) {
  const filtered = useMemo(() => {
    if (!query || query.trim() === "") return popularDestinations;
    const lower = query.toLowerCase();
    return popularDestinations.filter((d) =>
      d.fullLabel.toLowerCase().includes(lower)
    );
  }, [query]);

  // Helper to highlight matching characters
  const highlightMatch = (text: string, queryStr: string) => {
    if (!queryStr) return text;
    const index = text.toLowerCase().indexOf(queryStr.toLowerCase());
    if (index === -1) return text;

    const before = text.slice(0, index);
    const match = text.slice(index, index + queryStr.length);
    const after = text.slice(index + queryStr.length);

    return (
      <>
        {before}
        <span className="font-bold text-neutral-900">{match}</span>
        {after}
      </>
    );
  };

  return (
    <div className="bg-surface rounded-3xl shadow-2xl border border-tertiary/60 p-3 w-80 sm:w-96 max-w-[calc(100vw-32px)] max-h-[380px] overflow-y-auto z-50">
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-xs text-primary/50">
            No destinations found matching &quot;{query}&quot;
          </div>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full flex items-center gap-3.5 p-2.5 rounded-2xl hover:bg-tertiary/20 transition text-start cursor-pointer group"
            >
              {/* Location Pin Icon in rounded box */}
              <div className="w-10 h-10 rounded-xl bg-tertiary/20 group-hover:bg-surface flex items-center justify-center flex-shrink-0 transition border border-transparent group-hover:border-tertiary/40 shadow-2xs">
                <Image
                  src="/assets/location.png"
                  alt="Location"
                  width={20}
                  height={28}
                  className="object-contain"
                />
              </div>
              <div className="text-sm font-medium text-primary truncate">
                {highlightMatch(item.fullLabel, query)}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
