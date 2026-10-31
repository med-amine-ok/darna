"use client";

import React, { useId, useMemo } from "react";
import { useTranslations } from "next-intl";
import { BrandPinIcon, BrandSearchIcon } from "@/components/icons";
import { POPULAR_DESTINATIONS, type Destination } from "@/components/search/destinations";

export type DestinationItem = Destination;

interface WherePopoverProps {
  query: string;
  onQueryChange?: (value: string) => void;
  onSelect: (destination: Destination) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Taller list for full-screen use (search modal). */
  tall?: boolean;
}

/** Destination picker: free-text field + popular wilayas (numbered like Algerian plates). */
export default function WherePopover({ query, onQueryChange, onSelect, placeholder, autoFocus = true, tall = false }: WherePopoverProps) {
  const t = useTranslations("search");
  const inputId = useId();

  const filtered = useMemo(() => {
    if (!query || query.trim() === "") return POPULAR_DESTINATIONS;
    const lower = query.trim().toLowerCase();
    return POPULAR_DESTINATIONS.filter((d) =>
      [d.name, t(`destinations.${d.key}.name`), t(`destinations.${d.key}.tag`)].some((text) => text.toLowerCase().includes(lower))
    );
  }, [query, t]);

  return (
    <div className={tall ? "w-full" : "w-[min(26rem,calc(100vw-2rem))]"}>
      {onQueryChange && (
        <div className="relative mb-2">
          <label htmlFor={inputId} className="sr-only">
            {placeholder ?? t("bar.home.wherePlaceholder")}
          </label>
          <BrandSearchIcon size={18} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-primary-500" aria-hidden="true" />
          <input
            id={inputId}
            type="search"
            autoComplete="off"
            autoFocus={autoFocus}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered[0]) {
                e.preventDefault();
                onSelect(filtered[0]);
              }
            }}
            placeholder={placeholder ?? t("bar.home.wherePlaceholder")}
            className="h-12 w-full rounded-xl bg-darnaBg-300/60 ps-11 pe-4 text-base text-primary-900 placeholder:text-primary-500 outline-none ring-1 ring-transparent transition-[box-shadow,background-color] duration-fast focus:bg-white focus:ring-primary/15 focus-visible:ring-2 focus-visible:ring-accent-600 sm:text-sm"
          />
        </div>
      )}

      <h2 className="px-2 pb-1.5 pt-1 text-eyebrow uppercase font-semibold text-primary-500">
        {!query ? t("popularDestinations") : t("matchingDestinations")}
      </h2>

      <ul className={tall ? "-mx-1" : "-mx-1 max-h-[340px] overflow-y-auto overscroll-contain"}>
        {filtered.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start cursor-pointer transition-colors duration-fast ease-standard hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600"
            >
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tertiary-100 text-primary-700 transition-colors duration-fast group-hover:bg-accent-50 group-hover:text-accent-700">
                <BrandPinIcon size={20} strokeWidth={1.75} />
                <span className="absolute -bottom-1 -end-1 rounded-md bg-white px-1 text-[11px] font-semibold tabular-nums text-primary-700 shadow-e1">
                  {String(item.wilaya).padStart(2, "0")}
                </span>
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold text-primary-900">{t(`destinations.${item.key}.name`)}</span>
                <span className="truncate text-meta text-primary-500">{t(`destinations.${item.key}.tag`)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p role="status" className="px-4 py-6 text-center text-sm text-primary-600">
          {t("noDestinationsFound", { query })}
        </p>
      )}
    </div>
  );
}
