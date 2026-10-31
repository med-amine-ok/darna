"use client";

import React, { useEffect, useId, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type qs from "query-string";
import { Checkbox, Radio, cn } from "@/components/ui";
import { formatNumber } from "@/lib/i18n/date-locale";
import { COMMUNES, WILAYAS, communeLabel, findWilaya, wilayaLabel } from "@/lib/algeria";
import {
  BrandChevronDownIcon,
  BrandCloseIcon,
  BrandCompassIcon,
  BrandPinIcon,
  BrandSearchIcon,
  CategoryHotelIcon,
  CategoryHouseIcon,
  CategoryVehicleIcon,
  PremiumStarIcon,
} from "@/components/icons";
import PriceRange, { STEP, priceStats } from "./PriceRange";
import {
  AMENITY_GROUPS,
  DURATION_BUCKETS,
  EXPERIENCE_LENGTHS,
  FILTER_PARAMS,
  countSideFilters,
  hasAmenity,
  matchesListing,
  matchesTrip,
  matchesType,
  parseSideFilters,
  useSearchFacets,
  type FilterGroup,
  type ListingFacet,
  type TripFacet,
} from "./searchFacets";

/* ------------------------------------------------------------------ Options */

/** URL values (sent as is) with their label key in `filters`. */
const PROPERTY_TYPES = [
  { id: "Entire home", key: "entireHome" },
  { id: "Private room", key: "privateRoom" },
  { id: "Hotel", key: "hotelResort" },
  { id: "Hostel", key: "hostelDorms" },
  { id: "Villa", key: "villa" },
  { id: "Riad", key: "riad" },
  { id: "Apartment", key: "apartment" },
] as const;

const CATEGORIES = [
  { id: "all", Icon: PremiumStarIcon },
  { id: "home", Icon: CategoryHouseIcon },
  { id: "hotel", Icon: CategoryHotelIcon },
  { id: "experience", Icon: BrandPinIcon },
  { id: "vehicle", Icon: CategoryVehicleIcon },
  { id: "trip", Icon: BrandCompassIcon },
] as const;

const LANGUAGE_CODES: Record<string, string> = {
  arabic: "ar",
  french: "fr",
  english: "en",
  spanish: "es",
  german: "de",
  italian: "it",
  kabyle: "kab",
  tamazight: "ber",
};

const RATINGS = [4.8, 4.5, 4] as const;
const SHOWN = 6;

type ParamGroup = Exclude<FilterGroup, "price">;

/** Filters that only make sense inside one category; cleared when the category changes. */
const CATEGORY_SCOPED: ParamGroup[] = [
  "types",
  "subtypes",
  "bedrooms",
  "bathrooms",
  "stars",
  "transmissions",
  "fuels",
  "seats",
  "expLengths",
  "languages",
  "durations",
  "months",
  "group",
  "agencies",
  "amenities",
];

/* ------------------------------------------------------------------ Building blocks */

/** Collapsible section with a chevron header; shows how many of its options are active. */
function Section({
  title,
  active = 0,
  defaultOpen = true,
  children,
}: {
  title: string;
  active?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || active > 0);
  const id = useId();
  return (
    <section className="border-t border-primary/[0.08]">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 py-4 text-start text-body font-semibold text-primary-900 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
        >
          <span className="min-w-0 flex-1">{title}</span>
          {active > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-800 px-1.5 text-[11px] font-bold tabular-nums text-white">
              {active}
            </span>
          )}
          <BrandChevronDownIcon size={16} className={cn("shrink-0 text-primary-500 transition-transform duration-fast ease-standard", open && "rotate-180")} />
        </button>
      </h3>
      <div id={id} className={cn("grid transition-[grid-template-rows] duration-base ease-standard", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className={cn("min-h-0 overflow-hidden", !open && "invisible")}>
          <div className="pb-5">{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Option label with an optional second line and its result count at the end of the row. */
function OptionLabel({ label, sub, count }: { label: React.ReactNode; sub?: React.ReactNode; count: number }) {
  const locale = useLocale();
  const t = useTranslations("filters.sidebar");
  return (
    <span className="flex w-full items-baseline justify-between gap-3">
      <span className="min-w-0">
        <span className={cn("block truncate text-sm font-medium", count === 0 ? "text-primary-400" : "text-primary-800")}>{label}</span>
        {sub && <span className="block truncate text-meta text-primary-500">{sub}</span>}
      </span>
      <span className="shrink-0 text-meta tabular-nums text-primary-500">
        <span aria-hidden="true">{formatNumber(count, locale)}</span>
        <span className="sr-only">{t("optionCount", { count })}</span>
      </span>
    </span>
  );
}

function MoreToggle({ expanded, onToggle, moreLabel }: { expanded: boolean; onToggle: () => void; moreLabel?: string }) {
  const t = useTranslations("filters.sidebar");
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="mt-2 text-sm font-semibold text-secondary-700 underline-offset-4 hover:underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
    >
      {expanded ? t("seeLess") : moreLabel ?? t("seeMore")}
    </button>
  );
}

interface CheckItem {
  id: string;
  label: React.ReactNode;
  sub?: React.ReactNode;
  count: number;
}

/** Checkbox list; options without results are hidden unless selected (or `keepEmpty`). */
function CheckList({
  items,
  selected,
  onToggle,
  limit = SHOWN,
  keepEmpty = false,
}: {
  items: CheckItem[];
  selected: string[];
  onToggle: (id: string) => void;
  limit?: number;
  keepEmpty?: boolean;
}) {
  const [all, setAll] = useState(false);
  const visible = items.filter((i) => keepEmpty || i.count > 0 || selected.includes(i.id));
  const shown = all ? visible : visible.slice(0, limit);
  if (visible.length === 0) return null;
  return (
    <>
      <ul className="space-y-0.5">
        {shown.map((i) => (
          <li key={i.id}>
            <Checkbox checked={selected.includes(i.id)} onChange={() => onToggle(i.id)} label={<OptionLabel label={i.label} sub={i.sub} count={i.count} />} />
          </li>
        ))}
      </ul>
      {visible.length > limit && <MoreToggle expanded={all} onToggle={() => setAll((v) => !v)} />}
    </>
  );
}

/** "Any / 2+ / 3+" pills. `counts[i]` is the result count for `values[i]` (undefined = any). */
function MinPills({
  label,
  values,
  value,
  counts,
  format,
  onChange,
}: {
  label: string;
  values: (number | undefined)[];
  value?: number;
  counts: number[];
  format: (n: number) => string;
  onChange: (n?: number) => void;
}) {
  const t = useTranslations("filters.sidebar");
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {values.map((n, i) => {
        const selected = value === n;
        return (
          <button
            key={n ?? "any"}
            type="button"
            aria-pressed={selected}
            disabled={!selected && counts[i] === 0}
            onClick={() => onChange(n)}
            className={cn(
              "h-9 min-w-[2.75rem] rounded-full px-3.5 text-sm font-semibold cursor-pointer transition-[background-color,color,box-shadow] duration-fast ease-standard",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40",
              selected ? "bg-primary-800 text-white shadow-e1" : "bg-darnaBg text-primary-800 ring-1 ring-primary/[0.1] hover:ring-primary/30"
            )}
          >
            {n ? format(n) : t("any")}
          </button>
        );
      })}
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 mt-4 text-eyebrow uppercase font-semibold text-primary-500 first:mt-0">{children}</p>;
}

/* ------------------------------------------------------------------ Sidebar */

interface SearchFilterSidebarProps {
  isTrips: boolean;
  /** Current category (`vertical` param); undefined = all. */
  vertical?: string;
  /** Results per category for this search. */
  categoryCounts?: Record<string, number>;
  onUpdate: (params: qs.StringifiableRecord) => void;
  className?: string;
}

/**
 * Desktop filter sidebar for /search. Every change applies at once (results stay on screen
 * while the next ones load); each option shows how many results it would give with the
 * other filters kept. Place filters use the official wilaya codes and communes. Sections
 * follow the category: stays (type, rooms, hotel class, amenities), vehicles (type, gearbox,
 * fuel, seats), experiences (type, length, languages), trips (length, month, group, agency).
 * Phones and tablets keep the filter modal.
 */
export default function SearchFilterSidebar({ isTrips, vertical, categoryCounts, onUpdate, className }: SearchFilterSidebarProps) {
  const t = useTranslations("filters.sidebar");
  const tFilters = useTranslations("filters");
  const tAmenities = useTranslations("amenities");
  const tSearch = useTranslations("search");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const pool = useSearchFacets((s) => s.pool);
  const tripPool = useSearchFacets((s) => s.tripPool);

  const filters = useMemo(() => parseSideFilters((k) => searchParams?.get(k)), [searchParams]);
  const activeCount = countSideFilters(filters);

  /** Items that pass every filter except the `skip` groups. */
  const L = (skip: FilterGroup | FilterGroup[]) => pool.filter((f) => matchesListing(f, filters, skip));
  const T = (skip: FilterGroup | FilterGroup[]) => tripPool.filter((f) => matchesTrip(f, filters, skip));
  const by = <F,>(items: F[], test: (f: F) => boolean) => items.filter(test).length;

  const set = (patch: Record<string, string | undefined>) => onUpdate({ ...patch, selectedId: undefined });
  const toggle = (group: ParamGroup, values: (string | number)[], value: string | number) => {
    const next = values.includes(value as never) ? values.filter((v) => v !== value) : [...values, value];
    set({ [FILTER_PARAMS[group]]: next.length ? next.join(",") : undefined });
  };
  const setMin = (group: ParamGroup) => (n?: number) => set({ [FILTER_PARAMS[group]]: n ? String(n) : undefined });
  const fmt = (n: number, digits = 0) => formatNumber(n, locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const code = (n: number) => String(n).padStart(2, "0");

  const isStays = !isTrips && (!vertical || vertical === "home" || vertical === "hotel");
  const isVehicles = vertical === "vehicle";
  const isExperiences = vertical === "experience";

  /* ---------------------------------------------------------------- Place */
  const [wilayaQuery, setWilayaQuery] = useState("");
  const [allWilayas, setAllWilayas] = useState(false);
  const wilayaItems = useMemo(() => {
    const base: { wilaya?: number }[] = isTrips
      ? tripPool.filter((f) => matchesTrip(f, filters, ["wilayas", "communes"]))
      : pool.filter((f) => matchesListing(f, filters, ["wilayas", "communes"]));
    const counts = new Map<number, number>();
    for (const f of base) if (f.wilaya) counts.set(f.wilaya, (counts.get(f.wilaya) ?? 0) + 1);
    return WILAYAS.map((w) => ({ w, count: counts.get(w.code) ?? 0, label: wilayaLabel(w, locale) })).sort(
      (a, b) => b.count - a.count || a.w.code - b.w.code
    );
  }, [isTrips, tripPool, pool, filters, locale]);
  const q = wilayaQuery.trim().toLowerCase();
  const wilayaMatches = q
    ? wilayaItems.filter((i) => i.label.toLowerCase().includes(q) || i.w.name.toLowerCase().includes(q) || code(i.w.code).startsWith(q))
    : wilayaItems;
  const withResults = wilayaMatches.filter((i) => i.count > 0 || filters.wilayas.includes(i.w.code));
  const wilayaShown = q || allWilayas ? wilayaMatches : withResults.slice(0, SHOWN);

  const communeItems: CheckItem[] = useMemo(() => {
    const base: { commune?: string }[] = isTrips
      ? tripPool.filter((f) => matchesTrip(f, filters, "communes"))
      : pool.filter((f) => matchesListing(f, filters, "communes"));
    const counts = new Map<string, number>();
    for (const f of base) if (f.commune) counts.set(f.commune, (counts.get(f.commune) ?? 0) + 1);
    return COMMUNES.filter((c) => !filters.wilayas.length || filters.wilayas.includes(c.wilaya))
      .map((c) => {
        const w = findWilaya(c.wilaya);
        return { id: c.name, label: communeLabel(c.name, locale), sub: w ? `${code(w.code)} · ${wilayaLabel(w, locale)}` : undefined, count: counts.get(c.name) ?? 0 };
      })
      .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label), locale));
  }, [isTrips, tripPool, pool, filters, locale]);

  /* ---------------------------------------------------------------- Price */
  const prices = useMemo(() => (isTrips ? tripPool : pool).map((f) => f.price), [isTrips, tripPool, pool]);
  const { floor, ceil, histogram } = useMemo(() => priceStats(prices), [prices]);
  const [draft, setDraft] = useState<{ min: string; max: string }>({ min: "", max: "" });
  useEffect(() => {
    setDraft({ min: filters.minPrice ? String(filters.minPrice) : "", max: filters.maxPrice ? String(filters.maxPrice) : "" });
  }, [filters.minPrice, filters.maxPrice]);
  // Apply a moment after the last change (slider drag or typing).
  useEffect(() => {
    const min = draft.min || undefined;
    const max = draft.max || undefined;
    if (min === (filters.minPrice ? String(filters.minPrice) : undefined) && max === (filters.maxPrice ? String(filters.maxPrice) : undefined)) return;
    const timer = setTimeout(() => set({ minPrice: min, maxPrice: max }), 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  const low = Math.min(Math.max(Number(draft.min) || floor, floor), ceil);
  const high = Math.max(Math.min(Number(draft.max) || ceil, ceil), floor);

  /* ---------------------------------------------------------------- Helpers per category */
  const subtypeItems = (base: ListingFacet[]): CheckItem[] => {
    const counts = new Map<string, number>();
    for (const f of pool) if (f.rawType && !counts.has(f.rawType)) counts.set(f.rawType, 0);
    for (const f of base) if (f.rawType) counts.set(f.rawType, (counts.get(f.rawType) ?? 0) + 1);
    for (const s of filters.subtypes) if (!counts.has(s)) counts.set(s, 0);
    return Array.from(counts, ([id, count]) => ({ id, label: id, count })).sort((a, b) => b.count - a.count);
  };
  const languageName = (name: string) => {
    const lang = LANGUAGE_CODES[name.toLowerCase()];
    try {
      return lang ? new Intl.DisplayNames([locale], { type: "language" }).of(lang) ?? name : name;
    } catch {
      return name;
    }
  };
  const monthFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : locale, { month: "long" });
  const monthName = (m: number) => monthFmt.format(new Date(2026, m - 1, 1));

  /* ---------------------------------------------------------------- Active filter chips */
  const chips: { key: string; label: string; patch: Record<string, string | undefined> }[] = [];
  const listChips = (group: ParamGroup, values: (string | number)[], label: (v: string | number) => string) => {
    for (const v of values) {
      const rest = values.filter((x) => x !== v);
      chips.push({ key: `${group}:${v}`, label: label(v), patch: { [FILTER_PARAMS[group]]: rest.length ? rest.join(",") : undefined } });
    }
  };
  listChips("wilayas", filters.wilayas, (v) => {
    const w = findWilaya(Number(v));
    return w ? `${code(w.code)} · ${wilayaLabel(w, locale)}` : String(v);
  });
  listChips("communes", filters.communes, (v) => communeLabel(String(v), locale));
  listChips("types", filters.types, (v) => {
    const pt = PROPERTY_TYPES.find((p) => p.id === v);
    return pt ? tFilters(pt.key) : String(v);
  });
  listChips("subtypes", filters.subtypes, String);
  if (filters.minPrice || filters.maxPrice) {
    chips.push({ key: "price", label: `${fmt(filters.minPrice ?? floor)} - ${fmt(filters.maxPrice ?? ceil)} DZD`, patch: { minPrice: undefined, maxPrice: undefined } });
  }
  listChips("amenities", filters.amenities, (v) => (AMENITY_GROUPS[String(v)] ? tAmenities(String(v)) : String(v)));
  if (filters.minBedrooms && filters.minBedrooms > 1) chips.push({ key: "bed", label: t("bedroomsAtLeast", { count: filters.minBedrooms }), patch: { roomCount: undefined } });
  if (filters.minBathrooms && filters.minBathrooms > 1) chips.push({ key: "bath", label: t("bathroomsAtLeast", { count: filters.minBathrooms }), patch: { bathroomCount: undefined } });
  if (filters.minStars) chips.push({ key: "stars", label: t("starsAtLeast", { count: filters.minStars }), patch: { stars: undefined } });
  listChips("transmissions", filters.transmissions, (v) => t(`transmissionTypes.${v}`));
  listChips("fuels", filters.fuels, (v) => t(`fuelTypes.${v}`));
  if (filters.minSeats) chips.push({ key: "seats", label: t("seatsAtLeast", { count: filters.minSeats }), patch: { seats: undefined } });
  listChips("expLengths", filters.expLengths, (v) => t(`expLength.${v}`));
  listChips("languages", filters.languages, (v) => languageName(String(v)));
  listChips("durations", filters.durations, (v) => t(`duration.${v}`));
  listChips("months", filters.months, (v) => monthName(Number(v)));
  if (filters.minGroup) chips.push({ key: "group", label: t("groupAtLeast", { count: filters.minGroup }), patch: { groupSize: undefined } });
  listChips("agencies", filters.agencies, String);
  if (filters.instant) chips.push({ key: "instant", label: t("instantBook"), patch: { instantBook: undefined } });
  if (filters.favorite) chips.push({ key: "favorite", label: t("guestFavorite"), patch: { isGuestFavorite: undefined } });
  if (filters.freeCancel) chips.push({ key: "cancel", label: t("freeCancellation"), patch: { freeCancellation: undefined } });
  listChips("hosts", filters.hosts, (v) => t(`hostTypes.${v}`));
  if (filters.minRating) chips.push({ key: "rating", label: t("ratingAtLeast", { rating: fmt(filters.minRating, 1) }), patch: { minRating: undefined } });

  const clearAll = () => {
    setDraft({ min: "", max: "" });
    onUpdate({ ...Object.fromEntries(Object.values(FILTER_PARAMS).map((k) => [k, undefined])), minPrice: undefined, maxPrice: undefined, selectedId: undefined });
  };

  const changeCategory = (id: string) => {
    const scoped = Object.fromEntries(CATEGORY_SCOPED.map((g) => [FILTER_PARAMS[g], undefined]));
    setDraft({ min: "", max: "" });
    onUpdate({ ...scoped, minPrice: undefined, maxPrice: undefined, vertical: id === "all" ? undefined : id, selectedId: undefined });
  };

  const nameBase = useId();
  const currentCategory = vertical ?? "all";
  const ratingBase: { rating: number }[] = isTrips ? T("rating") : L("rating");

  return (
    <aside aria-label={t("label")} className={cn("rounded-3xl bg-white px-5 pb-3 shadow-e1 ring-1 ring-primary/[0.05]", className)}>
      {/* Header + active filters (sticky inside the scrolling sidebar) */}
      <div className="sticky top-0 z-[1] -mx-5 rounded-t-3xl bg-white/95 px-5 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-serif text-title text-primary-900">
            {t("title")}
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1.5 font-sans text-[11px] font-bold tabular-nums text-white">
                {activeCount}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={clearAll}
            disabled={activeCount === 0}
            className="text-sm font-semibold text-accent-700 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-primary-400 disabled:no-underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          >
            {t("reset")}
          </button>
        </div>
        {chips.length > 0 && (
          <ul aria-label={t("activeFilters")} className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <li key={c.key} className="max-w-full">
                <button
                  type="button"
                  onClick={() => set(c.patch)}
                  aria-label={t("remove", { label: c.label })}
                  className="inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-primary-800 ps-2.5 pe-1.5 text-[12px] font-semibold text-white cursor-pointer transition-colors duration-fast hover:bg-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1"
                >
                  <span className="truncate">{c.label}</span>
                  <BrandCloseIcon size={12} aria-hidden="true" className="shrink-0 opacity-80" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Category */}
      <Section title={t("category")}>
        <div role="radiogroup" aria-label={t("category")} className="space-y-0.5">
          {CATEGORIES.map(({ id, Icon }) => (
            <Radio
              key={id}
              name={`${nameBase}-category`}
              checked={currentCategory === id}
              onChange={() => changeCategory(id)}
              label={
                <OptionLabel
                  label={
                    <span className="inline-flex items-center gap-2">
                      <Icon size={15} className="text-secondary-600" aria-hidden="true" />
                      {tSearch(`tabs.${id}`)}
                    </span>
                  }
                  count={categoryCounts?.[id] ?? 0}
                />
              }
            />
          ))}
        </div>
      </Section>

      {/* Wilaya */}
      <Section title={t("wilaya")} active={filters.wilayas.length}>
        <label className="mb-3 flex h-10 items-center gap-2 rounded-xl bg-darnaBg px-3 ring-1 ring-primary/[0.08] focus-within:ring-2 focus-within:ring-accent-600">
          <BrandSearchIcon size={15} className="shrink-0 text-primary-500" aria-hidden="true" />
          <span className="sr-only">{t("searchWilaya")}</span>
          <input
            type="search"
            value={wilayaQuery}
            onChange={(e) => setWilayaQuery(e.target.value)}
            placeholder={t("searchWilaya")}
            className="min-w-0 flex-1 bg-transparent text-sm text-primary-900 placeholder:text-primary-400 focus:outline-none"
          />
        </label>
        {wilayaShown.length === 0 ? (
          <p className="text-meta text-primary-500">{t("noWilaya")}</p>
        ) : (
          <ul className={cn("space-y-0.5", (q || allWilayas) && "max-h-72 overflow-y-auto overscroll-contain pe-1")}>
            {wilayaShown.map(({ w, count, label }) => (
              <li key={w.code}>
                <Checkbox
                  checked={filters.wilayas.includes(w.code)}
                  onChange={() => toggle("wilayas", filters.wilayas, w.code)}
                  label={
                    <OptionLabel
                      label={
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex h-5 min-w-[1.6rem] items-center justify-center rounded-md bg-tertiary-100 px-1 text-[11px] font-bold tabular-nums text-primary-700">
                            {code(w.code)}
                          </span>
                          {label}
                        </span>
                      }
                      count={count}
                    />
                  }
                />
              </li>
            ))}
          </ul>
        )}
        {!q && (
          <MoreToggle
            expanded={allWilayas}
            onToggle={() => setAllWilayas((v) => !v)}
            moreLabel={t("seeAllWilayas", { count: WILAYAS.length })}
          />
        )}
      </Section>

      {/* Commune */}
      {communeItems.some((c) => c.count > 0 || filters.communes.includes(c.id)) && (
        <Section title={t("commune")} active={filters.communes.length}>
          {filters.wilayas.length === 0 && <p className="mb-2 text-meta text-primary-500">{t("communeHint")}</p>}
          <CheckList items={communeItems} selected={filters.communes} onToggle={(id) => toggle("communes", filters.communes, id)} />
        </Section>
      )}

      {/* Stays */}
      {isStays && (
        <>
          <Section title={tFilters("propertyType")} active={filters.types.length}>
            <CheckList
              items={PROPERTY_TYPES.map((pt) => ({ id: pt.id, label: tFilters(pt.key), count: by(L("types"), (f) => matchesType(f, pt.id)) }))}
              selected={filters.types}
              onToggle={(id) => toggle("types", filters.types, id)}
              limit={PROPERTY_TYPES.length}
            />
          </Section>

          <Section
            title={t("roomsAndBaths")}
            active={(filters.minBedrooms && filters.minBedrooms > 1 ? 1 : 0) + (filters.minBathrooms && filters.minBathrooms > 1 ? 1 : 0)}
          >
            <SubHeading>{t("bedrooms")}</SubHeading>
            <MinPills
              label={t("bedrooms")}
              values={[undefined, 2, 3, 4, 5]}
              value={filters.minBedrooms && filters.minBedrooms > 1 ? filters.minBedrooms : undefined}
              counts={[undefined, 2, 3, 4, 5].map((n) => by(L("bedrooms"), (f) => !n || f.bedrooms >= n))}
              format={(n) => t("atLeast", { count: n })}
              onChange={setMin("bedrooms")}
            />
            <SubHeading>{t("bathrooms")}</SubHeading>
            <MinPills
              label={t("bathrooms")}
              values={[undefined, 2, 3, 4]}
              value={filters.minBathrooms && filters.minBathrooms > 1 ? filters.minBathrooms : undefined}
              counts={[undefined, 2, 3, 4].map((n) => by(L("bathrooms"), (f) => !n || f.bathrooms >= n))}
              format={(n) => t("atLeast", { count: n })}
              onChange={setMin("bathrooms")}
            />
          </Section>

          {pool.some((f) => f.stars > 0) && (
            <Section title={t("hotelStars")} active={filters.minStars ? 1 : 0}>
              <MinPills
                label={t("hotelStars")}
                values={[undefined, 3, 4, 5]}
                value={filters.minStars}
                counts={[undefined, 3, 4, 5].map((n) => by(L("stars"), (f) => !n || f.stars >= n))}
                format={(n) => t("starsAtLeast", { count: n })}
                onChange={setMin("stars")}
              />
            </Section>
          )}
        </>
      )}

      {/* Vehicles */}
      {isVehicles && (
        <>
          <Section title={t("vehicleType")} active={filters.subtypes.length}>
            <CheckList items={subtypeItems(L("subtypes"))} selected={filters.subtypes} onToggle={(id) => toggle("subtypes", filters.subtypes, id)} keepEmpty />
          </Section>
          <Section title={t("transmission")} active={filters.transmissions.length}>
            <CheckList
              items={["automatic", "manual"].map((id) => ({ id, label: t(`transmissionTypes.${id}`), count: by(L("transmissions"), (f) => f.transmission === id) }))}
              selected={filters.transmissions}
              onToggle={(id) => toggle("transmissions", filters.transmissions, id)}
              keepEmpty
            />
          </Section>
          <Section title={t("fuel")} active={filters.fuels.length}>
            <CheckList
              items={["petrol", "diesel", "hybrid", "electric"].map((id) => ({ id, label: t(`fuelTypes.${id}`), count: by(L("fuels"), (f) => f.fuel === id) }))}
              selected={filters.fuels}
              onToggle={(id) => toggle("fuels", filters.fuels, id)}
              keepEmpty
            />
          </Section>
          <Section title={t("seats")} active={filters.minSeats ? 1 : 0}>
            <MinPills
              label={t("seats")}
              values={[undefined, 4, 5, 7]}
              value={filters.minSeats}
              counts={[undefined, 4, 5, 7].map((n) => by(L("seats"), (f) => !n || f.seats >= n))}
              format={(n) => t("atLeast", { count: n })}
              onChange={setMin("seats")}
            />
          </Section>
        </>
      )}

      {/* Experiences */}
      {isExperiences && (
        <>
          <Section title={t("experienceType")} active={filters.subtypes.length}>
            <CheckList items={subtypeItems(L("subtypes"))} selected={filters.subtypes} onToggle={(id) => toggle("subtypes", filters.subtypes, id)} keepEmpty />
          </Section>
          <Section title={t("experienceLength")} active={filters.expLengths.length}>
            <CheckList
              items={EXPERIENCE_LENGTHS.map((b) => ({ id: b.id, label: t(`expLength.${b.id}`), count: by(L("expLengths"), (f) => f.hours >= b.min && f.hours <= b.max) }))}
              selected={filters.expLengths}
              onToggle={(id) => toggle("expLengths", filters.expLengths, id)}
              keepEmpty
            />
          </Section>
          {pool.some((f) => f.languages.length > 0) && (
            <Section title={t("languages")} active={filters.languages.length}>
              <CheckList
                items={Array.from(new Set([...pool.flatMap((f) => f.languages), ...filters.languages])).map((n) => ({
                  id: n,
                  label: languageName(n),
                  count: by(L("languages"), (f) => f.languages.includes(n)),
                }))}
                selected={filters.languages}
                onToggle={(id) => toggle("languages", filters.languages, id)}
                keepEmpty
              />
            </Section>
          )}
        </>
      )}

      {/* Trips */}
      {isTrips && (
        <>
          <Section title={t("tripType")} active={filters.durations.length}>
            <CheckList
              items={DURATION_BUCKETS.map((b) => ({ id: b.id, label: t(`duration.${b.id}`), count: by(T("durations"), (f: TripFacet) => f.days >= b.min && f.days <= b.max) }))}
              selected={filters.durations}
              onToggle={(id) => toggle("durations", filters.durations, id)}
              keepEmpty
            />
          </Section>
          {tripPool.some((f) => f.months.length > 0) && (
            <Section title={t("departureMonth")} active={filters.months.length}>
              <CheckList
                items={Array.from(new Set([...tripPool.flatMap((f) => f.months), ...filters.months]))
                  .sort((a, b) => a - b)
                  .map((m) => ({ id: String(m), label: <span className="capitalize">{monthName(m)}</span>, count: by(T("months"), (f) => f.months.includes(m)) }))}
                selected={filters.months.map(String)}
                onToggle={(id) => toggle("months", filters.months, Number(id))}
                limit={12}
                keepEmpty
              />
            </Section>
          )}
          <Section title={t("groupSize")} active={filters.minGroup ? 1 : 0}>
            <MinPills
              label={t("groupSize")}
              values={[undefined, 6, 8, 10, 12]}
              value={filters.minGroup}
              counts={[undefined, 6, 8, 10, 12].map((n) => by(T("group"), (f) => !n || f.group >= n))}
              format={(n) => t("atLeast", { count: n })}
              onChange={setMin("group")}
            />
          </Section>
          {tripPool.some((f) => f.agency) && (
            <Section title={t("agency")} active={filters.agencies.length}>
              <CheckList
                items={Array.from(new Set([...tripPool.map((f) => f.agency).filter((a): a is string => Boolean(a)), ...filters.agencies])).map((n) => ({
                  id: n,
                  label: n,
                  count: by(T("agencies"), (f) => f.agency === n),
                }))}
                selected={filters.agencies}
                onToggle={(id) => toggle("agencies", filters.agencies, id)}
                keepEmpty
              />
            </Section>
          )}
        </>
      )}

      {/* Price */}
      {prices.length > 1 && (
        <Section title={isTrips ? t("pricePerPerson") : t("price")} active={filters.minPrice || filters.maxPrice ? 1 : 0}>
          <div className="space-y-4">
            <PriceRange
              floor={floor}
              ceil={ceil}
              low={low}
              high={high}
              histogram={histogram}
              minLabel={tFilters("minimum")}
              maxLabel={tFilters("maximum")}
              onChange={(lo, hi) => setDraft({ min: lo <= floor ? "" : String(lo), max: hi >= ceil ? "" : String(hi) })}
            />
            {/* Compact boxes: the currency is in the section title. */}
            <div className="grid grid-cols-2 gap-2">
              {(["min", "max"] as const).map((k) => (
                <label key={k} className="min-w-0 rounded-xl bg-darnaBg px-3 py-2 ring-1 ring-primary/[0.08] focus-within:ring-2 focus-within:ring-accent-600">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-primary-500">
                    {k === "min" ? tFilters("minimum") : tFilters("maximum")}
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={STEP}
                    value={draft[k]}
                    onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                    placeholder={formatNumber(k === "min" ? floor : ceil, locale)}
                    className="w-full min-w-0 bg-transparent text-sm font-semibold tabular-nums text-primary-900 placeholder:font-medium placeholder:text-primary-400 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </label>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Amenities (stays) */}
      {isStays && (
        <Section title={tFilters("amenities")} active={filters.amenities.length}>
          <CheckList
            items={Object.keys(AMENITY_GROUPS)
              .map((key) => ({ id: key, label: tAmenities(key), count: by(L("amenities"), (f) => hasAmenity(f, key)) }))
              .sort((a, b) => b.count - a.count)}
            selected={filters.amenities}
            onToggle={(id) => toggle("amenities", filters.amenities, id)}
          />
        </Section>
      )}

      {/* Booking options + host type (listings) */}
      {!isTrips && (
        <>
          <Section title={t("bookingOptions")} active={(filters.instant ? 1 : 0) + (filters.favorite ? 1 : 0) + (filters.freeCancel ? 1 : 0)}>
            <ul className="space-y-0.5">
              {[
                { id: "instant", param: "instantBook", on: filters.instant, label: t("instantBook"), count: by(L("instant"), (f) => f.instant) },
                { id: "favorite", param: "isGuestFavorite", on: filters.favorite, label: t("guestFavorite"), count: by(L("favorite"), (f) => f.favorite) },
                { id: "freeCancel", param: "freeCancellation", on: filters.freeCancel, label: t("freeCancellation"), count: by(L("freeCancel"), (f) => f.cancellation === "flexible") },
              ].map((o) => (
                <li key={o.id}>
                  <Checkbox checked={o.on} onChange={() => set({ [o.param]: o.on ? undefined : "true" })} label={<OptionLabel label={o.label} count={o.count} />} />
                </li>
              ))}
            </ul>
          </Section>
          <Section title={t("hostType")} active={filters.hosts.length} defaultOpen={false}>
            <CheckList
              items={["individual", "organization"].map((id) => ({ id, label: t(`hostTypes.${id}`), count: by(L("hosts"), (f) => f.owner === id) }))}
              selected={filters.hosts}
              onToggle={(id) => toggle("hosts", filters.hosts, id)}
              keepEmpty
            />
          </Section>
        </>
      )}

      {/* Rating */}
      <Section title={t("rating")} active={filters.minRating ? 1 : 0}>
        <div role="radiogroup" aria-label={t("rating")} className="space-y-0.5">
          <Radio
            name={`${nameBase}-rating`}
            checked={!filters.minRating}
            onChange={() => set({ minRating: undefined })}
            label={<OptionLabel label={t("anyRating")} count={ratingBase.length} />}
          />
          {RATINGS.map((r) => (
            <Radio
              key={r}
              name={`${nameBase}-rating`}
              checked={filters.minRating === r}
              onChange={() => set({ minRating: String(r) })}
              label={<OptionLabel label={t("ratingAtLeast", { rating: fmt(r, 1) })} count={ratingBase.filter((f) => f.rating >= r).length} />}
            />
          ))}
        </div>
      </Section>
    </aside>
  );
}
