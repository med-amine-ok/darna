"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/navigation";
import { Reservation } from "@/types";
import { cancelMyReservationAction } from "@/app/actions/bookings";
import { toast } from "react-toastify";
import {
  BrandCalendarIcon,
  BrandPinIcon,
  BrandUsersIcon,
  BrandReceiptIcon,
  BrandMessageIcon,
  BrandCloseIcon,
  BrandCheckIcon,
} from "@/components/icons";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Dialog from "@/components/ui/Dialog";
import { useLocale, useTranslations } from "next-intl";
import { useCurrency } from "@/hook/useCurrency";
import { computeGuestRefund, getCancellationPolicy } from "@/lib/booking/cancellation";
import { formatDateRange } from "@/lib/booking/dates";
import { useActionError } from "@/hook/useActionError";

/** Upcoming / past / cancelled bucket of a (server-settled) reservation status. */
function tabOf(status: Reservation["status"]): "upcoming" | "past" | "cancelled" {
  if (status === "confirmed" || status === "pending") return "upcoming";
  if (status === "completed") return "past";
  return "cancelled"; // cancelled, declined, expired
}

const VERTICALS = ["home", "hotel", "experience", "vehicle", "trip"] as const;
const TAB_LABEL_KEYS = { upcoming: "tabUpcoming", past: "tabPast", cancelled: "tabCancelled" } as const;
const TAB_EMPTY_KEYS = { upcoming: "noUpcoming", past: "noPast", cancelled: "noCancelled" } as const;
const TAB_EMPTY_DESC_KEYS = {
  upcoming: "emptyUpcomingDesc",
  past: "emptyPastDesc",
  cancelled: "emptyCancelledDesc",
} as const;

const STATUS_STYLES: Record<Reservation["status"], { className: string; icon?: "check" | "close" }> = {
  confirmed: { className: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: "check" },
  pending: { className: "bg-amber-100 text-amber-800 border-amber-200" },
  completed: { className: "bg-neutral-100 text-neutral-700 border-neutral-200" },
  cancelled: { className: "bg-rose-100 text-rose-800 border-rose-200", icon: "close" },
  declined: { className: "bg-rose-100 text-rose-800 border-rose-200", icon: "close" },
  expired: { className: "bg-neutral-100 text-neutral-700 border-neutral-200" },
};

function policyOf(res: Reservation) {
  return getCancellationPolicy(
    res.cancellationPolicy ?? res.listing?.cancellationPolicy ?? res.trip?.cancellationPolicy
  );
}

function refundFor(res: Reservation) {
  return computeGuestRefund({
    reservation: res,
    policy: res.cancellationPolicy ?? res.listing?.cancellationPolicy ?? res.trip?.cancellationPolicy,
    checkInTime: res.tripId ? "00:00" : res.listing?.checkInTime,
  });
}

interface TripsClientProps {
  initialReservations: Reservation[];
}

