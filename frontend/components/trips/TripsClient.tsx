"use client";

import React, { useEffect, useId, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/navigation";
import { Reservation } from "@/types";
import {
  answerRefundAction,
  cancelMyReservationAction,
  confirmMyStayAction,
  getMyCancellationPreviewAction,
  getMyRefundsAction,
  reportBookingProblemAction,
  type DisputeReason,
} from "@/app/actions/bookings";
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
import { Badge, Button, Card, Dialog, DialogFooter, KitEmptyState, Pill, Select, Tabs, TabPanel, Textarea, cn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { useLocale, useTranslations } from "next-intl";
import { useCurrency } from "@/hook/useCurrency";
import { getCancellationPolicy } from "@/lib/booking/cancellation";
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

const REFUND_STATUSES = ["open", "declared", "disputed", "settled"] as const;
const DISPUTE_REASONS: DisputeReason[] = ["not_as_described", "no_show", "cleanliness", "safety", "refund", "other"];

function policyOf(res: Reservation) {
  return getCancellationPolicy(
    res.cancellationPolicy ?? res.listing?.cancellationPolicy ?? res.trip?.cancellationPolicy
  );
}

/** Refund preview from the backend (GET /me/bookings/{id}/cancellation-preview). */
type CancelPreview = { allowed: boolean; refundAmount: number; refundPercent: number } | "loading" | "failed" | null;

type RefundRow = { id: string; status: string; amount: number; dueAt: string | null; isOverdue: boolean };

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
  const [cancelPreview, setCancelPreview] = useState<CancelPreview>(null);
  const [refunds, setRefunds] = useState<Record<string, RefundRow>>({});
  const [reportingRes, setReportingRes] = useState<Reservation | null>(null);
  const [reportReason, setReportReason] = useState<DisputeReason>("not_as_described");
  const [reportText, setReportText] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const formId = useId();

  const filteredReservations = reservations.filter((r) => tabOf(r.status) === activeTab);

  // Refunds hosts owe me after cancellations (guests pay hosts directly, DEC-001).
  useEffect(() => {
    if (!initialReservations.some((r) => (r.refundAmount ?? 0) > 0)) return;
    let live = true;
    getMyRefundsAction()
      .then((result) => {
        if (!live || !result.ok) return;
        setRefunds(Object.fromEntries(result.data.map((f) => [f.bookingId, f])));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [initialReservations]);

  // What cancelling would refund now, asked from the backend when the dialog opens.
  useEffect(() => {
    if (!cancellingRes) {
      setCancelPreview(null);
      return;
    }
    let live = true;
    setCancelPreview("loading");
    getMyCancellationPreviewAction(cancellingRes.id)
      .then((result) => {
        if (!live) return;
        setCancelPreview(
          result.ok
            ? { allowed: result.data.allowed, refundAmount: result.data.refundAmount, refundPercent: result.data.refundPercent }
            : "failed"
        );
      })
      .catch(() => {
        if (live) setCancelPreview("failed");
      });
    return () => {
      live = false;
    };
  }, [cancellingRes]);

  const replaceReservation = (updated: Reservation) =>
    setReservations((prev) =>
      prev.map((r) => (r.id === updated.id ? { ...r, ...updated, listing: r.listing, trip: r.trip } : r))
    );

  const handleConfirmStay = async (res: Reservation) => {
    setBusyId(res.id);
    try {
      const result = await confirmMyStayAction(res.id);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      replaceReservation(result.data);
      toast.success(t("toastStayConfirmed"));
    } catch {
      toast.error(errorText({ code: "SERVER_ERROR" }));
    } finally {
      setBusyId(null);
    }
  };

  const handleRefundAnswer = async (bookingId: string, received: boolean) => {
    const refund = refunds[bookingId];
    if (!refund) return;
    let answer: { received: true } | { received: false; note: string } = { received: true };
    if (!received) {
      const note = window.prompt(t("refundNotReceivedPrompt"))?.trim();
      if (!note) return;
      answer = { received: false, note };
    }
    setBusyId(bookingId);
    try {
      const result = await answerRefundAction(refund.id, answer);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setRefunds((prev) => ({ ...prev, [bookingId]: result.data }));
      toast.success(received ? t("toastRefundConfirmed") : t("toastRefundDisputed"));
    } catch {
      toast.error(errorText({ code: "SERVER_ERROR" }));
    } finally {
      setBusyId(null);
    }
  };

  const handleReport = async () => {
    if (!reportingRes) return;
    if (reportText.trim().length < 20) {
      toast.error(t("report.tooShort"));
      return;
    }
    setBusyId(reportingRes.id);
    try {
      const result = await reportBookingProblemAction(reportingRes.id, {
        side: "guest",
        reasonCode: reportReason,
        statement: reportText,
      });
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      toast.success(t("report.success"));
      setReportingRes(null);
      setReportText("");
    } catch {
      toast.error(errorText({ code: "SERVER_ERROR" }));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async () => {
    if (!cancellingRes) return;
    setIsProcessing(true);
    try {
      const result = await cancelMyReservationAction(cancellingRes.id);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      replaceReservation(result.data);
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
              const coverImage = listing?.imageSrc?.[0] || trip?.coverPhoto || "";
              const vertical = trip || res.tripId ? "trip" : listing?.category || "home";
              const canCancel = res.canCancel ?? (res.status === "confirmed" || res.status === "pending");
              const title = listing?.title || trip?.title || res.title || t("fallbackTitle");
              const vertical2 = res.vertical === "hostel" ? "hotel" : res.vertical;
              const stayStarted = res.checkInAt ? new Date(res.checkInAt).getTime() <= Date.now() : false;
              const canConfirmStay =
                (res.status === "confirmed" || res.status === "completed") && !res.stayConfirmedAt && stayStarted;
              const canReport = res.status === "confirmed" || res.status === "completed" || res.status === "cancelled";
              const refundRow = refunds[res.id];
              const city = listing?.city || trip?.city;
              const href = res.tripId ? `/trips/${res.tripId}` : `/listings/${res.listingId}`;

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
                      {coverImage && <TripCover src={coverImage} alt={t("coverAlt", { title })} />}
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary-900/30 to-transparent"
                      />
                    </Link>
                    <div className="pointer-events-none absolute inset-x-3.5 top-3.5 flex items-start justify-between gap-2">
                      <Pill tone="glass" className="shadow-e1">
                        {verticalLabel(listing || trip ? vertical : vertical2 || vertical)}
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
                          <dd className="mt-1 truncate font-semibold text-primary-900">{t("payAtHost")}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-primary-600">{t("totalDue")}</dt>
                          <dd className="mt-1 font-semibold tabular-nums text-primary-900">
                            {money(res.totalPrice)}{" "}
                            <span className="font-medium text-primary-500">
                              {t("eurApprox", { amount: eur(res.totalPrice) })}
                            </span>
                          </dd>
                        </div>
                      </dl>

                      {res.refundAmount !== undefined && res.status === "cancelled" && (
                        <div className="space-y-2 text-meta text-primary-600">
                          <p>{t("refundLine", { amount: money(res.refundAmount) })}</p>
                          {refundRow && (
                            <p className="flex flex-wrap items-center gap-2">
                              <Badge tone={refundRow.isOverdue ? "danger" : "sand"}>
                                {t(
                                  `refundStatus.${
                                    REFUND_STATUSES.includes(refundRow.status as (typeof REFUND_STATUSES)[number])
                                      ? (refundRow.status as (typeof REFUND_STATUSES)[number])
                                      : "open"
                                  }`
                                )}
                              </Badge>
                              {refundRow.status === "declared" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    loading={busyId === res.id}
                                    onClick={() => handleRefundAnswer(res.id, true)}
                                  >
                                    {t("refundReceived")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={busyId === res.id}
                                    onClick={() => handleRefundAnswer(res.id, false)}
                                  >
                                    {t("refundNotReceived")}
                                  </Button>
                                </>
                              )}
                            </p>
                          )}
                        </div>
                      )}

                      {(res.status === "confirmed" || res.status === "completed") &&
                        (res.checkInCode || res.hostPhone || res.addressLine) && (
                          <dl className="space-y-1.5 rounded-xl bg-secondary-50 p-4 text-meta text-primary-700">
                            {res.checkInCode && !res.stayConfirmedAt && (
                              <div className="flex items-baseline justify-between gap-3">
                                <dt>{t("checkInCode")}</dt>
                                <dd dir="ltr" className="font-mono text-title tracking-widest text-primary-900">
                                  {res.checkInCode}
                                </dd>
                              </div>
                            )}
                            {res.addressLine && (
                              <div className="flex justify-between gap-3">
                                <dt>{t("address")}</dt>
                                <dd className="text-end font-semibold text-primary-900">{res.addressLine}</dd>
                              </div>
                            )}
                            {res.hostPhone && (
                              <div className="flex justify-between gap-3">
                                <dt>{t("hostPhone", { name: res.hostName ?? "" })}</dt>
                                <dd dir="ltr" className="font-semibold tabular-nums text-primary-900">
                                  <a href={`tel:${res.hostPhone}`}>{res.hostPhone}</a>
                                </dd>
                              </div>
                            )}
                            {res.checkInCode && !res.stayConfirmedAt && (
                              <p className="pt-1 text-primary-600">{t("checkInCodeHelp")}</p>
                            )}
                          </dl>
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
                        {canConfirmStay && (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={busyId === res.id}
                            onClick={() => handleConfirmStay(res)}
                            leadingIcon={<BrandCheckIcon size={16} aria-hidden="true" />}
                          >
                            {t("confirmStay")}
                          </Button>
                        )}
                        {canReport && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReportReason("not_as_described");
                              setReportText("");
                              setReportingRes(res);
                            }}
                            aria-haspopup="dialog"
                          >
                            {t("report.button")}
                          </Button>
                        )}
                        {canCancel && (
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
                title: cancellingRes.listing?.title || cancellingRes.trip?.title || cancellingRes.title || t("fallbackTitle"),
                dates: formatDateRange(cancellingRes.startDate, cancellingRes.endDate, locale),
                b: (chunks) => <span className="font-semibold text-primary-900">{chunks}</span>,
              })
            : ""
        }
        callout={
          cancellingRes &&
          (cancellingRes.status === "pending" ? (
            <p>{t("notChargedNote")}</p>
          ) : cancelPreview === "loading" || cancelPreview === null ? (
            <p>{t("cancelPreviewLoading")}</p>
          ) : cancelPreview === "failed" || !cancelPreview.allowed ? (
            <p>{t("cancelPreviewFailed")}</p>
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

      {/* Report a problem to BLADUS support (opens a dispute on the booking). */}
      <Dialog
        isOpen={!!reportingRes}
        onClose={() => setReportingRes(null)}
        title={t("report.title")}
        description={t("report.description")}
        showClose
        size="md"
      >
        <div className="space-y-4">
          <Select
            id={`${formId}-reason`}
            label={t("report.reasonLabel")}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value as DisputeReason)}
            options={DISPUTE_REASONS.map((reason) => ({ value: reason, label: t(`report.reasons.${reason}`) }))}
          />
          <Textarea
            id={`${formId}-statement`}
            label={t("report.statementLabel")}
            helper={t("report.statementHelp")}
            rows={5}
            maxLength={4000}
            showCount
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="tertiary" onClick={() => setReportingRes(null)}>
            {t("receiptDialog.close")}
          </Button>
          <Button loading={busyId === reportingRes?.id} onClick={handleReport}>
            {t("report.submit")}
          </Button>
        </DialogFooter>
      </Dialog>

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
              <Badge tone="neutral" className="shrink-0">
                {t("payAtHost")}
              </Badge>
            </div>

            <dl className="space-y-3 text-body">
              <div className="flex justify-between gap-4">
                <dt className="text-primary-600">{t("receiptDialog.receiptId")}</dt>
                <dd className="font-mono text-meta font-semibold text-primary-900" dir="ltr">
                  {selectedReceipt.reference ?? selectedReceipt.id.slice(0, 8).toUpperCase()}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-primary-600">{t("receiptDialog.listing")}</dt>
                <dd className="text-end font-semibold text-primary-900">
                  {selectedReceipt.listing?.title || selectedReceipt.trip?.title || selectedReceipt.title}
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
                <dd className="text-end text-primary-900">{t("payAtHost")}</dd>
              </div>
            </dl>

            <dl className="space-y-2 rounded-xl bg-darnaBg-300/60 p-4 text-meta tabular-nums">
              <div className="flex justify-between gap-4 text-primary-700">
                <dt>{t("receiptDialog.subtotal")}</dt>
                <dd>
                  {money(
                    selectedReceipt.subtotal ??
                      selectedReceipt.totalPrice + (selectedReceipt.discount ?? 0) -
                        (selectedReceipt.cleaningFee ?? 0) -
                        (selectedReceipt.taxes ?? 0)
                  )}
                </dd>
              </div>
              {(selectedReceipt.discount ?? 0) > 0 && (
                <div className="flex justify-between gap-4 text-primary-700">
                  <dt>{t("receiptDialog.discount")}</dt>
                  <dd>{t("receiptDialog.refundedAmount", { amount: money(selectedReceipt.discount ?? 0) })}</dd>
                </div>
              )}
              {(selectedReceipt.cleaningFee ?? 0) > 0 && (
                <div className="flex justify-between gap-4 text-primary-700">
                  <dt>{t("receiptDialog.cleaningFee")}</dt>
                  <dd>{money(selectedReceipt.cleaningFee ?? 0)}</dd>
                </div>
              )}
              {(selectedReceipt.serviceFee ?? 0) > 0 && (
                <div className="flex justify-between gap-4 text-primary-700">
                  <dt>{t("receiptDialog.serviceFee")}</dt>
                  <dd>{money(selectedReceipt.serviceFee ?? 0)}</dd>
                </div>
              )}
              {(selectedReceipt.taxes ?? 0) > 0 && (
                <div className="flex justify-between gap-4 text-primary-700">
                  <dt>{t("receiptDialog.taxes")}</dt>
                  <dd>{money(selectedReceipt.taxes ?? 0)}</dd>
                </div>
              )}
              {(selectedReceipt.refundAmount ?? 0) > 0 && (
                <div className="flex justify-between gap-4 font-semibold text-secondary-800">
                  <dt>{t("receiptDialog.refunded")}</dt>
                  <dd>{t("receiptDialog.refundedAmount", { amount: money(selectedReceipt.refundAmount ?? 0) })}</dd>
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
