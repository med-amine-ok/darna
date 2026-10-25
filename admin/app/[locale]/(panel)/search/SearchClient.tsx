"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Link } from "@/navigation";
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Grid,
  Map as MapIcon,
  Home,
  Building,
  Car,
  Compass,
  Plane,
  Eye,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Star,
} from "lucide-react";
import { searchNetwork } from "@/lib/data/network";
import { Listing, ListingVertical } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDzd } from "@/lib/utils/format";
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
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [wilayaCode, setWilayaCode] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const { success } = useToast();

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchNetwork({
        destination: query || undefined,
        wilayaCode: wilayaCode === "all" ? undefined : wilayaCode,
      });
      let list = res.results;
      if (activeTab === "stays") list = list.filter((l) => l.vertical === "home" || l.vertical === "hotel");
      if (activeTab === "experiences") list = list.filter((l) => l.vertical === "experience");
      if (activeTab === "trips") list = list.filter((l) => l.vertical === "trip");
      if (activeTab === "cars") list = list.filter((l) => l.vertical === "vehicle");
      setResults(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [query, wilayaCode, activeTab]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const tabs = [
    { id: "all", label: "Tous les résultats", count: results.length, icon: <Search className="w-4 h-4" /> },
    { id: "stays", label: "Hébergements", icon: <Home className="w-4 h-4" /> },
    { id: "experiences", label: "Expériences", icon: <Compass className="w-4 h-4" /> },
    { id: "trips", label: "Voyages organisés", icon: <Plane className="w-4 h-4" /> },
    { id: "cars", label: "Location de voitures", icon: <Car className="w-4 h-4" /> },
    { id: "providers", label: "Prestataires", icon: <Building className="w-4 h-4" /> },
    { id: "users", label: "Utilisateurs", icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 text-start">
      <PageHeader
        title="Recherche Globale & Réseau DARNA"
        subtitle={query ? `Résultats pour la recherche : "${query}"` : "Recherchez à travers toutes les entités de la plateforme."}
        actions={[
          {
            label: viewMode === "grid" ? "Afficher la carte" : "Afficher la liste",
            icon: viewMode === "grid" ? <MapIcon className="w-4 h-4" /> : <Grid className="w-4 h-4" />,
            variant: "outline",
            onClick: () => setViewMode(viewMode === "grid" ? "map" : "grid"),
          },
        ]}
      />

      {/* Query Bar */}
      <div className="bg-white p-4 rounded-2xl border border-tertiary/40 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-neutral-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par titre, ville, prestataire, code..."
            className="w-full ps-9 pe-4 py-2 text-xs rounded-xl bg-darnaBg/40 border border-tertiary/70 text-primary focus:outline-none focus:border-secondary"
          />
        </div>

        <div>
          <select
            value={wilayaCode}
            onChange={(e) => setWilayaCode(e.target.value)}
            className="text-xs rounded-xl bg-white border border-tertiary/70 p-2 text-primary focus:outline-none focus:border-secondary cursor-pointer"
          >
            <option value="all">
              {locale === "ar" ? "جميع الولايات" : locale === "en" ? "All wilayas" : "Toutes les wilayas"}
            </option>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-white rounded-2xl border border-tertiary/40 animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-tertiary/40 p-12 text-center">
          <Search className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <h3 className="font-bold text-sm text-primary">Aucun résultat trouvé</h3>
          <p className="text-xs text-neutral-500 mt-1">Essayez avec un mot-clé plus court ou modifiez vos filtres.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-tertiary/40 p-4 space-y-3 shadow-2xs hover:border-secondary/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-neutral-400">#{item.id}</span>
                  <StatusPill status={item.status} size="sm" />
                </div>
                <h4 className="font-bold text-sm text-primary line-clamp-1">{item.title}</h4>
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  {item.city}, Wilaya {item.wilayaCode}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-mono font-bold text-primary">
                    {formatDzd(item.priceDzd || item.price || 0, locale)}
                  </span>
                  <div className="flex items-center text-xs text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-current me-1" />
                    {item.rating?.toFixed(1) || "4.8"}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">
                  Hôte : <strong>{item.hostName || "Prestataire"}</strong>
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
                  className="text-xs font-bold text-secondary hover:underline flex items-center gap-1"
                >
                  Détails →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
