"use client";

import React, { useCallback, useId, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Link, useRouter } from "@/navigation";
import { Trip, User } from "@/types";
import { getTripCoordinates } from "@/lib/trip-coordinates";
import Container from "@/components/Container";
import Counter from "@/components/inputs/Counter";
import { createBookingAction } from "@/app/actions/bookings";
import { toast } from "react-toastify";
import { useLocale, useTranslations } from "next-intl";
import { useCurrency } from "@/hook/useCurrency";
import { formatNumber, formatRating } from "@/lib/i18n/date-locale";
import { quoteTripBooking } from "@/lib/booking/pricing";
import { tripEndDate, validateTripRequest } from "@/lib/booking/availability";
import { getCancellationPolicy } from "@/lib/booking/cancellation";
import { formatDateKey, type DateKey } from "@/lib/booking/dates";
import { AnimatedNumber, ArchImage, Avatar, Badge, Banner, Button, IconButton, Pill, Sheet, Textarea, cn } from "@/components/ui";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import {
  BrandStarIcon,
  BrandCompassIcon,
  BrandCalendarIcon,
  BrandUsersIcon,
  BrandShareIcon,
  BrandHeartIcon,
  BrandShieldIcon,
  BrandPinIcon,
  BrandCheckIcon,
  BrandCloseIcon,
  BrandChevronLeftIcon,
  BrandKitchenIcon,
  BrandBedIcon,
  BrandGridIcon,
  BrandClockIcon,
} from "@/components/icons";
import { useActionError } from "@/hook/useActionError";
import ListingSectionNav from "@/components/listing/ListingSectionNav";
import PhotoLightbox from "@/components/listing/PhotoLightbox";
import Timeline from "@/components/listing/detail/Timeline";
import { tripTypeLabel } from "@/lib/catalog-types";
import MobileBookingBar from "@/components/listing/detail/MobileBookingBar";
import BookingSuccessDialog, { type BookingSummaryRow } from "@/components/listing/detail/BookingSuccessDialog";

function MapLoading() {
  const t = useTranslations("trips");
  return (
    <div role="status" className="skeleton w-full h-[320px] rounded-3xl flex items-center justify-center text-meta text-primary-600">
      <span className="relative">{t("detail.mapLoading")}</span>
    </div>
  );
}

const Map = dynamic(() => import("@/components/Map"), { ssr: false, loading: () => <MapLoading /> });

interface TripDetailClientProps {
  trip: Trip;
  currentUser?: User | null;
  /** Seats already sold per departure date (server-computed). */
  seatsSold: Record<DateKey, number>;
  /** Today in Algeria (server-computed). */
  today: DateKey;
}

const TRIP_SECTIONS = ["photos", "itinerary", "included", "location", "policies"] as const;
const sectionClass = "scroll-mt-28 border-b border-primary/[0.08] py-10 space-y-6";

