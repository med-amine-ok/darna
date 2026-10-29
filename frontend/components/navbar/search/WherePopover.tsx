"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { BrandPinIcon } from "@/components/icons";
import { POPULAR_DESTINATIONS, type Destination } from "@/components/search/destinations";

export type DestinationItem = Destination;

interface WherePopoverProps {
  query: string;
  onSelect: (destination: Destination) => void;
}

export default function WherePopover({ query, onSelect }: WherePopoverProps) {
  const t = useTranslations("search");

  const filtered = useMemo(() => {
    if (!query || query.trim() === "") return POPULAR_DESTINATIONS;
    const lower = query.trim().toLowerCase();
    return POPULAR_DESTINATIONS.filter((d) =>
      [d.name, t(`destinations.${d.key}.name`), t(`destinations.${d.key}.tag`)].some((text) =>
        text.toLowerCase().includes(lower)
      )
    );
  }, [query, t]);

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-tertiary/70 p-3 w-80 sm:w-96 max-w-[calc(100vw-32px)] max-h-[380px] overflow-y-auto z-50">
      <h2 className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-neutral-600">
        {!query ? t("popularDestinations") : t("matchingDestinations")}
      </h2>

      <ul className="flex flex-col gap-1">
        {filtered.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl hover:bg-darnaBg/70 transition text-start group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              <span className="w-10 h-10 rounded-xl bg-neutral-100 group-hover:bg-accent/10 flex items-center justify-center shrink-0 transition text-neutral-600 group-hover:text-accent-700">
                <BrandPinIcon size={20} strokeWidth={1.8} className="shrink-0" />
              </span>
              <span className="flex flex-col min-w-0">
                <span className="font-semibold text-sm text-primary group-hover:text-accent-700 transition truncate">
                  {t(`destinations.${item.key}.name`)}
                </span>
                <span className="text-xs text-neutral-600 truncate">
                  {t("destinationMeta", { tag: t(`destinations.${item.key}.tag`), wilaya: item.wilaya })}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p role="status" className="px-4 py-6 text-center text-sm text-neutral-600">
          {t("noDestinationsFound", { query })}
        </p>
      )}
    </div>
  );
}
