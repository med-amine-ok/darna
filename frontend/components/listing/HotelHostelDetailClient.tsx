"use client";

import React, { useState, useMemo, useRef, useId, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Listing, User, PublicUser, Review, RoomType } from "@/types";
import Container from "@/components/Container";
import HeartButton from "@/components/HeartButton";
import PriceDisplay from "@/components/common/PriceDisplay";
import Button from "@/components/Button";
import Counter from "@/components/inputs/Counter";
import Calendar from "@/components/inputs/Calendar";
import Avatar from "@/components/Avatar";
import Dialog from "@/components/ui/Dialog";
import { Range } from "react-date-range";
import { useLoginModal } from "@/hook/useLoginModal";
import { createBookingAction } from "@/app/actions/bookings";
import { isRequestToBook as computeIsRequestToBook, quoteListingBooking } from "@/lib/booking/pricing";
import {
  maxGuestsFor,
  maxUnitsFor,
  validateListingRequest,
  type ListingAvailability,
} from "@/lib/booking/availability";
import { getStayRules } from "@/lib/booking/config";
import { getCancellationPolicy } from "@/lib/booking/cancellation";
import { addDaysToKey, formatDateKey, fromDateKey, isDateKey, toDateKey } from "@/lib/booking/dates";
import { formatDzd } from "@/lib/currency";
import { formatDate, formatNumber, formatRating } from "@/lib/i18n/date-locale";
import { summarizeReviews } from "@/lib/reviews";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { toast } from "react-toastify";
import PhotoLightbox from "./PhotoLightbox";
import { useActionError } from "@/hook/useActionError";
import {
  BrandStarIcon,
  BrandShareIcon,
  BrandGridIcon,
  BrandCloseIcon,
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
  BrandShieldIcon,
  BrandUserIcon,
  BrandBedIcon,
  BrandBuildingIcon,
  BrandCheckIcon,
  BrandClockIcon,
  BrandWifiIcon,
  BrandSnowIcon,
  BrandKitchenIcon,
  BrandWaterIcon,
  BrandDoorIcon,
  BrandFlagIcon,
  CategoryPoolIcon,
  CategoryVehicleIcon,
  InstantBookingIcon,
  RequestReviewIcon,
  type IconProps,
} from "@/components/icons";
import ListingCarouselCard from "@/components/home/ListingCarouselCard";

function MapLoading() {
  const t = useTranslations("listing");
  return (
    <div
      role="status"
      className="w-full h-[320px] bg-tertiary/20 animate-pulse rounded-2xl flex items-center justify-center text-primary/70 text-sm"
    >
      {t("loadingMap")}
    </div>
  );
}

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <MapLoading />,
});

interface HotelHostelDetailClientProps {
  listing: Listing;
  host?: PublicUser | null;
  reviews?: Review[];
  similarListings?: Listing[];
  currentUser?: User | null;
  availability: ListingAvailability;
}

const AMENITY_ICONS: Record<string, React.FC<IconProps>> = {
  wifi: BrandWifiIcon,
  pool: CategoryPoolIcon,
  breakfast: BrandKitchenIcon,
  reception_24_7: BrandClockIcon,
  air_conditioning: BrandSnowIcon,
  valet: CategoryVehicleIcon,
  spa: BrandWaterIcon,
  shared_kitchen: BrandKitchenIcon,
  lockers: BrandShieldIcon,
  rooftop: BrandBuildingIcon,
  coworking: BrandBuildingIcon,
  luggage_storage: BrandDoorIcon,
  conference: BrandBuildingIcon,
  shuttle: CategoryVehicleIcon,
};

