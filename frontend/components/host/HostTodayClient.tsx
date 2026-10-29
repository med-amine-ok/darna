"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { User, Organization, Reservation, Listing, Review } from "@/types";
import { respondToReservationAction } from "@/app/actions/bookings";
import { convertDzdToEur, formatDzd, formatEur } from "@/lib/currency";
import { formatNumber, formatRating } from "@/lib/i18n/date-locale";
import { summarizeReviews } from "@/lib/reviews";
import { earningsChange, grossEarnings, occupancy, periodWindows } from "@/lib/host-kpis";
import { getStayRules } from "@/lib/booking/config";
import { todayKey } from "@/lib/booking/dates";
import { formatDateKey, formatDateRange } from "@/lib/booking/dates";
import Avatar from "@/components/Avatar";
import { toast } from "react-toastify";
import HostWalletWidget from "./HostWalletWidget";
import {
  BrandCalendarIcon,
  BrandCheckIcon,
  BrandCloseIcon,
  BrandTrendingUpIcon,
  BrandMessageIcon,
  BrandChevronRightIcon,
  BrandStarIcon,
  BrandClockIcon,
  BrandPlusIcon,
  BrandDoorIcon,
  BrandReceiptIcon,
  CategoryHouseIcon,
  WelcomeArchIcon,
} from "@/components/icons";
import { useActionError } from "@/hook/useActionError";

interface HostTodayClientProps {
  currentUser?: User | null;
  organization?: Organization | null;
  initialReservations: Reservation[];
  listings: Listing[];
  reviews: Review[];
}

type Period = "month" | "30days" | "year";
const PERIODS: Period[] = ["month", "30days", "year"];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";


