"use client";

import React, { useState, useMemo, useId } from "react";
import { formatDzd } from "@/lib/currency";
import { useActionError } from "@/hook/useActionError";
import { Range } from "react-date-range";
import { Listing, User } from "@/types";
import Calendar from "@/components/inputs/Calendar";
import Counter from "@/components/inputs/Counter";
import PriceDisplay from "@/components/common/PriceDisplay";
import { AnimatedNumber, Banner, Button, Sheet, Textarea } from "@/components/ui";
import BookingSuccessDialog, { type BookingSummaryRow } from "./detail/BookingSuccessDialog";
import MobileBookingBar from "./detail/MobileBookingBar";
import NoGuestFees from "./detail/NoGuestFees";
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
import { toast } from "react-toastify";
import { BrandStarIcon, BrandFlagIcon, BrandClockIcon } from "@/components/icons";
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

  const [success, setSuccess] = useState<{ status: "confirmed" | "pending"; rows: BookingSummaryRow[] } | null>(null);

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
  const datesLabel = isExperience
    ? fmt(startKey)
    : tCommon("dateRange", { start: fmtShort(startKey), end: fmtShort(endKey) });
  const guestsLabel = isVehicle ? t("passengerCount", { count: guestCount }) : t("guestCount", { count: guestCount });

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

      setIsMobileSheetOpen(false);
      // Celebrate in place; the guest chooses where to go next (no automatic redirect).
      setSuccess({
        status: result.data.status === "pending" ? "pending" : "confirmed",
        rows: [
          { label: t("success.dates"), value: datesLabel },
          { label: isVehicle ? t("passengers") : t("guests"), value: guestsLabel },
          { label: tCommon("total"), value: money(quote.total) },
        ],
      });
    } catch {
      toast.error(errorText({ code: "BOOKING_FAILED" }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRangeChange = (sel: Range) => {
    if (isExperience && sel.startDate) {
      setDateRange({ ...sel, endDate: sel.startDate });
    } else {
      setDateRange(sel);
    }
  };

  const partialNotice = partialAvailabilityInfo && (
    <Banner tone="warning" title={tListing("partialAvailabilityNoticeTitle")}>
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
    </Banner>
  );

  const modeNotice = isRequestToBook ? (
    <Banner tone="info" title={t("hostApprovalRequired")} icon={<BrandClockIcon size={18} />}>
      {t("hostApprovalDesc")}
    </Banner>
  ) : (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-secondary-50 text-secondary-800">
      <span className="relative flex w-2 h-2 shrink-0" aria-hidden="true">
        <span className="absolute inset-0 rounded-full bg-secondary-500 animate-ping opacity-60" />
        <span className="relative w-2 h-2 rounded-full bg-secondary-600" />
      </span>
      <span className="font-semibold text-meta">{t("instantConfirmation")}</span>
    </div>
  );

  const noteField = (idSuffix: string) =>
    isRequestToBook && (
      <Textarea
        id={`${baseId}-note-${idSuffix}`}
        label={t("noteToHost")}
        helper={t("noteToHostPlaceholder")}
        rows={3}
        maxLength={1000}
        showCount
        value={guestMessage}
        onChange={(e) => setGuestMessage(e.target.value)}
      />
    );

  const validationAlert = validationMessage && (
    <p role="alert" className="text-meta font-semibold text-accent-700">
      {validationMessage}
    </p>
  );

  const priceBreakdown = (
    <>
      <div className="flex justify-between gap-4">
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
        <AnimatedNumber value={quote.subtotal} format={money} className="tabular-nums" />
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
    </>
  );

  const eyebrow = "block text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-500 rtl:normal-case rtl:tracking-normal";

  return (
    <>
      {/* 1. Desktop sticky booking card */}
      <div className="hidden lg:block sticky top-28 w-full max-w-sm ms-auto bg-white rounded-3xl p-7 shadow-e3 space-y-5">
        {/* Price & rating */}
        <div className="flex items-start justify-between gap-3 pb-1">
          <div>
            {/* The host's own price: travellers pay no DARNA fee on top. */}
            <p className="flex items-baseline gap-1.5 flex-wrap">
              <span className="font-serif text-[1.75rem] leading-none text-primary-900 tabular-nums">{money(listing.price)}</span>
              <span className="text-body text-primary-500">{periodLabel}</span>
            </p>
            <p className="mt-1.5 text-meta text-primary-500 tabular-nums">
              {t("noFeesShort")} · {durationLabel}
            </p>
          </div>
          <div className="text-meta font-semibold text-primary-800 flex items-center gap-1 tabular-nums pt-1">
            {rating ? (
              <>
                <BrandStarIcon size={13} className="text-accent-600" />
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

        {partialNotice}

        {/* Dates & guests */}
        <div className="rounded-2xl ring-1 ring-primary/15 overflow-hidden divide-y divide-primary/10 text-sm transition-shadow duration-fast hover:ring-primary/25">
          <button
            type="button"
            onClick={() => setIsCalendarOpen((prev) => !prev)}
            aria-expanded={isCalendarOpen}
            aria-controls={calendarPanelId}
            className={`w-full grid ${isExperience ? "grid-cols-1" : "grid-cols-2"} px-4 py-3 text-start hover:bg-darnaBg/60 transition-colors duration-fast cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600`}
          >
            <div>
              <span className={eyebrow}>{isVehicle ? t("pickup") : isExperience ? t("date") : t("checkInLabel")}</span>
              <span className="block mt-0.5 font-medium text-primary-900 tabular-nums">{fmt(startKey)}</span>
            </div>
            {!isExperience && (
              <div className="border-s border-primary/10 ps-4">
                <span className={eyebrow}>{isVehicle ? t("return") : t("checkoutLabel")}</span>
                <span className="block mt-0.5 font-medium text-primary-900 tabular-nums">{fmt(endKey)}</span>
              </div>
            )}
          </button>

          {isCalendarOpen && (
            <div id={calendarPanelId} className="p-2 bg-white flex justify-center animate-in fade-in slide-in-from-top-1 duration-200">
              <Calendar
                value={dateRange}
                onChange={(val) => handleRangeChange(val.selection)}
                minDate={calendarMinDate}
                maxDate={calendarMaxDate}
                disabledDates={disabledDates}
              />
            </div>
          )}

          <div className="px-4 py-3">
            <button
              type="button"
              onClick={() => setIsGuestOpen((prev) => !prev)}
              aria-expanded={isGuestOpen}
              aria-controls={guestPanelId}
              className="w-full text-start cursor-pointer flex justify-between items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              <span>
                <span className={eyebrow}>{isVehicle ? t("passengers") : t("guests")}</span>
                <span className="font-semibold text-primary-900">{guestsLabel}</span>
              </span>
              <span className="text-meta font-semibold text-primary-900 underline underline-offset-4 decoration-primary/30" aria-hidden="true">
                {isGuestOpen ? tCommon("close") : t("change")}
              </span>
            </button>

            {isGuestOpen && (
              <div id={guestPanelId} className="pt-3 border-t border-primary/10 mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
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
          <p className="text-meta text-primary-500">
            {rules.minNights > 1 &&
              (isVehicle ? t("minimumDays", { count: rules.minNights }) : t("minimumNights", { count: rules.minNights }))}{" "}
            {rules.advanceNoticeDays > 0 && t("bookAhead", { count: rules.advanceNoticeDays })}
          </p>
        )}

        {modeNotice}
        {noteField("desktop")}
        {validationAlert}

        <Button size="lg" fullWidth onClick={handleReserve} loading={isLoading} disabled={Boolean(validationError)}>
          {isRequestToBook ? t("requestToBook") : t("reserve")}
        </Button>

        <p className="text-center text-meta text-primary-500">
          {isRequestToBook ? t("freeCancelNoResponse") : t("youWontBeCharged")}
        </p>

        {/* Price breakdown */}
        <div className="space-y-3 text-body text-primary-600 border-t border-primary/10 pt-5 [&_.flex>span:first-child]:underline [&_.flex>span:first-child]:decoration-primary/20 [&_.flex>span:first-child]:underline-offset-4">
          {priceBreakdown}
          <div className="flex justify-between items-baseline font-semibold text-title text-primary-900 border-t border-primary/10 pt-4 [&>span:first-child]:no-underline">
            <span>{tCommon("total")}</span>
            <AnimatedNumber value={quote.total} format={money} className="tabular-nums" />
          </div>
        </div>

        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => toast.info(t("reportSuccess"))}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-2 text-meta text-primary-500 hover:text-primary-900 transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          >
            <BrandFlagIcon size={14} strokeWidth={1.8} />
            <span>{t("reportListing")}</span>
          </button>
        </div>
      </div>

      {/* 2. Phones and tablets: sticky bottom bar + booking sheet */}
      <MobileBookingBar
        price={money(listing.price)}
        priceSuffix={periodLabel}
        detail={`${t("noFeesShort")} · ${datesLabel}`}
        detailLabel={t("editDates", { dates: datesLabel })}
        ctaLabel={isRequestToBook ? t("request") : t("reserve")}
        onCta={() => setIsMobileSheetOpen(true)}
      />

      <Sheet
        isOpen={isMobileSheetOpen}
        onClose={() => setIsMobileSheetOpen(false)}
        busy={isLoading}
        title={isRequestToBook ? t("requestBooking") : t("confirmReservation")}
        description={listing.title}
        size="lg"
        bodyClassName="space-y-5"
        footer={
          <div className="flex items-center justify-between gap-4">
            <p className="min-w-0">
              <AnimatedNumber value={quote.total} format={money} className="block font-semibold text-title text-primary-900 tabular-nums" />
              <span className="block text-meta text-primary-500 truncate">
                {datesLabel} · {guestsLabel}
              </span>
            </p>
            <Button size="lg" onClick={handleReserve} loading={isLoading} disabled={Boolean(validationError)} className="shrink-0">
              {isRequestToBook ? t("submitBookingRequest") : t("completeReservation")}
            </Button>
          </div>
        }
      >
        {partialNotice}
        {modeNotice}

        <div className="flex justify-center -mx-2">
          <Calendar
            value={dateRange}
            onChange={(val) => handleRangeChange(val.selection)}
            minDate={calendarMinDate}
            maxDate={calendarMaxDate}
            disabledDates={disabledDates}
          />
        </div>

        <Counter
          title={isVehicle ? t("passengers") : t("guests")}
          subtitle={t("maxCount", { count: maxGuests })}
          value={guestCount}
          maxValue={maxGuests}
          onChange={(v) => setGuestCount(Math.min(v, maxGuests))}
        />

        {noteField("sheet")}

        <div className="border-t border-primary/10 pt-4 space-y-2.5 text-body text-primary-600">
          {priceBreakdown}
          <div className="flex justify-between items-baseline font-semibold text-title text-primary-900 border-t border-primary/10 pt-3">
            <span>{t("totalAmount")}</span>
            <AnimatedNumber value={quote.total} format={money} className="tabular-nums" />
          </div>
        </div>

        {validationAlert}
      </Sheet>

      <BookingSuccessDialog
        isOpen={success !== null}
        onClose={() => setSuccess(null)}
        status={success?.status ?? "confirmed"}
        itemTitle={listing.title}
        rows={success?.rows ?? []}
      />
    </>
  );
}
