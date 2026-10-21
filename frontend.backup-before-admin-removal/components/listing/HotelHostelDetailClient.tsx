"use client";

import React, { useState, useMemo, useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Listing, User, Review, RoomType } from "@/types";
import Container from "@/components/Container";
import HeartButton from "@/components/HeartButton";
import PriceDisplay from "@/components/common/PriceDisplay";
import Button from "@/components/Button";
import Counter from "@/components/inputs/Counter";
import Calendar from "@/components/inputs/Calendar";
import Avatar from "@/components/Avatar";
import { Range } from "react-date-range";
import { differenceInCalendarDays, format } from "date-fns";
import { useLoginModal } from "@/hook/useLoginModal";
import { createReservation } from "@/lib/data/reservations";
import { useRouter } from "@/navigation";
import { toast } from "react-toastify";
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
  BrandFlameIcon,
  BrandDoorIcon,
  BrandFlagIcon,
  CategoryPoolIcon,
  CategoryVehicleIcon,
  InstantBookingIcon,
  RequestReviewIcon,
} from "@/components/icons";
import ListingCarouselCard from "@/components/home/ListingCarouselCard";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] bg-tertiary/20 animate-pulse rounded-2xl flex items-center justify-center text-primary/60 text-sm">
      Loading map...
    </div>
  ),
});

interface HotelHostelDetailClientProps {
  listing: Listing;
  host?: User | null;
  reviews?: Review[];
  similarListings?: Listing[];
  currentUser?: User | null;
}