export default function TripDetailClient({ trip, currentUser, seatsSold, today }: TripDetailClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("trips");
  const td = useTranslations("tripDetail");
  const tl = useTranslations("listing");
  const errorText = useActionError();
  const { formatDzd } = useCurrency();
  const baseId = useId();
  const errorId = `${baseId}-error`;

  const ratingText = trip.rating ? formatNumber(trip.rating, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

  // Upcoming departures only; no fallback to "today" when none are scheduled.
  const upcomingDepartures = (trip.departureDates || []).filter((d) => d > today).sort();
  const seatsLeftFor = (date: string) => Math.max(0, trip.maxGroupSize - (seatsSold[date] || 0));
  const firstOpen = upcomingDepartures.find((d) => seatsLeftFor(d) > 0) || upcomingDepartures[0] || "";

  const [selectedDate, setSelectedDate] = useState<string>(firstOpen);
  const seatsLeft = selectedDate ? seatsLeftFor(selectedDate) : 0;
  const maxTravelers = Math.max(1, seatsLeft);
  const [guestCount, setGuestCount] = useState<number>(Math.max(1, Math.min(trip.minGroupSize || 2, seatsLeft || 1)));
  const [guestMessage, setGuestMessage] = useState<string>("");
  const [isBooking, setIsBooking] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxTour, setLightboxTour] = useState(false);
  const [success, setSuccess] = useState<{ status: "confirmed" | "pending"; rows: BookingSummaryRow[] } | null>(null);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const agency = trip.organization;
  const nights = Math.max(1, trip.durationDays - 1);
  const agencyApprovalMode = agency?.bookingApprovalMode || "instant";
  const isRequest = agencyApprovalMode === "request";

  // Same pure functions the server uses.
  const quote = quoteTripBooking({ trip, guestCount });
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
  const fmtShort = (key: string) => formatDateKey(key, locale, { month: "short", day: "numeric" });
  const departureLabel = (date: string) =>
    td("dateRange", { start: fmtShort(date), end: fmtShort(tripEndDate(date, trip.durationDays)) });
  const travelersLabel = td("travelersCount", { count: guestCount });

  const allPhotos = [trip.coverPhoto, ...(trip.gallery || [])].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);
  const openPhotos = (index: number, tour = false) => {
    setLightboxTour(tour);
    setLightboxIndex(index);
  };

  const selectDeparture = (date: string) => {
    setSelectedDate(date);
    setGuestCount((g) => Math.max(1, Math.min(g, seatsLeftFor(date) || 1)));
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("detail.linkCopied"));
    } catch {
      toast.info(tl("linkReady"));
    }
  };

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
        if (result.code === "UNAUTHENTICATED") router.push(`/login?callbackUrl=/trips/${trip.id}`);
        toast.error(errorText(result));
        return;
      }

      setIsSheetOpen(false);
      setSuccess({
        status: result.data.status === "pending" ? "pending" : "confirmed",
        rows: [
          { label: td("departure"), value: departureLabel(selectedDate) },
          { label: t("detail.travelers"), value: travelersLabel },
          { label: t("detail.total"), value: formatDzd(quote.total) },
        ],
      });
    } catch {
      toast.error(t("detail.bookFailed"));
    } finally {
      setIsBooking(false);
    }
  };

  /* ------------------------------------------------------------ booking fields */

  const departurePicker = (
    <fieldset className="space-y-3">
      <legend className="text-body font-semibold text-primary-900">{t("detail.selectDeparture")}</legend>
      {upcomingDepartures.length > 0 ? (
        <div role="radiogroup" aria-label={t("detail.selectDeparture")} className="grid grid-cols-2 gap-2">
          {upcomingDepartures.map((date) => {
            const left = seatsLeftFor(date);
            const selected = date === selectedDate;
            const full = left === 0;
            return (
              <button
                key={date}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={full}
                onClick={() => selectDeparture(date)}
                className={cn(
                  "relative min-h-[64px] rounded-2xl px-3 py-2.5 text-start transition-[box-shadow,background-color] duration-fast ease-standard cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  selected ? "bg-primary-800 text-white shadow-e2" : "bg-white text-primary-900 shadow-e1 hover:shadow-e2"
                )}
              >
                <span className="block text-meta font-semibold tabular-nums">{departureLabel(date)}</span>
                <span
                  className={cn(
                    "mt-1 inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums",
                    selected ? "text-tertiary-200" : full ? "text-primary-500" : left <= 3 ? "text-accent-700" : "text-secondary-700"
                  )}
                >
                  <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", selected ? "bg-tertiary-200" : full ? "bg-primary-400" : left <= 3 ? "bg-accent-600" : "bg-secondary-600")} />
                  {full ? td("full") : td("seatsLeft", { count: left })}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <Banner tone="info" icon={<BrandCalendarIcon size={18} />}>
          {t("detail.noDepartures")}
        </Banner>
      )}
      {selectedDate && (
        <p className="text-meta text-primary-500">
          {t("detail.returnsLine", {
            date: formatDateKey(tripEndDate(selectedDate, trip.durationDays), locale),
            left: seatsLeft,
            max: trip.maxGroupSize,
          })}
        </p>
      )}
    </fieldset>
  );

  const fields = (suffix: string) => (
    <>
      {departurePicker}
      <Counter
        title={t("detail.travelers")}
        subtitle={selectedDate ? t("detail.maxGroupWithLeft", { max: trip.maxGroupSize, left: seatsLeft }) : t("detail.maxGroup", { max: trip.maxGroupSize })}
        value={guestCount}
        maxValue={maxTravelers}
        onChange={(v) => setGuestCount(Math.max(1, Math.min(maxTravelers, v)))}
      />
      {isRequest && (
        <Textarea
          id={`${baseId}-note-${suffix}`}
          label={t("detail.noteToAgency")}
          helper={t("detail.notePlaceholder")}
          rows={3}
          maxLength={1000}
          showCount
          value={guestMessage}
          onChange={(e) => setGuestMessage(e.target.value)}
        />
      )}
      <div className="space-y-3 border-t border-primary/10 pt-5 text-body text-primary-600">
        <div className="flex justify-between gap-4">
          <span>{t("detail.priceTimesTravelers", { price: formatDzd(trip.pricePerPerson), count: guestCount })}</span>
          <AnimatedNumber value={quote.subtotal} format={formatDzd} className="tabular-nums shrink-0" />
        </div>
        <div className="flex justify-between gap-4">
          <span>{t("detail.platformFee")}</span>
          <span className="font-semibold text-secondary-700">{t("detail.platformFeeFree", { amount: formatDzd(0) })}</span>
        </div>
        <div className="flex justify-between items-baseline gap-4 font-semibold text-title text-primary-900 border-t border-primary/10 pt-4">
          <span>{t("detail.total")}</span>
          <AnimatedNumber value={quote.total} format={formatDzd} className="tabular-nums" />
        </div>
      </div>
      {validationMessage && (
        <p id={`${errorId}-${suffix}`} role="alert" className="text-meta font-semibold text-accent-700">
          {validationMessage}
        </p>
      )}
    </>
  );

  const ctaLabel = isRequest ? t("detail.requestSpot") : t("detail.reserve");
  const glassAction =
    "inline-flex items-center gap-2 h-10 ps-3 pe-4 rounded-full glass-light shadow-e2 text-sm font-semibold text-primary-900 hover:bg-white transition duration-fast ease-standard cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  return (
    <div className="bg-darnaBg min-h-[100dvh] pt-4 sm:pt-6 pb-28 lg:pb-16">
      <ListingSectionNav sections={TRIP_SECTIONS} />
      <Container className="space-y-10 lg:space-y-12">
        {/* Cover */}
        <div id="photos" className="scroll-mt-28">
          <Link
            href="/"
            className="enter-up hidden md:inline-flex items-center gap-2 mb-4 min-h-[44px] text-meta font-semibold text-primary-600 hover:text-primary-900 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
          >
            <BrandChevronLeftIcon size={16} className="rtl:rotate-180" aria-hidden="true" />
            <span>{t("detail.back")}</span>
          </Link>

          <div className="relative -mx-4 sm:-mx-6 md:mx-0 -mt-4 sm:-mt-6 md:mt-0">
            <div className="enter-lift relative h-[68svh] min-h-[420px] max-h-[640px] md:h-[560px] md:rounded-3xl overflow-hidden bg-tertiary-200 md:shadow-e3">
              <button
                type="button"
                onClick={() => openPhotos(0)}
                aria-label={tl("openPhoto", { number: 1, total: allPhotos.length })}
                className="absolute inset-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white"
              >
                <Image src={trip.coverPhoto} alt="" fill priority sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" />
              </button>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 scrim-bottom" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary-900/35 to-transparent" />

              {/* Actions */}
              <div className="absolute top-4 inset-x-4 md:top-5 md:inset-x-5 flex items-center justify-between gap-3">
                <Link
                  href="/"
                  aria-label={t("detail.back")}
                  className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-full glass-light shadow-e2 text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <BrandChevronLeftIcon size={18} className="rtl:rotate-180" />
                </Link>
                <span className="hidden md:block" />
                <div className="flex items-center gap-2">
                  {allPhotos.length > 1 && (
                    <button type="button" onClick={() => openPhotos(0, true)} className={`hidden md:inline-flex ${glassAction}`}>
                      <BrandGridIcon size={16} />
                      <span>{tl("showAllPhotos")}</span>
                    </button>
                  )}
                  <IconButton label={t("detail.share")} icon={<BrandShareIcon size={17} />} variant="glass" size="lg" onClick={handleShare} />
                  <IconButton label={t("detail.save")} icon={<BrandHeartIcon size={17} />} variant="glass" size="lg" onClick={() => toast.info(t("detail.saved"))} />
                </div>
              </div>

              {/* Title on the scrim */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 pb-12 sm:p-8 md:p-10 md:pe-[19rem] lg:pe-[22rem]">
                <div className="flex flex-wrap gap-2">
                  <Pill tone="glass" icon={<BrandCompassIcon size={13} />}>
                    {tripTypeLabel(trip.tripType, locale) || t("detail.curatedBadge")}
                  </Pill>
                  <Pill tone="glass" icon={<BrandCalendarIcon size={13} />}>
                    {t("card.duration", { days: trip.durationDays, nights })}
                  </Pill>
                  <Pill tone="glass" icon={<BrandUsersIcon size={13} />}>
                    {t("detail.groupSize", { min: trip.minGroupSize || 2, max: trip.maxGroupSize })}
                  </Pill>
                </div>
                <h1 className="mt-4 font-serif text-display-lg text-white max-w-[20ch] [text-wrap:balance]">{trip.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-white/90">
                  <span className="inline-flex items-center gap-1.5">
                    <BrandPinIcon size={16} aria-hidden="true" />
                    {t("locationLine", { city: trip.city, country: t("countryAlgeria") })}
                  </span>
                  {trip.rating ? (
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <BrandStarIcon size={15} className="text-accent-300" aria-hidden="true" />
                      <span className="sr-only">{t("card.ratingLabel", { rating: ratingText })}</span>
                      <span aria-hidden="true" className="font-semibold text-white">
                        {ratingText}
                      </span>
                      <span>{t("detail.reviews", { count: trip.reviewsCount || 0 })}</span>
                    </span>
                  ) : null}
                </div>
              </div>

            </div>

            {/* Arch-masked second photo, floating over the cover edge (desktop) */}
            {allPhotos[1] && (
              <button
                type="button"
                onClick={() => openPhotos(1)}
                aria-label={tl("openPhoto", { number: 2, total: allPhotos.length })}
                className="enter-rise hidden md:block absolute end-10 lg:end-14 -bottom-10 w-52 lg:w-64 rounded-t-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-4"
                style={{ animationDelay: "160ms" }}
              >
                <ArchImage src={allPhotos[1]} alt="" sizes="256px" className="aspect-[4/5]" />
              </button>
            )}
          </div>

          {/* Phones: overlapping paper sheet */}
          <div className="md:hidden relative -mt-7 -mx-4 sm:-mx-6 rounded-t-[1.75rem] bg-darnaBg h-8" aria-hidden="true" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 relative md:pt-6">
          {/* Main column */}
          <div className="lg:col-span-7 xl:col-span-8 text-primary-800">
            {/* Agency */}
            <div data-reveal className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-3xl bg-white shadow-e2 p-6">
              <div className="flex items-center gap-4 min-w-0">
                <Avatar name={agencyName} src={agency?.logo} size="lg" verified={agency?.isVerified} decorative />
                <div className="min-w-0">
                  <p className="text-meta text-primary-500">{td("organizedBy")}</p>
                  <h2 className="font-serif text-title text-primary-900 truncate">{agencyName}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {agency?.isVerified ? (
                      <Badge tone="success" icon={<BrandShieldIcon size={12} />}>
                        {t("detail.verifiedBadge")}
                      </Badge>
                    ) : (
                      <Badge tone="warning">{td("verificationPending")}</Badge>
                    )}
                    {agencyRating && (
                      <span className="inline-flex items-center gap-1 text-meta text-primary-700 tabular-nums">
                        <BrandStarIcon size={13} className="text-accent-600" aria-hidden="true" />
                        {t("detail.agencyRating", { rating: agencyRating })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="tertiary" href={agency?.id ? `/agencies/${agency.id}` : "/"} className="shrink-0">
                {t("detail.viewAgency")}
              </Button>
            </div>

            {/* About */}
            <section data-reveal className={sectionClass} aria-labelledby={`${baseId}-about`}>
              <h2 id={`${baseId}-about`} className="font-serif text-heading text-primary-900">
                {t("detail.about")}
              </h2>
              <p dir="auto" className="text-body-lg text-primary-700 whitespace-pre-line [text-wrap:pretty]">{trip.description}</p>
            </section>

            {/* Itinerary */}
            {trip.itinerary && trip.itinerary.length > 0 && (
              <section id="itinerary" className={sectionClass} aria-labelledby={`${baseId}-itinerary`}>
                <div data-reveal>
                  <h2 id={`${baseId}-itinerary`} className="font-serif text-display-md text-primary-900">
                    {t("detail.itinerary")}
                  </h2>
                  <p className="mt-2 text-body text-primary-500">{t("detail.itinerarySubtitle", { count: trip.itinerary.length })}</p>
                </div>
                <Timeline
                  steps={trip.itinerary.map((day) => ({
                    key: day.day,
                    marker: formatNumber(day.day, locale),
                    eyebrow: t("detail.dayLabel", { day: day.day }),
                    title: <bdi>{day.title}</bdi>,
                    children: (
                      <div className="space-y-4">
                        <p dir="auto" className="text-body text-primary-700 [text-wrap:pretty]">{day.description}</p>
                        {day.activities && day.activities.length > 0 && (
                          <ul aria-label={t("detail.highlights")} className="flex flex-wrap gap-2">
                            {day.activities.map((act, i) => (
                              <li key={i} dir="auto" className="inline-flex items-center rounded-full bg-white shadow-e1 px-3 py-1.5 text-meta font-medium text-primary-800">
                                {act}
                              </li>
                            ))}
                          </ul>
                        )}
                        {(day.meals || day.accommodation) && (
                          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-meta text-primary-600">
                            {day.meals && (
                              <div className="flex items-center gap-2">
                                <dt>
                                  <BrandKitchenIcon size={16} className="text-secondary-700" aria-hidden="true" />
                                  <span className="sr-only">{t("detail.meals")}</span>
                                </dt>
                                <dd>{day.meals}</dd>
                              </div>
                            )}
                            {day.accommodation && (
                              <div className="flex items-center gap-2">
                                <dt>
                                  <BrandBedIcon size={16} className="text-secondary-700" aria-hidden="true" />
                                  <span className="sr-only">{t("detail.accommodation")}</span>
                                </dt>
                                <dd>{day.accommodation}</dd>
                              </div>
                            )}
                          </dl>
                        )}
                      </div>
                    ),
                  }))}
                />
              </section>
            )}

            {/* Included / not included */}
            <section id="included" data-reveal className={sectionClass} aria-labelledby={`${baseId}-included`}>
              <h2 id={`${baseId}-included`} className="font-serif text-heading text-primary-900">
                {t("detail.included")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-3xl bg-white shadow-e1 p-6">
                  <h3 className="text-body font-semibold text-primary-900">{t("detail.includedTitle")}</h3>
                  <RevealGroup as="ul" each={0.04} className="mt-4 space-y-3">
                    {(trip.inclusions || []).map((inc, i) => (
                      <RevealItem as="li" key={i} className="flex items-start gap-3 text-body text-primary-800">
                        <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-secondary-700">
                          <BrandCheckIcon size={14} />
                        </span>
                        {inc}
                      </RevealItem>
                    ))}
                  </RevealGroup>
                </div>
                {trip.exclusions && trip.exclusions.length > 0 && (
                  <div className="rounded-3xl bg-darnaBg-300/60 ring-1 ring-primary/[0.06] p-6">
                    <h3 className="text-body font-semibold text-primary-900">{t("detail.notIncluded")}</h3>
                    <ul className="mt-4 space-y-3">
                      {trip.exclusions.map((exc, i) => (
                        <li key={i} className="flex items-start gap-3 text-body text-primary-600">
                          <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-primary-500">
                            <BrandCloseIcon size={13} />
                          </span>
                          {exc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            {/* Gallery */}
            {allPhotos.length > 1 && (
              <section data-reveal className={sectionClass} aria-labelledby={`${baseId}-gallery`}>
                <div className="flex items-end justify-between gap-4">
                  <h2 id={`${baseId}-gallery`} className="font-serif text-heading text-primary-900">
                    {td("gallery")}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => openPhotos(0, true)} leadingIcon={<BrandGridIcon size={16} />}>
                    {tl("showAllPhotos")}
                  </Button>
                </div>
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {allPhotos.slice(0, 6).map((src, i) => (
                    <li key={src} className={i === 0 ? "col-span-2 row-span-2" : ""}>
                      <button
                        type="button"
                        onClick={() => openPhotos(i)}
                        aria-label={tl("openPhoto", { number: i + 1, total: allPhotos.length })}
                        className="group relative block w-full h-full min-h-[120px] aspect-square overflow-hidden rounded-2xl bg-tertiary-100 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                      >
                        <Image
                          src={src}
                          alt={t("detail.photoAlt", { title: trip.title, index: i + 1 })}
                          fill
                          sizes={i === 0 ? "(max-width: 640px) 100vw, 480px" : "(max-width: 640px) 50vw, 240px"}
                          className="object-cover transition-transform [transition-duration:700ms] ease-out group-hover:scale-[1.04]"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Meeting point */}
            <section id="location" data-reveal className={sectionClass} aria-labelledby={`${baseId}-meeting`}>
              <h2 id={`${baseId}-meeting`} className="font-serif text-heading text-primary-900">
                {t("detail.meetingPoint")}
              </h2>
              <div className="flex items-start gap-4 rounded-2xl bg-white shadow-e1 p-5">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-100 text-accent-700">
                  <BrandPinIcon size={20} />
                </span>
                <div>
                  <p className="text-body font-semibold text-primary-900">{trip.meetingPoint}</p>
                  <p className="mt-1 text-meta text-primary-500">{t("detail.meetingNote")}</p>
                </div>
              </div>
              <div className="rounded-3xl overflow-hidden shadow-e2 ring-4 ring-white">
                <Map center={trip.latlng || getTripCoordinates(trip)} locationValue={trip.city || trip.locationValue} zoom={10} className="w-full h-[320px]" />
              </div>
            </section>

            {/* Policy */}
            <section id="policies" data-reveal className="scroll-mt-28 py-10 space-y-5" aria-labelledby={`${baseId}-policy`}>
              <h2 id={`${baseId}-policy`} className="font-serif text-heading text-primary-900">
                {t("detail.cancellationPolicy")}
              </h2>
              <div className="flex items-start gap-4 rounded-2xl bg-white shadow-e1 p-5">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-100 text-secondary-700">
                  <BrandShieldIcon size={20} />
                </span>
                <div>
                  <p className="text-body font-semibold text-primary-900">{t("detail.policyName", { policy: t(`policy.${policy.id}.label`) })}</p>
                  <p className="mt-1 text-body text-primary-600">{t(`policy.${policy.id}.summaryTrip`)}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Sticky booking card (desktop) */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-4 relative">
            <section aria-labelledby={`${baseId}-book`} className="sticky top-28 w-full max-w-sm ms-auto bg-white rounded-3xl p-7 shadow-e3 space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id={`${baseId}-book`} className="sr-only">
                    {td("bookTitle")}
                  </h2>
                  <p className="flex items-baseline gap-1.5 flex-wrap">
                    <AnimatedNumber value={quote.total} format={formatDzd} className="font-serif text-[1.75rem] leading-none text-primary-900 tabular-nums" />
                    <span className="text-body text-primary-500">{tl("priceSuffix.total")}</span>
                  </p>
                  <p className="mt-1.5 text-meta text-primary-500 tabular-nums">
                    {formatDzd(trip.pricePerPerson)} {t("detail.perTraveler")} · {travelersLabel}
                  </p>
                </div>
                <Badge tone="olive" className="shrink-0">
                  {t("detail.allInclusive")}
                </Badge>
              </div>

              {fields("card")}

              <Button
                size="lg"
                fullWidth
                onClick={handleBookTrip}
                loading={isBooking}
                disabled={Boolean(validationError)}
                aria-describedby={validationMessage ? `${errorId}-card` : undefined}
              >
                {ctaLabel}
              </Button>
              <p className="text-center text-meta text-primary-500 flex items-center justify-center gap-1.5">
                <BrandClockIcon size={14} aria-hidden="true" />
                {t("detail.noChargeNote")}
              </p>
            </section>
          </div>
        </div>
      </Container>

      {/* Phones and tablets */}
      <MobileBookingBar
        price={<AnimatedNumber value={quote.total} format={formatDzd} />}
        priceSuffix={tl("priceSuffix.total")}
        detail={selectedDate ? `${departureLabel(selectedDate)} · ${travelersLabel}` : t("detail.noDepartures")}
        detailLabel={td("editBooking")}
        ctaLabel={isRequest ? td("requestShort") : tl("reserve")}
        onCta={() => setIsSheetOpen(true)}
        disabled={upcomingDepartures.length === 0}
      />

      <Sheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        busy={isBooking}
        title={td("bookTitle")}
        description={trip.title}
        size="lg"
        bodyClassName="space-y-6"
        footer={
          <div className="flex items-center justify-between gap-4">
            <p className="min-w-0">
              <AnimatedNumber value={quote.total} format={formatDzd} className="block font-semibold text-title text-primary-900 tabular-nums" />
              <span className="block text-meta text-primary-500 truncate">{travelersLabel}</span>
            </p>
            <Button size="lg" onClick={handleBookTrip} loading={isBooking} disabled={Boolean(validationError)} className="shrink-0">
              {ctaLabel}
            </Button>
          </div>
        }
      >
        {fields("sheet")}
      </Sheet>

      <PhotoLightbox
        isOpen={lightboxIndex !== null}
        onClose={closeLightbox}
        images={allPhotos}
        index={lightboxIndex ?? 0}
        onIndexChange={setLightboxIndex}
        title={trip.title}
        startInTour={lightboxTour}
      />

      <BookingSuccessDialog
        isOpen={success !== null}
        onClose={() => setSuccess(null)}
        status={success?.status ?? "confirmed"}
        itemTitle={trip.title}
        rows={success?.rows ?? []}
      />
    </div>
  );
}
