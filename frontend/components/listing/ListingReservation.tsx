"use client";

import React, { useState, useMemo, useId } from "react";
import Dialog from "@/components/ui/Dialog";
import { formatDzd } from "@/lib/currency";
import { useActionError } from "@/hook/useActionError";
import { Range } from "react-date-range";
import { Listing, User } from "@/types";
import Calendar from "@/components/inputs/Calendar";
import Counter from "@/components/inputs/Counter";
import PriceDisplay from "@/components/common/PriceDisplay";
import Button from "@/components/Button";
import { useLoginModal } from "@/hook/useLoginModal";
import { createBookingAction } from "@/app/actions/bookings";
import {
  isRequestToBook as computeIsRequestToBook,
  quoteListingBooking,
  unitLabel,
  type PriceOverrides,
} from "@/lib/booking/pricing";
import { maxGuestsFor, validateListingRequest, type ListingAvailability } from "@/lib/booking/availability";
import { getStayRules } from "@/lib/booking/config";
import {
  addDaysToKey,
  formatDateKey,
  fromDateKey,
  isDateKey,
  normalizeDateKey,
  toDateKey,
  type DateKey,
} from "@/lib/booking/dates";
import { useRouter } from "@/navigation";
import { toast } from "react-toastify";
import {
  BrandStarIcon,
  BrandFlagIcon,
  BrandCloseIcon,
  BrandAlertCircleIcon,
  BrandClockIcon,
} from "@/components/icons";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { formatNumber, formatRating } from "@/lib/i18n/date-locale";

interface ListingReservationProps {
  listing: Listing;
  currentUser?: User | null;
  availability: ListingAvailability;
  priceOverrides?: PriceOverrides;
}

const maxKey = (a: DateKey, b: DateKey | null | undefined) => (b && b > a ? b : a);