/** Hotel-facing labels for the review categories (staff = communication, value for money = value). */
const RATING_METRICS = [
  { key: "cleanliness", source: "cleanliness" },
  { key: "staff", source: "communication" },
  { key: "location", source: "location" },
  { key: "valueForMoney", source: "value" },
] as const;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function HotelHostelDetailClient({
  listing,
  host,
  reviews = [],
  similarListings = [],
  currentUser,
  availability,
}: HotelHostelDetailClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("listing");
  const tp = useTranslations("listing.property");
  const tCommon = useTranslations("common");
  const errorText = useActionError();
  const openLogin = useLoginModal((s) => s.onOpen);
  const bookingWidgetRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const calendarPanelId = `${baseId}-calendar`;
  const guestPanelId = `${baseId}-guests`;
  const noteId = `${baseId}-note`;

  const isHotel = listing.businessCategory === "hotel" || listing.type?.toLowerCase().includes("hotel");
  const isHostel = listing.businessCategory === "hostel" || listing.type?.toLowerCase().includes("hostel");

  // Property Photos (padded for the 5-tile mosaic)
  const rawImages = Array.isArray(listing.imageSrc) ? listing.imageSrc : [listing.imageSrc].filter(Boolean);
  const displayImages = [
    ...rawImages,
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
    "https://images.unsplash.com/photo-1613977257363-707ba9348227",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
  ].slice(0, 5);
  const photoTotal = displayImages.length;

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [mobilePhotoIndex, setMobilePhotoIndex] = useState(0);
  const [isAmenitiesModalOpen, setIsAmenitiesModalOpen] = useState(false);
  const closeLightbox = useCallback(() => setIsLightboxOpen(false), []);
  const openLightbox = (index: number) => {
    setActivePhotoIndex(index);
    setIsLightboxOpen(true);
  };

  // Room Types — only real room types can be booked (the server books these ids).
  const availableRooms: RoomType[] = useMemo(() => listing.roomTypes || [], [listing.roomTypes]);

  const [selectedRoomId, setSelectedRoomId] = useState<string>(availableRooms[0]?.id || "");

  const selectedRoom = useMemo(() => {
    return availableRooms.find((r) => r.id === selectedRoomId) || availableRooms[0];
  }, [availableRooms, selectedRoomId]);
  const isBedUnit = selectedRoom?.bookingUnit === "bed";

  // Booking Dates & Guest Count (date keys, Algeria calendar days)
  const rules = getStayRules(listing);
  const today = availability.today;
  const earliestStart = useMemo(() => {
    const notice = addDaysToKey(today, rules.advanceNoticeDays);
    return listing.availableFrom && isDateKey(listing.availableFrom) && listing.availableFrom > notice
      ? listing.availableFrom
      : notice;
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
  const durationNights = quote.nights;
  const nightlyRate = quote.unitPrice;
  const money = (amount: number) => formatDzd(amount, locale);

  const isRequestToBook = computeIsRequestToBook(listing);
  const policy = getCancellationPolicy(listing.cancellationPolicy);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(tp("linkCopied"));
    } catch {
      toast.info(t("linkReady"));
    }
  };

  const handleSelectRoom = (room: RoomType) => {
    setSelectedRoomId(room.id);
    setRoomCount(1);
    const cap = room.bookingUnit === "bed" ? maxUnitsFor(room) : room.capacity;
    if (guestCount > cap) {
      setGuestCount(cap);
    }
    toast.info(tp("roomSelected", { name: room.name }));
    if (bookingWidgetRef.current) {
      bookingWidgetRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

      if (result.data.status === "pending") {
        toast.success(tp("requestSent"));
      } else {
        toast.success(tp("roomConfirmed"));
      }
      router.push("/trips");
      router.refresh();
    } catch {
      toast.error(errorText({ code: "BOOKING_FAILED" }));
    } finally {
      setIsReserving(false);
    }
  };

  // Amenities Definition
  const propertyAmenities = listing.amenities || [
    "wifi",
    "pool",
    "breakfast",
    "reception_24_7",
    "air_conditioning",
    "valet",
    "spa",
  ];
  const amenityLabel = (key: string) =>
    t.has(`amenityLabels.${key}`) ? t(`amenityLabels.${key}`) : key.replace(/_/g, " ");

  const reviewSummary = summarizeReviews(reviews);
  const rating = formatRating(listing.rating || reviewSummary?.overall, locale);
  const reviewCount = listing.reviewCount ?? reviewSummary?.count ?? 0;
  const sectionNav = [
    { href: "#rooms", label: tp("nav.rooms") },
    { href: "#overview", label: tp("nav.overview") },
    { href: "#amenities", label: tp("nav.amenities") },
    { href: "#policies", label: tp("nav.policies") },
    { href: "#location", label: tp("nav.location") },
    { href: "#reviews", label: tp("nav.reviews") },
  ];

  const unitSummary = isBedUnit
    ? t("bedsCount", { count: guestCount })
    : tCommon("listSeparator", {
        a: t("roomsCount", { count: roomCount }),
        b: t("guestCount", { count: guestCount }),
      });

  return (
    <div className="pt-6 sm:pt-8 pb-28 lg:pb-12 text-primary">
      <Container className="space-y-8">
        {/* 1. PROPERTY HEADER BLOCK */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                isHotel ? "bg-primary text-white" : "bg-purple-100 text-purple-900 border border-purple-200"
              }`}
            >
              {isHotel ? tp("hotelResort") : tp("backpackerHostel")}
            </span>

            {isHotel && listing.hotelStarRating && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-bold">
                {Array.from({ length: listing.hotelStarRating }).map((_, i) => (
                  <BrandStarIcon key={i} size={13} className="text-amber-500 fill-amber-500" />
                ))}
                <span>{tp("starRating", { count: listing.hotelStarRating })}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-semibold">
              <BrandShieldIcon size={13} className="text-emerald-700" />
              <span>{tp("verifiedHospitality")}</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif tracking-tight text-primary">
                {listing.title}
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-neutral-600">
                <span className="flex items-center gap-1 font-bold text-primary">
                  {rating ? (
                    <>
                      <BrandStarIcon size={16} className="text-accent fill-accent" />
                      <span className="sr-only">{t("ratingLabel", { rating })}</span>
                      <span aria-hidden="true">{rating}</span>
                    </>
                  ) : (
                    t("ratingNew")
                  )}
                </span>
                {reviewCount > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <a
                      href="#reviews"
                      className={`underline font-semibold text-primary hover:text-accent-700 transition rounded ${focusRing}`}
                    >
                      {tp("verifiedReviews", { count: reviewCount })}
                    </a>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-neutral-700">
                  {listing.city ? t("cityCountry", { city: listing.city }) : listing.locationValue}
                </span>
              </div>
            </div>

            {/* Share & Save */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleShare}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-tertiary/80 text-xs sm:text-sm font-semibold text-primary hover:bg-neutral-100 transition cursor-pointer ${focusRing}`}
              >
                <BrandShareIcon size={16} />
                <span>{t("share")}</span>
              </button>
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-tertiary/80 text-xs sm:text-sm font-semibold text-primary hover:bg-neutral-100 transition">
                <HeartButton listingId={listing.id} currentUser={currentUser} />
                <span aria-hidden="true">{t("save")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. PROPERTY BENTO GALLERY */}
        <div className="relative">
          {/* Desktop Mosaic */}
          <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2.5 h-[420px] rounded-3xl overflow-hidden shadow-sm">
            {displayImages.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => openLightbox(idx)}
                aria-label={t("openPhoto", { number: idx + 1, total: photoTotal })}
                className={`relative cursor-pointer overflow-hidden group bg-neutral-100 ${focusRing} ${
                  idx === 0 ? "col-span-2 row-span-2" : ""
                }`}
              >
                <Image
                  src={img}
                  alt=""
                  fill
                  priority={idx === 0}
                  sizes={idx === 0 ? "(max-width: 1024px) 50vw, 640px" : "(max-width: 1024px) 25vw, 320px"}
                  className="object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition" />
              </button>
            ))}
          </div>

          {/* Mobile Single Carousel */}
          <div className="md:hidden relative aspect-video rounded-2xl overflow-hidden bg-neutral-100">
            <button
              type="button"
              onClick={() => openLightbox(mobilePhotoIndex)}
              aria-label={t("openPhoto", { number: mobilePhotoIndex + 1, total: photoTotal })}
              className={`absolute inset-0 ${focusRing}`}
            >
              <Image
                src={displayImages[mobilePhotoIndex]}
                alt=""
                fill
                priority={mobilePhotoIndex === 0}
                sizes="100vw"
                className="object-cover"
              />
            </button>
            {photoTotal > 1 && (
              <>
                <button
                  type="button"
                  aria-label={t("previousPhoto")}
                  onClick={() => setMobilePhotoIndex((prev) => (prev === 0 ? photoTotal - 1 : prev - 1))}
                  className={`absolute start-2.5 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-md text-primary ${focusRing}`}
                >
                  <BrandChevronLeftIcon size={16} className="rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  aria-label={t("nextPhoto")}
                  onClick={() => setMobilePhotoIndex((prev) => (prev === photoTotal - 1 ? 0 : prev + 1))}
                  className={`absolute end-2.5 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-md text-primary ${focusRing}`}
                >
                  <BrandChevronRightIcon size={16} className="rtl:rotate-180" />
                </button>
                <div
                  aria-live="polite"
                  className="absolute bottom-2.5 end-2.5 px-2 py-0.5 bg-black/70 text-white text-[11px] font-mono rounded-md"
                >
                  {t("photoCount", { current: mobilePhotoIndex + 1, total: photoTotal })}
                </div>
              </>
            )}
          </div>

          {/* Lightbox button */}
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className={`absolute bottom-4 end-4 hidden md:flex items-center gap-2 px-3.5 py-2 bg-white/95 hover:bg-white text-primary text-xs font-bold rounded-xl shadow-md border border-tertiary transition cursor-pointer ${focusRing}`}
          >
            <BrandGridIcon size={16} />
            <span>{t("showAllPhotos")}</span>
          </button>
        </div>

        {/* 3. QUICK NAV BAR */}
        <nav
          aria-label={tp("sectionsNav")}
          className="sticky top-16 z-20 bg-white/90 backdrop-blur-md border-b border-tertiary/70 py-2.5 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          <ul className="flex items-center gap-6 text-xs sm:text-sm font-semibold text-neutral-600 overflow-x-auto no-scrollbar">
            {sectionNav.map((item, idx) => (
              <li key={item.href} className="shrink-0">
                <a
                  href={item.href}
                  className={`transition pb-1 rounded ${focusRing} ${
                    idx === 0 ? "text-primary border-b-2 border-primary" : "hover:text-primary"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* 4. MAIN SPLIT: ROOMS & CONTENT vs STICKY BOOKING */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Main Column */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-10">
            {/* SECTION: ROOMS & BED PICKER */}
            <section id="rooms" aria-labelledby={`${baseId}-rooms`} className="space-y-5 scroll-mt-28">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-tertiary/60 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary-700">
                    {isHostel ? tp("dormsAndRooms") : tp("availableRoomTypes")}
                  </span>
                  <h2 id={`${baseId}-rooms`} className="text-2xl sm:text-3xl font-bold font-serif text-primary">
                    {tp("selectAccommodation")}
                  </h2>
                </div>
                <p className="text-xs text-neutral-600">
                  {tp("roomConfigurations", { count: availableRooms.length })}
                </p>
              </div>

              {/* Room Cards Stack */}
              <ul className="space-y-4">
                {availableRooms.map((room) => {
                  const isSelected = selectedRoom?.id === room.id;
                  const roomPrice = room.basePrice ?? room.price;
                  const roomImages =
                    room.imageSrc && room.imageSrc.length > 0 ? room.imageSrc : displayImages.slice(0, 2);

                  return (
                    <li
                      key={room.id}
                      className={`rounded-3xl border-2 p-5 sm:p-6 transition duration-200 bg-white ${
                        isSelected
                          ? "border-primary shadow-lg ring-2 ring-primary/10"
                          : "border-tertiary/70 hover:border-neutral-400 shadow-xs"
                      }`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                        {/* Room Image */}
                        <div className="md:col-span-4 relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100 group">
                          <Image
                            src={roomImages[0]}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 280px"
                            className="object-cover group-hover:scale-105 transition duration-300"
                          />
                          <span className="absolute top-2.5 start-2.5 px-2.5 py-0.5 bg-black/70 text-white text-[11px] font-semibold rounded-full">
                            {room.bookingUnit === "bed" ? tp("dormBed") : tp("privateRoom")}
                          </span>
                        </div>

                        {/* Room Details */}
                        <div className="md:col-span-8 flex flex-col justify-between h-full space-y-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="text-lg sm:text-xl font-bold text-primary font-serif">{room.name}</h3>
                              <div className="text-end">
                                <div className="text-base sm:text-lg font-bold font-mono text-primary">
                                  {money(roomPrice)}
                                </div>
                                <div className="text-[11px] text-neutral-600">
                                  {room.bookingUnit === "bed" ? tp("perBedNight") : t("priceSuffix.night")}
                                </div>
                              </div>
                            </div>

                            <p className="text-xs text-neutral-600 leading-relaxed">{room.description}</p>

                            {/* Capacity & Bed config pills */}
                            <ul className="flex flex-wrap gap-2 pt-1 text-xs">
                              <li className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-tertiary/20 rounded-xl font-semibold text-primary">
                                <BrandUserIcon size={14} className="text-primary" />
                                <span>{t("upToGuests", { count: room.capacity })}</span>
                              </li>
                              <li className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-tertiary/20 rounded-xl font-semibold text-primary">
                                <BrandBedIcon size={14} className="text-primary" />
                                <span>
                                  {room.bookingUnit === "bed"
                                    ? tp("bunkShared")
                                    : room.capacity > 2
                                    ? tp("kingPlusSofa")
                                    : tp("kingBed")}
                                </span>
                              </li>
                              <li className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-xl font-medium text-[11px]">
                                <BrandCheckIcon size={13} className="text-emerald-700" />
                                <span>{t("freeCancelHighlight")}</span>
                              </li>
                            </ul>

                            {/* Room Features */}
                            {room.amenities && room.amenities.length > 0 && (
                              <ul className="flex flex-wrap gap-1.5 pt-1">
                                {room.amenities.map((amId) => (
                                  <li
                                    key={amId}
                                    className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-[10px] font-medium rounded-md first-letter:uppercase"
                                  >
                                    {amenityLabel(amId)}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="pt-2 flex items-center justify-between border-t border-tertiary/40">
                            <span className="text-[11px] text-neutral-600 font-medium">{tp("instantOnDarna")}</span>
                            <button
                              type="button"
                              aria-pressed={isSelected}
                              aria-label={isSelected ? tp("selectedRoomNamed", { name: room.name }) : tp("selectRoomNamed", { name: room.name })}
                              onClick={() => handleSelectRoom(room)}
                              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${focusRing} ${
                                isSelected
                                  ? "bg-primary text-white shadow-xs"
                                  : "bg-tertiary/30 text-primary hover:bg-tertiary/60"
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <BrandCheckIcon size={15} />
                                  <span>{tp("selectedRoom")}</span>
                                </>
                              ) : (
                                <span>{tp("selectRoom")}</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* SECTION: PROPERTY OVERVIEW */}
            <section id="overview" className="space-y-4 pt-4 border-t border-tertiary/60 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-primary">{tp("aboutProperty")}</h2>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                {listing.description ||
                  tp("defaultDescription", { title: listing.title, city: listing.city || "Algiers" })}
              </p>

              {/* Highlights Cards */}
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {[
                  { Icon: BrandClockIcon, key: "frontDesk" },
                  { Icon: BrandShieldIcon, key: "licensing" },
                  { Icon: BrandWifiIcon, key: "fiberWifi" },
                ].map(({ Icon, key }) => (
                  <li key={key} className="p-4 rounded-2xl border border-tertiary/70 bg-white space-y-1">
                    <Icon size={20} className="text-secondary" />
                    <div className="text-xs font-bold text-primary">{tp(`highlights.${key}.title`)}</div>
                    <div className="text-[11px] text-neutral-600">{tp(`highlights.${key}.desc`)}</div>
                  </li>
                ))}
              </ul>
            </section>

            {/* SECTION: WHAT THIS PLACE OFFERS */}
            <section id="amenities" className="space-y-4 pt-4 border-t border-tertiary/60 scroll-mt-28">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold font-serif text-primary">{tp("whatOffers")}</h2>
                <p className="text-xs text-neutral-600">{tp("whatOffersDesc")}</p>
              </div>

              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {propertyAmenities.slice(0, 9).map((amenityId) => {
                  const Icon = AMENITY_ICONS[amenityId] || BrandCheckIcon;
                  return (
                    <li
                      key={amenityId}
                      className="p-3.5 rounded-2xl border border-tertiary/70 bg-white flex items-center gap-3 text-xs font-semibold text-primary shadow-xs"
                    >
                      <Icon size={20} className="text-secondary shrink-0" />
                      <span className="first-letter:uppercase">{amenityLabel(amenityId)}</span>
                    </li>
                  );
                })}
              </ul>

              {propertyAmenities.length > 9 && (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setIsAmenitiesModalOpen(true)}
                  className={`px-5 py-2.5 rounded-xl border border-tertiary/80 text-xs font-bold text-primary hover:bg-neutral-100 transition cursor-pointer ${focusRing}`}
                >
                  {t("showAllAmenities", { count: propertyAmenities.length })}
                </button>
              )}
            </section>

            {/* SECTION: POLICIES */}
            <section id="policies" className="space-y-4 pt-4 border-t border-tertiary/60 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-primary">{tp("policiesTitle")}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-tertiary/70 bg-white space-y-2">
                  <h3 className="text-xs font-bold text-primary flex items-center gap-2">
                    <BrandClockIcon size={16} className="text-secondary" />
                    <span>{tp("checkInOut")}</span>
                  </h3>
                  <ul className="text-xs text-neutral-600 space-y-1 list-disc ps-4">
                    <li>{t("checkInFrom", { time: rules.checkInTime })}</li>
                    <li>{tp("checkOutUntil", { time: rules.checkOutTime })}</li>
                    <li>{tp("keycardReception")}</li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl border border-tertiary/70 bg-white space-y-2">
                  <h3 className="text-xs font-bold text-primary flex items-center gap-2">
                    <BrandShieldIcon size={16} className="text-secondary" />
                    <span>{t("cancellationPolicy")}</span>
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {t(`policies.${policy.id}.label`)}: {t(`policies.${policy.id}.summary`)}
                  </p>
                </div>

                {isHostel && (
                  <>
                    <div className="p-5 rounded-2xl border border-tertiary/70 bg-white space-y-2">
                      <h3 className="text-xs font-bold text-primary flex items-center gap-2">
                        <BrandDoorIcon size={16} className="text-secondary" />
                        <span>{tp("curfewTitle")}</span>
                      </h3>
                      <p className="text-xs text-neutral-600 leading-relaxed">{tp("curfewDesc")}</p>
                    </div>

                    <div className="p-5 rounded-2xl border border-tertiary/70 bg-white space-y-2">
                      <h3 className="text-xs font-bold text-primary flex items-center gap-2">
                        <BrandUserIcon size={16} className="text-secondary" />
                        <span>{tp("agePolicyTitle")}</span>
                      </h3>
                      <p className="text-xs text-neutral-600 leading-relaxed">{tp("agePolicyDesc")}</p>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* SECTION: PROPERTY HOST / MANAGEMENT CARD */}
            <div className="p-6 rounded-3xl border border-tertiary bg-white space-y-4">
              <div className="flex items-center gap-4">
                <Avatar src={host?.image || undefined} />
                <div>
                  <h3 className="font-bold text-base text-primary">
                    {tp("managedBy", { name: host?.name || listing.title })}
                  </h3>
                  <div className="text-xs text-neutral-600">{tp("hostMeta")}</div>
                </div>
              </div>

              <ul className="flex flex-wrap gap-2 pt-1 text-xs">
                <li className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full font-medium border border-emerald-200">
                  {tp("identityVerified")}
                </li>
                <li className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full font-medium border border-blue-200">
                  {tp("licensedPartner")}
                </li>
              </ul>
            </div>

            {/* SECTION: LOCATION & MAP */}
            <section id="location" className="space-y-4 pt-4 border-t border-tertiary/60 scroll-mt-28">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold font-serif text-primary">{t("whereYoullBe")}</h2>
                <p className="text-xs text-neutral-600">
                  {listing.city ? t("cityCountry", { city: listing.city }) : listing.locationValue || t("algeria")}
                </p>
              </div>

              <div className="rounded-3xl overflow-hidden border border-tertiary shadow-xs h-[340px] relative">
                <Map center={listing.latlng || [36.7538, 3.0588]} />
              </div>
            </section>

            {/* SECTION: REVIEWS */}
            <section id="reviews" className="space-y-6 pt-4 border-t border-tertiary/60 scroll-mt-28">
              <div className="flex items-center gap-2">
                <BrandStarIcon size={22} className="text-accent fill-accent" />
                <h2 className="text-2xl font-bold font-serif text-primary">
                  {rating ? t("ratingAndReviews", { rating, count: reviewCount }) : t("reviews")}
                </h2>
              </div>

              {/* Rating metrics */}
              {reviewSummary && (
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-tertiary/15 p-4 rounded-2xl border border-tertiary/50 text-xs">
                  {RATING_METRICS.filter((m) => reviewSummary.categories[m.source] > 0).map((m) => (
                    <div key={m.key}>
                      <dt className="font-bold text-primary">{tp(`metrics.${m.key}`)}</dt>
                      <dd className="font-mono text-secondary-700 font-bold">
                        {tp("scoreOutOf", {
                          score: formatNumber(reviewSummary.categories[m.source], locale, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          }),
                        })}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* Review snippets */}
              {reviews.length > 0 ? (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {reviews.slice(0, 4).map((rev) => (
                    <li key={rev.id} className="p-5 rounded-2xl border border-tertiary/70 bg-white space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">{rev.user?.name || t("guestFallback")}</span>
                        {rev.createdAt && (
                          <span className="text-neutral-600 text-[11px]">
                            {formatDate(rev.createdAt, locale, { month: "long", year: "numeric" })}
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-600 leading-relaxed">{rev.comment}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-neutral-600">{t("noReviewsYet")}</p>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN: STICKY ROOM BOOKING WIDGET */}
          <div ref={bookingWidgetRef} className="lg:col-span-5 xl:col-span-4 sticky top-28 space-y-4">
            <section
              aria-labelledby={`${baseId}-booking`}
              className="p-6 rounded-3xl border border-tertiary/80 bg-white shadow-xl space-y-5"
            >
              {/* Selected Room Header */}
              <div className="space-y-1 pb-3 border-b border-tertiary/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-700">
                  {tp("selectedAccommodation")}
                </span>
                <div className="flex items-start justify-between gap-2">
                  <h2 id={`${baseId}-booking`} className="text-lg font-bold text-primary font-serif">
                    {selectedRoom?.name || tp("selectARoom")}
                  </h2>
                  <div className="text-end shrink-0">
                    <div className="text-base font-bold font-mono text-primary">{money(nightlyRate)}</div>
                    <div className="text-[10px] text-neutral-600">
                      {selectedRoom?.bookingUnit === "bed" ? tp("perBedPerNight") : tp("perRoomPerNight")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Date & Guest Input Box */}
              <div className="border border-tertiary rounded-2xl overflow-hidden divide-y divide-tertiary text-xs">
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen((prev) => !prev)}
                  aria-expanded={isCalendarOpen}
                  aria-controls={calendarPanelId}
                  className="w-full grid grid-cols-2 p-3 text-start hover:bg-neutral-50 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600"
                >
                  <span>
                    <span className="block font-bold text-[10px] text-neutral-600 uppercase">{t("checkInLabel")}</span>
                    <span className="font-semibold text-primary">{formatDateKey(startKey, locale)}</span>
                  </span>
                  <span className="border-s border-tertiary ps-3">
                    <span className="block font-bold text-[10px] text-neutral-600 uppercase">{t("checkoutLabel")}</span>
                    <span className="font-semibold text-primary">{formatDateKey(endKey, locale)}</span>
                  </span>
                </button>

                {isCalendarOpen && (
                  <div
                    id={calendarPanelId}
                    className="p-2 bg-white flex justify-center border-t border-tertiary/50 animate-in fade-in"
                  >
                    <Calendar
                      value={dateRange}
                      onChange={(val) => setDateRange(val.selection)}
                      minDate={fromDateKey(earliestStart)}
                      maxDate={
                        listing.availableTo && isDateKey(listing.availableTo) ? fromDateKey(listing.availableTo) : undefined
                      }
                      disabledDates={disabledDates}
                    />
                  </div>
                )}

                {/* Guest / Unit count selector */}
                <div className="p-3">
                  <button
                    type="button"
                    onClick={() => setIsGuestPickerOpen((prev) => !prev)}
                    aria-expanded={isGuestPickerOpen}
                    aria-controls={guestPanelId}
                    className="w-full text-start cursor-pointer flex justify-between items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                  >
                    <span>
                      <span className="block font-bold text-[10px] text-neutral-600 uppercase">
                        {isBedUnit ? tp("bedsLabel") : t("guests")}
                      </span>
                      <span className="font-semibold text-primary">{unitSummary}</span>
                    </span>
                    <span className="text-xs font-bold text-neutral-600" aria-hidden="true">
                      {isGuestPickerOpen ? tp("done") : t("change")}
                    </span>
                  </button>

                  {isGuestPickerOpen && (
                    <div id={guestPanelId} className="pt-3 border-t border-tertiary/40 mt-2">
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
                        subtitle={
                          isBedUnit ? tp("onePerBed", { count: maxUnits }) : tp("maxCapacity", { count: maxGuests })
                        }
                        value={guestCount}
                        maxValue={maxGuests}
                        onChange={(v) => setGuestCount(Math.min(v, maxGuests))}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Mode Badge */}
              {isRequestToBook ? (
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs">
                  <RequestReviewIcon size={18} className="text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold block text-amber-950">{t("hostApprovalRequired")}</span>
                    <p className="text-[11px] text-amber-800 leading-snug">{tp("frontDeskReview")}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 text-emerald-900 text-xs">
                  <InstantBookingIcon size={18} className="text-emerald-700 shrink-0" />
                  <span className="font-semibold text-emerald-900 text-[11px]">{t("instantConfirmation")}</span>
                </div>
              )}

              {/* Optional Note to Host */}
              {isRequestToBook && (
                <div className="space-y-1.5">
                  <label htmlFor={noteId} className="text-xs font-bold text-neutral-700">
                    {tp("specialRequests")}
                  </label>
                  <textarea
                    id={noteId}
                    rows={2}
                    value={guestMessage}
                    onChange={(e) => setGuestMessage(e.target.value)}
                    placeholder={tp("specialRequestsPlaceholder")}
                    className="w-full text-xs p-2.5 rounded-xl border border-tertiary/70 bg-neutral-50 focus:bg-white focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-accent-600 transition resize-none placeholder:text-neutral-500"
                  />
                </div>
              )}

              {validationMessage && (
                <p role="alert" className="text-xs font-semibold text-rose-700">
                  {validationMessage}
                </p>
              )}

              {/* Reserve Button */}
              <Button
                label={
                  isRequestToBook
                    ? tp("requestToBookRoom")
                    : selectedRoom?.name
                    ? tp("reserveNamed", { name: selectedRoom.name })
                    : t("reserve")
                }
                disabled={isReserving || Boolean(validationError)}
                onClick={handleReserveRoom}
              />

              <p className="text-center text-xs text-neutral-600">{tp("notChargedUntilConfirmed")}</p>

              {/* Price Calculation Breakdown */}
              <div className="space-y-2.5 text-xs sm:text-sm text-neutral-700 border-t border-tertiary/50 pt-4">
                <div className="flex justify-between">
                  <span>
                    {tp("rateBreakdown", {
                      rate: money(nightlyRate),
                      units: isBedUnit ? t("bedsCount", { count: quote.quantity }) : t("roomsCount", { count: quote.quantity }),
                      nights: t("nightsCount", { count: durationNights }),
                    })}
                  </span>
                  <span>{money(quote.subtotal)}</span>
                </div>

                {quote.cleaningFee > 0 && (
                  <div className="flex justify-between">
                    <span>{t("cleaningFee")}</span>
                    <span>{money(quote.cleaningFee)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>{t("serviceFee")}</span>
                  <span>{money(quote.serviceFee)}</span>
                </div>

                {quote.taxes > 0 && (
                  <div className="flex justify-between">
                    <span>{t("taxes")}</span>
                    <span>{money(quote.taxes)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-sm sm:text-base text-primary border-t border-tertiary/60 pt-3">
                  <span>{tCommon("total")}</span>
                  <PriceDisplay price={quote.total} priceClassName="font-bold text-primary" />
                </div>
              </div>

              {/* Report Property */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => toast.info(t("reportSuccess"))}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-800 transition cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                >
                  <BrandFlagIcon size={14} />
                  <span>{tp("reportProperty")}</span>
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* 5. SIMILAR PROPERTIES */}
        {similarListings.length > 0 && (
          <div className="pt-8 border-t border-tertiary/60 space-y-4">
            <h2 className="text-2xl font-bold font-serif text-primary">{tp("similarStays")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {similarListings.slice(0, 4).map((item) => (
                <ListingCarouselCard key={item.id} listing={item} />
              ))}
            </div>
          </div>
        )}

        {/* Mobile Sticky Booking Bar */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-tertiary/80 p-3.5 shadow-2xl flex items-center justify-between pb-[calc(0.8rem+env(safe-area-inset-bottom))]">
          <div>
            <div className="text-xs font-bold text-primary truncate max-w-[180px]">{selectedRoom?.name}</div>
            <div className="text-xs font-mono font-bold text-primary">
              {money(nightlyRate)}{" "}
              <span className="text-[10px] font-normal text-neutral-600">{t("priceSuffix.night")}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => bookingWidgetRef.current?.scrollIntoView({ behavior: "smooth" })}
            className={`px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-sm hover:bg-primary/95 transition ${focusRing}`}
          >
            {isRequestToBook ? tp("requestRoom") : t("reserve")}
          </button>
        </div>

        <PhotoLightbox
          isOpen={isLightboxOpen}
          onClose={closeLightbox}
          images={displayImages}
          index={activePhotoIndex}
          onIndexChange={setActivePhotoIndex}
          title={listing.title}
        />

        {/* All amenities dialog */}
        <Dialog
          isOpen={isAmenitiesModalOpen}
          onClose={() => setIsAmenitiesModalOpen(false)}
          ariaLabel={t("allAmenities")}
          className="relative bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl"
          backdropClassName="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <h3 className="font-bold text-lg text-primary">{t("allAmenities")}</h3>
            <button
              type="button"
              aria-label={t("closeAmenities")}
              onClick={() => setIsAmenitiesModalOpen(false)}
              className={`p-1 rounded-full hover:bg-neutral-100 ${focusRing}`}
            >
              <BrandCloseIcon size={20} strokeWidth={2} />
            </button>
          </div>
          <ul className="space-y-3 divide-y divide-neutral-100">
            {propertyAmenities.map((am) => {
              const Icon = AMENITY_ICONS[am] || BrandCheckIcon;
              return (
                <li key={am} className="pt-2 flex items-center gap-3 text-sm text-neutral-800">
                  <Icon size={18} className="text-secondary shrink-0" />
                  <span className="first-letter:uppercase">{amenityLabel(am)}</span>
                </li>
              );
            })}
          </ul>
        </Dialog>
      </Container>
    </div>
  );
}
