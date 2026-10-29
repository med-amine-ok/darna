"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import {
  Search,
  MapPin,
  Users,
  Grid,
  Map as MapIcon,
  Home,
  Building,
  Car,
  Compass,
  Plane,
  Star,
  ArrowRight,
} from "lucide-react";
import { searchNetwork } from "@/lib/actions/network";
import { unwrap } from "@/lib/actions/result";
import { Listing } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDzd, intlLocale } from "@/lib/utils/format";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";
import { useToast } from "@/components/ui/Toast";

const ListingsMapView = dynamic(
  () => import("@/components/features/listings/ListingsMapView"),
  { ssr: false, loading: () => <div className="h-[520px] bg-neutral-100 rounded-2xl animate-pulse" /> }
);

export interface SearchClientProps {
  initialQuery?: string;
  locale: string;
}

export default function SearchClient({
  initialQuery = "",
  locale,
}: SearchClientProps) {
  const t = useTranslations("search");
  const uid = useId();
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [wilayaCode, setWilayaCode] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const { error } = useToast();
  const searchFailedLabel = t("searchFailed");

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const res = unwrap(await searchNetwork({
        destination: query || undefined,
        wilayaCode: wilayaCode === "all" ? undefined : wilayaCode,
      }));
      let list = res.results;
      if (activeTab === "stays") list = list.filter((l) => l.vertical === "home" || l.vertical === "hotel");
      if (activeTab === "experiences") list = list.filter((l) => l.vertical === "experience");
      if (activeTab === "trips") list = list.filter((l) => l.vertical === "trip");
      if (activeTab === "cars") list = list.filter((l) => l.vertical === "vehicle");
      setResults(list);
    } catch (err: any) {
      error(searchFailedLabel, err?.message);
    } finally {
      setLoading(false);
    }
  }, [query, wilayaCode, activeTab, error, searchFailedLabel]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const formatRating = (rating: number) =>
    new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);

  const tabs = [
    { id: "all", label: t("tabs.all"), count: results.length, icon: <Search className="w-4 h-4" aria-hidden="true" /> },
    { id: "stays", label: t("tabs.stays"), icon: <Home className="w-4 h-4" aria-hidden="true" /> },
    { id: "experiences", label: t("tabs.experiences"), icon: <Compass className="w-4 h-4" aria-hidden="true" /> },
    { id: "trips", label: t("tabs.trips"), icon: <Plane className="w-4 h-4" aria-hidden="true" /> },
    { id: "cars", label: t("tabs.cars"), icon: <Car className="w-4 h-4" aria-hidden="true" /> },
    { id: "providers", label: t("tabs.providers"), icon: <Building className="w-4 h-4" aria-hidden="true" /> },
    { id: "users", label: t("tabs.users"), icon: <Users className="w-4 h-4" aria-hidden="true" /> },
  ];

  const ids = { query: `${uid}-query`, wilaya: `${uid}-wilaya` };

  return (
    <div className="space-y-6 text-start">
      <PageHeader
        title={t("title")}
        subtitle={query ? t("subtitleQuery", { query }) : t("subtitle")}
        actions={[
          {
            label: viewMode === "grid" ? t("showMap") : t("showList"),
            icon: viewMode === "grid" ? <MapIcon className="w-4 h-4" aria-hidden="true" /> : <Grid className="w-4 h-4" aria-hidden="true" />,
            variant: "outline",
            onClick: () => setViewMode(viewMode === "grid" ? "map" : "grid"),
          },
        ]}
      />

      {/* Query Bar */}
      <div role="search" className="bg-white p-4 rounded-2xl border border-tertiary/40 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <label htmlFor={ids.query} className="sr-only">{t("searchLabel")}</label>
          <Search className="w-4 h-4 text-neutral-400 absolute start-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            id={ids.query}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="w-full ps-9 pe-4 py-2 text-xs rounded-xl bg-darnaBg/40 border border-tertiary/70 text-primary focus:outline-none focus:border-secondary focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1"
          />
        </div>

        <div>
          <label htmlFor={ids.wilaya} className="sr-only">{t("wilayaLabel")}</label>
          <select
            id={ids.wilaya}
            value={wilayaCode}
            onChange={(e) => setWilayaCode(e.target.value)}
            className="text-xs rounded-xl bg-white border border-tertiary/70 p-2 text-primary focus:outline-none focus:border-secondary focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1 cursor-pointer"
          >
            <option value="all">{t("allWilayas")}</option>
            {WILAYAS.map((w) => (
              <option key={w.code} value={w.code}>
                {getWilayaLabel(w, locale)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Tabs
        items={tabs}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* Results */}
      {viewMode === "map" ? (
        <div className="rounded-2xl overflow-hidden border border-tertiary/40 shadow-2xs">
          <ListingsMapView listings={results} />
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-busy="true">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-white rounded-2xl border border-tertiary/40 animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-tertiary/40 p-12 text-center" role="status">
          <Search className="w-10 h-10 text-neutral-300 mx-auto mb-2" aria-hidden="true" />
          <h3 className="font-bold text-sm text-primary">{t("emptyTitle")}</h3>
          <p className="text-xs text-neutral-500 mt-1">{t("emptyHint")}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((item) => {
            const rating = formatRating(item.rating ?? 4.8);
            return (
              <li
                key={item.id}
                className="bg-white rounded-2xl border border-tertiary/40 p-4 space-y-3 shadow-2xs hover:border-secondary/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-neutral-500">#{item.id}</span>
                    <StatusPill status={item.status} size="sm" />
                  </div>
                  <h4 className="font-bold text-sm text-primary line-clamp-1">{item.title}</h4>
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" />
                    {t("cityWilaya", { city: item.city, code: item.wilayaCode })}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-mono font-bold text-primary">
                      {formatDzd(item.priceDzd || item.price || 0, locale)}
                    </span>
                    <div
                      className="flex items-center text-xs text-amber-700 font-bold"
                      role="img"
                      aria-label={t("rating", { rating })}
                    >
                      <Star className="w-3.5 h-3.5 fill-current me-1" aria-hidden="true" />
                      {rating}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-neutral-500">
                    {t.rich("host", {
                      name: item.hostName || t("hostFallback"),
                      strong: (chunks) => <strong>{chunks}</strong>,
                    })}
                  </span>
                  <Link
                    href={
                      item.vertical === "home" || item.vertical === "hotel"
                        ? `/stays/${item.id}`
                        : item.vertical === "trip"
                        ? `/trips/${item.id}`
                        : item.vertical === "vehicle"
                        ? `/cars/${item.id}`
                        : `/experiences/${item.id}`
                    }
                    aria-label={t("detailsLabel", { title: item.title })}
                    className="text-xs font-bold text-secondary-700 hover:underline flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                  >
                    {t("details")}
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
