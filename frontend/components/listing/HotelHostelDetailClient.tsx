"use client";

import React, { useCallback, useId, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, m } from "framer-motion";
import { Range } from "react-date-range";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { Listing, User, PublicUser, Review, RoomType } from "@/types";
import Container from "@/components/Container";
import Counter from "@/components/inputs/Counter";
import Calendar from "@/components/inputs/Calendar";
import ListingCarouselCard from "@/components/home/ListingCarouselCard";
import { AnimatedNumber, Avatar, Badge, Banner, Button, Dialog, KitEmptyState, Pill, Sheet, Textarea } from "@/components/ui";
import { useLoginModal } from "@/hook/useLoginModal";
import { useActionError } from "@/hook/useActionError";
import { createBookingAction } from "@/app/actions/bookings";
import { isRequestToBook as computeIsRequestToBook, quoteListingBooking } from "@/lib/booking/pricing";
import { maxGuestsFor, maxUnitsFor, validateListingRequest, type ListingAvailability } from "@/lib/booking/availability";
import { getStayRules } from "@/lib/booking/config";
import { getCancellationPolicy } from "@/lib/booking/cancellation";
import { addDaysToKey, formatDateKey, fromDateKey, isDateKey, toDateKey, type DateKey } from "@/lib/booking/dates";
import { formatDzd } from "@/lib/currency";
import { formatRating } from "@/lib/i18n/date-locale";
import { summarizeReviews } from "@/lib/reviews";
import { dur, ease } from "@/lib/motion";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import {
  BrandStarIcon,
  BrandShieldIcon,
  BrandUserIcon,
  BrandClockIcon,
  BrandWifiIcon,
  BrandDoorIcon,
  BrandFlagIcon,
  BrandPinIcon,
  BrandBadgeCheckIcon,
} from "@/components/icons";
import ListingHead, { headImages } from "./ListingHead";
import ListingSectionNav from "./ListingSectionNav";
import PhotoLightbox, { type PhotoGroup } from "./PhotoLightbox";
import RoomCard from "./hotel/RoomCard";
import ReviewsSummary from "./detail/ReviewsSummary";
import type { HostProfileLink } from "@/lib/host-profile";
import MobileBookingBar from "./detail/MobileBookingBar";
import NoGuestFees from "./detail/NoGuestFees";
import BookingSuccessDialog, { type BookingSummaryRow } from "./detail/BookingSuccessDialog";
import { amenityIcon } from "./detail/amenityIcons";

function MapLoading() {
  const t = useTranslations("listing");
  return (
    <div role="status" className="skeleton w-full h-[380px] rounded-3xl flex items-center justify-center text-meta text-primary-600">
      <span className="relative">{t("loadingMap")}</span>
    </div>
  );
}

const Map = dynamic(() => import("@/components/Map"), { ssr: false, loading: () => <MapLoading /> });

interface HotelHostelDetailClientProps {
  listing: Listing;
  host?: PublicUser | null;
  /** Hotel or hostel (or individual host) with the link to its profile page. */
  hostProfile?: HostProfileLink | null;
  reviews?: Review[];
  similarListings?: Listing[];
  currentUser?: User | null;
  availability: ListingAvailability;
}

/** Hotel-facing labels for the review categories (staff = communication, value for money = value). */
const RATING_METRICS = [
  { key: "cleanliness", source: "cleanliness" },
  { key: "staff", source: "communication" },
  { key: "location", source: "location" },
  { key: "valueForMoney", source: "value" },
] as const;

const HOTEL_SECTIONS = ["photos", "rooms", "amenities", "reviews", "location"] as const;
const sectionClass = "scroll-mt-28 border-b border-primary/[0.08] py-10 space-y-6";
const eyebrow = "block text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-500 rtl:normal-case rtl:tracking-normal";

/** True when any night of [start, end) is fully booked for the room type. */
function hasBlockedNight(start: DateKey, end: DateKey, blocked: Set<string>): boolean {
  for (let d = start; d < end; d = addDaysToKey(d, 1)) if (blocked.has(d)) return true;
  return false;
}

