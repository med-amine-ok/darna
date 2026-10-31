"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { listingImageSrc } from "@/lib/placeholders";
import {
  Search,
  Compass,
  MapPin,
  Users,
  Grid,
  Map as MapIcon,
  Home,
  Building,
  Car,
  Tent,
  Sparkles,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { searchNetwork } from "@/lib/actions/network";
import { approveListing, suspendListing } from "@/lib/actions/listings";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { canTransitionListing } from "@/lib/domain/transitions";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { Listing, ListingVertical, HostType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { useToast } from "@/components/ui/Toast";
import { formatDzd } from "@/lib/utils/format";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";
import { Link } from "@/navigation";
import { useTranslations } from "next-intl";

const ListingsMapView = dynamic(
  () => import("@/components/features/listings/ListingsMapView"),
  { ssr: false, loading: () => <div className="h-[520px] skeleton rounded-2xl" /> }
);

const FIELD_CLASS =
  "w-full text-xs rounded-xl border border-primary/[0.12] text-primary focus:outline-none focus:border-primary-600 focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1";


interface Props {
  locale: string;
}

export default function NetworkClient({ locale }: Props) {
  const t = useTranslations("network");
  const tVerticals = useTranslations("verticals");
  const tHostTypes = useTranslations("hostTypes");
  const tActions = useTranslations("actions");
  const uid = useId();
  const [suspendTarget, setSuspendTarget] = useState<{ id: string; title: string } | null>(null);
  const [vertical, setVertical] = useState<ListingVertical>("home");
  const [destination, setDestination] = useState("");
  const [wilayaCode, setWilayaCode] = useState("all");
  const [guestCount, setGuestCount] = useState(1);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 150000]);
  const [hostType, setHostType] = useState<HostType | "all">("all");
  const [propertyType] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const { success, error } = useToast();
  const can = useCan();
  const searchFailedLabel = t("searchFailed");

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const res = unwrap(await searchNetwork({
        vertical,
        destination,
        wilayaCode: wilayaCode === "all" ? undefined : wilayaCode,
        guests: guestCount,
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
        hostType,
        propertyType,
      }));
      setResults(res.results);
    } catch (err: any) {
      error(searchFailedLabel, err.message);
    } finally {
      setLoading(false);
    }
  }, [vertical, destination, wilayaCode, guestCount, priceRange, hostType, propertyType, error, searchFailedLabel]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const handleQuickApprove = async (listingId: string) => {
    try {
      unwrap(await approveListing(listingId));
      success(t("approved"), t("approvedDescription"));
      handleSearch();
    } catch (err: any) {
      error(t("approveFailed"), err.message);
    }
  };

  const handleQuickSuspend = async (listingId: string, reason: string) => {
    try {
      unwrap(await suspendListing(listingId, reason));
      success(t("suspended"), t("suspendedDescription"));
      setSuspendTarget(null);
      handleSearch();
    } catch (err: any) {
      error(t("suspendFailed"), err.message);
    }
  };

  const verticals: { key: ListingVertical; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "home", label: tVerticals("home"), icon: Home },
    { key: "hotel", label: tVerticals("hotel"), icon: Building },
    { key: "trip", label: tVerticals("trip"), icon: Tent },
    { key: "vehicle", label: tVerticals("vehicle"), icon: Car },
    { key: "experience", label: tVerticals("experience"), icon: Compass },
  ];

  const ids = {
    destination: `${uid}-destination`,
    wilaya: `${uid}-wilaya`,
    guests: `${uid}-guests`,
    hostType: `${uid}-host-type`,
  };

  const viewToggleClass = (active: boolean) =>
    `p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1 ${
      active ? "bg-primary text-white" : "text-primary-600 hover:text-primary"
    }`;

  return (
    <div className="space-y-6 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-heading text-primary-900">{t("title")}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary-100 text-secondary-700 border border-secondary/25 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              {t("liveMirror")}
            </span>
          </div>
          <p className="text-xs text-primary-600 mt-1">
            {t("subtitle")}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div
          role="group"
          aria-label={t("viewMode")}
          className="flex items-center gap-1 bg-white p-1 rounded-xl border border-primary/[0.08] shadow-2xs"
        >
          <button
            type="button"
            aria-pressed={viewMode === "grid"}
            onClick={() => setViewMode("grid")}
            className={viewToggleClass(viewMode === "grid")}
          >
            <Grid className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("listView")}</span>
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "map"}
            onClick={() => setViewMode("map")}
            className={viewToggleClass(viewMode === "map")}
          >
            <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("mapView")}</span>
          </button>
        </div>
      </div>

      {/* Guest-Style Vertical Tabs */}
      <div
        role="group"
        aria-label={t("verticalsLabel")}
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-primary/[0.08]"
      >
        {verticals.map((v) => {
          const Icon = v.icon;
          const isActive = vertical === v.key;
          return (
            <button
              key={v.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setVertical(v.key)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold rounded-t-xl transition-all border-b-2 -mb-[2px] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
                isActive
                  ? "border-secondary text-primary bg-white shadow-2xs"
                  : "border-transparent text-primary-600 hover:text-primary"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-secondary" : "text-neutral-400"}`} aria-hidden="true" />
              <span>{v.label}</span>
            </button>
          );
        })}
      </div>

      {/* Guest-Style Omnibar Search */}
      <div className="bg-white p-4 rounded-2xl shadow-e1 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Destination */}
          <div className="relative">
            <label htmlFor={ids.destination} className="block text-xs font-semibold text-primary-600 mb-1">
              {t("where")}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-secondary" aria-hidden="true" />
              <input
                id={ids.destination}
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={t("wherePlaceholder")}
                className={`${FIELD_CLASS} ps-9 pe-3 py-2`}
              />
            </div>
          </div>

          {/* Wilaya Picker */}
          <div>
            <label htmlFor={ids.wilaya} className="block text-xs font-semibold text-primary-600 mb-1">
              {t("wilaya")}
            </label>
            <select
              id={ids.wilaya}
              value={wilayaCode}
              onChange={(e) => setWilayaCode(e.target.value)}
              className={`${FIELD_CLASS} px-3 py-2 bg-white`}
            >
              <option value="all">{t("allWilayas")}</option>
              {WILAYAS.map((w) => (
                <option key={w.code} value={w.code}>
                  {getWilayaLabel(w, locale)}
                </option>
              ))}
            </select>
          </div>

          {/* Guests */}
          <div>
            <label htmlFor={ids.guests} className="block text-xs font-semibold text-primary-600 mb-1">
              {t("guestsCapacity")}
            </label>
            <div className="relative">
              <Users className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-primary-600" aria-hidden="true" />
              <input
                id={ids.guests}
                type="number"
                min={1}
                max={20}
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className={`${FIELD_CLASS} ps-9 pe-3 py-2`}
              />
            </div>
          </div>

          {/* Host Type Filter */}
          <div>
            <label htmlFor={ids.hostType} className="block text-xs font-semibold text-primary-600 mb-1">
              {t("hostType")}
            </label>
            <select
              id={ids.hostType}
              value={hostType}
              onChange={(e) => setHostType(e.target.value as HostType | "all")}
              className={`${FIELD_CLASS} px-3 py-2 bg-white`}
            >
              <option value="all">{t("allCategories")}</option>
              <option value="individual">{tHostTypes("individual")}</option>
              <option value="agency">{tHostTypes("agency")}</option>
              <option value="hotel">{tHostTypes("hotel")}</option>
              <option value="hostel">{tHostTypes("hostel")}</option>
            </select>
          </div>
        </div>

        {/* Dual Handle Price Slider */}
        <div className="pt-2 border-t border-primary/[0.08]">
          <RangeSlider
            min={0}
            max={150000}
            step={1000}
            value={priceRange}
            onChange={setPriceRange}
            label={t("unitPriceRange")}
          />
        </div>
      </div>

      {/* Results Section */}
      {viewMode === "map" ? (
        <div className="bg-white rounded-2xl overflow-hidden shadow-e1">
          <div className="p-4 border-b border-primary/[0.08] flex justify-between items-center text-xs">
            <span className="font-semibold text-primary" aria-live="polite">
              {t("mapCount", { count: results.length })}
            </span>
          </div>
          <ListingsMapView
            listings={results}
            selectedListingId={null}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-primary-600 font-medium" aria-live="polite">
            {t.rich("foundCount", {
              count: results.length,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-white rounded-2xl animate-pulse shadow-e1" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-e1">
              <Search className="w-10 h-10 text-primary-300 mx-auto mb-2" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-primary">{t("emptyTitle")}</h3>
              <p className="text-xs text-primary-600 mt-1">
                {t("emptyHint")}
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.map((item) => (
                <li
                  key={item.id}
                  className="group bg-white rounded-2xl overflow-hidden shadow-e1 hover:shadow-e2 hover:-translate-y-0.5 transition-[box-shadow,transform] duration-fast ease-standard flex flex-col justify-between"
                >
                  {/* Photo & Status Badge */}
                  <div className="relative h-44 bg-tertiary-100 overflow-hidden">
                    <Image
                      src={listingImageSrc(item.images?.[0] || item.imageSrc?.[0], item.category === "vehicle" ? "car" : "stay")}
                      alt={t("photoAlt", { title: item.title })}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover group-hover:scale-[1.04] transition-transform [transition-duration:700ms] ease-out"
                    />
                    <div className="absolute top-2.5 start-2.5">
                      <StatusPill status={item.status} size="sm" />
                    </div>
                    <div className="absolute top-2.5 end-2.5 bg-primary/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-white font-semibold text-[11px]">
                      {formatDzd(item.price, locale)}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2 flex-1">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-primary-600">
                      <span className="font-semibold text-secondary-700">
                        {tVerticals.has(item.category) ? tVerticals(item.category) : item.category}
                      </span>
                      <span>{t("wilayaCity", { code: item.wilayaCode, city: item.city })}</span>
                    </div>

                    <h3 className="text-xs font-semibold text-primary line-clamp-1">{item.title}</h3>
                    <p className="text-[11px] text-primary-600 line-clamp-2">{item.description}</p>

                    <div className="text-[11px] text-primary-600 pt-1 border-t border-primary/[0.08] flex justify-between gap-2">
                      <span>
                        {t.rich("host", {
                          name: item.hostName,
                          strong: (chunks) => <strong>{chunks}</strong>,
                        })}
                      </span>
                      <span className="text-primary-600">
                        {tHostTypes.has(item.hostType) ? tHostTypes(item.hostType) : item.hostType}
                      </span>
                    </div>
                  </div>

                  {/* Admin Quick Action Footer */}
                  <div className="p-3 bg-darnaBg-100 border-t border-primary/[0.08] flex items-center justify-between gap-2">
                    <Link
                      href={`/listings/${item.id}`}
                      aria-label={t("inspectLabel", { title: item.title })}
                      className="text-xs font-semibold text-primary hover:text-secondary-700 flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                    >
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t("inspect")}</span>
                    </Link>

                    <div className="flex items-center gap-1.5">
                      {item.status !== "approved" ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleQuickApprove(item.id)}
                          disabled={!can("listings.approve") || !canTransitionListing(item.status, "approved")}
                          className="text-xs"
                          leftIcon={<CheckCircle className="w-3 h-3" aria-hidden="true" />}
                        >
                          {t("approve")}
                        </Button>
                      ) : (
                        <Button
                          variant="dangerOutline"
                          size="sm"
                          onClick={() => setSuspendTarget({ id: item.id, title: item.title })}
                          disabled={!can("listings.suspend") || !canTransitionListing(item.status, "suspended")}
                          className="text-xs"
                          leftIcon={<XCircle className="w-3 h-3" aria-hidden="true" />}
                        >
                          {t("suspend")}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ReasonDialog
        isOpen={!!suspendTarget}
        title={tActions("suspendListingTitle")}
        description={suspendTarget?.title}
        confirmLabel={tActions("suspend")}
        onCancel={() => setSuspendTarget(null)}
        onConfirm={(reason) => (suspendTarget ? handleQuickSuspend(suspendTarget.id, reason) : undefined)}
      />
    </div>
  );
}
