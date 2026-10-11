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
import { Flag, X } from "lucide-react";

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

  const [dateRange, setDateRange] = useState<Range>({
    startDate: new Date(),
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    key: "selection",
  });

  const [guestCount, setGuestCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const durationDays = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return 1;
    const diff = differenceInCalendarDays(dateRange.endDate, dateRange.startDate);
    return diff > 0 ? diff : 1;
  }, [dateRange]);

  const basePriceTotal = listing.price * durationDays;
  const cleaningFee = listing.category === "home" ? 3500 : 0;
  const serviceFee = Math.round(basePriceTotal * 0.1);
  const totalPrice = basePriceTotal + cleaningFee + serviceFee;

  const handleReserve = async () => {
    if (!currentUser) {
      loginModal.onOpen();
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
        nightlyPrice: listing.price,
        cleaningFee,
        serviceFee,
      });

      toast.success("Reservation confirmed! Viewing your trips.");
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
              price={listing.price}
              period={`/ ${periodLabel}`}
              priceClassName="text-xl sm:text-2xl font-bold text-primary"
            />
          </div>
          <div className="text-xs font-semibold text-neutral-600">
            ★ {listing.rating?.toFixed(2) || "4.95"} ({listing.reviewCount || 34})
          </div>
        </div>

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

        {/* Reserve Button */}
        <Button
          label="Reserve"
          disabled={isLoading}
          onClick={handleReserve}
        />

        <p className="text-center text-xs text-neutral-500">
          You won't be charged yet
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
            <Flag size={14} />
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
          Reserve
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
              <h3 className="font-bold text-base text-primary">Confirm Reservation</h3>
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition btn-press"
                aria-label="Close"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            <Calendar
              value={dateRange}
              onChange={(val) => setDateRange(val.selection)}
            />

            <Counter
              title="Guests / Passengers"
              subtitle="Total travelers"
              value={guestCount}
              onChange={(v) => setGuestCount(v)}
            />

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
              label="Complete Reservation"
              disabled={isLoading}
              onClick={handleReserve}
            />
          </div>
        </div>
      )}
    </>
  );
}
