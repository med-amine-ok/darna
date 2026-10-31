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
  BrandCheckIcon,
  BrandCloseIcon,
  BrandCreditCardIcon,
} from "@/components/icons";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import { Badge, Button, Card, Dialog, KitEmptyState, Pill, Tabs, TabPanel, cn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { useLocale, useTranslations } from "next-intl";
import { useCurrency } from "@/hook/useCurrency";
import { computeGuestRefund, getCancellationPolicy } from "@/lib/booking/cancellation";
import { formatDateRange } from "@/lib/booking/dates";
import { useActionError } from "@/hook/useActionError";

type TripTab = "upcoming" | "past" | "cancelled";

/** Upcoming / past / cancelled bucket of a (server-settled) reservation status. */
function tabOf(status: Reservation["status"]): TripTab {
  if (status === "confirmed" || status === "pending") return "upcoming";
  if (status === "completed") return "past";
  return "cancelled"; // cancelled, declined, expired
}

const TABS: TripTab[] = ["upcoming", "past", "cancelled"];
const VERTICALS = ["home", "hotel", "experience", "vehicle", "trip"] as const;
const TAB_LABEL_KEYS = { upcoming: "tabUpcoming", past: "tabPast", cancelled: "tabCancelled" } as const;
const TAB_EMPTY_KEYS = { upcoming: "noUpcoming", past: "noPast", cancelled: "noCancelled" } as const;
const TAB_EMPTY_DESC_KEYS = {
  upcoming: "emptyUpcomingDesc",
  past: "emptyPastDesc",
  cancelled: "emptyCancelledDesc",
} as const;

const STATUS_TONE: Record<Reservation["status"], { tone: BadgeTone; icon?: "check" | "close" }> = {
  confirmed: { tone: "success", icon: "check" },
  pending: { tone: "warning" },
  completed: { tone: "neutral" },
  cancelled: { tone: "danger", icon: "close" },
  declined: { tone: "danger", icon: "close" },
  expired: { tone: "sand" },
};

const PAYMENT_TONE: Record<string, BadgeTone> = {
  paid: "success",
  pending: "warning",
  refunded: "sand",
  partially_refunded: "sand",
  voided: "neutral",
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

/** 16:10 cover with sand placeholder that cross-fades into the photo and zooms slowly on hover. */
function TripCover({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 560px"
      className={cn(
        "object-cover transition-transform [transition-duration:700ms] ease-out group-hover:scale-[1.04]"
      )}
    />
  );
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
  const [activeTab, setActiveTab] = useState<TripTab>("upcoming");
  const [selectedReceipt, setSelectedReceipt] = useState<Reservation | null>(null);
  const [cancellingRes, setCancellingRes] = useState<Reservation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const statusBadge = (status: Reservation["status"]) => {
    const style = STATUS_TONE[status];
    if (!style) return null;
    return (
      <Badge
        tone={style.tone}
        dot={!style.icon}
        icon={
          style.icon === "check" ? (
            <BrandCheckIcon size={13} aria-hidden="true" />
          ) : style.icon === "close" ? (
            <BrandCloseIcon size={13} aria-hidden="true" />
          ) : undefined
        }
        className="shadow-e1"
      >
        {t(`status.${status}`)}
      </Badge>
    );
  };

  const verticalLabel = (vertical: string) =>
    VERTICALS.includes(vertical as (typeof VERTICALS)[number])
      ? t(`vertical.${vertical as (typeof VERTICALS)[number]}`)
      : vertical;

  const money = (amount: number) => formatDzd(amount);
  const eur = (amount: number) => formatEur(convertToEur(amount));

  const counts = TABS.reduce(
    (acc, tab) => ({ ...acc, [tab]: reservations.filter((r) => tabOf(r.status) === tab).length }),
    {} as Record<TripTab, number>
  );

  return (
    <div className="space-y-8">
      <Tabs
        id="trips"
        ariaLabel={t("tabsLabel")}
        value={activeTab}
        onChange={setActiveTab}
        items={TABS.map((tab) => ({ value: tab, label: t(TAB_LABEL_KEYS[tab]), count: counts[tab] }))}
      />

      <TabPanel tabsId="trips" value={activeTab} active={activeTab}>
        {filteredReservations.length === 0 ? (
          <Card padding="none" className="enter-up">
            <KitEmptyState
              variant="calendar"
              title={t(TAB_EMPTY_KEYS[activeTab])}
              description={t(TAB_EMPTY_DESC_KEYS[activeTab])}
              className="min-h-0 py-14"
              action={
                <Button href="/search" leadingIcon={<BrandPinIcon size={18} aria-hidden="true" />}>
                  {t("exploreCta")}
                </Button>
              }
            />
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredReservations.map((res, i) => {
              const listing = res.listing;
              const trip = res.trip;
              const coverImage = listing?.imageSrc?.[0] || trip?.coverPhoto || "/assets/placeholder.jpg";
              const vertical = trip ? "trip" : listing?.category || "home";
              const refund = res.status === "confirmed" || res.status === "pending" ? refundFor(res) : null;
              const title = listing?.title || trip?.title || t("fallbackTitle");
              const city = listing?.city || trip?.city;
              const href = trip ? `/trips/${trip.id}` : `/listings/${res.listingId}`;

              return (
                <li
                  key={`${activeTab}-${res.id}`}
                  className="enter-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                >
                  <Card as="article" padding="none" className="group flex h-full flex-col overflow-hidden">
                    <Link
                      href={href}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="relative block aspect-[16/10] w-full overflow-hidden bg-tertiary-100"
                    >
                      <TripCover src={coverImage} alt={t("coverAlt", { title })} />
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary-900/30 to-transparent"
                      />
                    </Link>
                    <div className="pointer-events-none absolute inset-x-3.5 top-3.5 flex items-start justify-between gap-2">
                      <Pill tone="glass" className="shadow-e1">
                        {verticalLabel(vertical)}
                      </Pill>
                      {statusBadge(res.status)}
                    </div>

                    <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
                      <div className="min-w-0">
                        {city && (
                          <p className="flex items-center gap-1.5 text-meta text-primary-600">
                            <BrandPinIcon size={15} className="shrink-0 text-secondary-600" aria-hidden="true" />
                            <span className="truncate">
                              {t("locationLine", { city, country: listing?.country || t("countryAlgeria") })}
                            </span>
                          </p>
                        )}
                        <h2 className="mt-1.5 font-serif text-heading text-primary-900 line-clamp-2">
                          <Link
                            href={href}
                            className="rounded transition-colors duration-fast ease-standard hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                          >
                            {title}
                          </Link>
                        </h2>
                      </div>

                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 rounded-xl bg-darnaBg-300/60 p-4 text-meta">
                        <div className="min-w-0">
                          <dt className="flex items-center gap-1.5 text-primary-600">
                            <BrandCalendarIcon size={14} aria-hidden="true" />
                            {t("dates")}
                          </dt>
                          <dd className="mt-1 font-semibold text-primary-900">
                            {formatDateRange(res.startDate, res.endDate, locale)}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="flex items-center gap-1.5 text-primary-600">
                            <BrandUsersIcon size={14} aria-hidden="true" />
                            {t("guests")}
                          </dt>
                          <dd className="mt-1 font-semibold text-primary-900">
                            {t("travelers", { count: res.guestsCount })}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="flex items-center gap-1.5 text-primary-600">
                            <BrandCreditCardIcon size={14} aria-hidden="true" />
                            {t("payment")}
                          </dt>
                          <dd className="mt-1 truncate font-semibold text-primary-900">
                            {res.paymentMethod || t("defaultPaymentMethod")}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-primary-600">{t("totalPaid")}</dt>
                          <dd className="mt-1 font-semibold tabular-nums text-primary-900">
                            {money(res.totalPrice)}{" "}
                            <span className="font-medium text-primary-500">
                              {t("eurApprox", { amount: eur(res.totalPrice) })}
                            </span>
                          </dd>
                        </div>
                      </dl>

                      {res.refundAmount !== undefined && res.status === "cancelled" && (
                        <p className="text-meta text-primary-600">
                          {t("refundLine", { amount: money(res.refundAmount) })}
                        </p>
                      )}

                      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-primary/[0.08] pt-4">
                        <Button
                          href="/messages"
                          variant="tertiary"
                          size="sm"
                          leadingIcon={<BrandMessageIcon size={16} aria-hidden="true" />}
                        >
                          {t("messageHost")}
                        </Button>
                        <Button
                          variant="tertiary"
                          size="sm"
                          onClick={() => setSelectedReceipt(res)}
                          leadingIcon={<BrandReceiptIcon size={16} aria-hidden="true" />}
                        >
                          {t("receipt")}
                        </Button>
                        {refund?.allowed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancellingRes(res)}
                            className="ms-auto !text-accent-700 hover:!bg-accent-50 hover:!text-accent-800"
                          >
                            {t("cancelBooking")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </TabPanel>

      {/* Cancel flow: policy and refund amount computed by lib/booking/cancellation. */}
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
                b: (chunks) => <span className="font-semibold text-primary-900">{chunks}</span>,
              })
            : ""
        }
        callout={
          cancellingRes &&
          cancelPreview &&
          (cancellingRes.status === "pending" ? (
            <p>{t("notChargedNote")}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold text-primary-800">{t("refundAmount")}</span>
                <span className="font-serif text-heading tabular-nums text-primary-900">
                  {money(cancelPreview.refundAmount)}
                </span>
              </div>
              <p className="text-primary-700">
                {t.rich(cancelPreview.refundPercent === 100 ? "refundPreviewFull" : "refundPreview", {
                  refund: money(cancelPreview.refundAmount),
                  total: money(cancellingRes.totalPrice),
                  percent: cancelPreview.refundPercent,
                  b: (chunks) => <span className="font-semibold text-primary-900">{chunks}</span>,
                })}
              </p>
              <p className="text-primary-600">
                {t("policyLine", {
                  policy: t(`policy.${policyOf(cancellingRes).id}.label`),
                  summary: t(`policy.${policyOf(cancellingRes).id}.summary`),
                })}
              </p>
            </div>
          ))
        }
      />

      {/* Receipt (printable: only .print-area is printed). */}
      <Dialog
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        title={t("receiptDialog.title")}
        titleClassName="sr-only"
        showClose
        className="print-area relative w-full space-y-6 overflow-y-auto overscroll-contain bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-e4 rounded-t-3xl max-h-[92dvh] sm:max-w-lg sm:rounded-3xl sm:p-8"
      >
        {selectedReceipt && (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-primary/[0.08] pb-5 pe-10">
              <div>
                <Image
                  src="/assets/logo-horizontal.png"
                  alt={t("receiptDialog.logoAlt")}
                  width={110}
                  height={35}
                  className="mb-2 h-7 w-auto object-contain"
                />
                <p className="font-serif text-heading text-primary-900">{t("receiptDialog.title")}</p>
                <p className="mt-0.5 text-meta text-primary-600">{t("receiptDialog.subtitle")}</p>
              </div>
              <Badge tone={PAYMENT_TONE[selectedReceipt.paymentStatus ?? "paid"] ?? "neutral"} className="shrink-0">
                {t(`paymentStatus.${selectedReceipt.paymentStatus ?? "paid"}`)}
              </Badge>
            </div>

            <dl className="space-y-3 text-body">
              <div className="flex justify-between gap-4">
                <dt className="text-primary-600">{t("receiptDialog.receiptId")}</dt>
                <dd className="font-mono text-meta font-semibold text-primary-900">{selectedReceipt.id}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-primary-600">{t("receiptDialog.listing")}</dt>
                <dd className="text-end font-semibold text-primary-900">
                  {selectedReceipt.listing?.title || selectedReceipt.trip?.title}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-primary-600">{t("receiptDialog.dates")}</dt>
                <dd className="text-end text-primary-900">
                  {formatDateRange(selectedReceipt.startDate, selectedReceipt.endDate, locale)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-primary-600">{t("receiptDialog.paymentMethod")}</dt>
                <dd className="text-end text-primary-900">
                  {selectedReceipt.paymentMethod || t("defaultPaymentMethod")}
                </dd>
              </div>
            </dl>

            <dl className="space-y-2 rounded-xl bg-darnaBg-300/60 p-4 text-meta tabular-nums">
              <div className="flex justify-between gap-4 text-primary-700">
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
                <div className="flex justify-between gap-4 text-primary-700">
                  <dt>{t("receiptDialog.cleaningFee")}</dt>
                  <dd>{money(selectedReceipt.cleaningFee ?? 0)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 text-primary-700">
                <dt>{t("receiptDialog.serviceFee")}</dt>
                <dd>{money(selectedReceipt.serviceFee ?? 0)}</dd>
              </div>
              {(selectedReceipt.taxes ?? 0) > 0 && (
                <div className="flex justify-between gap-4 text-primary-700">
                  <dt>{t("receiptDialog.taxes")}</dt>
                  <dd>{money(selectedReceipt.taxes ?? 0)}</dd>
                </div>
              )}
              {selectedReceipt.refundAmount !== undefined && (
                <div className="flex justify-between gap-4 font-semibold text-secondary-800">
                  <dt>{t("receiptDialog.refunded")}</dt>
                  <dd>{t("receiptDialog.refundedAmount", { amount: money(selectedReceipt.refundAmount) })}</dd>
                </div>
              )}
            </dl>

            <div className="flex items-baseline justify-between gap-4 border-t border-primary/[0.08] pt-5">
              <span className="font-semibold text-primary-800">{t("receiptDialog.totalAmount")}</span>
              <span className="text-end">
                <span className="block font-serif text-heading tabular-nums text-primary-900">
                  {money(selectedReceipt.totalPrice)}
                </span>
                <span className="text-meta tabular-nums text-primary-500">{eur(selectedReceipt.totalPrice)}</span>
              </span>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-1 print:hidden sm:flex-row sm:justify-end">
              <Button variant="tertiary" onClick={() => setSelectedReceipt(null)}>
                {t("receiptDialog.close")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.print()}
                leadingIcon={<BrandReceiptIcon size={18} aria-hidden="true" />}
              >
                {t("receiptDialog.download")}
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
