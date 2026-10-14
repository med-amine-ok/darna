"use client";

import React, { useState, useMemo } from "react";
import { Range } from "react-date-range";
import { Listing, User } from "@/types";
import Calendar from "@/components/inputs/Calendar";
import Counter from "@/components/inputs/Counter";
import PriceDisplay from "@/components/common/PriceDisplay";
import Button from "@/components/Button";
import { useLoginModal } from "@/hook/useLoginModal";
import { createReservation } from "@/lib/data/reservations";
import { useRouter } from "@/navigation";
import { toast } from "react-toastify";
import { differenceInCalendarDays, format } from "date-fns";
import {
  BrandStarIcon,
  BrandFlagIcon,
  BrandCloseIcon,
  BrandAlertCircleIcon,
  BrandClockIcon,
} from "@/components/icons";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

interface ListingReservationProps {
  listing: Listing;
  currentUser?: User | null;
}

export default function ListingReservation({
  listing,
  currentUser,
}: ListingReservationProps) {
  const router = useRouter();
  const loginModal = useLoginModal();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const tListing = useTranslations("listing");

  const rawSearchStart = searchParams?.get("startDate") || searchParams?.get("checkIn");
  const rawSearchEnd = searchParams?.get("endDate") || searchParams?.get("checkOut");

  const listingStart = useMemo(
    () => (listing.availableFrom ? new Date(listing.availableFrom) : null),
    [listing.availableFrom]
  );
  const listingEnd = useMemo(
    () => (listing.availableTo ? new Date(listing.availableTo) : null),
    [listing.availableTo]
  );

  // Compute overlap & partial availability status (Section 6)
  const partialAvailabilityInfo = useMemo(() => {
    if (!rawSearchStart || !rawSearchEnd || !listingStart || !listingEnd) return null;
    const sStart = new Date(rawSearchStart);
    const sEnd = new Date(rawSearchEnd);
    if (isNaN(sStart.getTime()) || isNaN(sEnd.getTime()) || sStart >= sEnd) return null;

    const overlapStartTime = Math.max(listingStart.getTime(), sStart.getTime());
    const overlapEndTime = Math.min(listingEnd.getTime(), sEnd.getTime());

    if (overlapStartTime < overlapEndTime) {
      const isPartial =
        listingStart.getTime() > sStart.getTime() || listingEnd.getTime() < sEnd.getTime();
      if (isPartial) {
        return {
          searchedStart: sStart,
          searchedEnd: sEnd,
          overlapStart: new Date(overlapStartTime),
          overlapEnd: new Date(overlapEndTime),
        };
      }
    }
    return null;
  }, [rawSearchStart, rawSearchEnd, listingStart, listingEnd]);

  // Initial dateRange derived from available intersection
  const initialRange = useMemo<Range>(() => {
    if (partialAvailabilityInfo) {
      return {
        startDate: partialAvailabilityInfo.overlapStart,
        endDate: partialAvailabilityInfo.overlapEnd,
        key: "selection",
      };
    }
    if (rawSearchStart && rawSearchEnd) {
      const sStart = new Date(rawSearchStart);
      const sEnd = new Date(rawSearchEnd);
      if (!isNaN(sStart.getTime()) && !isNaN(sEnd.getTime()) && sStart < sEnd) {
        return { startDate: sStart, endDate: sEnd, key: "selection" };
      }
    }
    const today = new Date();
    const defaultStart = listingStart && listingStart > today ? listingStart : today;
    const defaultEnd = new Date(defaultStart.getTime() + 2 * 24 * 60 * 60 * 1000);
    return {
      startDate: defaultStart,
      endDate: listingEnd && defaultEnd > listingEnd ? listingEnd : defaultEnd,
      key: "selection",
    };
  }, [partialAvailabilityInfo, rawSearchStart, rawSearchEnd, listingStart, listingEnd]);

  const [dateRange, setDateRange] = useState<Range>(initialRange);

  React.useEffect(() => {
    if (partialAvailabilityInfo) {
      setDateRange({
        startDate: partialAvailabilityInfo.overlapStart,
        endDate: partialAvailabilityInfo.overlapEnd,
        key: "selection",
      });
    }
  }, [partialAvailabilityInfo]);

  const calendarMinDate = listingStart && listingStart > new Date() ? listingStart : new Date();
  const calendarMaxDate = listingEnd || undefined;

  const [guestCount, setGuestCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>(
    listing.roomTypes?.[0]?.id || ""
  );

  const selectedRoomType = useMemo(() => {
    if (!listing.roomTypes || listing.roomTypes.length === 0) return null;
    return listing.roomTypes.find((r) => r.id === selectedRoomTypeId) || listing.roomTypes[0];
  }, [listing.roomTypes, selectedRoomTypeId]);

  const durationDays = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return 1;
    const diff = differenceInCalendarDays(dateRange.endDate, dateRange.startDate);
    return diff > 0 ? diff : 1;
  }, [dateRange]);

  const activeNightlyPrice = selectedRoomType ? (selectedRoomType.basePrice ?? selectedRoomType.price) : listing.price;
  const basePriceTotal = activeNightlyPrice * durationDays;
  const cleaningFee = listing.category === "home" && !listing.roomTypes ? 3500 : 0;
  const serviceFee = Math.round(basePriceTotal * 0.1);
  const totalPrice = basePriceTotal + cleaningFee + serviceFee;

  const [guestMessage, setGuestMessage] = useState<string>("");
  const isRequestToBook = listing.bookingApprovalMode === "request" || listing.instantBook === false;

  const handleReserve = async () => {
    if (!currentUser) {
      loginModal.onOpen();
      return;
    }

    // Guard against overbooking outside true availability
    if (listingStart && dateRange.startDate && dateRange.startDate < listingStart) {
      toast.error(
        tListing("outsideAvailabilityError", {
          range: `${format(listingStart, "MMM d, yyyy")} – ${listingEnd ? format(listingEnd, "MMM d, yyyy") : ""}`,
        })
      );
      return;
    }
    if (listingEnd && dateRange.endDate && dateRange.endDate > listingEnd) {
      toast.error(
        tListing("outsideAvailabilityError", {
          range: `${listingStart ? format(listingStart, "MMM d, yyyy") : ""} – ${format(listingEnd, "MMM d, yyyy")}`,
        })
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await createReservation({
        userId: currentUser.id,
        listingId: listing.id,
        startDate: dateRange.startDate?.toISOString() || new Date().toISOString(),
        endDate: dateRange.endDate?.toISOString() || new Date().toISOString(),
        totalPrice,
        guestCount,
        nightlyPrice: activeNightlyPrice,
        cleaningFee,
        serviceFee,
        approvalMode: isRequestToBook ? "request" : "instant",
        guestMessage: guestMessage.trim() || undefined,
        selectedRoomTypeId: selectedRoomType?.id,
      });

      if (isRequestToBook) {
        toast.success("Booking request submitted! The host has 24 hours to review and accept.");
      } else {
        toast.success("Reservation confirmed! Viewing your trips.");
      }
      setIsMobileSheetOpen(false);
      router.push("/trips");
    } catch (err) {
      toast.error("Could not complete booking. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const periodLabel =
    listing.category === "vehicle"
      ? "day"
      : listing.category === "experience"
      ? "person"
      : "night";

  return (
    <>
      {/* 1. Desktop Sticky Sidebar Card */}
      <div className="hidden lg:block sticky top-28 w-full max-w-sm bg-white rounded-3xl p-6 border border-tertiary/60 shadow-darna-widget hover:shadow-darna-modal transition-shadow duration-300 space-y-5">
        {/* Price & Rating Header */}
        <div className="flex items-baseline justify-between border-b border-tertiary/40 pb-4">
          <div>
            <PriceDisplay
              price={activeNightlyPrice}
              period={`/ ${selectedRoomType?.bookingUnit === "bed" ? "bed" : periodLabel}`}
              priceClassName="text-xl sm:text-2xl font-bold text-primary"
            />
          </div>
          <div className="text-xs font-semibold text-neutral-600 flex items-center gap-1">
            <BrandStarIcon size={12} className="text-accent fill-accent" />
            <span>{listing.rating?.toFixed(2) || "4.95"} ({listing.reviewCount || 34})</span>
          </div>
        </div>

        {/* Room / Bed Type Selector (Section 2: Hotel & Hostel) */}
        {listing.roomTypes && listing.roomTypes.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-primary">
              Select {listing.businessCategory === "hostel" ? "Bed or Room Type" : "Room / Suite Type"}
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {listing.roomTypes.map((rt) => {
                const isSelected = selectedRoomType?.id === rt.id;
                return (
                  <div
                    key={rt.id}
                    onClick={() => setSelectedRoomTypeId(rt.id)}
                    className={`p-2.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-2xs"
                        : "border-tertiary/70 bg-neutral-50/50 hover:border-neutral-400"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <span>{rt.name}</span>
                        <span className="px-1.5 py-0.5 bg-secondary/15 text-secondary text-[10px] rounded-md font-semibold">
                          {rt.bookingUnit === "bed" ? "per bed" : "per room"}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        {rt.bedsDescription || `Capacity: ${rt.capacity} guests`} · {rt.inventoryCount ?? rt.totalInventory} units
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="text-xs font-mono font-bold text-primary">
                        {(rt.basePrice ?? rt.price).toLocaleString()} DZD
                      </div>
                      <div className="text-[10px] text-neutral-400">/ night</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Partial Availability Notice Banner (Section 6) */}
        {partialAvailabilityInfo && (
          <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in">
            <BrandAlertCircleIcon size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-amber-950">
                {tListing("partialAvailabilityNoticeTitle")}
              </p>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                {tListing("partialAvailabilityNotice", {
                  searched: `${format(partialAvailabilityInfo.searchedStart, "MMM d")} – ${format(partialAvailabilityInfo.searchedEnd, "MMM d")}`,
                  available: `${format(partialAvailabilityInfo.overlapStart, "MMM d")} – ${format(partialAvailabilityInfo.overlapEnd, "MMM d")}`,
                })}
              </p>
            </div>
          </div>
        )}

        {/* Date & Guest Input Box */}
        <div className="border border-tertiary rounded-2xl overflow-hidden divide-y divide-tertiary text-xs">
          {/* Check-in / Checkout Selector */}
          <button
            type="button"
            onClick={() => setIsCalendarOpen((prev) => !prev)}
            className="w-full grid grid-cols-2 p-3 text-start hover:bg-neutral-50 transition cursor-pointer"
          >
            <div>
              <span className="block font-bold text-[10px] text-neutral-500 uppercase">
                {listing.category === "vehicle" ? "Pickup" : "Check-in"}
              </span>
              <span className="font-semibold text-primary">
                {dateRange.startDate ? format(dateRange.startDate, "MMM d, yyyy") : "Add date"}
              </span>
            </div>
            <div className="border-s border-tertiary ps-3">
              <span className="block font-bold text-[10px] text-neutral-500 uppercase">
                {listing.category === "vehicle" ? "Return" : "Checkout"}
              </span>
              <span className="font-semibold text-primary">
                {dateRange.endDate ? format(dateRange.endDate, "MMM d, yyyy") : "Add date"}
              </span>
            </div>
          </button>

          {/* Calendar Picker Drawer */}
          {isCalendarOpen && (
            <div className="p-2 bg-white flex justify-center border-t border-tertiary/50 animate-in fade-in duration-150">
              <Calendar
                value={dateRange}
                onChange={(val) => setDateRange(val.selection)}
                minDate={calendarMinDate}
                maxDate={calendarMaxDate}
              />
            </div>
          )}

          {/* Guest Count Selector */}
          <div className="p-3">
            <div
              onClick={() => setIsGuestOpen((prev) => !prev)}
              className="cursor-pointer flex justify-between items-center"
            >
              <div>
                <span className="block font-bold text-[10px] text-neutral-500 uppercase">
                  {listing.category === "vehicle" ? "Passengers" : "Guests"}
                </span>
                <span className="font-semibold text-primary">
                  {guestCount} {guestCount === 1 ? "guest" : "guests"}
                </span>
              </div>
              <span className="text-xs font-bold text-neutral-500">
                {isGuestOpen ? "Close" : "Change"}
              </span>
            </div>

            {isGuestOpen && (
              <div className="pt-3 border-t border-tertiary/40 mt-2">
                <Counter
                  title="Total travelers"
                  subtitle={`Max ${listing.guestCount || listing.seats || 6}`}
                  value={guestCount}
                  onChange={(v) => setGuestCount(v)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Host Approval / Instant Booking Mode Indicator */}
        {isRequestToBook ? (
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs">
            <BrandClockIcon size={16} strokeWidth={1.8} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block text-amber-950">Host Approval Required</span>
              <p className="text-[11px] text-amber-800 leading-snug">
                You won&apos;t be charged yet. The host reviews and responds within 24 hours.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 text-emerald-900 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
            <span className="font-semibold text-emerald-900 text-[11px]">Instant Confirmation Available</span>
          </div>
        )}

        {/* Optional Note to Host when in Request Mode */}
        {isRequestToBook && (
          <div className="space-y-1.5 pt-1">
            <label htmlFor="desktop-guest-msg" className="text-xs font-bold text-neutral-700 flex items-center justify-between">
              <span>Note to Host (optional)</span>
              <span className="text-[10px] text-neutral-400 font-normal">Trip purpose / arrival</span>
            </label>
            <textarea
              id="desktop-guest-msg"
              rows={2}
              value={guestMessage}
              onChange={(e) => setGuestMessage(e.target.value)}
              placeholder="Salam! Introduce yourself or share your estimated arrival time..."
              className="w-full text-xs p-2.5 rounded-xl border border-tertiary/70 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-primary transition resize-none placeholder:text-neutral-400"
            />
          </div>
        )}

        {/* Reserve Button */}
        <Button
          label={isRequestToBook ? "Request to Book" : "Reserve"}
          disabled={isLoading}
          onClick={handleReserve}
        />

        <p className="text-center text-xs text-neutral-500">
          {isRequestToBook ? "Free cancellation if host does not respond within 24h" : "You won't be charged yet"}
        </p>

        {/* Price Breakdown Calculation */}
        <div className="space-y-2.5 text-xs sm:text-sm text-neutral-700 border-t border-tertiary/40 pt-4">
          <div className="flex justify-between">
            <span>
              <PriceDisplay price={listing.price} showEur={false} /> × {durationDays} {periodLabel}s
            </span>
            <span>{basePriceTotal.toLocaleString()} DZD</span>
          </div>

          {cleaningFee > 0 && (
            <div className="flex justify-between">
              <span>Cleaning fee</span>
              <span>{cleaningFee.toLocaleString()} DZD</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>DARNA service fee</span>
            <span>{serviceFee.toLocaleString()} DZD</span>
          </div>

          <div className="flex justify-between font-bold text-sm sm:text-base text-primary border-t border-tertiary/60 pt-3">
            <span>Total</span>
            <PriceDisplay price={totalPrice} priceClassName="font-bold text-primary" />
          </div>
        </div>

        {/* Report Listing */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => toast.info("Listing reported for community review")}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition cursor-pointer btn-press"
          >
            <BrandFlagIcon size={14} strokeWidth={1.8} />
            <span>Report this listing</span>
          </button>
        </div>
      </div>

      {/* 2. Mobile Sticky Bottom Bar & Drawer */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-tertiary/80 p-3.5 shadow-2xl flex items-center justify-between pb-[calc(0.8rem+env(safe-area-inset-bottom))]">
        <div>
          <PriceDisplay
            price={listing.price}
            period={`/ ${periodLabel}`}
            priceClassName="font-bold text-sm text-primary"
          />
          <div className="text-[11px] text-neutral-500">
            {dateRange.startDate && dateRange.endDate
              ? `${format(dateRange.startDate, "MMM d")} – ${format(dateRange.endDate, "MMM d")}`
              : "Select dates"}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileSheetOpen(true)}
          className="bg-accent text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md cursor-pointer hover:opacity-95"
        >
          {isRequestToBook ? "Request" : "Reserve"}
        </button>
      </div>

      {/* Mobile Reservation Modal Sheet */}
      {isMobileSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="lg:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex flex-col justify-end"
        >
          <div className="bg-white rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-tertiary/50 pb-3">
              <h3 className="font-bold text-base text-primary">
                {isRequestToBook ? "Request Booking" : "Confirm Reservation"}
              </h3>
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition btn-press"
                aria-label="Close"
              >
                <BrandCloseIcon size={18} strokeWidth={2.2} />
              </button>
            </div>

            {/* Host Approval Notice */}
            {isRequestToBook && (
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-900 text-xs">
                <BrandClockIcon size={16} strokeWidth={1.8} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-amber-950">Host Approval Required</span>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    You won&apos;t be charged yet. The host has 24 hours to accept or decline.
                  </p>
                </div>
              </div>
            )}

            {/* Partial Availability Notice in Mobile Sheet */}
            {partialAvailabilityInfo && (
              <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                <BrandAlertCircleIcon size={16} strokeWidth={1.8} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-amber-950">
                    {tListing("partialAvailabilityNoticeTitle")}
                  </p>
                  <p className="text-amber-800 leading-relaxed text-[11px]">
                    {tListing("partialAvailabilityNotice", {
                      searched: `${format(partialAvailabilityInfo.searchedStart, "MMM d")} – ${format(partialAvailabilityInfo.searchedEnd, "MMM d")}`,
                      available: `${format(partialAvailabilityInfo.overlapStart, "MMM d")} – ${format(partialAvailabilityInfo.overlapEnd, "MMM d")}`,
                    })}
                  </p>
                </div>
              </div>
            )}

            <Calendar
              value={dateRange}
              onChange={(val) => setDateRange(val.selection)}
              minDate={calendarMinDate}
              maxDate={calendarMaxDate}
            />

            <Counter
              title="Guests / Passengers"
              subtitle="Total travelers"
              value={guestCount}
              onChange={(v) => setGuestCount(v)}
            />

            {/* Optional note in mobile sheet */}
            {isRequestToBook && (
              <div className="space-y-1.5 pt-1">
                <label htmlFor="mobile-guest-msg" className="text-xs font-bold text-neutral-700 flex items-center justify-between">
                  <span>Note to Host (optional)</span>
                  <span className="text-[10px] text-neutral-400 font-normal">Trip details</span>
                </label>
                <textarea
                  id="mobile-guest-msg"
                  rows={2}
                  value={guestMessage}
                  onChange={(e) => setGuestMessage(e.target.value)}
                  placeholder="Salam! Share arrival time or notes for your host..."
                  className="w-full text-xs p-2.5 rounded-xl border border-tertiary/70 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-primary transition resize-none placeholder:text-neutral-400"
                />
              </div>
            )}

            <div className="border-t border-tertiary/40 pt-3 space-y-1.5 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Total nights / days</span>
                <span>{durationDays}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-primary">
                <span>Total amount</span>
                <PriceDisplay price={totalPrice} />
              </div>
            </div>

            <Button
              label={isRequestToBook ? "Submit Booking Request" : "Complete Reservation"}
              disabled={isLoading}
              onClick={handleReserve}
            />
          </div>
        </div>
      )}
    </>
  );
}