export default function TripsClient({ initialReservations }: TripsClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("trips");
  const errorText = useActionError();
  const { formatDzd, formatEur, convertToEur } = useCurrency();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [selectedReceipt, setSelectedReceipt] = useState<Reservation | null>(null);
  const [cancellingRes, setCancellingRes] = useState<Reservation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter reservations based on active tab
  const filteredReservations = reservations.filter((r) => tabOf(r.status) === activeTab);
  const cancelPreview = cancellingRes ? refundFor(cancellingRes) : null;

  const handleCancel = async () => {
    if (!cancellingRes) return;
    setIsProcessing(true);
    try {
      const result = await cancelMyReservationAction(cancellingRes.id);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setReservations((prev) =>
        prev.map((r) =>
          r.id === cancellingRes.id
            ? {
                ...r,
                status: result.data.status,
                paymentStatus: result.data.paymentStatus,
                refundAmount: result.data.refundAmount,
              }
            : r
        )
      );
      toast.success(
        result.data.refundAmount
          ? t("toastCancelledWithRefund", { amount: formatDzd(result.data.refundAmount) })
          : t("toastCancelled")
      );
      setCancellingRes(null);
      router.refresh();
    } catch {
      toast.error(t("toastCancelFailed"));
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: Reservation["status"]) => {
    const style = STATUS_STYLES[status];
    if (!style) return null;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${style.className}`}
      >
        {style.icon === "check" && <BrandCheckIcon size={14} aria-hidden="true" />}
        {style.icon === "close" && <BrandCloseIcon size={14} aria-hidden="true" />}
        {t(`status.${status}`)}
      </span>
    );
  };

  const verticalLabel = (vertical: string) =>
    VERTICALS.includes(vertical as (typeof VERTICALS)[number])
      ? t(`vertical.${vertical as (typeof VERTICALS)[number]}`)
      : vertical;

  const money = (amount: number) => formatDzd(amount);
  const eur = (amount: number) => formatEur(convertToEur(amount));
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

  return (
    <div className="space-y-8">
      {/* Page Title & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tertiary/50 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary font-serif">{t("pageTitle")}</h1>
          <p className="text-sm text-neutral-500 mt-1">{t("pageSubtitle")}</p>
        </div>

        {/* Status Filter Tabs */}
        <div
          role="group"
          aria-label={t("tabsLabel")}
          className="flex items-center gap-1.5 bg-tertiary/20 p-1.5 rounded-2xl border border-tertiary/40"
        >
          {(["upcoming", "past", "cancelled"] as const).map((tab) => {
            const count = reservations.filter((r) => tabOf(r.status) === tab).length;

            return (
              <button
                key={tab}
                type="button"
                aria-pressed={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${focusRing} ${
                  activeTab === tab ? "bg-white text-primary shadow-sm" : "text-neutral-600 hover:text-primary"
                }`}
              >
                {t("tabWithCount", { tab: t(TAB_LABEL_KEYS[tab]), count })}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trips List / Empty State */}
      {filteredReservations.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-tertiary text-center max-w-lg mx-auto shadow-sm my-8">
          <div className="w-16 h-16 bg-tertiary/30 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <BrandCalendarIcon size={32} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-primary mb-1">{t(TAB_EMPTY_KEYS[activeTab])}</h2>
          <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">{t(TAB_EMPTY_DESC_KEYS[activeTab])}</p>
          <Link
            href="/search"
            className={`inline-flex items-center justify-center py-2.5 px-6 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition shadow-sm ${focusRing}`}
          >
            {t("exploreCta")}
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredReservations.map((res) => {
            const listing = res.listing;
            const trip = res.trip;
            const coverImage = listing?.imageSrc?.[0] || trip?.coverPhoto || "/assets/placeholder.jpg";
            const vertical = trip ? "trip" : listing?.category || "home";
            const refund = res.status === "confirmed" || res.status === "pending" ? refundFor(res) : null;
            const title = listing?.title || trip?.title || t("fallbackTitle");
            const city = listing?.city || trip?.city;

            return (
              <li
                key={res.id}
                className="bg-white rounded-3xl border border-tertiary overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Image & Header */}
                  <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
                    <Image
                      src={coverImage}
                      alt={t("coverAlt", { title })}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                    <div className="absolute top-3 start-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/90 backdrop-blur-md text-primary shadow-xs">
                        {verticalLabel(vertical)}
                      </span>
                    </div>
                    <div className="absolute top-3 end-3">{getStatusBadge(res.status)}</div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-4">
                    <div>
                      <h2 className="text-lg font-bold text-primary line-clamp-1 hover:text-accent-700 transition">
                        <Link
                          href={trip ? `/trips/${trip.id}` : `/listings/${res.listingId}`}
                          className={`rounded ${focusRing}`}
                        >
                          {title}
                        </Link>
                      </h2>
                      {city && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
                          <BrandPinIcon size={15} className="text-secondary shrink-0" aria-hidden="true" />
                          <span>{t("locationLine", { city, country: listing?.country || t("countryAlgeria") })}</span>
                        </div>
                      )}
                    </div>

                    {/* Booking Details Grid */}
                    <dl className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-2xl border border-tertiary/40 text-xs">
                      <div>
                        <dt className="text-neutral-500 font-medium">{t("dates")}</dt>
                        <dd className="font-semibold text-primary mt-0.5">
                          {formatDateRange(res.startDate, res.endDate, locale)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-neutral-500 font-medium">{t("guests")}</dt>
                        <dd className="font-semibold text-primary mt-0.5 flex items-center gap-1">
                          <BrandUsersIcon size={14} className="text-neutral-400" aria-hidden="true" />
                          <span>{t("travelers", { count: res.guestsCount })}</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-neutral-500 font-medium">{t("payment")}</dt>
                        <dd className="font-semibold text-primary mt-0.5">
                          {res.paymentMethod || t("defaultPaymentMethod")}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-neutral-500 font-medium">{t("totalPaid")}</dt>
                        <dd className="font-bold text-primary mt-0.5">
                          {money(res.totalPrice)}{" "}
                          <span className="text-[11px] font-normal text-neutral-500">
                            {t("eurApprox", { amount: eur(res.totalPrice) })}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-6 py-4 bg-tertiary/10 border-t border-tertiary/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Link
                      href="/messages"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-tertiary rounded-xl font-semibold text-neutral-700 hover:bg-neutral-50 transition ${focusRing}`}
                    >
                      <BrandMessageIcon size={15} className="text-secondary" aria-hidden="true" />
                      <span>{t("messageHost")}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSelectedReceipt(res)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-tertiary rounded-xl font-semibold text-neutral-700 hover:bg-neutral-50 transition ${focusRing}`}
                    >
                      <BrandReceiptIcon size={15} className="text-secondary" aria-hidden="true" />
                      <span>{t("receipt")}</span>
                    </button>
                  </div>

                  {res.refundAmount !== undefined && res.status === "cancelled" && (
                    <span className="text-neutral-500">{t("refundLine", { amount: money(res.refundAmount) })}</span>
                  )}
                  {refund?.allowed && (
                    <button
                      type="button"
                      onClick={() => setCancellingRes(res)}
                      className={`px-3 py-1.5 text-rose-700 hover:bg-rose-50 rounded-xl font-semibold transition ${focusRing}`}
                    >
                      {t("cancelBooking")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!cancellingRes}
        title={t("cancelDialogTitle")}
        variant="destructive"
        isLoading={isProcessing}
        confirmLabel={t("cancelAction")}
        cancelLabel={t("keepReservation")}
        onConfirm={handleCancel}
        onCancel={() => setCancellingRes(null)}
        message={
          cancellingRes
            ? t.rich("cancelDialogMessage", {
                title: cancellingRes.listing?.title || cancellingRes.trip?.title || t("fallbackTitle"),
                dates: formatDateRange(cancellingRes.startDate, cancellingRes.endDate, locale),
                b: (chunks) => <span className="font-semibold text-primary">{chunks}</span>,
              })
            : ""
        }
        callout={
          cancellingRes &&
          cancelPreview && (
            <div className="flex items-center gap-2 text-amber-900 font-medium">
              {cancellingRes.status === "pending" ? (
                <span>{t("notChargedNote")}</span>
              ) : (
                <span>
                  {t("policyLine", {
                    policy: t(`policy.${policyOf(cancellingRes).id}.label`),
                    summary: t(`policy.${policyOf(cancellingRes).id}.summary`),
                  })}{" "}
                  {t.rich(cancelPreview.refundPercent === 100 ? "refundPreviewFull" : "refundPreview", {
                    refund: money(cancelPreview.refundAmount),
                    total: money(cancellingRes.totalPrice),
                    percent: cancelPreview.refundPercent,
                    b: (chunks) => <span className="font-bold">{chunks}</span>,
                  })}
                </span>
              )}
            </div>
          )
        }
      />

      {/* Receipt Modal */}
      <Dialog
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        title={t("receiptDialog.title")}
        titleClassName="sr-only"
        className="print-area relative bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-tertiary shadow-xl space-y-6 max-h-[92dvh] overflow-y-auto"
        backdropClassName="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        {selectedReceipt && (
          <>
            <div className="flex items-center justify-between border-b border-tertiary/50 pb-4">
              <div>
                <Image
                  src="/assets/logo-horizontal.png"
                  alt={t("receiptDialog.logoAlt")}
                  width={110}
                  height={35}
                  className="h-7 w-auto object-contain mb-1"
                />
                <p className="text-xs text-neutral-500">{t("receiptDialog.subtitle")}</p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-semibold uppercase">
                {t(`paymentStatus.${selectedReceipt.paymentStatus ?? "paid"}`)}
              </span>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">{t("receiptDialog.receiptId")}</dt>
                <dd className="font-mono font-semibold text-primary">{selectedReceipt.id}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">{t("receiptDialog.listing")}</dt>
                <dd className="font-semibold text-primary text-end">
                  {selectedReceipt.listing?.title || selectedReceipt.trip?.title}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">{t("receiptDialog.dates")}</dt>
                <dd className="text-primary text-end">
                  {formatDateRange(selectedReceipt.startDate, selectedReceipt.endDate, locale)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">{t("receiptDialog.paymentMethod")}</dt>
                <dd className="text-primary text-end">{selectedReceipt.paymentMethod || t("defaultPaymentMethod")}</dd>
              </div>
            </dl>
            <hr className="border-tertiary/50" />
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between text-neutral-600">
                <dt>{t("receiptDialog.subtotal")}</dt>
                <dd>
                  {money(
                    selectedReceipt.subtotal ??
                      selectedReceipt.totalPrice -
                        (selectedReceipt.cleaningFee ?? 0) -
                        (selectedReceipt.serviceFee ?? 0) -
                        (selectedReceipt.taxes ?? 0)
                  )}
                </dd>
              </div>
              {(selectedReceipt.cleaningFee ?? 0) > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <dt>{t("receiptDialog.cleaningFee")}</dt>
                  <dd>{money(selectedReceipt.cleaningFee ?? 0)}</dd>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <dt>{t("receiptDialog.serviceFee")}</dt>
                <dd>{money(selectedReceipt.serviceFee ?? 0)}</dd>
              </div>
              {(selectedReceipt.taxes ?? 0) > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <dt>{t("receiptDialog.taxes")}</dt>
                  <dd>{money(selectedReceipt.taxes ?? 0)}</dd>
                </div>
              )}
              {selectedReceipt.refundAmount !== undefined && (
                <div className="flex justify-between text-emerald-700">
                  <dt>{t("receiptDialog.refunded")}</dt>
                  <dd>{t("receiptDialog.refundedAmount", { amount: money(selectedReceipt.refundAmount) })}</dd>
                </div>
              )}
            </dl>
            <hr className="border-tertiary/50" />
            <div className="flex justify-between gap-4 text-base font-bold text-primary">
              <span>{t("receiptDialog.totalAmount")}</span>
              <span className="text-end">
                {t("receiptDialog.totalWithEur", {
                  dzd: money(selectedReceipt.totalPrice),
                  eur: eur(selectedReceipt.totalPrice),
                })}
              </span>
            </div>

            <div className="print:hidden flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className={`px-4 py-2 bg-primary text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-primary/95 transition flex items-center gap-1.5 ${focusRing}`}
              >
                <BrandReceiptIcon size={16} aria-hidden="true" />
                <span>{t("receiptDialog.download")}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className={`px-4 py-2 border border-tertiary rounded-xl text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition ${focusRing}`}
              >
                {t("receiptDialog.close")}
              </button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