export default function HostTodayClient({
  currentUser,
  organization,
  initialReservations,
  listings,
  reviews,
}: HostTodayClientProps) {
  const t = useTranslations("hostToday");
  const tHost = useTranslations("host");
  const tListing = useTranslations("listing");
  const errorText = useActionError();
  const locale = useLocale();
  const percent = (value: number, extra?: Intl.NumberFormatOptions) =>
    formatNumber(value, locale, { style: "percent", maximumFractionDigits: 1, ...extra });

  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [period, setPeriod] = useState<Period>("month");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const pendingRequests = reservations.filter((r) => r.status === "pending");
  const confirmedReservations = reservations.filter((r) => r.status === "confirmed");

  // Every figure below comes from the host's reservations, listings and reviews.
  const today = todayKey();
  const todayCheckIns = confirmedReservations.filter((r) => r.startDate === today);
  const currentlyHosting = confirmedReservations.filter((r) => r.startDate < today && r.endDate > today);

  const windows = periodWindows(period, today);
  const totalEarnings = grossEarnings(reservations, windows.current);
  const change = earningsChange(reservations, period, today);
  const occupancyStats = occupancy(reservations, listings, windows.current);
  const hostReviews = useMemo(() => {
    const ids = new Set(listings.map((l) => l.id));
    return reviews.filter((r) => ids.has(r.listingId));
  }, [listings, reviews]);
  const reviewSummary = summarizeReviews(hostReviews);
  const overallRating = formatRating(reviewSummary?.overall, locale);

  const handleStatusChange = async (id: string, newStatus: "confirmed" | "cancelled") => {
    setIsProcessing(id);
    try {
      const result = await respondToReservationAction(id, newStatus === "confirmed" ? "confirm" : "decline");
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: result.data.status } : r))
      );
      if (newStatus === "confirmed") {
        toast.success(t("toast.accepted"));
      } else {
        toast.info(t("toast.declined"));
      }
    } catch {
      toast.error(t("toast.updateFailed"));
    } finally {
      setIsProcessing(null);
    }
  };

  const displayName = organization ? organization.name : currentUser?.name || t("hostFallback");

  const quickLinks = [
    { href: "/host/calendar", label: t("quick.calendar"), Icon: BrandCalendarIcon },
    { href: "/host/listings", label: t("quick.listings", { count: listings.length }), Icon: CategoryHouseIcon },
    { href: "/host/messages", label: t("quick.messages"), Icon: BrandMessageIcon },
    { href: "/host/settings", label: t("quick.payout"), Icon: BrandReceiptIcon },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tertiary/50 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-secondary font-bold">
            {organization ? t("eyebrowAgency") : t("eyebrowIndividual")}
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold text-primary font-serif mt-1 flex items-center gap-2.5">
            <span>{t("greeting", { name: displayName })}</span>
            <WelcomeArchIcon size={28} className="text-primary inline-block shrink-0" />
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/become-a-host/1"
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-primary/95 transition shadow-xs ${FOCUS_RING}`}
          >
            <BrandPlusIcon size={16} />
            <span>{t("createListing")}</span>
          </Link>
          <Link
            href="/host/calendar"
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-tertiary rounded-xl text-xs sm:text-sm font-semibold text-primary hover:bg-neutral-50 transition shadow-xs ${FOCUS_RING}`}
          >
            <BrandCalendarIcon size={16} className="text-secondary" />
            <span>{tHost("nav.calendar")}</span>
          </Link>
        </div>
      </div>

      {/* Host Prepaid Wallet & Solvency Widget */}
      <HostWalletWidget />

      {/* KPI Cards Banner */}
      <section aria-labelledby="host-today-performance" className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 id="host-today-performance" className="text-lg font-bold text-primary font-serif">
            {t("performanceTitle")}
          </h2>
          <div role="group" aria-label={t("periodLabel")} className="flex items-center gap-1 bg-tertiary/20 p-1 rounded-xl text-xs">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${FOCUS_RING} ${
                  period === p ? "bg-white text-primary shadow-xs" : "text-neutral-600"
                }`}
              >
                {t(`period.${p}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-tertiary/70 shadow-xs space-y-1">
            <div className="text-xs font-semibold text-neutral-600">{t("kpi.grossEarnings")}</div>
            <div className="text-xl sm:text-2xl font-bold text-primary font-serif">{formatDzd(totalEarnings, locale)}</div>
            {change !== null ? (
              <div className={`text-[11px] flex items-center gap-1 ${change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                <BrandTrendingUpIcon size={13} className={change < 0 ? "-scale-y-100" : undefined} />
                <span>
                  {t("kpi.earningsTrend", {
                    change: percent(change, { signDisplay: "always" }),
                    eur: formatEur(convertDzdToEur(totalEarnings), locale),
                  })}
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-neutral-600">
                {t("kpi.earningsEur", { eur: formatEur(convertDzdToEur(totalEarnings), locale) })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-5 border border-tertiary/70 shadow-xs space-y-1">
            <div className="text-xs font-semibold text-neutral-600">{t("kpi.occupancyRate")}</div>
            <div className="text-xl sm:text-2xl font-bold text-primary">
              {occupancyStats ? percent(occupancyStats.rate) : "—"}
            </div>
            {occupancyStats && (
              <div className="text-[11px] text-neutral-600">
                {t("kpi.occupancyNote", {
                  booked: formatNumber(occupancyStats.booked, locale),
                  available: formatNumber(occupancyStats.available, locale),
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-5 border border-tertiary/70 shadow-xs space-y-1">
            <div className="text-xs font-semibold text-neutral-600">{t("kpi.activeBookings")}</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700">
              {formatNumber(confirmedReservations.length, locale)}
            </div>
            <div className="text-[11px] text-neutral-600">{t("kpi.activeBookingsNote")}</div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-tertiary/70 shadow-xs space-y-1">
            <div className="text-xs font-semibold text-neutral-600">{t("kpi.overallRating")}</div>
            <div className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-1">
              {overallRating ? (
                <>
                  <BrandStarIcon size={20} className="text-amber-500 fill-amber-500" />
                  <span>{overallRating}</span>
                </>
              ) : (
                tListing("ratingNew")
              )}
            </div>
            <div className="text-[11px] text-neutral-600">{t("kpi.ratingNote", { count: hostReviews.length })}</div>
          </div>
        </div>
      </section>

      {/* Pending Approval Requests (If Any) */}
      {pendingRequests.length > 0 && (
        <section aria-labelledby="host-today-pending" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 motion-safe:animate-ping" aria-hidden="true" />
            <h2 id="host-today-pending" className="text-lg font-bold text-primary font-serif">
              {t("pendingTitle", { count: pendingRequests.length })}
            </h2>
          </div>

          <ul className="space-y-3">
            {pendingRequests.map((req) => (
              <li
                key={req.id}
                className="bg-amber-50/70 border-2 border-amber-300 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-amber-200 text-amber-700 font-bold shrink-0">
                    <BrandClockIcon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary text-sm sm:text-base">
                      {t("requestFor", { title: req.listing?.title || "" })}
                    </h3>
                    <div className="text-xs text-neutral-600 mt-0.5">
                      {t.rich("requestDetails", {
                        dates: formatDateRange(req.startDate, req.endDate, locale),
                        guests: req.guestsCount,
                        payout: formatDzd(req.totalPrice, locale),
                        strong: (chunks) => <strong>{chunks}</strong>,
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    type="button"
                    disabled={isProcessing === req.id}
                    onClick={() => handleStatusChange(req.id, "confirmed")}
                    className={`px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition flex items-center gap-1 shadow-2xs disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    <BrandCheckIcon size={16} />
                    <span>{t("acceptRequest")}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing === req.id}
                    onClick={() => handleStatusChange(req.id, "cancelled")}
                    className={`px-4 py-2 bg-white border border-rose-300 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-50 transition flex items-center gap-1 disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    <BrandCloseIcon size={16} />
                    <span>{tHost("today.decline")}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Main Grid: Today's Schedule & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Start Column: Today's Movements */}
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-tertiary shadow-sm space-y-5">
            <h2 className="text-xl font-bold text-primary font-serif flex items-center gap-2">
              <BrandDoorIcon size={24} className="text-secondary" />
              <span>{t("todayTitle")}</span>
            </h2>

            {todayCheckIns.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-tertiary/40 text-xs text-neutral-600">
                {t("noCheckIns")}
              </div>
            ) : (
              <ul className="space-y-3">
                {todayCheckIns.map((stay) => (
                  <li
                    key={stay.id}
                    className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/60 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-neutral-200">
                        <Image
                          src={stay.listing?.imageSrc?.[0] || "/assets/placeholder.jpg"}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                          {t("checkInAt", { time: getStayRules(stay.listing ?? {}).checkInTime })}
                        </span>
                        <h3 className="font-bold text-primary text-sm mt-1">{stay.listing?.title}</h3>
                        <div className="text-xs text-neutral-600">{t("stayDetails", { count: stay.guestsCount })}</div>
                      </div>
                    </div>

                    <Link
                      href="/host/messages"
                      className={`px-3 py-1.5 bg-white border border-tertiary rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition shrink-0 ${FOCUS_RING}`}
                    >
                      {tHost("today.messageGuest")}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* Currently Hosting */}
            <div className="pt-4 border-t border-tertiary/40">
              <h3 className="font-bold text-primary text-sm mb-3">
                {t("currentlyHosting", { count: currentlyHosting.length })}
              </h3>
              <ul className="space-y-3">
                {currentlyHosting.map((stay) => (
                  <li
                    key={stay.id}
                    className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/60 flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-semibold text-primary text-sm">{stay.listing?.title}</h4>
                      <div className="text-xs text-neutral-600">
                        {t("stayEnds", { date: formatDateKey(stay.endDate, locale) })}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700">{t("inHouse")}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Recent Reviews Card */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-tertiary shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-primary font-serif">{t("recentReviews")}</h2>

            {hostReviews.length === 0 ? (
              <p className="text-xs text-neutral-600">{t("noReviews")}</p>
            ) : (
              <ul className="divide-y divide-tertiary/30">
                {hostReviews.slice(0, 2).map((rev) => (
                  <li key={rev.id} className="py-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar src={rev.user?.image} size={28} />
                        <span className="font-bold text-primary">{rev.user?.name}</span>
                      </div>
                      <div className="flex items-center gap-1 font-bold text-primary">
                        <BrandStarIcon size={14} className="text-amber-500 fill-amber-500" />
                        <span>{formatNumber(rev.rating, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                      </div>
                    </div>
                    <p className="text-neutral-600 leading-relaxed">{rev.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* End Column: Shortcuts & Quick Hub */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Hub Links */}
          <nav aria-labelledby="host-today-quick" className="bg-white rounded-3xl p-6 border border-tertiary shadow-sm space-y-3">
            <h2 id="host-today-quick" className="font-bold text-primary text-base font-serif">
              {t("quickActions")}
            </h2>

            {quickLinks.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={`p-3 bg-neutral-50 hover:bg-tertiary/20 rounded-2xl border border-tertiary/50 flex items-center justify-between transition group ${FOCUS_RING}`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={18} className="text-secondary shrink-0" />
                  <span className="text-xs font-bold text-primary">{label}</span>
                </span>
                <BrandChevronRightIcon
                  size={16}
                  className="text-neutral-400 transition rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                />
              </Link>
            ))}
          </nav>

          {/* Hosting Guide Tip */}
          <aside className="bg-primary text-white rounded-3xl p-6 space-y-3 shadow-xs">
            <span className="text-[10px] uppercase tracking-wider text-tertiary font-bold">{t("tip.eyebrow")}</span>
            <h2 className="font-bold text-sm font-serif">{t("tip.title")}</h2>
            <p className="text-xs text-neutral-300 leading-relaxed">{t("tip.body")}</p>
            <Link
              href="/host/calendar"
              className="inline-flex items-center gap-1 text-xs font-bold text-accent-300 hover:underline pt-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {t("tip.cta")}
              <BrandChevronRightIcon size={14} className="rtl:rotate-180" />
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
