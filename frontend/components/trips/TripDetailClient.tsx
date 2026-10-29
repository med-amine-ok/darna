"use client";

import React, { useId, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Link, useRouter } from "@/navigation";
import { Trip, User, Organization } from "@/types";
import { getTripCoordinates } from "@/lib/trip-coordinates";
import PriceDisplay from "@/components/common/PriceDisplay";
import Container from "@/components/Container";
import { createBookingAction } from "@/app/actions/bookings";
import { toast } from "react-toastify";
import { useLocale, useTranslations } from "next-intl";
import { useCurrency } from "@/hook/useCurrency";
import { formatNumber, formatRating } from "@/lib/i18n/date-locale";
import { quoteTripBooking } from "@/lib/booking/pricing";
import { tripEndDate, validateTripRequest } from "@/lib/booking/availability";
import { getCancellationPolicy } from "@/lib/booking/cancellation";
import { formatDateKey, formatDateRange, type DateKey } from "@/lib/booking/dates";
import {
  BrandStarIcon,
  PremiumStarIcon,
  BrandCompassIcon,
  BrandCalendarIcon,
  BrandUsersIcon,
  BrandBuildingIcon,
  BrandShareIcon,
  BrandHeartIcon,
  BrandShieldIcon,
  BrandPinIcon,
  BrandCheckIcon,
  BrandCloseIcon,
  BrandClockIcon,
  BrandChevronDownIcon,
  BrandChevronUpIcon,
  BrandChevronLeftIcon,
  BrandAlertCircleIcon,
  BrandKitchenIcon,
  BrandBedIcon,
} from "@/components/icons";
import { useActionError } from "@/hook/useActionError";

function MapLoading() {
  const t = useTranslations("trips");
  return (
    <div
      role="status"
      className="w-full h-[280px] bg-tertiary/20 animate-pulse rounded-2xl flex items-center justify-center text-primary/80 text-xs font-semibold"
    >
      {t("detail.mapLoading")}
    </div>
  );
}

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <MapLoading />,
});

interface TripDetailClientProps {
  trip: Trip;
  currentUser?: User | null;
  /** Seats already sold per departure date (server-computed). */
  seatsSold: Record<DateKey, number>;
  /** Today in Algeria (server-computed). */
  today: DateKey;
}