export default function HotelHostelDetailClient({
  listing,
  host,
  reviews = [],
  similarListings = [],
  currentUser,
}: HotelHostelDetailClientProps) {
  const router = useRouter();
  const loginModal = useLoginModal();
  const bookingWidgetRef = useRef<HTMLDivElement>(null);

  const isHotel = listing.businessCategory === "hotel" || listing.type?.toLowerCase().includes("hotel");
  const isHostel = listing.businessCategory === "hostel" || listing.type?.toLowerCase().includes("hostel");

  // Property Photos
  const rawImages = Array.isArray(listing.imageSrc)
    ? listing.imageSrc
    : [listing.imageSrc || "/assets/hero.jpg"];
  const displayImages = [
    ...rawImages,
    "/assets/hero.jpg",
    "/assets/tipaza.jpg",
    "/assets/oran.jpg",
    "/assets/constantine.jpg",
  ].slice(0, 5);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [mobilePhotoIndex, setMobilePhotoIndex] = useState(0);
  const [isAmenitiesModalOpen, setIsAmenitiesModalOpen] = useState(false);

  // Room Types
  const availableRooms: RoomType[] = useMemo(() => {
    if (listing.roomTypes && listing.roomTypes.length > 0) {
      return listing.roomTypes;
    }
    // Fallback default rooms if not modeled
    if (isHostel) {
      return [
        {
          id: `${listing.id}_dorm_6`,
          propertyListingId: listing.id,
          name: "6-Bed Mixed Dormitory Bed",
          capacity: 1,
          price: 3200,
          basePrice: 3200,
          description: "Individual bunk bed in a climate-controlled dormitory with reading light, privacy curtain and personal secure locker.",
          amenities: ["wifi", "air_conditioning", "shared_kitchen", "lockers"],
          bookingUnit: "bed",
          imageSrc: [rawImages[0] || "/assets/hero.jpg", rawImages[1] || "/assets/tipaza.jpg"],
          inventoryCount: 12,
          totalInventory: 12,
        },
        {
          id: `${listing.id}_private_double`,
          propertyListingId: listing.id,
          name: "Private Double Room (Ensuite)",
          capacity: 2,
          price: 7800,
          basePrice: 7800,
          description: "Comfortable private room with queen bed, ensuite bathroom, and quiet courtyard view.",
          amenities: ["wifi", "air_conditioning", "breakfast"],
          bookingUnit: "room",
          imageSrc: [rawImages[1] || "/assets/oran.jpg", rawImages[2] || "/assets/constantine.jpg"],
          inventoryCount: 4,
          totalInventory: 4,
        },
      ];
    }
    return [
      {
        id: `${listing.id}_standard_deluxe`,
        propertyListingId: listing.id,
        name: "Standard Deluxe Room",
        capacity: 2,
        price: listing.price || 24000,
        basePrice: listing.price || 24000,
        description: "Elegant room with king bed, marble bath, work desk, and high-speed Wi-Fi.",
        amenities: ["wifi", "air_conditioning", "breakfast"],
        bookingUnit: "room",
        imageSrc: [rawImages[0] || "/assets/hero.jpg", rawImages[1] || "/assets/oran.jpg"],
        inventoryCount: 16,
        totalInventory: 16,
      },
      {
        id: `${listing.id}_executive_suite`,
        propertyListingId: listing.id,
        name: "Executive Sea View Suite",
        capacity: 3,
        price: Math.round((listing.price || 24000) * 1.6),
        basePrice: Math.round((listing.price || 24000) * 1.6),
        description: "Spacious luxury suite with separate living area, panoramic balcony, and VIP lounge access.",
        amenities: ["wifi", "air_conditioning", "breakfast", "pool", "spa"],
        bookingUnit: "room",
        imageSrc: [rawImages[2] || "/assets/constantine.jpg", rawImages[3] || "/assets/tipaza.jpg"],
        inventoryCount: 6,
        totalInventory: 6,
      },
    ];
  }, [listing, isHostel, rawImages]);

  // Selected Room for Booking
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    availableRooms[0]?.id || ""
  );

  const selectedRoom = useMemo(() => {
    return availableRooms.find((r) => r.id === selectedRoomId) || availableRooms[0];
  }, [availableRooms, selectedRoomId]);

  // Booking Dates & Guest Count
  const today = useMemo(() => new Date(), []);
  const defaultCheckout = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d;
  }, []);

  const [dateRange, setDateRange] = useState<Range>({
    startDate: today,
    endDate: defaultCheckout,
    key: "selection",
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [guestCount, setGuestCount] = useState<number>(1);
  const [isGuestPickerOpen, setIsGuestPickerOpen] = useState(false);
  const [guestMessage, setGuestMessage] = useState<string>("");
  const [isReserving, setIsReserving] = useState(false);
  const [isMobileBookingOpen, setIsMobileBookingOpen] = useState(false);

  const durationNights = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return 1;
    const diff = differenceInCalendarDays(dateRange.endDate, dateRange.startDate);
    return diff > 0 ? diff : 1;
  }, [dateRange]);

  const nightlyRate = selectedRoom ? (selectedRoom.basePrice ?? selectedRoom.price) : (listing.price || 20000);
  const baseSubtotal = nightlyRate * durationNights;
  const serviceFee = Math.round(baseSubtotal * 0.1);
  const totalAmount = baseSubtotal + serviceFee;

  const isRequestToBook = listing.bookingApprovalMode === "request" || listing.instantBook === false;

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Property link copied to clipboard!");
    } else {
      toast.info("Link ready to share!");
    }
  };

  const handleSelectRoom = (room: RoomType) => {
    setSelectedRoomId(room.id);
    if (guestCount > room.capacity) {
      setGuestCount(room.capacity);
    }
    toast.info(`Selected: ${room.name}`);
    if (bookingWidgetRef.current) {
      bookingWidgetRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleReserveRoom = async () => {
    if (!currentUser) {
      loginModal.onOpen();
      return;
    }

    setIsReserving(true);
    try {
      await createReservation({
        userId: currentUser.id,
        listingId: listing.id,
        startDate: dateRange.startDate?.toISOString() || new Date().toISOString(),
        endDate: dateRange.endDate?.toISOString() || new Date().toISOString(),
        totalPrice: totalAmount,
        guestCount,
        nightlyPrice: nightlyRate,
        cleaningFee: 0,
        serviceFee,
        approvalMode: isRequestToBook ? "request" : "instant",
        guestMessage: guestMessage.trim() || undefined,
        selectedRoomTypeId: selectedRoom?.id,
      });

      if (isRequestToBook) {
        toast.success("Reservation request sent! Front desk will confirm within 24 hours.");
      } else {
        toast.success("Room reservation confirmed! Viewing your trips.");
      }
      setIsMobileBookingOpen(false);
      router.push("/trips");
    } catch {
      toast.error("Failed to confirm reservation. Please try again.");
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

  const amenityMap: Record<string, { label: string; icon: any }> = {
    wifi: { label: "High-Speed Wi-Fi", icon: BrandWifiIcon },
    pool: { label: "Swimming Pool", icon: CategoryPoolIcon },
    breakfast: { label: "Buffet Breakfast", icon: BrandKitchenIcon },
    reception_24_7: { label: "24/7 Front Desk", icon: BrandClockIcon },
    air_conditioning: { label: "Climate Control AC", icon: BrandSnowIcon },
    valet: { label: "Valet / Private Parking", icon: CategoryVehicleIcon },
    spa: { label: "Spa & Traditional Hammam", icon: BrandWaterIcon },
    shared_kitchen: { label: "Communal Kitchen", icon: BrandKitchenIcon },
    lockers: { label: "Secure Personal Lockers", icon: BrandShieldIcon },
    rooftop: { label: "Panoramic Rooftop Patio", icon: BrandBuildingIcon },
    coworking: { label: "Co-working Lounge", icon: BrandBuildingIcon },
    luggage_storage: { label: "Free Luggage Storage", icon: BrandDoorIcon },
    conference: { label: "Conference Center", icon: BrandBuildingIcon },
    shuttle: { label: "Airport Transfer Shuttle", icon: CategoryVehicleIcon },
  };

  return (
    <div className="pt-6 sm:pt-8 pb-28 lg:pb-12 text-primary">
      <Container className="space-y-8">
        {/* ========================================================= */}
        {/* 1. PROPERTY HEADER BLOCK                                 */}
        {/* ========================================================= */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                isHotel
                  ? "bg-primary text-white"
                  : "bg-purple-100 text-purple-900 border border-purple-200"
              }`}
            >
              {isHotel ? "Hotel & Resort" : "Backpacker Hostel"}
            </span>

            {isHotel && listing.hotelStarRating && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-bold">
                {Array.from({ length: listing.hotelStarRating }).map((_, i) => (
                  <BrandStarIcon key={i} size={13} className="text-amber-500 fill-amber-500" />
                ))}
                <span>{listing.hotelStarRating}-Star Luxury</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-semibold">
              <BrandShieldIcon size={13} className="text-emerald-700" />
              <span>Verified Algerian Hospitality</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif tracking-tight text-primary">
                {listing.title}
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-neutral-600">
                <span className="flex items-center gap-1 font-bold text-primary">
                  <BrandStarIcon size={16} className="text-accent fill-accent" />
                  <span>{listing.rating?.toFixed(2) || "4.92"}</span>
                </span>
                <span>·</span>
                <a
                  href="#reviews"
                  className="underline font-semibold text-primary hover:text-accent transition"
                >
                  {listing.reviewCount || 48} verified reviews
                </a>
                <span>·</span>
                <span className="font-semibold text-neutral-700">
                  {listing.city ? `${listing.city}, Algeria` : listing.locationValue}
                </span>
              </div>
            </div>

            {/* Share & Save */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-tertiary/80 text-xs sm:text-sm font-semibold text-primary hover:bg-neutral-100 transition cursor-pointer"
              >
                <BrandShareIcon size={16} />
                <span>Share</span>
              </button>
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-tertiary/80 text-xs sm:text-sm font-semibold text-primary hover:bg-neutral-100 transition">
                <HeartButton listingId={listing.id} currentUser={currentUser} />
                <span>Save</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. PROPERTY BENTO GALLERY                                */}
        {/* ========================================================= */}
        <div className="relative">
          {/* Desktop Mosaic */}
          <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2.5 h-[420px] rounded-3xl overflow-hidden shadow-sm">
            {/* Cover photo */}
            <div
              onClick={() => {
                setActivePhotoIndex(0);
                setIsLightboxOpen(true);
              }}
              className="col-span-2 row-span-2 relative cursor-pointer overflow-hidden group bg-neutral-100"
            >
              <Image
                src={displayImages[0]}
                alt={listing.title}
                fill
                priority
                className="object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition" />
            </div>

            {/* 4 thumbnails */}
            {displayImages.slice(1, 5).map((img, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setActivePhotoIndex(idx + 1);
                  setIsLightboxOpen(true);
                }}
                className="relative cursor-pointer overflow-hidden group bg-neutral-100"
              >
                <Image
                  src={img}
                  alt={`${listing.title} ${idx + 2}`}
                  fill
                  className="object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition" />
              </div>
            ))}
          </div>

          {/* Mobile Single Carousel */}
          <div className="md:hidden relative aspect-video rounded-2xl overflow-hidden bg-neutral-100">
            <Image
              src={displayImages[mobilePhotoIndex]}
              alt={listing.title}
              fill
              className="object-cover"
            />
            {displayImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setMobilePhotoIndex((prev) =>
                      prev === 0 ? displayImages.length - 1 : prev - 1
                    )
                  }
                  className="absolute start-2.5 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-md text-primary"
                >
                  <BrandChevronLeftIcon size={16} className="rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMobilePhotoIndex((prev) =>
                      prev === displayImages.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-md text-primary"
                >
                  <BrandChevronRightIcon size={16} className="rtl:rotate-180" />
                </button>
                <div className="absolute bottom-2.5 end-2.5 px-2 py-0.5 bg-black/70 text-white text-[11px] font-mono rounded-md">
                  {mobilePhotoIndex + 1} / {displayImages.length}
                </div>
              </>
            )}
          </div>

          {/* Lightbox button */}
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="absolute bottom-4 end-4 hidden md:flex items-center gap-2 px-3.5 py-2 bg-white/95 hover:bg-white text-primary text-xs font-bold rounded-xl shadow-md border border-tertiary transition cursor-pointer"
          >
            <BrandGridIcon size={16} />
            <span>Show all photos</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* 3. QUICK NAV BAR (Overview, Rooms, Amenities, Policies)   */}
        {/* ========================================================= */}
        <div className="sticky top-16 z-20 bg-white/90 backdrop-blur-md border-b border-tertiary/70 py-2.5 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-6 text-xs sm:text-sm font-semibold text-neutral-600 overflow-x-auto no-scrollbar">
            <a href="#rooms" className="text-primary hover:text-primary border-b-2 border-primary pb-1">
              Rooms & Rates
            </a>
            <a href="#overview" className="hover:text-primary transition pb-1">
              Property Overview
            </a>
            <a href="#amenities" className="hover:text-primary transition pb-1">
              What This Place Offers
            </a>
            <a href="#policies" className="hover:text-primary transition pb-1">
              Policies
            </a>
            <a href="#location" className="hover:text-primary transition pb-1">
              Location
            </a>
            <a href="#reviews" className="hover:text-primary transition pb-1">
              Reviews
            </a>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. MAIN SPLIT: ROOMS & CONTENT LEFT vs STICKY BOOK RIGHT  */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Main Column */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-10">
            {/* ======================================================= */}
            {/* SECTION: ROOMS & BED PICKER (Core of this page)        */}
            {/* ======================================================= */}
            <section id="rooms" className="space-y-5 scroll-mt-28">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-tertiary/60 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                    {isHostel ? "Dorm Beds & Private Rooms" : "Available Room Types"}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold font-serif text-primary">
                    Select Your Accommodation
                  </h2>
                </div>
                <p className="text-xs text-neutral-500">
                  {availableRooms.length} room configuration{availableRooms.length > 1 ? "s" : ""} available
                </p>
              </div>

              {/* Room Cards Stack */}
              <div className="space-y-4">
                {availableRooms.map((room) => {
                  const isSelected = selectedRoom?.id === room.id;
                  const roomPrice = room.basePrice ?? room.price;
                  const roomImages = room.imageSrc && room.imageSrc.length > 0 ? room.imageSrc : displayImages.slice(0, 2);

                  return (
                    <div
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
                            alt={room.name}
                            fill
                            className="object-cover group-hover:scale-105 transition duration-300"
                          />
                          <span className="absolute top-2.5 start-2.5 px-2.5 py-0.5 bg-black/70 text-white text-[11px] font-semibold rounded-full">
                            {room.bookingUnit === "bed" ? "Dormitory Bed" : "Private Room"}
                          </span>
                        </div>

                        {/* Room Details */}
                        <div className="md:col-span-8 flex flex-col justify-between h-full space-y-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="text-lg sm:text-xl font-bold text-primary font-serif">
                                {room.name}
                              </h3>
                              <div className="text-end">
                                <div className="text-base sm:text-lg font-bold font-mono text-primary">
                                  {roomPrice.toLocaleString()} DZD
                                </div>
                                <div className="text-[11px] text-neutral-500">
                                  {room.bookingUnit === "bed" ? "/ bed · night" : "/ night"}
                                </div>
                              </div>
                            </div>

                            <p className="text-xs text-neutral-600 leading-relaxed">
                              {room.description}
                            </p>

                            {/* Capacity & Bed config pills */}
                            <div className="flex flex-wrap gap-2 pt-1 text-xs">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-tertiary/20 rounded-xl font-semibold text-primary">
                                <BrandUserIcon size={14} className="text-primary" />
                                <span>Up to {room.capacity} guest{room.capacity > 1 ? "s" : ""}</span>
                              </span>

                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-tertiary/20 rounded-xl font-semibold text-primary">
                                <BrandBedIcon size={14} className="text-primary" />
                                <span>
                                  {room.bookingUnit === "bed"
                                    ? "1 Bunk bed (shared)"
                                    : room.capacity > 2
                                    ? "1 King bed + 1 Sofa bed"
                                    : "1 Large King Bed"}
                                </span>
                              </span>

                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-xl font-medium text-[11px]">
                                <BrandCheckIcon size={13} className="text-emerald-700" />
                                <span>Free cancellation</span>
                              </span>
                            </div>

                            {/* Room Features */}
                            {room.amenities && room.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {room.amenities.map((amId) => {
                                  const am = amenityMap[amId];
                                  return (
                                    <span
                                      key={amId}
                                      className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-[10px] font-medium rounded-md"
                                    >
                                      {am?.label || amId}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="pt-2 flex items-center justify-between border-t border-tertiary/40">
                            <span className="text-[11px] text-neutral-500 font-medium">
                              Instant booking confirmed on DARNA
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSelectRoom(room)}
                              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-primary text-white shadow-xs"
                                  : "bg-tertiary/30 text-primary hover:bg-tertiary/60"
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <BrandCheckIcon size={15} />
                                  <span>Selected Room</span>
                                </>
                              ) : (
                                <span>Select Room</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ======================================================= */}
            {/* SECTION: PROPERTY OVERVIEW                              */}
            {/* ======================================================= */}
            <section id="overview" className="space-y-4 pt-4 border-t border-tertiary/60 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-primary">
                About this Property
              </h2>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                {listing.description ||
                  `Experience authentic Algerian hospitality at ${listing.title}. Conveniently located in ${listing.city || "Algiers"}, offering refined accommodation, dedicated guest services, and seamless access to local attractions.`}
              </p>

              {/* Highlights Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-2xl border border-tertiary/70 bg-white space-y-1">
                  <BrandClockIcon size={20} className="text-secondary" />
                  <div className="text-xs font-bold text-primary">24/7 Front Desk</div>
                  <div className="text-[11px] text-neutral-500">Concierge on duty day and night</div>
                </div>

                <div className="p-4 rounded-2xl border border-tertiary/70 bg-white space-y-1">
                  <BrandShieldIcon size={20} className="text-secondary" />
                  <div className="text-xs font-bold text-primary">Official Licensing</div>
                  <div className="text-[11px] text-neutral-500">Registered CNRC commercial property</div>
                </div>

                <div className="p-4 rounded-2xl border border-tertiary/70 bg-white space-y-1">
                  <BrandWifiIcon size={20} className="text-secondary" />
                  <div className="text-xs font-bold text-primary">Fiber Optic Wi-Fi</div>
                  <div className="text-[11px] text-neutral-500">High speed throughout all rooms</div>
                </div>
              </div>
            </section>

            {/* ======================================================= */}
            {/* SECTION: WHAT THIS PLACE OFFERS (Amenities Grid)        */}
            {/* ======================================================= */}
            <section id="amenities" className="space-y-4 pt-4 border-t border-tertiary/60 scroll-mt-28">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold font-serif text-primary">
                  What this Property Offers
                </h2>
                <p className="text-xs text-neutral-500">
                  Property-wide facilities and services available to all guests
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {propertyAmenities.slice(0, 9).map((amenityId) => {
                  const am = amenityMap[amenityId];
                  const Icon = am?.icon || BrandCheckIcon;
                  return (
                    <div
                      key={amenityId}
                      className="p-3.5 rounded-2xl border border-tertiary/70 bg-white flex items-center gap-3 text-xs font-semibold text-primary shadow-xs"
                    >
                      <Icon size={20} className="text-secondary shrink-0" />
                      <span>{am?.label || amenityId}</span>
                    </div>
                  );
                })}
              </div>

              {propertyAmenities.length > 9 && (
                <button
                  type="button"
                  onClick={() => setIsAmenitiesModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl border border-tertiary/80 text-xs font-bold text-primary hover:bg-neutral-100 transition cursor-pointer"
                >
                  Show all {propertyAmenities.length} amenities
                </button>
              )}
            </section>

            {/* ======================================================= */}
            {/* SECTION: POLICIES                                       */}
            {/* ======================================================= */}
            <section id="policies" className="space-y-4 pt-4 border-t border-tertiary/60 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-primary">
                Property Policies & House Rules
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-tertiary/70 bg-white space-y-2">
                  <div className="text-xs font-bold text-primary flex items-center gap-2">
                    <BrandClockIcon size={16} className="text-secondary" />
                    <span>Check-in & Check-out</span>
                  </div>
                  <ul className="text-xs text-neutral-600 space-y-1">
                    <li>· Check-in: from 15:00</li>
                    <li>· Check-out: until 12:00</li>
                    <li>· 24/7 keycard reception for late arrivals</li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl border border-tertiary/70 bg-white space-y-2">
                  <div className="text-xs font-bold text-primary flex items-center gap-2">
                    <BrandShieldIcon size={16} className="text-secondary" />
                    <span>Cancellation Policy</span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Flexible: Full refund for cancellations up to 48 hours before check-in date.
                  </p>
                </div>

                {isHostel && (
                  <>
                    <div className="p-5 rounded-2xl border border-tertiary/70 bg-white space-y-2">
                      <div className="text-xs font-bold text-primary flex items-center gap-2">
                        <BrandDoorIcon size={16} className="text-secondary" />
                        <span>Curfew Policy</span>
                      </div>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        No curfew · 24h keycard access for registered guests.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl border border-tertiary/70 bg-white space-y-2">
                      <div className="text-xs font-bold text-primary flex items-center gap-2">
                        <BrandUserIcon size={16} className="text-secondary" />
                        <span>Guest & Age Policy</span>
                      </div>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        All ages welcome in private rooms; minimum age 18 in shared dormitory rooms.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ======================================================= */}
            {/* SECTION: PROPERTY HOST / MANAGEMENT CARD                */}
            {/* ======================================================= */}
            <div className="p-6 rounded-3xl border border-tertiary bg-white space-y-4">
              <div className="flex items-center gap-4">
                <Avatar src={host?.image || undefined} />
                <div>
                  <h3 className="font-bold text-base text-primary">
                    Managed by {host?.name || listing.title}
                  </h3>
                  <div className="text-xs text-neutral-500">
                    Hospitality Host on DARNA · Responds within an hour
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full font-medium border border-emerald-200">
                  Identity Verified
                </span>
                <span className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full font-medium border border-blue-200">
                  Licensed Hospitality Partner
                </span>
              </div>
            </div>

            {/* ======================================================= */}
            {/* SECTION: LOCATION & MAP                                 */}
            {/* ======================================================= */}
            <section id="location" className="space-y-4 pt-4 border-t border-tertiary/60 scroll-mt-28">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold font-serif text-primary">
                  Where you&apos;ll be
                </h2>
                <p className="text-xs text-neutral-500">
                  {listing.city || "Algiers"}, {listing.locationValue || "Algeria"}
                </p>
              </div>

              <div className="rounded-3xl overflow-hidden border border-tertiary shadow-xs h-[340px] relative">
                <Map center={listing.latlng || [36.7538, 3.0588]} />
              </div>
            </section>

            {/* ======================================================= */}
            {/* SECTION: REVIEWS                                        */}
            {/* ======================================================= */}
            <section id="reviews" className="space-y-6 pt-4 border-t border-tertiary/60 scroll-mt-28">
              <div className="flex items-center gap-2">
                <BrandStarIcon size={22} className="text-accent fill-accent" />
                <h2 className="text-2xl font-bold font-serif text-primary">
                  {listing.rating?.toFixed(2) || "4.92"} · {reviews.length || 48} reviews
                </h2>
              </div>

              {/* Rating metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-tertiary/15 p-4 rounded-2xl border border-tertiary/50 text-xs">
                <div>
                  <div className="font-bold text-primary">Cleanliness</div>
                  <div className="font-mono text-secondary font-bold">4.9 / 5.0</div>
                </div>
                <div>
                  <div className="font-bold text-primary">Staff & Reception</div>
                  <div className="font-mono text-secondary font-bold">5.0 / 5.0</div>
                </div>
                <div>
                  <div className="font-bold text-primary">Location</div>
                  <div className="font-mono text-secondary font-bold">4.8 / 5.0</div>
                </div>
                <div>
                  <div className="font-bold text-primary">Value for Money</div>
                  <div className="font-mono text-secondary font-bold">4.9 / 5.0</div>
                </div>
              </div>

              {/* Review snippets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    name: "Yacine B.",
                    date: "September 2026",
                    comment: "Splendid experience in Algiers. Room was immaculately clean, front desk was exceptionally helpful with recommendations, and breakfast was hearty.",
                  },
                  {
                    name: "Sarah M.",
                    date: "August 2026",
                    comment: "Great location and wonderful atmosphere. The room configuration gave our family plenty of space. Will definitely book again on DARNA.",
                  },
                ].map((rev, i) => (
                  <div key={i} className="p-5 rounded-2xl border border-tertiary/70 bg-white space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">{rev.name}</span>
                      <span className="text-neutral-400 text-[11px]">{rev.date}</span>
                    </div>
                    <p className="text-neutral-600 leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ======================================================= */}
          {/* RIGHT COLUMN: STICKY ROOM BOOKING WIDGET               */}
          {/* ======================================================= */}
          <div ref={bookingWidgetRef} className="lg:col-span-5 xl:col-span-4 sticky top-28 space-y-4">
            <div className="p-6 rounded-3xl border border-tertiary/80 bg-white shadow-xl space-y-5">
              {/* Selected Room Header */}
              <div className="space-y-1 pb-3 border-b border-tertiary/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                  Selected Accommodation
                </span>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-primary font-serif">
                    {selectedRoom?.name || "Select a Room"}
                  </h3>
                  <div className="text-end shrink-0">
                    <div className="text-base font-bold font-mono text-primary">
                      {nightlyRate.toLocaleString()} DZD
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {selectedRoom?.bookingUnit === "bed" ? "per bed / night" : "per room / night"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Date & Guest Input Box */}
              <div className="border border-tertiary rounded-2xl overflow-hidden divide-y divide-tertiary text-xs">
                {/* Date Selection button */}
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen((prev) => !prev)}
                  className="w-full grid grid-cols-2 p-3 text-start hover:bg-neutral-50 transition cursor-pointer"
                >
                  <div>
                    <span className="block font-bold text-[10px] text-neutral-500 uppercase">
                      Check-in
                    </span>
                    <span className="font-semibold text-primary">
                      {dateRange.startDate ? format(dateRange.startDate, "MMM d, yyyy") : "Add date"}
                    </span>
                  </div>
                  <div className="border-s border-tertiary ps-3">
                    <span className="block font-bold text-[10px] text-neutral-500 uppercase">
                      Checkout
                    </span>
                    <span className="font-semibold text-primary">
                      {dateRange.endDate ? format(dateRange.endDate, "MMM d, yyyy") : "Add date"}
                    </span>
                  </div>
                </button>

                {/* Calendar Drawer */}
                {isCalendarOpen && (
                  <div className="p-2 bg-white flex justify-center border-t border-tertiary/50 animate-in fade-in">
                    <Calendar
                      value={dateRange}
                      onChange={(val) => setDateRange(val.selection)}
                      minDate={new Date()}
                    />
                  </div>
                )}

                {/* Guest / Unit count selector */}
                <div className="p-3">
                  <div
                    onClick={() => setIsGuestPickerOpen((prev) => !prev)}
                    className="cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <span className="block font-bold text-[10px] text-neutral-500 uppercase">
                        {selectedRoom?.bookingUnit === "bed" ? "Beds Count" : "Guests"}
                      </span>
                      <span className="font-semibold text-primary">
                        {guestCount} {selectedRoom?.bookingUnit === "bed" ? (guestCount === 1 ? "bed" : "beds") : (guestCount === 1 ? "guest" : "guests")}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-neutral-500">
                      {isGuestPickerOpen ? "Done" : "Change"}
                    </span>
                  </div>

                  {isGuestPickerOpen && (
                    <div className="pt-3 border-t border-tertiary/40 mt-2">
                      <Counter
                        title={selectedRoom?.bookingUnit === "bed" ? "Number of beds" : "Total travelers"}
                        subtitle={`Maximum capacity: ${selectedRoom?.capacity || 2}`}
                        value={guestCount}
                        onChange={(v) => setGuestCount(Math.min(v, selectedRoom?.capacity || 4))}
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
                    <span className="font-bold block text-amber-950">Host Approval Required</span>
                    <p className="text-[11px] text-amber-800 leading-snug">
                      Front desk reviews availability and confirms within 24 hours.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 text-emerald-900 text-xs">
                  <InstantBookingIcon size={18} className="text-emerald-700 shrink-0" />
                  <span className="font-semibold text-emerald-900 text-[11px]">Instant Confirmation Available</span>
                </div>
              )}

              {/* Optional Note to Host */}
              {isRequestToBook && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">
                    Special Requests / Arrival Time (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={guestMessage}
                    onChange={(e) => setGuestMessage(e.target.value)}
                    placeholder="Estimated check-in time or room preferences..."
                    className="w-full text-xs p-2.5 rounded-xl border border-tertiary/70 bg-neutral-50 focus:bg-white focus:outline-none focus:border-primary transition resize-none"
                  />
                </div>
              )}

              {/* Reserve Button */}
              <Button
                label={isRequestToBook ? "Request to Book Room" : `Reserve ${selectedRoom?.name || "Room"}`}
                disabled={isReserving}
                onClick={handleReserveRoom}
              />

              <p className="text-center text-xs text-neutral-500">
                You won&apos;t be charged until booking confirmation
              </p>

              {/* Price Calculation Breakdown */}
              <div className="space-y-2.5 text-xs sm:text-sm text-neutral-700 border-t border-tertiary/50 pt-4">
                <div className="flex justify-between">
                  <span>
                    {nightlyRate.toLocaleString()} DZD × {durationNights} night{durationNights > 1 ? "s" : ""}
                  </span>
                  <span>{baseSubtotal.toLocaleString()} DZD</span>
                </div>

                <div className="flex justify-between">
                  <span>DARNA service fee</span>
                  <span>{serviceFee.toLocaleString()} DZD</span>
                </div>

                <div className="flex justify-between font-bold text-sm sm:text-base text-primary border-t border-tertiary/60 pt-3">
                  <span>Total</span>
                  <PriceDisplay price={totalAmount} priceClassName="font-bold text-primary" />
                </div>
              </div>

              {/* Report Property */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => toast.info("Property reported for community review")}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                >
                  <BrandFlagIcon size={14} />
                  <span>Report this property</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. SIMILAR PROPERTIES CAROUSEL                           */}
        {/* ========================================================= */}
        {similarListings.length > 0 && (
          <div className="pt-8 border-t border-tertiary/60 space-y-4">
            <h2 className="text-2xl font-bold font-serif text-primary">
              Similar Stays & Hotels in Algeria
            </h2>
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
            <div className="text-xs font-bold text-primary truncate max-w-[180px]">
              {selectedRoom?.name}
            </div>
            <div className="text-xs font-mono font-bold text-primary">
              {nightlyRate.toLocaleString()} DZD <span className="text-[10px] font-normal text-neutral-500">/ night</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (bookingWidgetRef.current) {
                bookingWidgetRef.current.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-sm hover:bg-primary/95 transition"
          >
            {isRequestToBook ? "Request Room" : "Reserve"}
          </button>
        </div>

        {/* ========================================================= */}
        {/* LIGHTBOX MODAL                                           */}
        {/* ========================================================= */}
        {isLightboxOpen && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-white text-xs font-semibold">
              <span>
                {activePhotoIndex + 1} / {displayImages.length}
              </span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <BrandCloseIcon size={20} />
              </button>
            </div>

            <div className="relative flex-1 max-h-[75vh] my-auto flex items-center justify-center">
              <div className="relative w-full max-w-4xl h-full aspect-video">
                <Image
                  src={displayImages[activePhotoIndex]}
                  alt="Property photo"
                  fill
                  className="object-contain"
                />
              </div>

              {/* Prev / Next buttons */}
              <button
                type="button"
                onClick={() =>
                  setActivePhotoIndex((prev) =>
                    prev === 0 ? displayImages.length - 1 : prev - 1
                  )
                }
                className="absolute start-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/40 text-white rounded-full transition cursor-pointer"
              >
                <BrandChevronLeftIcon size={22} className="rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setActivePhotoIndex((prev) =>
                    prev === displayImages.length - 1 ? 0 : prev + 1
                  )
                }
                className="absolute end-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/40 text-white rounded-full transition cursor-pointer"
              >
                <BrandChevronRightIcon size={22} className="rtl:rotate-180" />
              </button>
            </div>

            {/* Thumbnail Strip */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
              {displayImages.map((src, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`relative w-14 h-10 rounded-lg overflow-hidden border-2 transition ${
                    activePhotoIndex === idx ? "border-white scale-105" : "border-transparent opacity-60"
                  }`}
                >
                  <Image src={src} alt="Thumbnail" fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
