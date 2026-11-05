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
  BrandCheckCircleIcon,
} from "@/components/icons";
import {
  Badge,
  Button,
  Card,
  IconButton,
  Input,
  KitEmptyState,
  SegmentedControl,
  StatCard,
  cn,
  focusRing,
} from "@/components/ui";
import { useActionError } from "@/hook/useActionError";
import { tripTypeLabel } from "@/lib/catalog-types";

interface AgencyTripsClientProps {
  initialTrips: Trip[];
  currentUser?: User | null;
  organization?: Organization | null;
}

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
    },
    {
      id: "active" as const,
      label: t("list.filterActive", { count: activeCount }),
    },
    {
      id: "draft" as const,
      label: t("list.filterDraft", { count: draftCount }),
    },
  ];

  const twoDecimals = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  // Review-weighted average of the agency's rated trips; null → "New".
  const ratedTrips = trips.filter((trip) => trip.rating && trip.rating > 0);
  const ratingWeight = ratedTrips.reduce((sum, trip) => sum + (trip.reviewsCount || 1), 0);
  const averageRating = ratingWeight
    ? ratedTrips.reduce((sum, trip) => sum + (trip.rating || 0) * (trip.reviewsCount || 1), 0) / ratingWeight
    : null;

  const iconLink = cn(
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary-700 transition-colors duration-fast ease-standard hover:bg-primary/[0.06]",
    focusRing
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="enter-up min-w-0">
          <p className="flex items-center gap-1.5 text-eyebrow uppercase text-secondary-700">
            <BrandCompassIcon size={14} aria-hidden="true" />
            <span className="truncate">{t("list.eyebrow", { name: organization?.name || t("workspaceFallback") })}</span>
          </p>
          <h1 className="mt-2 font-serif text-display-md text-primary-900 [text-wrap:balance]">{t("list.title")}</h1>
          <p className="mt-2 max-w-2xl text-body text-primary-600 [text-wrap:pretty]">{t("list.subtitle")}</p>
        </div>
        <Button
          href="/host/agency/trips/new"
          variant="primary"
          size="lg"
          leadingIcon={<BrandPlusIcon size={18} aria-hidden="true" />}
          className="enter-up self-start md:self-auto"
        >
          {t("list.addTrip")}
        </Button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("list.kpiTotal")} value={trips.length} icon={<BrandCompassIcon size={18} aria-hidden="true" />} />
        <StatCard label={t("list.kpiActive")} value={activeCount} icon={<BrandCheckCircleIcon size={18} aria-hidden="true" />} />
        <StatCard label={t("list.kpiDepartures")} value={totalDepartures} icon={<BrandCalendarIcon size={18} aria-hidden="true" />} />
        {averageRating ? (
          <StatCard
            label={t("list.kpiRating")}
            value={Math.round(averageRating * 100)}
            format={(n) => formatNumber(n / 100, locale, twoDecimals)}
            icon={<BrandStarIcon size={18} aria-hidden="true" />}
          />
        ) : (
          <Card padding="md" className="flex flex-col justify-between gap-2">
            <p className="flex items-center gap-2 text-meta text-primary-600">
              <BrandStarIcon size={18} aria-hidden="true" className="text-secondary-700" />
              {t("list.kpiRating")}
            </p>
            <p className="font-serif text-heading text-primary-900">{t("list.ratingNew")}</p>
          </Card>
        )}
      </div>

      {/* Search & filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          id="agency-trips-search"
          type="search"
          label={t("list.searchLabel")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          prefix={<BrandSearchIcon size={18} aria-hidden="true" />}
          containerClassName="w-full sm:max-w-sm"
        />
        <SegmentedControl
          ariaLabel={t("list.filterLabel")}
          value={statusFilter}
          onChange={setStatusFilter}
          options={filters.map((f) => ({ value: f.id, label: f.label }))}
        />
      </div>

      {/* Trips */}
      {filteredTrips.length === 0 ? (
        <Card padding="none" radius="3xl">
          <KitEmptyState
            compact
            variant="search"
            title={t("list.emptyTitle")}
            description={searchQuery ? t("list.emptySearch") : t("list.emptyNone")}
            action={
              <Button href="/host/agency/trips/new" variant="secondary" size="md">
                {t("list.createFirst")}
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.map((trip, index) => {
            const nights = Math.max(1, trip.durationDays - 1);
            const isActive = trip.status === "active";

            return (
              <li
                key={trip.id}
                className="enter-up flex flex-col"
                style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
              >
                <Link
                  href={`/trips/${trip.id}`}
                  className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-4 focus-visible:ring-offset-darnaBg"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-tertiary-100 shadow-e1 transition-[box-shadow,transform] duration-base ease-out group-hover:-translate-y-1 group-hover:shadow-e3">
                    <Image
                      src={trip.coverPhoto}
                      alt={t("list.coverAlt", { title: trip.title })}
                      fill
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw"
                      className="object-cover transition-transform [transition-duration:700ms] ease-out group-hover:scale-[1.04]"
                    />
                    <div aria-hidden="true" className="absolute inset-0 scrim-bottom" />
                    <div aria-hidden="true" className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary-900/35 to-transparent" />

                    <div className="absolute inset-x-3.5 top-3.5 flex items-center justify-between gap-2">
                      <span className="glass-light flex min-w-0 items-center gap-1.5 rounded-full py-1 pe-3 ps-2 text-[0.6875rem] font-semibold text-primary-900 shadow-e1">
                        <BrandCalendarIcon size={13} className="shrink-0 text-secondary-700" aria-hidden="true" />
                        <span className="truncate">{t("duration", { days: trip.durationDays, nights })}</span>
                      </span>
                      <Badge tone={isActive ? "success" : "warning"} dot className="shrink-0 shadow-e1">
                        {isActive ? t("list.statusActive") : t("list.statusDraft")}
                      </Badge>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <p className="flex items-center gap-1.5 text-eyebrow uppercase text-tertiary-200">
                        <BrandPinIcon size={13} aria-hidden="true" />
                        {trip.tripType && (
                          <>
                            <span>{tripTypeLabel(trip.tripType, locale)}</span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        {t("cityCountry", { city: trip.city })}
                      </p>
                      <h2 className="mt-2 line-clamp-2 font-serif text-[1.375rem] leading-tight">{trip.title}</h2>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-white/85">
                        <span className="flex items-center gap-1.5">
                          <BrandUsersIcon size={13} aria-hidden="true" />
                          {t("list.groupRange", { min: trip.minGroupSize || 2, max: trip.maxGroupSize })}
                        </span>
                        <span aria-hidden="true" className="text-white/40">
                          ·
                        </span>
                        <span className="flex items-center gap-1.5">
                          <BrandListIcon size={13} aria-hidden="true" />
                          {t("list.itineraryDays", { count: trip.itinerary?.length || trip.durationDays })}
                        </span>
                        <span aria-hidden="true" className="text-white/40">
                          ·
                        </span>
                        <span className="flex items-center gap-1 tabular-nums">
                          <BrandStarIcon size={12} aria-hidden="true" />
                          {trip.rating ? formatNumber(trip.rating, locale, twoDecimals) : t("list.ratingNew")}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                {trip.departureDates && trip.departureDates.length > 0 && (
                  <div className="mt-3.5 px-1">
                    <p className="mb-1.5 text-meta text-primary-600">
                      {t("list.upcomingDepartures", { count: trip.departureDates.length })}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {trip.departureDates.slice(0, 3).map((date) => (
                        <time
                          key={date}
                          dateTime={date}
                          className="rounded-full bg-white px-2.5 py-1 text-meta tabular-nums text-primary-800 shadow-e1"
                        >
                          {formatDate(date, locale)}
                        </time>
                      ))}
                      {trip.departureDates.length > 3 && (
                        <span className="text-meta font-semibold text-primary-600">
                          {t("list.moreDates", { count: trip.departureDates.length - 3 })}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-auto flex items-end justify-between gap-3 px-1 pt-4">
                  <div className="min-w-0">
                    <span className="block text-meta text-primary-500">{t("list.pricePerTraveler")}</span>
                    <PriceDisplay
                      price={trip.pricePerPerson}
                      priceClassName="text-[1.0625rem] font-semibold text-primary-900 tabular-nums"
                      eurClassName="text-meta text-primary-500 tabular-nums"
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant={isActive ? "tertiary" : "secondary"}
                      size="sm"
                      onClick={() => handleToggleStatus(trip)}
                      aria-label={
                        isActive
                          ? t("list.pauseAria", { title: trip.title })
                          : t("list.publishAria", { title: trip.title })
                      }
                    >
                      {isActive ? t("list.pause") : t("list.publish")}
                    </Button>
                    <Link
                      href={`/trips/${trip.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t("list.viewPublic", { title: trip.title })}
                      title={t("list.viewPublic", { title: trip.title })}
                      className={iconLink}
                    >
                      <BrandExternalLinkIcon size={17} aria-hidden="true" />
                    </Link>
                    <IconButton
                      label={t("list.deleteAria", { title: trip.title })}
                      icon={<BrandTrashIcon size={17} aria-hidden="true" />}
                      variant="ghost"
                      onClick={() => setDeletingId(trip.id)}
                      className="text-accent-700"
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

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