export default function TripDetailClient({
  trip,
  currentUser,
  seatsSold,
  today,
}: TripDetailClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const ratingText = trip.rating
    ? formatNumber(trip.rating, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";
  const t = useTranslations("trips");
  const errorText = useActionError();
  const { formatDzd } = useCurrency();
  const fieldId = useId();
  const departureId = `${fieldId}-departure`;
  const departureHintId = `${fieldId}-departure-hint`;
  const travelersLabelId = `${fieldId}-travelers`;
  const noteId = `${fieldId}-note`;
  const errorId = `${fieldId}-error`;

  // Upcoming departures only; no fallback to "today" when none are scheduled.
  const upcomingDepartures = (trip.departureDates || []).filter((d) => d > today).sort();
  const seatsLeftFor = (date: string) => Math.max(0, trip.maxGroupSize - (seatsSold[date] || 0));
  const firstOpen = upcomingDepartures.find((d) => seatsLeftFor(d) > 0) || upcomingDepartures[0] || "";

  // Booking widget state
  const [selectedDate, setSelectedDate] = useState<string>(firstOpen);
  const seatsLeft = selectedDate ? seatsLeftFor(selectedDate) : 0;
  const minTravelers = 1;
  const maxTravelers = Math.max(1, seatsLeft);
  const [guestCount, setGuestCount] = useState<number>(
    Math.max(1, Math.min(trip.minGroupSize || 2, seatsLeft || 1))
  );
  const [guestMessage, setGuestMessage] = useState<string>("");
  const [isBooking, setIsBooking] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [activePhoto, setActivePhoto] = useState<number>(0);

  const agency = trip.organization;
  const nights = Math.max(1, trip.durationDays - 1);
  const agencyApprovalMode = agency?.bookingApprovalMode || "instant";

  // Same pure functions the server uses.
  const quote = quoteTripBooking({ trip, guestCount });
  const subtotal = quote.subtotal;
  const totalPrice = quote.total;
  const policy = getCancellationPolicy(trip.cancellationPolicy);
  const validationError = validateTripRequest({
    trip,
    departureDate: selectedDate,
    guestCount,
    seatsSold: seatsSold[selectedDate] || 0,
    today,
  });
  const validationMessage = validationError ? errorText(validationError) : null;
  const agencyName = agency?.name || t("detail.agencyFallback");
  const agencyRating = formatRating(agency?.rating, locale);
  const policyKey = policy.id;

  // Handle booking reservation
  const handleBookTrip = async () => {
    if (!currentUser) {
      toast.info(t("detail.signInToBook"));
      router.push(`/login?callbackUrl=/trips/${trip.id}`);
      return;
    }
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setIsBooking(true);
    try {
      // Price, dates and approval mode are computed on the server.
      const result = await createBookingAction({
        kind: "trip",
        tripId: trip.id,
        departureDate: selectedDate,
        guestCount,
        guestMessage: guestMessage.trim() || undefined,
      });

      if (!result.ok) {
        if (result.code === "UNAUTHENTICATED") {
          router.push(`/login?callbackUrl=/trips/${trip.id}`);
        }
        toast.error(errorText(result));
        return;
      }

      if (result.data.status === "pending") {
        toast.success(t("detail.requestSent", { agency: agencyName }));
      } else {
        toast.success(t("detail.reserved"));
      }

      router.push("/trips");
      router.refresh();
    } catch {
      toast.error(t("detail.bookFailed"));
    } finally {
      setIsBooking(false);
    }
  };

  const allPhotos = [trip.coverPhoto, ...(trip.gallery || [])].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  return (
    <div className="bg-darnaBg min-h-screen pt-6 sm:pt-8 pb-28 lg:pb-8">
      <Container className="space-y-8 max-w-7xl">
        {/* Top Breadcrumb & Actions */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-primary transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
          >
            <BrandChevronLeftIcon size={16} strokeWidth={2.2} className="rtl:rotate-180" aria-hidden="true" />
            <span>{t("detail.back")}</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toast.info(t("detail.linkCopied"))}
              className="p-2 rounded-xl bg-white border border-tertiary/70 text-neutral-600 hover:text-primary transition shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
              title={t("detail.share")}
              aria-label={t("detail.share")}
            >
              <BrandShareIcon size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => toast.info(t("detail.saved"))}
              className="p-2 rounded-xl bg-white border border-tertiary/70 text-neutral-600 hover:text-rose-500 transition shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
              title={t("detail.save")}
              aria-label={t("detail.save")}
            >
              <BrandHeartIcon size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Title Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <BrandCompassIcon size={13} aria-hidden="true" />
              <span>{t("detail.curatedBadge")}</span>
            </span>

            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center gap-1.5">
              <BrandCalendarIcon size={13} aria-hidden="true" />
              <span>{t("card.duration", { days: trip.durationDays, nights })}</span>
            </span>

            <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-semibold flex items-center gap-1.5">
              <BrandUsersIcon size={13} aria-hidden="true" />
              <span>{t("detail.groupSize", { min: trip.minGroupSize || 2, max: trip.maxGroupSize })}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-primary leading-tight">
            {trip.title}
          </h1>

          <div className="flex items-center gap-4 text-xs sm:text-sm text-neutral-600 flex-wrap pt-1">
            <div className="flex items-center gap-1 font-semibold text-primary">
              <BrandPinIcon size={16} strokeWidth={2} className="text-secondary shrink-0" aria-hidden="true" />
              <span>{t("locationLine", { city: trip.city, country: t("countryAlgeria") })}</span>
            </div>

            {trip.rating && (
              <div className="flex items-center gap-1">
                <BrandStarIcon size={15} className="text-accent fill-accent" aria-hidden="true" />
                <span className="sr-only">{t("card.ratingLabel", { rating: ratingText })}</span>
                <span className="font-bold text-primary" aria-hidden="true">{ratingText}</span>
                <span className="text-neutral-500">{t("detail.reviews", { count: trip.reviewsCount || 0 })}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-neutral-500">
              <BrandBuildingIcon size={15} className="text-neutral-400" aria-hidden="true" />
              <span>
                {t.rich("detail.organizedBy", {
                  agency: agencyName,
                  b: (chunks) => <strong className="text-primary font-semibold">{chunks}</strong>,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Photo Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-3xl overflow-hidden max-h-[500px]">
          <div className="relative md:col-span-2 aspect-[4/3] md:aspect-auto md:h-full bg-neutral-100">
            <Image
              src={allPhotos[0]}
              alt={trip.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="hidden md:grid md:col-span-2 grid-cols-2 gap-3 h-full">
            {allPhotos.slice(1, 5).map((photo, i) => (
              <div key={i} className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
                <Image
                  src={photo}
                  alt={t("detail.photoAlt", { title: trip.title, index: i + 2 })}
                  fill
                  sizes="25vw"
                  className="object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Two-Column Layout: Details (Left) + Sticky Booking Widget (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT COLUMN: Details, Agency Card, Itinerary, Inclusions */}
          <div className="lg:col-span-7 space-y-10">
            {/* Agency Verification Card */}
            <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-7 shadow-2xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center text-secondary font-black text-xl shrink-0">
                  <BrandCompassIcon size={28} aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-serif text-lg font-bold text-primary">{agencyName}</h2>
                    {agency?.isVerified && (
                      <BrandShieldIcon size={16} className="text-emerald-600" aria-label={t("detail.verifiedBadge")} role="img" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {agency?.isVerified ? t("detail.verifiedOperator") : t("detail.pendingOperator")}
                  </p>
                  {agencyRating && (
                    <div className="flex items-center gap-3 text-xs text-neutral-600 mt-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <BrandStarIcon size={12} className="text-accent" aria-hidden="true" />
                        <span>{t("detail.agencyRating", { rating: agencyRating })}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Link
                href={agency?.id ? `/agencies/${agency.id}` : "/"}
                className="hidden sm:inline-flex px-4 py-2 rounded-xl border border-tertiary text-xs font-bold text-primary hover:bg-neutral-50 transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
              >
                {t("detail.viewAgency")}
              </Link>
            </div>

            {/* Overview Description */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary">
                {t("detail.about")}
              </h2>
              <p className="text-sm sm:text-base text-neutral-700 leading-relaxed whitespace-pre-line">
                {trip.description}
              </p>
            </div>

            {/* Day-by-Day Interactive Itinerary */}
            <div className="space-y-6 pt-4 border-t border-tertiary/60">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary">
                    {t("detail.itinerary")}
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                    {t("detail.itinerarySubtitle", { count: trip.itinerary?.length || trip.durationDays })}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setExpandedDay(expandedDay === null ? 1 : null)
                  }
                  aria-expanded={expandedDay === null}
                  className="text-xs font-bold text-primary hover:text-secondary underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                >
                  {expandedDay === null ? t("detail.collapse") : t("detail.expandAll")}
                </button>
              </div>

              <div className="space-y-3">
                {trip.itinerary?.map((dayItem) => {
                  const isExpanded = expandedDay === dayItem.day || expandedDay === null;

                  return (
                    <div
                      key={dayItem.day}
                      className="bg-white rounded-2xl border border-tertiary/70 overflow-hidden shadow-2xs transition"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDay(expandedDay === dayItem.day ? -1 : dayItem.day)
                        }
                        aria-expanded={isExpanded}
                        aria-controls={`${fieldId}-day-${dayItem.day}`}
                        className="w-full p-5 flex items-center justify-between gap-4 text-start hover:bg-neutral-50/50 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {dayItem.day}
                          </span>
                          <div>
                            <span className="block text-[10px] font-bold text-secondary uppercase tracking-wider">
                              {t("detail.dayLabel", { day: dayItem.day })}
                            </span>
                            <span className="font-serif text-base font-bold text-primary">
                              {dayItem.title}
                            </span>
                          </div>
                        </div>

                        <div className="text-neutral-400" aria-hidden="true">
                          {isExpanded ? <BrandChevronUpIcon size={18} strokeWidth={2} /> : <BrandChevronDownIcon size={18} strokeWidth={2} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div
                          id={`${fieldId}-day-${dayItem.day}`}
                          className="px-5 pb-5 pt-1 space-y-4 border-t border-tertiary/40 bg-neutral-50/30 text-xs sm:text-sm">
                          <p className="text-neutral-600 leading-relaxed">
                            {dayItem.description}
                          </p>

                          {/* Day Activities */}
                          {dayItem.activities && dayItem.activities.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                                {t("detail.highlights")}
                              </span>
                              <div className="flex items-center gap-2 flex-wrap">
                                {dayItem.activities.map((act, i) => (
                                  <span
                                    key={i}
                                    className="px-2.5 py-1 rounded-lg bg-white border border-tertiary/70 text-xs font-medium text-neutral-700 shadow-2xs inline-flex items-center gap-1.5"
                                  >
                                    <PremiumStarIcon size={11} className="text-accent shrink-0" />
                                    <span>{act}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Logistics: Meals & Sleep */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-tertiary/40 text-xs">
                            {dayItem.meals && (
                              <div className="flex items-center gap-2 text-neutral-600">
                                <BrandKitchenIcon size={15} className="text-secondary shrink-0" aria-hidden="true" />
                                <span className="sr-only">{t("detail.meals")}: </span>
                                <span>{dayItem.meals}</span>
                              </div>
                            )}
                            {dayItem.accommodation && (
                              <div className="flex items-center gap-2 text-neutral-600">
                                <BrandBedIcon size={15} className="text-secondary shrink-0" aria-hidden="true" />
                                <span className="sr-only">{t("detail.accommodation")}: </span>
                                <span>{dayItem.accommodation}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inclusions vs Exclusions Side-by-Side */}
            <div className="space-y-4 pt-4 border-t border-tertiary/60">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary">
                {t("detail.included")}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Inclusions */}
                <div className="p-6 bg-emerald-50/40 rounded-3xl border border-emerald-200/80 space-y-3">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BrandCheckIcon size={15} strokeWidth={2.5} className="text-emerald-600" aria-hidden="true" />
                    <span>{t("detail.includedTitle")}</span>
                  </span>
                  <ul className="space-y-2.5 text-xs text-neutral-700">
                    {trip.inclusions?.map((inc, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <BrandCheckIcon size={14} strokeWidth={2.5} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="leading-snug">{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Exclusions */}
                <div className="p-6 bg-rose-50/40 rounded-3xl border border-rose-200/80 space-y-3">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BrandCloseIcon size={15} strokeWidth={2.2} className="text-rose-600" aria-hidden="true" />
                    <span>{t("detail.notIncluded")}</span>
                  </span>
                  <ul className="space-y-2.5 text-xs text-neutral-700">
                    {trip.exclusions?.map((exc, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <BrandCloseIcon size={14} strokeWidth={2.2} className="text-rose-500 shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="leading-snug">{exc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Meeting Point & Logistics */}
            <div className="space-y-3 pt-4 border-t border-tertiary/60">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary">
                {t("detail.meetingPoint")}
              </h2>
              <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-2xs flex items-start gap-3 text-xs sm:text-sm">
                <BrandPinIcon size={20} strokeWidth={2} className="text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-bold text-primary block">
                    {trip.meetingPoint}
                  </span>
                  <p className="text-neutral-500 text-xs mt-1">
                    {t("detail.meetingNote")}
                  </p>
                </div>
              </div>

              {/* Interactive Meeting Point Map */}
              <div className="rounded-2xl overflow-hidden border border-tertiary/70 shadow-sm h-[280px]">
                <Map
                  center={trip.latlng || getTripCoordinates(trip)}
                  locationValue={trip.city || trip.locationValue}
                  zoom={10}
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Cancellation Policy */}
            <div className="space-y-3 pt-4 border-t border-tertiary/60">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary">
                {t("detail.cancellationPolicy")}
              </h2>
              <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-2xs space-y-1 text-xs">
                <span className="font-bold text-primary uppercase tracking-wider block">
                  {t("detail.policyName", { policy: t(`policy.${policyKey}.label`) })}
                </span>
                <p className="text-neutral-600">{t(`policy.${policyKey}.summaryTrip`)}</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Booking Card */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="bg-white rounded-3xl border border-tertiary/80 p-6 sm:p-7 shadow-xl space-y-6">
              {/* Header Price */}
              <div className="flex items-baseline justify-between border-b border-tertiary/40 pb-4">
                <div>
                  <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                    {t("detail.pricePerPerson")}
                  </span>
                  <PriceDisplay
                    price={trip.pricePerPerson}
                    period={t("detail.perTraveler")}
                    priceClassName="text-2xl font-black text-primary"
                  />
                </div>
                <div className="text-end">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    {t("detail.allInclusive")}
                  </span>
                </div>
              </div>



              {/* Departure Date Selector */}
              <div className="space-y-2">
                <label htmlFor={departureId} className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  {t("detail.selectDeparture")}
                </label>
                {upcomingDepartures.length > 0 ? (
                  <>
                    <select
                      id={departureId}
                      aria-describedby={selectedDate ? departureHintId : undefined}
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setGuestCount((g) => Math.max(1, Math.min(g, seatsLeftFor(e.target.value) || 1)));
                      }}
                      className="w-full px-4 py-3 bg-neutral-50 border border-tertiary/80 rounded-2xl text-xs sm:text-sm font-semibold text-primary focus:outline-none focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                    >
                      {upcomingDepartures.map((date) => {
                        const left = seatsLeftFor(date);
                        return (
                          <option key={date} value={date} disabled={left === 0}>
                            {t("detail.departureOption", {
                              dates: formatDateRange(date, tripEndDate(date, trip.durationDays), locale),
                              seats: left,
                            })}
                          </option>
                        );
                      })}
                    </select>
                    {selectedDate && (
                      <p id={departureHintId} className="text-[11px] text-neutral-500">
                        {t("detail.returnsLine", {
                          date: formatDateKey(tripEndDate(selectedDate, trip.durationDays), locale),
                          left: seatsLeft,
                          max: trip.maxGroupSize,
                        })}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="w-full px-4 py-3 bg-neutral-50 border border-tertiary/80 rounded-2xl text-xs sm:text-sm font-semibold text-neutral-500">
                    {t("detail.noDepartures")}
                  </p>
                )}
              </div>

              {/* Travelers Stepper */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span id={travelersLabelId} className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    {t("detail.travelers")}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {selectedDate
                      ? t("detail.maxGroupWithLeft", { max: trip.maxGroupSize, left: seatsLeft })
                      : t("detail.maxGroup", { max: trip.maxGroupSize })}
                  </span>
                </div>

                <div
                  role="group"
                  aria-labelledby={travelersLabelId}
                  className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-tertiary/80"
                >
                  <div className="text-xs">
                    <span className="font-bold text-primary block">{t("detail.adultsYouth")}</span>
                    <span className="text-neutral-500 text-[11px]">{t("detail.allAges")}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={guestCount <= minTravelers}
                      onClick={() => setGuestCount(Math.max(minTravelers, guestCount - 1))}
                      aria-label={t("detail.decrease")}
                      className="w-8 h-8 rounded-full border border-tertiary bg-white flex items-center justify-center font-bold text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                    >
                      <span aria-hidden="true">–</span>
                    </button>
                    <span aria-live="polite" className="font-bold text-base text-primary w-5 text-center">
                      {guestCount}
                    </span>
                    <button
                      type="button"
                      disabled={guestCount >= maxTravelers}
                      onClick={() => setGuestCount(Math.min(maxTravelers, guestCount + 1))}
                      aria-label={t("detail.increase")}
                      className="w-8 h-8 rounded-full border border-tertiary bg-white flex items-center justify-center font-bold text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Optional message to agency */}
              {agencyApprovalMode === "request" && (
                <div className="space-y-1.5">
                  <label htmlFor={noteId} className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    {t("detail.noteToAgency")}
                  </label>
                  <textarea
                    id={noteId}
                    rows={2}
                    value={guestMessage}
                    onChange={(e) => setGuestMessage(e.target.value)}
                    placeholder={t("detail.notePlaceholder")}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                  />
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="space-y-2.5 pt-3 border-t border-tertiary/40 text-xs">
                <div className="flex items-center justify-between text-neutral-600">
                  <span>
                    {t("detail.priceTimesTravelers", { price: formatDzd(trip.pricePerPerson), count: guestCount })}
                  </span>
                  <span className="font-semibold">{formatDzd(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                  <span>{t("detail.platformFee")}</span>
                  <span className="text-emerald-700 font-bold">{t("detail.platformFeeFree", { amount: formatDzd(0) })}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-primary pt-2 border-t border-tertiary/40">
                  <span>{t("detail.total")}</span>
                  <PriceDisplay price={totalPrice} priceClassName="text-lg font-black text-primary" />
                </div>
              </div>

              {validationMessage && (
                <p id={errorId} role="alert" className="text-xs font-semibold text-rose-700">
                  {validationMessage}
                </p>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleBookTrip}
                disabled={isBooking || Boolean(validationError)}
                aria-describedby={validationMessage ? errorId : undefined}
                aria-busy={isBooking}
                className="w-full py-3.5 px-4 bg-primary hover:bg-primary/95 text-white rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer btn-press disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
              >
                <BrandCompassIcon size={17} strokeWidth={2} className="text-tertiary" aria-hidden="true" />
                <span>
                  {isBooking
                    ? t("detail.processing")
                    : agencyApprovalMode === "request"
                    ? t("detail.requestSpot")
                    : t("detail.reserve")}
                </span>
              </button>

              <div className="text-center text-[11px] text-neutral-500">
                {t("detail.noChargeNote")}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
