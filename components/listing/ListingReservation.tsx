"use client";

import React, { useState, useMemo } from "react";
import { Range } from "react-date-range";
import { format, differenceInCalendarDays } from "date-fns";
import Calendar from "../inputs/Calendar";
import { useTranslations } from "next-intl";
import { MdStar, MdFlag, MdClose } from "react-icons/md";
import { toast } from "react-toastify";

type Props = {
  price: number;
  dateRange: Range;
  totalPrice: number;
  onChangeDate: (value: Range) => void;
  onSubmit: () => void;
  disabled?: boolean;
  disabledDates: Date[];
  rating?: number;
  reviewCount?: number;
};

function ListingReservation({
  price,
  dateRange,
  totalPrice,
  onChangeDate,
  onSubmit,
  disabled,
  disabledDates,
  rating = 4.92,
  reviewCount = 28,
}: Props) {
  const t = useTranslations("listing");
  const tCommon = useTranslations("common");
  const [showCalendar, setShowCalendar] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("inaccurate");
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);

  const nights = useMemo(() => {
    if (dateRange.startDate && dateRange.endDate) {
      const diff = differenceInCalendarDays(dateRange.endDate, dateRange.startDate);
      return diff > 0 ? diff : 1;
    }
    return 1;
  }, [dateRange.startDate, dateRange.endDate]);

  const nightlySubtotal = price * nights;
  const cleaningFee = 45;
  const serviceFee = Math.round(nightlySubtotal * 0.12);
  const calculatedTotal = nightlySubtotal + cleaningFee + serviceFee;

  const startDateFormatted = dateRange.startDate
    ? format(dateRange.startDate, "MM/dd/yyyy")
    : t("selectDates");
  const endDateFormatted = dateRange.endDate
    ? format(dateRange.endDate, "MM/dd/yyyy")
    : t("selectDates");

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsReportSubmitting(true);
    setTimeout(() => {
      setIsReportSubmitting(false);
      setIsReportModalOpen(false);
      toast.success(t("reportSuccess"));
    }, 400);
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/90 p-6 shadow-airbnb-card hover:shadow-airbnb transition-all flex flex-col gap-5">
      {/* Header: Price & Rating */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-neutral-900">${price}</span>
          <span className="text-neutral-500 font-normal text-sm">
            / {tCommon("night")}
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm font-semibold text-neutral-800">
          <MdStar className="text-neutral-900" size={15} />
          <span>{rating.toFixed(2)}</span>
          <span className="text-neutral-400 font-normal">·</span>
          <span className="underline text-neutral-500 font-normal text-xs">
            {t("reviewsCount", { count: reviewCount })}
          </span>
        </div>
      </div>

      {/* Segmented Inputs Box (Check-in, Checkout, Guests) */}
      <div className="border border-neutral-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-neutral-900 transition">
        {/* Top: Dates */}
        <div
          onClick={() => setShowCalendar((prev) => !prev)}
          className="grid grid-cols-2 divide-x divide-neutral-300 rtl:divide-x-reverse border-b border-neutral-300 cursor-pointer hover:bg-neutral-50/80 transition"
        >
          <div className="p-2.5">
            <span className="block text-[10px] font-extrabold uppercase text-neutral-800 tracking-wider">
              {tCommon("date")}
            </span>
            <span className="text-xs sm:text-sm font-medium text-neutral-900 truncate block">
              {startDateFormatted}
            </span>
          </div>
          <div className="p-2.5">
            <span className="block text-[10px] font-extrabold uppercase text-neutral-800 tracking-wider">
              {tCommon("date")}
            </span>
            <span className="text-xs sm:text-sm font-medium text-neutral-900 truncate block">
              {endDateFormatted}
            </span>
          </div>
        </div>

        {/* Bottom: Guests */}
        <div className="p-2.5 flex items-center justify-between hover:bg-neutral-50/80 transition">
          <div>
            <span className="block text-[10px] font-extrabold uppercase text-neutral-800 tracking-wider">
              {tCommon("guests").toUpperCase()}
            </span>
            <span className="text-xs sm:text-sm font-medium text-neutral-900">
              {t("guestCount", { count: guestCount })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={guestCount <= 1}
              onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
              className="w-7 h-7 rounded-full border border-neutral-300 flex items-center justify-center text-sm font-bold text-neutral-700 hover:border-neutral-900 disabled:opacity-30 disabled:hover:border-neutral-300 transition cursor-pointer"
            >
              -
            </button>
            <span className="text-xs font-semibold">{guestCount}</span>
            <button
              type="button"
              onClick={() => setGuestCount((c) => Math.min(10, c + 1))}
              className="w-7 h-7 rounded-full border border-neutral-300 flex items-center justify-center text-sm font-bold text-neutral-700 hover:border-neutral-900 transition cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Calendar Dropdown */}
      {showCalendar && (
        <div className="pt-2 border-t border-neutral-100 flex flex-col items-center">
          <Calendar
            value={dateRange}
            disabledDates={disabledDates}
            onChange={(value) => onChangeDate(value.selection)}
          />
          <button
            type="button"
            onClick={() => setShowCalendar(false)}
            className="mt-2 text-xs font-semibold underline text-neutral-700 hover:text-neutral-900 cursor-pointer"
          >
            {tCommon("close")}
          </button>
        </div>
      )}

      {/* Full-Width Primary Reserve CTA */}
      <button
        disabled={disabled}
        onClick={onSubmit}
        className="w-full bg-accent hover:bg-accent-600 active:bg-accent-700 active:scale-[0.99] text-white py-3.5 px-4 rounded-xl font-bold text-base shadow-sm hover:shadow-md transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {t("reserve")}
      </button>

      <p className="text-center text-xs text-neutral-500 font-medium">
        {t("youWontBeCharged")}
      </p>

      {/* Price Breakdown Appearing Below Button */}
      <div className="flex flex-col gap-2.5 pt-2 text-sm text-neutral-700 border-t border-neutral-200">
        <div className="flex justify-between">
          <span className="underline">
            ${price} x {nights} {nights === 1 ? tCommon("night") : `${tCommon("night")}s`}
          </span>
          <span>${nightlySubtotal}</span>
        </div>
        <div className="flex justify-between">
          <span className="underline">{t("cleaningFee")}</span>
          <span>${cleaningFee}</span>
        </div>
        <div className="flex justify-between">
          <span className="underline">{t("serviceFee")}</span>
          <span>${serviceFee}</span>
        </div>

        <div className="border-t border-neutral-200 pt-3 mt-1 flex justify-between font-bold text-base text-neutral-900">
          <span>{tCommon("total")}</span>
          <span>${calculatedTotal}</span>
        </div>
      </div>

      {/* Report Listing Trigger */}
      <div className="pt-3 border-t border-neutral-100 flex justify-center">
        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 font-medium cursor-pointer transition underline"
        >
          <MdFlag size={14} />
          <span>{t("reportListing")}</span>
        </button>
      </div>

      {/* Report Listing Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="font-bold text-base text-neutral-900">{t("reportModalTitle")}</h3>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
              >
                <MdClose size={18} />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="flex flex-col gap-4 pt-4">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
                <input
                  type="radio"
                  name="reportReason"
                  value="inaccurate"
                  checked={reportReason === "inaccurate"}
                  onChange={() => setReportReason("inaccurate")}
                  className="accent-accent"
                />
                <span className="text-sm font-medium text-neutral-800">{t("reportAccurate")}</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
                <input
                  type="radio"
                  name="reportReason"
                  value="scam"
                  checked={reportReason === "scam"}
                  onChange={() => setReportReason("scam")}
                  className="accent-accent"
                />
                <span className="text-sm font-medium text-neutral-800">{t("reportScam")}</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
                <input
                  type="radio"
                  name="reportReason"
                  value="offensive"
                  checked={reportReason === "offensive"}
                  onChange={() => setReportReason("offensive")}
                  className="accent-accent"
                />
                <span className="text-sm font-medium text-neutral-800">{t("reportOffensive")}</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isReportSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-800 text-white text-sm font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {t("reportSubmit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ListingReservation;
