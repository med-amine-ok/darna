"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  Compass,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Grid,
  Map as MapIcon,
  Home,
  Building,
  Car,
  Tent,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { searchNetwork, NetworkSearchParams } from "@/lib/data/network";
import { approveListing, suspendListing } from "@/lib/data/listings";
import { Listing, ListingVertical, HostType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { useToast } from "@/components/ui/Toast";
import { formatDzd } from "@/lib/utils/format";
import { WILAYAS } from "@/lib/utils/wilayas";
import { Link } from "@/navigation";
import { useTranslations } from "next-intl";

const ListingsMapView = dynamic(
  () => import("@/components/features/listings/ListingsMapView"),
  { ssr: false, loading: () => <div className="h-[520px] bg-neutral-100 rounded-2xl animate-pulse" /> }
);

interface Props {
  locale: string;
}

export default function NetworkClient({ locale }: Props) {
  const t = useTranslations("network");
  const tVerticals = useTranslations("verticals");
  const tCommon = useTranslations("common");
  const [vertical, setVertical] = useState<ListingVertical>("home");
  const [destination, setDestination] = useState("");
  const [wilayaCode, setWilayaCode] = useState("all");
  const [guestCount, setGuestCount] = useState(1);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 150000]);
  const [hostType, setHostType] = useState<HostType | "all">("all");
  const [propertyType, setPropertyType] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const { success, error } = useToast();

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchNetwork({
        vertical,
        destination,
        wilayaCode: wilayaCode === "all" ? undefined : wilayaCode,
        guests: guestCount,
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
        hostType,
        propertyType,
      });
      setResults(res.results);
    } catch (err: any) {
      error("Search failed", err.message);
    } finally {
      setLoading(false);
    }
  }, [vertical, destination, wilayaCode, guestCount, priceRange, hostType, propertyType, error]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const handleQuickApprove = async (listingId: string) => {
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      await approveListing(listingId, actor);
      success("Listing Approved", "Item is now live and bookable on the network.");
      handleSearch();
    } catch (err: any) {
      error("Approval failed", err.message);
    }
  };

  const handleQuickSuspend = async (listingId: string) => {
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      await suspendListing(listingId, "Admin Network Explorer review", actor);
      success("Listing Suspended", "Item taken offline from marketplace search.");
      handleSearch();
    } catch (err: any) {
      error("Suspension failed", err.message);
    }
  };

  const verticals: { key: ListingVertical; label: string; icon: any }[] = [
    { key: "home", label: tVerticals("home"), icon: Home },
    { key: "hotel", label: tVerticals("hotel"), icon: Building },
    { key: "trip", label: tVerticals("trip"), icon: Tent },
    { key: "vehicle", label: tVerticals("vehicle"), icon: Car },
    { key: "experience", label: tVerticals("experience"), icon: Compass },
  ];

  return (
    <div className="space-y-6 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary tracking-tight">{t("title")}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/15 text-secondary border border-secondary/25 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Live Marketplace Mirror
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {t("subtitle")}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-tertiary/70 shadow-2xs">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              viewMode === "grid"
                ? "bg-primary text-white"
                : "text-neutral-500 hover:text-primary"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>{t("listView")}</span>
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              viewMode === "map"
                ? "bg-primary text-white"
                : "text-neutral-500 hover:text-primary"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>{t("mapView")}</span>
          </button>
        </div>
      </div>

      {/* Guest-Style Vertical Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-tertiary/60">
        {verticals.map((v) => {
          const Icon = v.icon;
          const isActive = vertical === v.key;
          return (
            <button
              key={v.key}
              onClick={() => setVertical(v.key)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-xl transition-all border-b-2 -mb-[2px] cursor-pointer whitespace-nowrap ${
                isActive
                  ? "border-secondary text-primary bg-white shadow-2xs"
                  : "border-transparent text-neutral-500 hover:text-primary"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-secondary" : "text-neutral-400"}`} />
              <span>{v.label}</span>
            </button>
          );
        })}
      </div>

      {/* Guest-Style Omnibar Search */}
      <div className="bg-white p-4 rounded-2xl border border-tertiary/80 shadow-darna-card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Destination */}
          <div className="relative">
            <label className="block text-xs font-semibold text-neutral-600 mb-1">
              Where in Algeria
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-secondary" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="City, oasis, or landmark..."
                className="w-full ps-9 pe-3 py-2 text-xs rounded-xl border border-tertiary text-primary focus:outline-none focus:border-secondary"
              />
            </div>
          </div>

          {/* Wilaya Picker */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">
              Wilaya (69 Wilayas)
            </label>
            <select
              value={wilayaCode}
              onChange={(e) => setWilayaCode(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-tertiary text-primary bg-white focus:outline-none focus:border-secondary"
            >
              <option value="all">All 69 Wilayas</option>
              {WILAYAS.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code} - {w.nameEn} ({w.nameAr})
                </option>
              ))}
            </select>
          </div>

          {/* Guests */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">
              Guests / Capacity
            </label>
            <div className="relative">
              <Users className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="number"
                min={1}
                max={20}
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="w-full ps-9 pe-3 py-2 text-xs rounded-xl border border-tertiary text-primary focus:outline-none focus:border-secondary"
              />
            </div>
          </div>

          {/* Host Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">
              Host Type
            </label>
            <select
              value={hostType}
              onChange={(e) => setHostType(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-tertiary text-primary bg-white focus:outline-none focus:border-secondary"
            >
              <option value="all">All Categories</option>
              <option value="individual">Individual Host</option>
              <option value="agency">Certified Agency</option>
              <option value="hotel">Hotel</option>
              <option value="hostel">Hostel</option>
            </select>
          </div>
        </div>

        {/* Dual Handle Price Slider */}
        <div className="pt-2 border-t border-tertiary/40">
          <RangeSlider
            min={0}
            max={150000}
            step={1000}
            value={priceRange}
            onChange={setPriceRange}
            label="Nightly / Unit Price Range"
            currency="DZD"
          />
        </div>
      </div>

      {/* Results Section */}
      {viewMode === "map" ? (
        <div className="bg-white rounded-2xl border border-tertiary/80 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-tertiary/50 flex justify-between items-center text-xs">
            <span className="font-bold text-primary">
              Showing {results.length} properties on the Algerian map
            </span>
          </div>
          <ListingsMapView
            listings={results}
            onSelectListing={(l) => {}}
            selectedListingId={null}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-neutral-500 font-medium">
            Found <strong>{results.length}</strong> matching listing{results.length > 1 ? "s" : ""} on the network
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-white rounded-2xl border border-tertiary/60 animate-pulse" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="bg-white rounded-2xl border border-tertiary/70 p-12 text-center">
              <Search className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-primary">No exact matches in the network</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Try widening your price range or exploring another Algerian Wilaya.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-tertiary/80 overflow-hidden shadow-2xs hover:shadow-darna-card transition flex flex-col justify-between"
                >
                  {/* Photo & Status Badge */}
                  <div className="relative h-44 bg-neutral-100 overflow-hidden">
                    <img
                      src={item.images?.[0] || "/images/placeholder.jpg"}
                      alt={item.title}
                      className="w-full h-full object-cover hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2.5 start-2.5">
                      <StatusPill status={item.status as any} size="sm" />
                    </div>
                    <div className="absolute top-2.5 end-2.5 bg-primary/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-white font-bold text-[11px]">
                      {formatDzd(item.price, locale)}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2 flex-1">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span className="font-semibold text-secondary capitalize">
                        {item.category}
                      </span>
                      <span>Wilaya {item.wilayaCode} · {item.city}</span>
                    </div>

                    <h3 className="text-xs font-bold text-primary line-clamp-1">{item.title}</h3>
                    <p className="text-[11px] text-neutral-500 line-clamp-2">{item.description}</p>

                    <div className="text-[11px] text-neutral-500 pt-1 border-t border-tertiary/40 flex justify-between">
                      <span>Host: <strong>{item.hostName}</strong></span>
                      <span className="capitalize text-neutral-400">{item.hostType}</span>
                    </div>
                  </div>

                  {/* Admin Quick Action Footer */}
                  <div className="p-3 bg-darnaBg/50 border-t border-tertiary/60 flex items-center justify-between gap-2">
                    <Link
                      href={`/listings/${item.id}`}
                      className="text-xs font-bold text-primary hover:text-secondary flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </Link>

                    <div className="flex items-center gap-1.5">
                      {item.status !== "approved" ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleQuickApprove(item.id)}
                          className="text-[11px] font-bold py-1 px-2.5"
                        >
                          <CheckCircle className="w-3 h-3 me-1" />
                          Approve
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickSuspend(item.id)}
                          className="text-[11px] font-bold py-1 px-2.5 text-accent border-accent/40 hover:bg-accent/10"
                        >
                          <XCircle className="w-3 h-3 me-1" />
                          Suspend
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
