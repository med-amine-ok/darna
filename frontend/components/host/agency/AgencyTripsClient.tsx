"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { Trip, User, Organization } from "@/types";
import { setTripStatusAction, deleteTripAction } from "@/app/actions/trips";
import PriceDisplay from "@/components/common/PriceDisplay";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import { formatDate, formatNumber } from "@/lib/i18n/date-locale";
import { toast } from "react-toastify";
import {
  BrandCompassIcon,
  BrandPlusIcon,
  BrandCalendarIcon,
  BrandUsersIcon,
  BrandPinIcon,
  BrandStarIcon,
  BrandSearchIcon,
  BrandExternalLinkIcon,
  BrandTrashIcon,
  BrandListIcon,
} from "@/components/icons";
import { useActionError } from "@/hook/useActionError";

interface AgencyTripsClientProps {
  initialTrips: Trip[];
  currentUser?: User | null;
  organization?: Organization | null;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function AgencyTripsClient({
  initialTrips,
  organization,
}: AgencyTripsClientProps) {
  const t = useTranslations("hostTrips");
  const tCommon = useTranslations("common");
  const errorText = useActionError();
  const locale = useLocale();
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (statusFilter !== "all" && trip.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !trip.title.toLowerCase().includes(q) &&
          !trip.city.toLowerCase().includes(q) &&
          !trip.locationValue.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [trips, searchQuery, statusFilter]);

  // KPIs
  const activeCount = trips.filter((tr) => tr.status === "active").length;
  const draftCount = trips.filter((tr) => tr.status === "draft").length;
  const totalDepartures = trips.reduce(
    (acc, tr) => acc + (tr.departureDates?.length || 0),
    0
  );

  // Toggle status
  const handleToggleStatus = async (trip: Trip) => {
    const nextStatus = trip.status === "active" ? "draft" : "active";
    try {
      const result = await setTripStatusAction(trip.id, nextStatus);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setTrips((prev) =>
        prev.map((tr) => (tr.id === trip.id ? { ...tr, status: result.data.status } : tr))
      );
      toast.info(nextStatus === "active" ? t("list.toastPublished") : t("list.toastPaused"));
    } catch {
      toast.error(t("list.toastStatusError"));
    }
  };

  // Delete trip
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const result = await deleteTripAction(id);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setTrips((prev) => prev.filter((tr) => tr.id !== id));
      toast.success(t("list.toastDeleted"));
      setDeletingId(null);
    } catch {
      toast.error(t("list.toastDeleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const filters = [
    {
      id: "all" as const,
      label: t("list.filterAll", { count: trips.length }),
      activeClass: "bg-primary text-white",
    },
    {
      id: "active" as const,
      label: t("list.filterActive", { count: activeCount }),
      activeClass: "bg-emerald-700 text-white",
    },
    {
      id: "draft" as const,
      label: t("list.filterDraft", { count: draftCount }),
      activeClass: "bg-amber-700 text-white",
    },
  ];

  const twoDecimals = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  // Review-weighted average of the agency's rated trips; null → "New".
  const ratedTrips = trips.filter((trip) => trip.rating && trip.rating > 0);
  const ratingWeight = ratedTrips.reduce((sum, trip) => sum + (trip.reviewsCount || 1), 0);
  const averageRating = ratingWeight
    ? ratedTrips.reduce((sum, trip) => sum + (trip.rating || 0) * (trip.reviewsCount || 1), 0) / ratingWeight
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-wider mb-2">
            <BrandCompassIcon size={14} aria-hidden="true" />
            <span>
              {t("list.eyebrow", { name: organization?.name || t("workspaceFallback") })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            {t("list.title")}
          </h1>
          <p className="text-sm text-neutral-600 mt-1 max-w-2xl">{t("list.subtitle")}</p>
        </div>

        {/* Add Trip CTA */}
        <Link
          href="/host/agency/trips/new"
          className={`px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-sm self-start md:self-auto cursor-pointer btn-press ${FOCUS_RING}`}
        >
          <BrandPlusIcon size={18} className="text-tertiary" aria-hidden="true" />
          <span>{t("list.addTrip")}</span>
        </Link>
      </div>

      {/* KPI Stats Strip */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <dt className="block text-xs font-bold text-neutral-600 uppercase tracking-wider">
            {t("list.kpiTotal")}
          </dt>
          <dd className="text-2xl font-black text-primary">
            {formatNumber(trips.length, locale)}
          </dd>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <dt className="block text-xs font-bold text-emerald-700 uppercase tracking-wider">
            {t("list.kpiActive")}
          </dt>
          <dd className="text-2xl font-black text-emerald-700">
            {formatNumber(activeCount, locale)}
          </dd>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <dt className="block text-xs font-bold text-amber-700 uppercase tracking-wider">
            {t("list.kpiDepartures")}
          </dt>
          <dd className="text-2xl font-black text-amber-700">
            {formatNumber(totalDepartures, locale)}
          </dd>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <dt className="block text-xs font-bold text-secondary uppercase tracking-wider">
            {t("list.kpiRating")}
          </dt>
          <dd className="text-2xl font-black text-secondary flex items-center gap-1">
            {averageRating ? (
              <>
                {formatNumber(averageRating, locale, twoDecimals)}
                <BrandStarIcon size={18} className="text-amber-500 fill-amber-500" aria-hidden="true" />
              </>
            ) : (
              t("list.ratingNew")
            )}
          </dd>
        </div>
      </dl>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <label htmlFor="agency-trips-search" className="sr-only">
            {t("list.searchLabel")}
          </label>
          <BrandSearchIcon
            size={18}
            aria-hidden="true"
            className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            id="agency-trips-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("list.searchPlaceholder")}
            className={`w-full ps-10 pe-4 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary placeholder:text-neutral-500 focus:border-primary ${FOCUS_RING}`}
          />
        </div>

        <div
          role="group"
          aria-label={t("list.filterLabel")}
          className="flex items-center gap-2 self-end sm:self-auto"
        >
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={statusFilter === f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${FOCUS_RING} ${
                statusFilter === f.id
                  ? f.activeClass
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trips Feed / Grid */}
      {filteredTrips.length === 0 ? (
        <div className="bg-white rounded-3xl border border-tertiary/70 p-12 text-center space-y-4 shadow-2xs">
          <BrandCompassIcon size={48} className="mx-auto text-neutral-300" aria-hidden="true" />
          <h2 className="font-serif text-lg font-bold text-primary">{t("list.emptyTitle")}</h2>
          <p className="text-xs text-neutral-600 max-w-sm mx-auto">
            {searchQuery ? t("list.emptySearch") : t("list.emptyNone")}
          </p>
          <Link
            href="/host/agency/trips/new"
            className={`inline-block px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition ${FOCUS_RING}`}
          >
            {t("list.createFirst")}
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTrips.map((trip) => {
            const nights = Math.max(1, trip.durationDays - 1);
            const isActive = trip.status === "active";

            return (
              <li
                key={trip.id}
                className="bg-white rounded-3xl border border-tertiary/70 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between"
              >
                <Link href={`/trips/${trip.id}`} className={`block rounded-t-3xl ${FOCUS_RING}`}>
                  {/* Card Header & Media */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
                    <Image
                      src={trip.coverPhoto}
                      alt={t("list.coverAlt", { title: trip.title })}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                    {/* Top status & duration pills */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                      <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[11px] font-bold text-primary flex items-center gap-1.5 shadow-xs">
                        <BrandCalendarIcon size={13} className="text-secondary" aria-hidden="true" />
                        <span>{t("duration", { days: trip.durationDays, nights })}</span>
                      </span>

                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1 text-white ${
                          isActive ? "bg-emerald-700" : "bg-amber-700"
                        }`}
                      >
                        <span aria-hidden="true">{isActive ? "●" : "○"}</span>
                        <span>{isActive ? t("list.statusActive") : t("list.statusDraft")}</span>
                      </span>
                    </div>

                    {/* Bottom overlay: Location & Rating */}
                    <div className="absolute bottom-3 start-3 end-3 flex items-center justify-between text-white text-xs">
                      <div className="flex items-center gap-1 font-semibold">
                        <BrandPinIcon size={14} className="text-secondary" aria-hidden="true" />
                        <span>{t("cityCountry", { city: trip.city })}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-xs font-bold">
                        <BrandStarIcon size={12} className="text-amber-400 fill-amber-400" aria-hidden="true" />
                        <span>
                          {trip.rating
                            ? formatNumber(trip.rating, locale, twoDecimals)
                            : t("list.ratingNew")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    <h2 className="font-serif text-lg font-bold text-primary line-clamp-1">
                      {trip.title}
                    </h2>
                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                      {trip.description}
                    </p>

                    {/* Logistics highlights */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-tertiary/40 text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <BrandUsersIcon size={14} className="text-secondary" aria-hidden="true" />
                        <span>
                          {t("list.groupRange", {
                            min: trip.minGroupSize || 2,
                            max: trip.maxGroupSize,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <BrandListIcon size={14} className="text-secondary" aria-hidden="true" />
                        <span>
                          {t("list.itineraryDays", {
                            count: trip.itinerary?.length || trip.durationDays,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Scheduled departure dates chips */}
                    {trip.departureDates && trip.departureDates.length > 0 && (
                      <div className="pt-2">
                        <span className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5">
                          {t("list.upcomingDepartures", { count: trip.departureDates.length })}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {trip.departureDates.slice(0, 3).map((date) => (
                            <time
                              key={date}
                              dateTime={date}
                              className="px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-700 text-[11px] font-medium"
                            >
                              {formatDate(date, locale)}
                            </time>
                          ))}
                          {trip.departureDates.length > 3 && (
                            <span className="text-[10px] text-neutral-600 font-semibold">
                              {t("list.moreDates", { count: trip.departureDates.length - 3 })}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Card Footer */}
                <div className="p-5 pt-3 border-t border-tertiary/40 bg-neutral-50/50 flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
                      {t("list.pricePerTraveler")}
                    </span>
                    <PriceDisplay
                      price={trip.pricePerPerson}
                      priceClassName="text-base font-black text-primary"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(trip)}
                      aria-label={
                        isActive
                          ? t("list.pauseAria", { title: trip.title })
                          : t("list.publishAria", { title: trip.title })
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${FOCUS_RING} ${
                        isActive
                          ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      }`}
                    >
                      {isActive ? t("list.pause") : t("list.publish")}
                    </button>

                    <Link
                      href={`/trips/${trip.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t("list.viewPublic", { title: trip.title })}
                      title={t("list.viewPublic", { title: trip.title })}
                      className={`p-2 rounded-xl bg-white border border-tertiary/70 text-neutral-700 hover:text-primary hover:border-primary transition shadow-2xs ${FOCUS_RING}`}
                    >
                      <BrandExternalLinkIcon size={16} aria-hidden="true" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => setDeletingId(trip.id)}
                      aria-label={t("list.deleteAria", { title: trip.title })}
                      title={t("list.deleteAria", { title: trip.title })}
                      className={`p-2 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 transition shadow-2xs cursor-pointer ${FOCUS_RING}`}
                    >
                      <BrandTrashIcon size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onCancel={() => setDeletingId(null)}
        onConfirm={() => {
          if (deletingId) handleDelete(deletingId);
        }}
        title={t("list.deleteTitle")}
        message={t("list.deleteMessage")}
        confirmLabel={t("list.deleteConfirm")}
        cancelLabel={tCommon("cancel")}
        isLoading={isDeleting}
        variant="destructive"
      />
    </div>
  );
}
