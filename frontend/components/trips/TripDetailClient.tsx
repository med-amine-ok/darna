"use client";

import React, { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Link, useRouter } from "@/navigation";
import { Trip, User, Organization } from "@/types";
import { getTripCoordinates } from "@/lib/mock-data/trips";
import PriceDisplay from "@/components/common/PriceDisplay";
import Container from "@/components/Container";
import { createReservation } from "@/lib/data/reservations";
import { toast } from "react-toastify";
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

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[280px] bg-tertiary/20 animate-pulse rounded-2xl flex items-center justify-center text-primary/60 text-xs font-semibold">
      Loading expedition location map...
    </div>
  ),
});

interface TripDetailClientProps {
  trip: Trip;
  currentUser?: User | null;
}

export default function TripDetailClient({
  trip,
  currentUser,
}: TripDetailClientProps) {
  const router = useRouter();

  // Booking widget state
  const [selectedDate, setSelectedDate] = useState<string>(
    trip.departureDates?.[0] || new Date().toISOString().split("T")[0]
  );
  const [guestCount, setGuestCount] = useState<number>(trip.minGroupSize || 2);
  const [guestMessage, setGuestMessage] = useState<string>("");
  const [isBooking, setIsBooking] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [activePhoto, setActivePhoto] = useState<number>(0);

  const agency = trip.organization;
  const nights = Math.max(1, trip.durationDays - 1);
  const agencyApprovalMode = agency?.bookingApprovalMode || "instant";

  // Financial calculations
  const subtotal = trip.pricePerPerson * guestCount;
  const serviceFee = 0; // DARNA 0 commission promotion for travelers
  const totalPrice = subtotal + serviceFee;

  // Handle booking reservation
  const handleBookTrip = async () => {
    if (!currentUser) {
      toast.info("Please sign in to book your expedition.");
      router.push(`/login?callbackUrl=/trips/${trip.id}`);
      return;
    }

    setIsBooking(true);
    try {
      // Calculate end date based on duration
      const startDateObj = new Date(selectedDate);
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + trip.durationDays);

      const reservation = await createReservation({
        userId: currentUser.id,
        tripId: trip.id,
        listingId: trip.id,
        startDate: selectedDate,
        endDate: endDateObj.toISOString().split("T")[0],
        totalPrice,
        guestCount,
        nightlyPrice: trip.pricePerPerson,
        cleaningFee: 0,
        serviceFee: 0,
        approvalMode: agencyApprovalMode,
        guestMessage: guestMessage.trim() || undefined,
        paymentMethod: "CIB / Edahabia Card",
      });

      if (agencyApprovalMode === "request") {
        toast.success(
          "Trip booking request sent to " +
            (agency?.name || "agency") +
            "! They have 24 hours to review."
        );
      } else {
        toast.success("Expedition successfully reserved! Pack your bags for Algeria.");
      }

      router.push("/reservations");
    } catch {
      toast.error("Failed to book trip. Please check details.");
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
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-primary transition"
          >
            <BrandChevronLeftIcon size={16} strokeWidth={2.2} />
            <span>Back to All Circuits</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toast.info("Link copied to clipboard.")}
              className="p-2 rounded-xl bg-white border border-tertiary/70 text-neutral-600 hover:text-primary transition shadow-2xs cursor-pointer"
              title="Share circuit"
            >
              <BrandShareIcon size={16} />
            </button>
            <button
              type="button"
              onClick={() => toast.info("Expedition saved to favorites.")}
              className="p-2 rounded-xl bg-white border border-tertiary/70 text-neutral-600 hover:text-rose-500 transition shadow-2xs cursor-pointer"
              title="Save to favorites"
            >
              <BrandHeartIcon size={16} />
            </button>
          </div>
        </div>

        {/* Title Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <BrandCompassIcon size={13} />
              <span>Agency Curated Expedition</span>
            </span>

            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center gap-1.5">
              <BrandCalendarIcon size={13} />
              <span>
                {trip.durationDays} Days / {nights} Nights
              </span>
            </span>

            <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-semibold flex items-center gap-1.5">
              <BrandUsersIcon size={13} />
              <span>
                Group: {trip.minGroupSize || 2}–{trip.maxGroupSize} travelers
              </span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-primary leading-tight">
            {trip.title}
          </h1>

          <div className="flex items-center gap-4 text-xs sm:text-sm text-neutral-600 flex-wrap pt-1">
            <div className="flex items-center gap-1 font-semibold text-primary">
              <BrandPinIcon size={16} strokeWidth={2} className="text-secondary shrink-0" />
              <span>{trip.city}, Algeria</span>
            </div>

            {trip.rating && (
              <div className="flex items-center gap-1">
                <BrandStarIcon size={15} className="text-accent fill-accent" />
                <span className="font-bold text-primary">{trip.rating.toFixed(2)}</span>
                <span className="text-neutral-400">({trip.reviewsCount || 0} reviews)</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-neutral-500">
              <BrandBuildingIcon size={15} className="text-neutral-400" />
              <span>Organized by </span>
              <strong className="text-primary font-semibold">
                {agency?.name || "Atlas Escapes Tourism SARL"}
              </strong>
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
                  alt={`${trip.title} - photo ${i + 2}`}
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
                  <BrandCompassIcon size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-serif text-lg font-bold text-primary">
                      {agency?.name || "Atlas Escapes Tourism SARL"}
                    </h3>
                    <BrandShieldIcon size={16} className="text-emerald-600" />
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Licensed Algerian Tourism Operator · License #
                    {agency?.businessRegistrationNumber || "DZ-ALG-2021-B-89412"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-neutral-600 mt-2 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <BrandStarIcon size={12} className="text-accent" />
                      <span>4.94 Agency Rating</span>
                    </span>
                    <span>·</span>
                    <span>100% Certified Local Guides</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/agencies/${agency?.id || "org_atlas_escapes"}`}
                className="hidden sm:inline-flex px-4 py-2 rounded-xl border border-tertiary text-xs font-bold text-primary hover:bg-neutral-50 transition shrink-0"
              >
                View Agency Profile
              </Link>
            </div>

            {/* Overview Description */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary">
                About this Expedition
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
                    Day-by-Day Itinerary
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                    {trip.itinerary?.length || trip.durationDays} days of guided immersion across Algerian natural wonders.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setExpandedDay(expandedDay === null ? 1 : null)
                  }
                  className="text-xs font-bold text-primary hover:text-secondary underline"
                >
                  {expandedDay === null ? "Expand All" : "Collapse"}
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
                        className="w-full p-5 flex items-center justify-between gap-4 text-start hover:bg-neutral-50/50 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {dayItem.day}
                          </span>
                          <div>
                            <span className="block text-[10px] font-bold text-secondary uppercase tracking-wider">
                              Day {dayItem.day}
                            </span>
                            <span className="font-serif text-base font-bold text-primary">
                              {dayItem.title}
                            </span>
                          </div>
                        </div>

                        <div className="text-neutral-400">
                          {isExpanded ? <BrandChevronUpIcon size={18} strokeWidth={2} /> : <BrandChevronDownIcon size={18} strokeWidth={2} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-tertiary/40 bg-neutral-50/30 text-xs sm:text-sm">
                          <p className="text-neutral-600 leading-relaxed">
                            {dayItem.description}
                          </p>

                          {/* Day Activities */}
                          {dayItem.activities && dayItem.activities.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                                Key Highlights & Activities:
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
                                <BrandKitchenIcon size={15} className="text-secondary shrink-0" />
                                <span>{dayItem.meals}</span>
                              </div>
                            )}
                            {dayItem.accommodation && (
                              <div className="flex items-center gap-2 text-neutral-600">
                                <BrandBedIcon size={15} className="text-secondary shrink-0" />
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
                What&apos;s Included
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Inclusions */}
                <div className="p-6 bg-emerald-50/40 rounded-3xl border border-emerald-200/80 space-y-3">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BrandCheckIcon size={15} strokeWidth={2.5} className="text-emerald-600" />
                    <span>Included in this Expedition</span>
                  </span>
                  <ul className="space-y-2.5 text-xs text-neutral-700">
                    {trip.inclusions?.map((inc, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <BrandCheckIcon size={14} strokeWidth={2.5} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Exclusions */}
                <div className="p-6 bg-rose-50/40 rounded-3xl border border-rose-200/80 space-y-3">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BrandCloseIcon size={15} strokeWidth={2.2} className="text-rose-600" />
                    <span>Not Included</span>
                  </span>
                  <ul className="space-y-2.5 text-xs text-neutral-700">
                    {trip.exclusions?.map((exc, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <BrandCloseIcon size={14} strokeWidth={2.2} className="text-rose-500 shrink-0 mt-0.5" />
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
                Meeting Point & Arrival
              </h2>
              <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-2xs flex items-start gap-3 text-xs sm:text-sm">
                <BrandPinIcon size={20} strokeWidth={2} className="text-secondary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-primary block">
                    {trip.meetingPoint}
                  </span>
                  <p className="text-neutral-500 text-xs mt-1">
                    The agency team meets all confirmed participants upon arrival. Detailed airport logistics and flight recommendation coordination will be sent to your DARNA inbox after booking.
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
                Cancellation Policy
              </h2>
              <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-2xs space-y-1 text-xs">
                <span className="font-bold text-primary uppercase tracking-wider block capitalize">
                  {trip.cancellationPolicy} Policy
                </span>
                <p className="text-neutral-600">
                  {trip.cancellationPolicy === "flexible"
                    ? "Full refund up to 14 days before departure. Cancellations within 14 days are subject to local park permit fees."
                    : trip.cancellationPolicy === "moderate"
                    ? "Full refund up to 30 days before departure. 50% refund between 30 and 15 days before departure."
                    : "Strict: 50% refund up to 30 days before departure due to advance National Park permits and bivouac reservations."}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Booking Card */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="bg-white rounded-3xl border border-tertiary/80 p-6 sm:p-7 shadow-xl space-y-6">
              {/* Header Price */}
              <div className="flex items-baseline justify-between border-b border-tertiary/40 pb-4">
                <div>
                  <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Price per person
                  </span>
                  <PriceDisplay
                    price={trip.pricePerPerson}
                    period="/ traveler"
                    priceClassName="text-2xl font-black text-primary"
                  />
                </div>
                <div className="text-end">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    All-Inclusive Circuit
                  </span>
                </div>
              </div>



              {/* Departure Date Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Select Departure Date
                </label>
                {trip.departureDates && trip.departureDates.length > 0 ? (
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 border border-tertiary/80 rounded-2xl text-xs sm:text-sm font-semibold text-primary focus:outline-none focus:border-primary"
                  >
                    {trip.departureDates.map((date) => (
                      <option key={date} value={date}>
                        Departure: {date} ({trip.durationDays} Days)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 border border-tertiary/80 rounded-2xl text-xs sm:text-sm font-semibold text-primary"
                  />
                )}
              </div>

              {/* Travelers Stepper */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Travelers
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    Max group size: {trip.maxGroupSize}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-tertiary/80">
                  <div className="text-xs">
                    <span className="font-bold text-primary block">Adults / Youth</span>
                    <span className="text-neutral-500 text-[11px]">All ages welcome</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={guestCount <= (trip.minGroupSize || 1)}
                      onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                      className="w-8 h-8 rounded-full border border-tertiary bg-white flex items-center justify-center font-bold text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 transition"
                    >
                      –
                    </button>
                    <span className="font-bold text-base text-primary w-5 text-center">
                      {guestCount}
                    </span>
                    <button
                      type="button"
                      disabled={guestCount >= trip.maxGroupSize}
                      onClick={() => setGuestCount(Math.min(trip.maxGroupSize, guestCount + 1))}
                      className="w-8 h-8 rounded-full border border-tertiary bg-white flex items-center justify-center font-bold text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Optional message to agency */}
              {agencyApprovalMode === "request" && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Note to Agency (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={guestMessage}
                    onChange={(e) => setGuestMessage(e.target.value)}
                    placeholder="Dietary requirements, trekking experience, or arrival flights..."
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="space-y-2.5 pt-3 border-t border-tertiary/40 text-xs">
                <div className="flex items-center justify-between text-neutral-600">
                  <span>
                    {trip.pricePerPerson.toLocaleString()} DZD × {guestCount} travelers
                  </span>
                  <span className="font-semibold">{subtotal.toLocaleString()} DZD</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                  <span>DARNA Platform Fee</span>
                  <span className="text-emerald-700 font-bold">0 DZD (Free)</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-primary pt-2 border-t border-tertiary/40">
                  <span>Total (TTC)</span>
                  <PriceDisplay price={totalPrice} priceClassName="text-lg font-black text-primary" />
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleBookTrip}
                disabled={isBooking}
                className="w-full py-3.5 px-4 bg-primary hover:bg-primary/95 text-white rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer btn-press disabled:opacity-60"
              >
                <BrandCompassIcon size={17} strokeWidth={2} className="text-tertiary" />
                <span>
                  {isBooking
                    ? "Processing..."
                    : agencyApprovalMode === "request"
                    ? "Request Expedition Spot"
                    : "Reserve Expedition"}
                </span>
              </button>

              <div className="text-center text-[11px] text-neutral-400">
                You won&apos;t be charged until the agency verifies group availability.
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