export default function ListingReservation({
  listing,
  currentUser,
  availability,
  priceOverrides = {},
}: ListingReservationProps) {
  const router = useRouter();
  const openLogin = useLoginModal((s) => s.onOpen);
  const searchParams = useSearchParams();
  const locale = useLocale();
  const tListing = useTranslations("listing");
  const t = tListing;
  const tCommon = useTranslations("common");
  const errorText = useActionError();
  const baseId = useId();
  const calendarPanelId = `${baseId}-calendar`;
  const guestPanelId = `${baseId}-guests`;

  const isExperience = listing.category === "experience";
  const isVehicle = listing.category === "vehicle";
  const rules = getStayRules(listing);
  const today = availability.today;

  const availableFrom = listing.availableFrom && isDateKey(listing.availableFrom) ? listing.availableFrom : null;
  const availableTo = listing.availableTo && isDateKey(listing.availableTo) ? listing.availableTo : null;
  const earliestStart = maxKey(addDaysToKey(today, rules.advanceNoticeDays), availableFrom);

  const searchStart = normalizeDateKey(searchParams?.get("startDate") || searchParams?.get("checkIn"));
  const searchEnd = normalizeDateKey(searchParams?.get("endDate") || searchParams?.get("checkOut"));

  // Partial availability: the searched range only partly overlaps the listing's window.
  const partialAvailabilityInfo = useMemo(() => {
    if (!searchStart || !searchEnd || searchStart >= searchEnd || (!availableFrom && !availableTo)) return null;
    const overlapStart = availableFrom && availableFrom > searchStart ? availableFrom : searchStart;
    const overlapEnd = availableTo && availableTo < searchEnd ? availableTo : searchEnd;
    if (overlapStart >= overlapEnd) return null;
    if (overlapStart === searchStart && overlapEnd === searchEnd) return null;
    return { searchedStart: searchStart, searchedEnd: searchEnd, overlapStart, overlapEnd };
  }, [searchStart, searchEnd, availableFrom, availableTo]);

  // Initial selection: search dates (clipped) or the earliest bookable stay.
  const initialRange = useMemo<Range>(() => {
    let start: DateKey = earliestStart;
    let end: DateKey = addDaysToKey(earliestStart, isExperience ? 0 : rules.minNights);
    if (partialAvailabilityInfo) {
      start = partialAvailabilityInfo.overlapStart;
      end = partialAvailabilityInfo.overlapEnd;
    } else if (searchStart && searchEnd && searchStart < searchEnd && searchStart >= earliestStart) {
      start = searchStart;
      end = searchEnd;
    }
    if (isExperience) end = start;
    return { startDate: fromDateKey(start), endDate: fromDateKey(end), key: "selection" };
  }, [partialAvailabilityInfo, searchStart, searchEnd, earliestStart, isExperience, rules.minNights]);

  const [dateRange, setDateRange] = useState<Range>(initialRange);

  const calendarMinDate = fromDateKey(earliestStart);
  const calendarMaxDate = availableTo ? fromDateKey(availableTo) : undefined;
  const disabledDates = useMemo(() => availability.unavailable.map(fromDateKey), [availability.unavailable]);
  const unavailableSet = useMemo(() => new Set(availability.unavailable), [availability.unavailable]);

  const maxGuests = maxGuestsFor(listing);
  const [guestCount, setGuestCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const startKey = dateRange.startDate ? toDateKey(dateRange.startDate) : earliestStart;
  const endKey = isExperience ? startKey : dateRange.endDate ? toDateKey(dateRange.endDate) : startKey;

  // Same pure functions the server uses when the booking is created.
  const quote = useMemo(
    () =>
      quoteListingBooking({
        listing,
        startDate: startKey,
        endDate: endKey,
        guestCount,
        priceOverrides,
      }),
    [listing, startKey, endKey, guestCount, priceOverrides]
  );
  const validationError = useMemo(
    () =>
      validateListingRequest({
        listing,
        request: { startDate: startKey, endDate: endKey, guestCount },
        today,
        unavailableNights: unavailableSet,
      }),
    [listing, startKey, endKey, guestCount, today, unavailableSet]
  );

  const [guestMessage, setGuestMessage] = useState<string>("");
  const isRequestToBook = computeIsRequestToBook(listing);

  const validationMessage = validationError ? errorText(validationError) : null;

  const handleReserve = async () => {
    if (!currentUser) {
      openLogin();
      return;
    }
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setIsLoading(true);
    try {
      // Price, fees, availability and approval mode are decided on the server.
      const result = await createBookingAction({
        kind: "listing",
        listingId: listing.id,
        startDate: startKey,
        endDate: endKey,
        guestCount,
        guestMessage: guestMessage.trim() || undefined,
      });

      if (!result.ok) {
        if (result.code === "UNAUTHENTICATED") openLogin();
        toast.error(errorText(result));
        return;
      }

      if (result.data.status === "pending") {
        toast.success(t("requestSubmitted"));
      } else {
        toast.success(t("reservationConfirmed"));
      }
      setIsMobileSheetOpen(false);
      router.push("/trips");
      router.refresh();
    } catch {
      toast.error(errorText({ code: "BOOKING_FAILED" }));
    } finally {
      setIsLoading(false);
    }
  };

  const periodLabel = t(`perUnit.${unitLabel(quote.model)}`);
  const rating = formatRating(listing.rating, locale);
  const reviewCount = listing.reviewCount ?? 0;
  const durationLabel = isExperience
    ? t("peopleCount", { count: quote.quantity })
    : isVehicle
    ? t("daysCount", { count: quote.nights })
    : t("nightsCount", { count: quote.nights });
  const money = (amount: number) => formatDzd(amount, locale);
  const fmt = (key: DateKey) => formatDateKey(key, locale);
  const fmtShort = (key: DateKey) => formatDateKey(key, locale, { month: "short", day: "numeric" });

  const handleRangeChange = (sel: Range) => {
    if (isExperience && sel.startDate) {
      setDateRange({ ...sel, endDate: sel.startDate });
    } else {
      setDateRange(sel);
    }
  };

  const priceBreakdown = (
    <>
      <div className="flex justify-between">
        <span>
          {t.rich(quote.hasPriceOverrides ? "averageTimes" : "priceTimes", {
            price: () => (
              <PriceDisplay
                price={quote.hasPriceOverrides ? quote.averageUnitPrice : quote.unitPrice}
                showEur={false}
              />
            ),
            duration: durationLabel,
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
    </>
  );

  return (
    <>
      {/* 1. Desktop Sticky Sidebar Card */}
      <div className="hidden lg:block sticky top-28 w-full max-w-sm bg-white rounded-3xl p-6 border border-tertiary/60 shadow-darna-widget hover:shadow-darna-modal transition-shadow duration-300 space-y-5">
        {/* Price & Rating Header */}
        <div className="flex items-baseline justify-between border-b border-tertiary/40 pb-4">
          <div>
            <PriceDisplay
              price={listing.price}
              period={periodLabel}
              priceClassName="text-xl sm:text-2xl font-bold text-primary"
            />
          </div>
          <div className="text-xs font-semibold text-neutral-600 flex items-center gap-1">
            {rating ? (
              <>
                <BrandStarIcon size={12} className="text-accent fill-accent" />
                <span className="sr-only">
                  {t("ratingLabel", { rating })}
                  {reviewCount > 0 && <>, {t("reviewsCount", { count: reviewCount })}</>}
                </span>
                <span aria-hidden="true">
                  {rating}
                  {reviewCount > 0 && <> ({formatNumber(reviewCount, locale)})</>}
                </span>
              </>
            ) : (
              t("ratingNew")
            )}
          </div>
        </div>

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
                  searched: tCommon("dateRange", {
                    start: fmtShort(partialAvailabilityInfo.searchedStart),
                    end: fmtShort(partialAvailabilityInfo.searchedEnd),
                  }),
                  available: tCommon("dateRange", {
                    start: fmtShort(partialAvailabilityInfo.overlapStart),
                    end: fmtShort(partialAvailabilityInfo.overlapEnd),
                  }),
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
            aria-expanded={isCalendarOpen}
            aria-controls={calendarPanelId}
            className={`w-full grid ${isExperience ? "grid-cols-1" : "grid-cols-2"} p-3 text-start hover:bg-neutral-50 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600`}
          >
            <div>
              <span className="block font-bold text-[10px] text-neutral-600 uppercase">
                {isVehicle ? t("pickup") : isExperience ? t("date") : t("checkInLabel")}
              </span>
              <span className="font-semibold text-primary">{fmt(startKey)}</span>
            </div>
            {!isExperience && (
              <div className="border-s border-tertiary ps-3">
                <span className="block font-bold text-[10px] text-neutral-600 uppercase">
                  {isVehicle ? t("return") : t("checkoutLabel")}
                </span>
                <span className="font-semibold text-primary">{fmt(endKey)}</span>
              </div>
            )}
          </button>

          {/* Calendar Picker Drawer */}
          {isCalendarOpen && (
            <div
              id={calendarPanelId}
              className="p-2 bg-white flex justify-center border-t border-tertiary/50 animate-in fade-in duration-150"
            >
              <Calendar
                value={dateRange}
                onChange={(val) => handleRangeChange(val.selection)}
                minDate={calendarMinDate}
                maxDate={calendarMaxDate}
                disabledDates={disabledDates}
              />
            </div>
          )}

          {/* Guest Count Selector */}
          <div className="p-3">
            <button
              type="button"
              onClick={() => setIsGuestOpen((prev) => !prev)}
              aria-expanded={isGuestOpen}
              aria-controls={guestPanelId}
              className="w-full text-start cursor-pointer flex justify-between items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              <span>
                <span className="block font-bold text-[10px] text-neutral-600 uppercase">
                  {isVehicle ? t("passengers") : t("guests")}
                </span>
                <span className="font-semibold text-primary">
                  {isVehicle ? t("passengerCount", { count: guestCount }) : t("guestCount", { count: guestCount })}
                </span>
              </span>
              <span className="text-xs font-bold text-neutral-600" aria-hidden="true">
                {isGuestOpen ? tCommon("close") : t("change")}
              </span>
            </button>

            {isGuestOpen && (
              <div id={guestPanelId} className="pt-3 border-t border-tertiary/40 mt-2">
                <Counter
                  title={t("totalTravelers")}
                  subtitle={t("maxCount", { count: maxGuests })}
                  value={guestCount}
                  maxValue={maxGuests}
                  onChange={(v) => setGuestCount(Math.min(v, maxGuests))}
                />
              </div>
            )}
          </div>
        </div>

        {/* Stay rules */}
        {!isExperience && (rules.minNights > 1 || rules.advanceNoticeDays > 0) && (
          <p className="text-[11px] text-neutral-600">
            {rules.minNights > 1 &&
              (isVehicle
                ? t("minimumDays", { count: rules.minNights })
                : t("minimumNights", { count: rules.minNights }))}{" "}
            {rules.advanceNoticeDays > 0 && t("bookAhead", { count: rules.advanceNoticeDays })}
          </p>
        )}

        {/* Host Approval / Instant Booking Mode Indicator */}
        {isRequestToBook ? (
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs">
            <BrandClockIcon size={16} strokeWidth={1.8} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block text-amber-950">{t("hostApprovalRequired")}</span>
              <p className="text-[11px] text-amber-800 leading-snug">{t("hostApprovalDesc")}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 text-emerald-900 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-emerald-900 text-[11px]">{t("instantConfirmation")}</span>
          </div>
        )}

        {/* Optional Note to Host when in Request Mode */}
        {isRequestToBook && (
          <div className="space-y-1.5 pt-1">
            <label htmlFor="desktop-guest-msg" className="text-xs font-bold text-neutral-700 flex items-center justify-between">
              <span>{t("noteToHost")}</span>
              <span className="text-[10px] text-neutral-600 font-normal">{t("noteToHostHint")}</span>
            </label>
            <textarea
              id="desktop-guest-msg"
              rows={2}
              value={guestMessage}
              onChange={(e) => setGuestMessage(e.target.value)}
              placeholder={t("noteToHostPlaceholder")}
              className="w-full text-xs p-2.5 rounded-xl border border-tertiary/70 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-accent-600 transition resize-none placeholder:text-neutral-500"
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
          label={isRequestToBook ? t("requestToBook") : t("reserve")}
          disabled={isLoading || Boolean(validationError)}
          onClick={handleReserve}
        />

        <p className="text-center text-xs text-neutral-600">
          {isRequestToBook ? t("freeCancelNoResponse") : t("youWontBeCharged")}
        </p>

        {/* Price Breakdown Calculation */}
        <div className="space-y-2.5 text-xs sm:text-sm text-neutral-700 border-t border-tertiary/40 pt-4">
          {priceBreakdown}

          <div className="flex justify-between font-bold text-sm sm:text-base text-primary border-t border-tertiary/60 pt-3">
            <span>{tCommon("total")}</span>
            <PriceDisplay price={quote.total} priceClassName="font-bold text-primary" />
          </div>
        </div>

        {/* Report Listing */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => toast.info(t("reportSuccess"))}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-800 transition cursor-pointer btn-press rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          >
            <BrandFlagIcon size={14} strokeWidth={1.8} />
            <span>{t("reportListing")}</span>
          </button>
        </div>
      </div>

      {/* 2. Mobile Sticky Bottom Bar & Drawer */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-tertiary/80 p-3.5 shadow-2xl flex items-center justify-between pb-[calc(0.8rem+env(safe-area-inset-bottom))]">
        <div>
          <PriceDisplay
            price={listing.price}
            period={periodLabel}
            priceClassName="font-bold text-sm text-primary"
          />
          <div className="text-[11px] text-neutral-600">
            {isExperience
              ? fmtShort(startKey)
              : tCommon("dateRange", { start: fmtShort(startKey), end: fmtShort(endKey) })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileSheetOpen(true)}
          aria-haspopup="dialog"
          className="bg-accent-600 hover:bg-accent-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          {isRequestToBook ? t("request") : t("reserve")}
        </button>
      </div>

      {/* Mobile Reservation Modal Sheet */}
      <Dialog
        isOpen={isMobileSheetOpen}
        onClose={() => setIsMobileSheetOpen(false)}
        busy={isLoading}
        ariaLabel={isRequestToBook ? t("requestBooking") : t("confirmReservation")}
        backdropClassName="lg:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex flex-col justify-end"
        className="bg-white rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
            <div className="flex items-center justify-between border-b border-tertiary/50 pb-3">
              <h3 className="font-bold text-base text-primary">
                {isRequestToBook ? t("requestBooking") : t("confirmReservation")}
              </h3>
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                aria-label={tCommon("close")}
              >
                <BrandCloseIcon size={18} strokeWidth={2.2} />
              </button>
            </div>

            {/* Host Approval Notice */}
            {isRequestToBook && (
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-900 text-xs">
                <BrandClockIcon size={16} strokeWidth={1.8} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-amber-950">{t("hostApprovalRequired")}</span>
                  <p className="text-[11px] text-amber-800 leading-snug">{t("hostApprovalDesc")}</p>
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
                      searched: tCommon("dateRange", {
                    start: fmtShort(partialAvailabilityInfo.searchedStart),
                    end: fmtShort(partialAvailabilityInfo.searchedEnd),
                  }),
                      available: tCommon("dateRange", {
                    start: fmtShort(partialAvailabilityInfo.overlapStart),
                    end: fmtShort(partialAvailabilityInfo.overlapEnd),
                  }),
                    })}
                  </p>
                </div>
              </div>
            )}

            <Calendar
              value={dateRange}
              onChange={(val) => handleRangeChange(val.selection)}
              minDate={calendarMinDate}
              maxDate={calendarMaxDate}
              disabledDates={disabledDates}
            />

            <Counter
              title={isVehicle ? t("passengers") : t("guests")}
              subtitle={t("maxCount", { count: maxGuests })}
              value={guestCount}
              maxValue={maxGuests}
              onChange={(v) => setGuestCount(Math.min(v, maxGuests))}
            />

            {/* Optional note in mobile sheet */}
            {isRequestToBook && (
              <div className="space-y-1.5 pt-1">
                <label htmlFor="mobile-guest-msg" className="text-xs font-bold text-neutral-700 flex items-center justify-between">
                  <span>{t("noteToHost")}</span>
                  <span className="text-[10px] text-neutral-600 font-normal">{t("noteToHostHint")}</span>
                </label>
                <textarea
                  id="mobile-guest-msg"
                  rows={2}
                  value={guestMessage}
                  onChange={(e) => setGuestMessage(e.target.value)}
                  placeholder={t("noteToHostPlaceholder")}
                  className="w-full text-xs p-2.5 rounded-xl border border-tertiary/70 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-accent-600 transition resize-none placeholder:text-neutral-500"
                />
              </div>
            )}

            <div className="border-t border-tertiary/40 pt-3 space-y-1.5 text-xs text-neutral-600">
              {priceBreakdown}
              <div className="flex justify-between font-bold text-sm text-primary">
                <span>{t("totalAmount")}</span>
                <PriceDisplay price={quote.total} />
              </div>
            </div>

            {validationMessage && (
              <p role="alert" className="text-xs font-semibold text-rose-700">
                {validationMessage}
              </p>
            )}

            <Button
              label={isRequestToBook ? t("submitBookingRequest") : t("completeReservation")}
              disabled={isLoading || Boolean(validationError)}
              onClick={handleReserve}
            />
      </Dialog>
    </>
  );
}