export default function HotelHostelDetailClient({
  listing,
  host,
  hostProfile,
  reviews = [],
  similarListings = [],
  currentUser,
  availability,
}: HotelHostelDetailClientProps) {
  const locale = useLocale();
  const t = useTranslations("listing");
  const tp = useTranslations("listing.property");
  const tCommon = useTranslations("common");
  const errorText = useActionError();
  const openLogin = useLoginModal((s) => s.onOpen);
  const baseId = useId();
  const calendarPanelId = `${baseId}-calendar`;
  const guestPanelId = `${baseId}-guests`;

  const isHotel = listing.businessCategory === "hotel" || listing.type?.toLowerCase().includes("hotel");
  const isHostel = listing.businessCategory === "hostel" || listing.type?.toLowerCase().includes("hostel");

  // Room types: only real room types can be booked (the server books these ids).
  const availableRooms: RoomType[] = useMemo(() => listing.roomTypes || [], [listing.roomTypes]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(availableRooms[0]?.id || "");
  const selectedRoom = useMemo(
    () => availableRooms.find((r) => r.id === selectedRoomId) || availableRooms[0],
    [availableRooms, selectedRoomId]
  );
  const isBedUnit = selectedRoom?.bookingUnit === "bed";

  // Photo tour grouped by space: Overview, then each room type with photos.
  const overviewImages = useMemo(() => headImages(listing), [listing]);
  const roomGroups: PhotoGroup[] = useMemo(
    () =>
      availableRooms
        .filter((r) => r.imageSrc && r.imageSrc.length > 0)
        .map((r) => ({ id: r.id, label: r.name, images: r.imageSrc })),
    [availableRooms]
  );
  const tourGroups: PhotoGroup[] = useMemo(
    () => [{ id: "overview", label: t("tour.overview"), images: overviewImages }, ...roomGroups],
    [overviewImages, roomGroups, t]
  );
  const tourImages = useMemo(() => tourGroups.flatMap((g) => g.images), [tourGroups]);
  const [roomTourIndex, setRoomTourIndex] = useState<number | null>(null);
  const closeRoomTour = useCallback(() => setRoomTourIndex(null), []);
  const openRoomPhotos = (roomId: string) => {
    let offset = 0;
    for (const g of tourGroups) {
      if (g.id === roomId) return setRoomTourIndex(offset);
      offset += g.images.length;
    }
    setRoomTourIndex(0);
  };

  // Dates & guests (date keys, Algeria calendar days)
  const rules = getStayRules(listing);
  const today = availability.today;
  const earliestStart = useMemo(() => {
    const notice = addDaysToKey(today, rules.advanceNoticeDays);
    return listing.availableFrom && isDateKey(listing.availableFrom) && listing.availableFrom > notice ? listing.availableFrom : notice;
  }, [today, rules.advanceNoticeDays, listing.availableFrom]);

  const [dateRange, setDateRange] = useState<Range>(() => ({
    startDate: fromDateKey(earliestStart),
    endDate: fromDateKey(addDaysToKey(earliestStart, Math.max(2, rules.minNights))),
    key: "selection",
  }));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [guestCount, setGuestCount] = useState<number>(1);
  const [roomCount, setRoomCount] = useState<number>(1);
  const [isGuestPickerOpen, setIsGuestPickerOpen] = useState(false);
  const [guestMessage, setGuestMessage] = useState<string>("");
  const [isReserving, setIsReserving] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAmenitiesOpen, setIsAmenitiesOpen] = useState(false);
  const [success, setSuccess] = useState<{ status: "confirmed" | "pending"; rows: BookingSummaryRow[] } | null>(null);

  const startKey = dateRange.startDate ? toDateKey(dateRange.startDate) : earliestStart;
  const endKey = dateRange.endDate ? toDateKey(dateRange.endDate) : startKey;
  // Hostel beds: one bed per guest. Rooms: rooms × capacity guests.
  const unitCount = isBedUnit ? guestCount : roomCount;
  const maxUnits = maxUnitsFor(selectedRoom);
  const maxGuests = isBedUnit ? maxUnits : maxGuestsFor(listing, selectedRoom, roomCount);

  const unavailableKeys = useMemo(
    () => (selectedRoom ? availability.unavailableByRoomType[selectedRoom.id] || [] : []),
    [availability.unavailableByRoomType, selectedRoom]
  );
  const disabledDates = useMemo(() => unavailableKeys.map(fromDateKey), [unavailableKeys]);
  const unavailableSet = useMemo(() => new Set(unavailableKeys), [unavailableKeys]);

  // Same pure functions the server uses when the booking is created.
  const quote = useMemo(
    () =>
      quoteListingBooking({
        listing,
        startDate: startKey,
        endDate: endKey,
        guestCount,
        unitCount,
        selectedRoomTypeId: selectedRoom?.id,
      }),
    [listing, startKey, endKey, guestCount, unitCount, selectedRoom]
  );
  const validationError = useMemo(
    () =>
      selectedRoom
        ? validateListingRequest({
            listing,
            roomType: selectedRoom,
            request: { startDate: startKey, endDate: endKey, guestCount, unitCount },
            today,
            unavailableNights: unavailableSet,
          })
        : ("NO_ROOMS" as const),
    [listing, selectedRoom, startKey, endKey, guestCount, unitCount, today, unavailableSet]
  );
  const validationMessage =
    validationError === "NO_ROOMS" ? tp("noBookableRooms") : validationError ? errorText(validationError) : null;

  // Per-room price for the stay (one room / bed) and availability for the chosen nights.
  const roomOffers = useMemo(
    () =>
      Object.fromEntries(
        availableRooms.map((room) => {
          const q = quoteListingBooking({
            listing,
            startDate: startKey,
            endDate: endKey,
            guestCount: 1,
            unitCount: 1,
            selectedRoomTypeId: room.id,
          });
          const blocked = new Set(availability.unavailableByRoomType[room.id] || []);
          return [
            room.id,
            {
              stayPrice: q.subtotal,
              left: room.availableInventory ?? maxUnitsFor(room),
              soldOut: room.isAvailable === false || hasBlockedNight(startKey, endKey, blocked),
            },
          ];
        })
      ),
    [availableRooms, listing, startKey, endKey, availability.unavailableByRoomType]
  );

  const money = (amount: number) => formatDzd(amount, locale);
  const fmtShort = (key: DateKey) => formatDateKey(key, locale, { month: "short", day: "numeric" });
  const datesLabel = tCommon("dateRange", { start: fmtShort(startKey), end: fmtShort(endKey) });
  const isRequestToBook = computeIsRequestToBook(listing);
  const policy = getCancellationPolicy(listing.cancellationPolicy);

  const unitSummary = isBedUnit
    ? t("bedsCount", { count: guestCount })
    : tCommon("listSeparator", { a: t("roomsCount", { count: roomCount }), b: t("guestCount", { count: guestCount }) });

  const handleSelectRoom = (room: RoomType) => {
    setSelectedRoomId(room.id);
    setRoomCount(1);
    const cap = room.bookingUnit === "bed" ? maxUnitsFor(room) : room.capacity;
    if (guestCount > cap) setGuestCount(cap);
  };

  const handleReserveRoom = async () => {
    if (!currentUser) {
      openLogin();
      return;
    }
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setIsReserving(true);
    try {
      // Price, fees, availability and approval mode are decided on the server.
      const result = await createBookingAction({
        kind: "listing",
        listingId: listing.id,
        startDate: startKey,
        endDate: endKey,
        guestCount,
        unitCount,
        guestMessage: guestMessage.trim() || undefined,
        selectedRoomTypeId: selectedRoom?.id,
      });

      if (!result.ok) {
        if (result.code === "UNAUTHENTICATED") openLogin();
        toast.error(errorText(result));
        return;
      }

      setIsSheetOpen(false);
      setSuccess({
        status: result.data.status === "pending" ? "pending" : "confirmed",
        rows: [
          { label: t("success.room"), value: selectedRoom?.name ?? "" },
          { label: t("success.dates"), value: datesLabel },
          { label: isBedUnit ? tp("bedsLabel") : t("guests"), value: unitSummary },
          { label: tCommon("total"), value: money(quote.total) },
        ],
      });
    } catch {
      toast.error(errorText({ code: "BOOKING_FAILED" }));
    } finally {
      setIsReserving(false);
    }
  };

  // Amenities
  const propertyAmenities = listing.amenities || [];
  const amenityLabel = (key: string) => (t.has(`amenityLabels.${key}`) ? t(`amenityLabels.${key}`) : key.replace(/_/g, " "));

  const reviewSummary = summarizeReviews(reviews);
  const rating = formatRating(listing.rating || reviewSummary?.overall, locale);
  const reviewCount = listing.reviewCount ?? reviewSummary?.count ?? 0;
  const hostName = hostProfile?.name || host?.name || listing.title;
  const place = listing.city ? t("cityCountry", { city: listing.city }) : listing.locationValue || t("algeria");

  const badges = (
    <>
      <Pill tone={isHotel ? "ink" : "olive"}>
        {isHotel ? tp("hotelResort") : tp("backpackerHostel")}
      </Pill>
      {isHotel && listing.hotelStarRating ? (
        <Pill tone="white" className="shadow-e1">
          <span className="inline-flex items-center gap-0.5" aria-hidden="true">
            {Array.from({ length: listing.hotelStarRating }).map((_, i) => (
              <BrandStarIcon key={i} size={12} className="text-accent-600" />
            ))}
          </span>
          <span className="sr-only">{tp("starRating", { count: listing.hotelStarRating })}</span>
        </Pill>
      ) : null}
      <Pill tone="success" icon={<BrandShieldIcon size={13} />}>
        {tp("verifiedHospitality")}
      </Pill>
    </>
  );

  /* ---------------------------------------------------------------- booking UI */

  const bookingFields = (inSheet: boolean) => (
    <>
      {!inSheet && (
        <div className="rounded-2xl ring-1 ring-primary/15 overflow-hidden divide-y divide-primary/10 text-sm transition-shadow duration-fast hover:ring-primary/25">
          <button
            type="button"
            onClick={() => setIsCalendarOpen((p) => !p)}
            aria-expanded={isCalendarOpen}
            aria-controls={calendarPanelId}
            className="w-full grid grid-cols-2 px-4 py-3 text-start hover:bg-darnaBg/60 transition-colors duration-fast cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600"
          >
            <span>
              <span className={eyebrow}>{t("checkInLabel")}</span>
              <span className="block mt-0.5 font-medium text-primary-900 tabular-nums">{formatDateKey(startKey, locale)}</span>
            </span>
            <span className="border-s border-primary/10 ps-4">
              <span className={eyebrow}>{t("checkoutLabel")}</span>
              <span className="block mt-0.5 font-medium text-primary-900 tabular-nums">{formatDateKey(endKey, locale)}</span>
            </span>
          </button>
          {isCalendarOpen && (
            <div id={calendarPanelId} className="p-2 bg-white flex justify-center animate-in fade-in slide-in-from-top-1 duration-200">
              {calendar}
            </div>
          )}
          <div className="px-4 py-3">
            <button
              type="button"
              onClick={() => setIsGuestPickerOpen((p) => !p)}
              aria-expanded={isGuestPickerOpen}
              aria-controls={guestPanelId}
              className="w-full text-start cursor-pointer flex justify-between items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              <span>
                <span className={eyebrow}>{isBedUnit ? tp("bedsLabel") : t("guests")}</span>
                <span className="font-semibold text-primary-900">{unitSummary}</span>
              </span>
              <span className="text-meta font-semibold text-primary-900 underline underline-offset-4 decoration-primary/30" aria-hidden="true">
                {isGuestPickerOpen ? tp("done") : t("change")}
              </span>
            </button>
            {isGuestPickerOpen && (
              <div id={guestPanelId} className="pt-3 border-t border-primary/10 mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                {counters}
              </div>
            )}
          </div>
        </div>
      )}

      {inSheet && (
        <>
          <div className="flex justify-center -mx-2">{calendar}</div>
          {counters}
        </>
      )}

      {isRequestToBook ? (
        <Banner tone="info" title={t("hostApprovalRequired")} icon={<BrandClockIcon size={18} />}>
          {tp("frontDeskReview")}
        </Banner>
      ) : (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-secondary-50 text-secondary-800">
          <span className="relative flex w-2 h-2 shrink-0" aria-hidden="true">
            <span className="absolute inset-0 rounded-full bg-secondary-500 animate-ping opacity-60" />
            <span className="relative w-2 h-2 rounded-full bg-secondary-600" />
          </span>
          <span className="font-semibold text-meta">{t("instantConfirmation")}</span>
        </div>
      )}

      {isRequestToBook && (
        <Textarea
          id={`${baseId}-note-${inSheet ? "sheet" : "card"}`}
          label={tp("specialRequests")}
          helper={tp("specialRequestsPlaceholder")}
          rows={3}
          maxLength={1000}
          showCount
          value={guestMessage}
          onChange={(e) => setGuestMessage(e.target.value)}
        />
      )}

      {validationMessage && (
        <p role="alert" className="text-meta font-semibold text-accent-700">
          {validationMessage}
        </p>
      )}
    </>
  );

  const calendar = (
    <Calendar
      value={dateRange}
      onChange={(val) => setDateRange(val.selection)}
      minDate={fromDateKey(earliestStart)}
      maxDate={listing.availableTo && isDateKey(listing.availableTo) ? fromDateKey(listing.availableTo) : undefined}
      disabledDates={disabledDates}
    />
  );

  const counters = (
    <div className="space-y-1">
      {!isBedUnit && (
        <Counter
          title={tp("roomsLabel")}
          subtitle={tp("unitsOfType", { count: maxUnits })}
          value={roomCount}
          maxValue={maxUnits}
          onChange={(v) => {
            const rooms = Math.min(v, maxUnits);
            setRoomCount(rooms);
            setGuestCount((g) => Math.min(g, maxGuestsFor(listing, selectedRoom, rooms)));
          }}
        />
      )}
      <Counter
        title={isBedUnit ? tp("numberOfBeds") : t("totalTravelers")}
        subtitle={isBedUnit ? tp("onePerBed", { count: maxUnits }) : tp("maxCapacity", { count: maxGuests })}
        value={guestCount}
        maxValue={maxGuests}
        onChange={(v) => setGuestCount(Math.min(v, maxGuests))}
      />
    </div>
  );

  const breakdown = (
    <div className="space-y-3 text-body text-primary-600">
      <div className="flex justify-between gap-4">
        <span>
          {tp("rateBreakdown", {
            rate: money(quote.unitPrice),
            units: isBedUnit ? t("bedsCount", { count: quote.quantity }) : t("roomsCount", { count: quote.quantity }),
            nights: t("nightsCount", { count: quote.nights }),
          })}
        </span>
        <AnimatedNumber value={quote.subtotal} format={money} className="tabular-nums shrink-0" />
      </div>
      {quote.cleaningFee > 0 && (
        <div className="flex justify-between gap-4">
          <span>{t("cleaningFee")}</span>
          <AnimatedNumber value={quote.cleaningFee} format={money} className="tabular-nums" />
        </div>
      )}
      <NoGuestFees />
      {quote.taxes > 0 && (
        <div className="flex justify-between gap-4">
          <span>{t("taxes")}</span>
          <AnimatedNumber value={quote.taxes} format={money} className="tabular-nums" />
        </div>
      )}
      <div className="flex justify-between items-baseline gap-4 font-semibold text-title text-primary-900 border-t border-primary/10 pt-4">
        <span>{tCommon("total")}</span>
        <AnimatedNumber value={quote.total} format={money} className="tabular-nums" />
      </div>
    </div>
  );

  const ctaLabel = isRequestToBook
    ? tp("requestToBookRoom")
    : selectedRoom?.name
    ? tp("reserveNamed", { name: selectedRoom.name })
    : t("reserve");

  return (
    <div className="pt-6 sm:pt-8 pb-28 lg:pb-16">
      <ListingSectionNav sections={HOTEL_SECTIONS} />
      <Container className="space-y-10 lg:space-y-12">
        <ListingHead listing={listing} currentUser={currentUser} badges={badges} extraPhotoGroups={roomGroups} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 relative">
          {/* Main column */}
          <div className="lg:col-span-7 xl:col-span-8 text-primary-800">
            {/* Intro */}
            <div data-reveal className="flex items-center justify-between gap-6 border-b border-primary/[0.08] pb-8">
              <div className="min-w-0">
                <h2 className="font-serif text-heading text-primary-900">{tp("managedBy", { name: hostName })}</h2>
                <p className="mt-2 text-body text-primary-500">
                  {tp("roomConfigurations", { count: availableRooms.length })}
                  {rating && (
                    <>
                      {" · "}
                      <span className="text-primary-800 font-semibold tabular-nums">{t("ratingLabel", { rating })}</span>
                    </>
                  )}
                </p>
              </div>
              <Avatar name={hostName} src={host?.image} size="lg" decorative verified />
            </div>

            {/* About + highlights */}
            <section id="overview" data-reveal className={sectionClass} aria-labelledby={`${baseId}-about`}>
              <h2 id={`${baseId}-about`} className="font-serif text-heading text-primary-900">
                {tp("aboutProperty")}
              </h2>
              <p className="text-body-lg text-primary-700 [text-wrap:pretty]">
                {listing.description || tp("defaultDescription", { title: listing.title, city: listing.city || t("algeria") })}
              </p>
              <RevealGroup as="ul" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { Icon: BrandClockIcon, key: "frontDesk" },
                  { Icon: BrandShieldIcon, key: "licensing" },
                  { Icon: BrandWifiIcon, key: "fiberWifi" },
                ].map(({ Icon, key }) => (
                  <RevealItem as="li" key={key} className="p-5 rounded-2xl bg-white shadow-e1">
                    <Icon size={22} className="text-secondary-700" />
                    <p className="mt-3 text-body font-semibold text-primary-900">{tp(`highlights.${key}.title`)}</p>
                    <p className="mt-0.5 text-meta text-primary-500">{tp(`highlights.${key}.desc`)}</p>
                  </RevealItem>
                ))}
              </RevealGroup>
            </section>

            {/* Rooms */}
            <section id="rooms" className={sectionClass} aria-labelledby={`${baseId}-rooms`}>
              <div data-reveal>
                <p className="text-eyebrow uppercase text-secondary-700 rtl:normal-case rtl:tracking-normal">
                  {isHostel ? tp("dormsAndRooms") : tp("availableRoomTypes")}
                </p>
                <h2 id={`${baseId}-rooms`} className="mt-1 font-serif text-display-md text-primary-900">
                  {tp("selectAccommodation")}
                </h2>
                <p className="mt-2 text-body text-primary-500">{t("room.pricesFor", { dates: datesLabel, count: quote.nights })}</p>
              </div>
              {availableRooms.length > 0 ? (
                <ul className="space-y-4">
                  {availableRooms.map((room) => {
                    const offer = roomOffers[room.id];
                    return (
                      <RoomCard
                        key={room.id}
                        room={room}
                        selected={selectedRoom?.id === room.id}
                        onSelect={() => handleSelectRoom(room)}
                        stayPrice={offer.stayPrice}
                        nights={quote.nights}
                        left={offer.left}
                        soldOut={offer.soldOut}
                        amenityLabel={amenityLabel}
                        onOpenPhotos={() => openRoomPhotos(room.id)}
                        fallbackImage={overviewImages[0]}
                      />
                    );
                  })}
                </ul>
              ) : (
                <KitEmptyState variant="calendar" title={tp("noBookableRooms")} className="bg-white rounded-3xl shadow-e1" />
              )}
            </section>

            {/* Amenities */}
            {propertyAmenities.length > 0 && (
              <section id="amenities" data-reveal className={sectionClass} aria-labelledby={`${baseId}-amenities`}>
                <div>
                  <h2 id={`${baseId}-amenities`} className="font-serif text-heading text-primary-900">
                    {tp("whatOffers")}
                  </h2>
                  <p className="mt-1 text-body text-primary-500">{tp("whatOffersDesc")}</p>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  {propertyAmenities.slice(0, 10).map((key) => {
                    const Icon = amenityIcon(key);
                    return (
                      <li key={key} className="flex items-center gap-4 text-body text-primary-800">
                        <Icon size={22} className="text-secondary-700 shrink-0" />
                        <span className="first-letter:uppercase">{amenityLabel(key)}</span>
                      </li>
                    );
                  })}
                </ul>
                {propertyAmenities.length > 10 && (
                  <Button variant="tertiary" aria-haspopup="dialog" onClick={() => setIsAmenitiesOpen(true)}>
                    {t("showAllAmenities", { count: propertyAmenities.length })}
                  </Button>
                )}
              </section>
            )}

            {/* Policies */}
            <section id="policies" data-reveal className={sectionClass} aria-labelledby={`${baseId}-policies`}>
              <h2 id={`${baseId}-policies`} className="font-serif text-heading text-primary-900">
                {tp("policiesTitle")}
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <li className="p-5 rounded-2xl bg-white shadow-e1 space-y-2">
                  <h3 className="flex items-center gap-2 text-body font-semibold text-primary-900">
                    <BrandClockIcon size={18} className="text-secondary-700" />
                    {tp("checkInOut")}
                  </h3>
                  <p className="text-body text-primary-600">{t("checkInFrom", { time: rules.checkInTime })}</p>
                  <p className="text-body text-primary-600">{tp("checkOutUntil", { time: rules.checkOutTime })}</p>
                  <p className="text-meta text-primary-500">{tp("keycardReception")}</p>
                </li>
                <li className="p-5 rounded-2xl bg-white shadow-e1 space-y-2">
                  <h3 className="flex items-center gap-2 text-body font-semibold text-primary-900">
                    <BrandShieldIcon size={18} className="text-secondary-700" />
                    {t("cancellationPolicy")}
                  </h3>
                  <p className="text-body text-primary-600">
                    <span className="font-semibold text-primary-800">{t(`policies.${policy.id}.label`)}.</span>{" "}
                    {t(`policies.${policy.id}.summary`)}
                  </p>
                </li>
                {isHostel && (
                  <>
                    <li className="p-5 rounded-2xl bg-white shadow-e1 space-y-2">
                      <h3 className="flex items-center gap-2 text-body font-semibold text-primary-900">
                        <BrandDoorIcon size={18} className="text-secondary-700" />
                        {tp("curfewTitle")}
                      </h3>
                      <p className="text-body text-primary-600">{tp("curfewDesc")}</p>
                    </li>
                    <li className="p-5 rounded-2xl bg-white shadow-e1 space-y-2">
                      <h3 className="flex items-center gap-2 text-body font-semibold text-primary-900">
                        <BrandUserIcon size={18} className="text-secondary-700" />
                        {tp("agePolicyTitle")}
                      </h3>
                      <p className="text-body text-primary-600">{tp("agePolicyDesc")}</p>
                    </li>
                  </>
                )}
              </ul>
            </section>

            {/* Reviews */}
            <ReviewsSummary
              reviews={reviews}
              rating={rating}
              reviewCount={reviewCount}
              className="border-b border-primary/[0.08] py-10"
              metrics={
                reviewSummary
                  ? RATING_METRICS.filter((mm) => reviewSummary.categories[mm.source] > 0).map((mm) => ({
                      key: mm.key,
                      label: tp(`metrics.${mm.key}`),
                      score: reviewSummary.categories[mm.source],
                    }))
                  : []
              }
            />

            {/* Location */}
            <section id="location" data-reveal className={sectionClass} aria-labelledby={`${baseId}-location`}>
              <h2 id={`${baseId}-location`} className="font-serif text-heading text-primary-900">
                {t("whereYoullBe")}
              </h2>
              <p className="flex items-center text-body text-primary-500">
                <BrandPinIcon size={16} className="me-1.5 shrink-0 text-accent-600" />
                {place}
              </p>
              <div className="rounded-3xl overflow-hidden shadow-e2 ring-4 ring-white">
                <Map center={listing.latlng || [36.7538, 3.0588]} className="h-[380px]" />
              </div>
            </section>

            {/* Host / organisation */}
            <section data-reveal className="py-10 space-y-5" aria-labelledby={`${baseId}-host`}>
              <h2 id={`${baseId}-host`} className="font-serif text-heading text-primary-900">
                {t("hostCardTitle")}
              </h2>
              <div className="relative overflow-hidden p-7 rounded-3xl bg-white shadow-e2 flex flex-col sm:flex-row items-center gap-6">
                <div aria-hidden="true" className="absolute -top-12 -end-12 w-40 h-40 texture-zellige opacity-90" />
                <Avatar name={hostName} src={host?.image} size="xl" decorative verified />
                <div className="relative space-y-2 text-center sm:text-start flex-1 min-w-0">
                  {hostProfile && (
                    <p className="text-eyebrow uppercase font-semibold text-secondary-700">{t(`hostKind.${hostProfile.kind}`)}</p>
                  )}
                  <p className="font-serif text-[1.5rem] text-primary-900">{hostName}</p>
                  <p className="text-meta text-primary-500">{tp("hostMeta")}</p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                    <Badge tone="success" size="md" icon={<BrandBadgeCheckIcon size={13} />}>
                      {tp("identityVerified")}
                    </Badge>
                    <Badge tone="sand" size="md" icon={<BrandShieldIcon size={13} />}>
                      {tp("licensedPartner")}
                    </Badge>
                  </div>
                </div>
                {hostProfile && (
                  <Button variant="secondary" href={hostProfile.href} className="relative shrink-0">
                    {t("viewProfile")}
                  </Button>
                )}
              </div>
            </section>
          </div>

          {/* Sticky booking card (desktop) */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-4 relative">
            <section
              aria-labelledby={`${baseId}-booking`}
              className="sticky top-28 w-full max-w-sm ms-auto bg-white rounded-3xl p-7 shadow-e3 space-y-5"
            >
              <div>
                <span className={eyebrow}>{tp("selectedAccommodation")}</span>
                <AnimatePresence mode="wait" initial={false}>
                  <m.h2
                    key={selectedRoom?.id ?? "none"}
                    id={`${baseId}-booking`}
                    aria-live="polite"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } }}
                    exit={{ opacity: 0, y: -6, transition: { duration: dur.fast } }}
                    className="mt-1 font-serif text-title text-primary-900"
                  >
                    {selectedRoom?.name || tp("selectARoom")}
                  </m.h2>
                </AnimatePresence>
                {/* The hotel's own rate: travellers pay no BLADUS fee on top. */}
                <p className="mt-3 flex items-baseline gap-1.5 flex-wrap">
                  <span className="font-serif text-[1.75rem] leading-none text-primary-900 tabular-nums">{money(quote.unitPrice)}</span>
                  <span className="text-body text-primary-500">{isBedUnit ? tp("perBedPerNight") : tp("perRoomPerNight")}</span>
                </p>
                <p className="mt-1.5 text-meta text-primary-500 tabular-nums">
                  {t("noFeesShort")} · {t("nightsCount", { count: quote.nights })}
                </p>
              </div>

              {bookingFields(false)}

              <Button size="lg" fullWidth onClick={handleReserveRoom} loading={isReserving} disabled={Boolean(validationError)}>
                {ctaLabel}
              </Button>
              <p className="text-center text-meta text-primary-500">{tp("notChargedUntilConfirmed")}</p>

              <div className="border-t border-primary/10 pt-5">{breakdown}</div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => toast.info(t("reportSuccess"))}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-2 text-meta text-primary-500 hover:text-primary-900 transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                >
                  <BrandFlagIcon size={14} />
                  <span>{tp("reportProperty")}</span>
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* Similar stays */}
        {similarListings.length > 0 && (
          <section data-reveal className="space-y-6 pt-4" aria-labelledby={`${baseId}-similar`}>
            <h2 id={`${baseId}-similar`} className="font-serif text-heading text-primary-900">
              {tp("similarStays")}
            </h2>
            <div className="flex gap-5 overflow-x-auto snap-x scrollbar-none py-2 -mx-4 px-4 scroll-px-4 lg:mx-0 lg:px-0 lg:scroll-px-0">
              {similarListings.slice(0, 6).map((item) => (
                <div key={item.id} className="snap-start shrink-0 w-[72vw] sm:w-60">
                  <ListingCarouselCard listing={item} currentUser={currentUser} />
                </div>
              ))}
            </div>
          </section>
        )}
      </Container>

      {/* Phones and tablets */}
      <MobileBookingBar
        price={money(quote.unitPrice)}
        priceSuffix={isBedUnit ? tp("perBedPerNight") : tp("perRoomPerNight")}
        detail={`${selectedRoom?.name ?? ""} · ${datesLabel}`}
        detailLabel={t("editDates", { dates: datesLabel })}
        ctaLabel={isRequestToBook ? tp("requestRoom") : t("reserve")}
        onCta={() => setIsSheetOpen(true)}
        disabled={!selectedRoom}
      />

      <Sheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        busy={isReserving}
        title={selectedRoom?.name || tp("selectARoom")}
        description={listing.title}
        size="lg"
        bodyClassName="space-y-5"
        footer={
          <div className="flex items-center justify-between gap-4">
            <p className="min-w-0">
              <AnimatedNumber value={quote.total} format={money} className="block font-semibold text-title text-primary-900 tabular-nums" />
              <span className="block text-meta text-primary-500 truncate">
                {datesLabel} · {unitSummary}
              </span>
            </p>
            <Button size="lg" onClick={handleReserveRoom} loading={isReserving} disabled={Boolean(validationError)} className="shrink-0">
              {isRequestToBook ? tp("requestRoom") : t("reserve")}
            </Button>
          </div>
        }
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsSheetOpen(false);
            document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="-ms-3 underline underline-offset-4 decoration-primary/30"
        >
          {t("room.changeRoom")}
        </Button>
        {bookingFields(true)}
        <div className="border-t border-primary/10 pt-4">{breakdown}</div>
      </Sheet>

      {/* Room photo tour (opened from a room card) */}
      <PhotoLightbox
        isOpen={roomTourIndex !== null}
        onClose={closeRoomTour}
        images={tourImages}
        groups={tourGroups}
        index={roomTourIndex ?? 0}
        onIndexChange={setRoomTourIndex}
        title={listing.title}
      />

      <Dialog isOpen={isAmenitiesOpen} onClose={() => setIsAmenitiesOpen(false)} title={t("allAmenities")} showClose>
        <ul className="mt-4 divide-y divide-primary/[0.08]">
          {propertyAmenities.map((am) => {
            const Icon = amenityIcon(am);
            return (
              <li key={am} className="py-3 flex items-center gap-3 text-body text-primary-800">
                <Icon size={20} className="text-secondary-700 shrink-0" />
                <span className="first-letter:uppercase">{amenityLabel(am)}</span>
              </li>
            );
          })}
        </ul>
      </Dialog>

      <BookingSuccessDialog
        isOpen={success !== null}
        onClose={() => setSuccess(null)}
        status={success?.status ?? "confirmed"}
        itemTitle={listing.title}
        rows={success?.rows ?? []}
      />
    </div>
  );
}
