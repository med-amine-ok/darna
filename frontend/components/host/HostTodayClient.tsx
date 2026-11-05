"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { User, Organization, Reservation, Listing, Review } from "@/types";
import { respondToReservationAction } from "@/app/actions/bookings";
import { convertDzdToEur, formatAmountNumber, formatDzd, formatEur } from "@/lib/currency";
import { formatNumber } from "@/lib/i18n/date-locale";
import { summarizeReviews } from "@/lib/reviews";
import { earningsChange, grossEarnings, occupancy, periodWindows, type DateWindow } from "@/lib/host-kpis";
import { getStayRules } from "@/lib/booking/config";
import { addDaysToKey, nightsBetween, todayKey, formatDateKey, formatDateRange } from "@/lib/booking/dates";
import { toast } from "react-toastify";
import HostWalletWidget from "./HostWalletWidget";
import {
  Avatar,
  Badge,
  Button,
  Card,
  KitEmptyState,
  SegmentedControl,
  StatCard,
  cn,
  focusRing,
} from "@/components/ui";
import {
  BrandCalendarIcon,
  BrandCheckIcon,
  BrandCloseIcon,
  BrandMessageIcon,
  BrandChevronRightIcon,
  BrandStarIcon,
  BrandClockIcon,
  BrandPlusIcon,
  BrandReceiptIcon,
  BrandCashIcon,
  BrandChartIcon,
  BrandBookingsIcon,
  CategoryHouseIcon,
  CategoryHotelIcon,
  BrandPinIcon,
} from "@/components/icons";
import { useActionError } from "@/hook/useActionError";
import { canHostOffer } from "@/lib/catalog-types";

interface HostTodayClientProps {
  currentUser?: User | null;
  organization?: Organization | null;
  initialReservations: Reservation[];
  listings: Listing[];
  reviews: Review[];
}

type Period = "month" | "30days" | "year";
const PERIODS: Period[] = ["month", "30days", "year"];
const SPARK_BUCKETS = 6;

/** Splits a KPI window into equal sub-windows for sparklines (no invented data: each point is a real KPI). */
function splitWindow(w: DateWindow, parts: number): DateWindow[] {
  const days = nightsBetween(w.start, w.end);
  const n = Math.max(1, Math.min(parts, days));
  const out: DateWindow[] = [];
  for (let i = 0; i < n; i++) {
    const start = addDaysToKey(w.start, Math.floor((i * days) / n));
    const end = i === n - 1 ? w.end : addDaysToKey(w.start, Math.floor(((i + 1) * days) / n));
    out.push({ start, end });
  }
  return out;
}

export default function HostTodayClient({
  currentUser,
  organization,
  initialReservations,
  listings,
  reviews,
}: HostTodayClientProps) {
  const t = useTranslations("hostToday");
  const tHost = useTranslations("host");
  const errorText = useActionError();
  const locale = useLocale();

  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [period, setPeriod] = useState<Period>("month");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const pendingRequests = reservations.filter((r) => r.status === "pending");
  const confirmedReservations = reservations.filter((r) => r.status === "confirmed");

  // Every figure below comes from the host's reservations, listings and reviews.
  const today = todayKey();
  const upcomingCheckIns = confirmedReservations
    .filter((r) => r.startDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 6);
  const currentlyHosting = confirmedReservations.filter((r) => r.startDate < today && r.endDate > today);

  const windows = periodWindows(period, today);
  const totalEarnings = grossEarnings(reservations, windows.current);
  const change = earningsChange(reservations, period, today);
  const occupancyStats = occupancy(reservations, listings, windows.current);

  const buckets = splitWindow(windows.current, SPARK_BUCKETS);
  const earningsSpark = buckets.map((w) => grossEarnings(reservations, w));
  const occupancySpark = buckets.map((w) => Math.round((occupancy(reservations, listings, w)?.rate ?? 0) * 100));
  const hasSignal = (values: number[]) => values.length > 1 && values.some((v) => v > 0);

  const hostReviews = useMemo(() => {
    const ids = new Set(listings.map((l) => l.id));
    return reviews.filter((r) => ids.has(r.listingId));
  }, [listings, reviews]);
  const reviewSummary = summarizeReviews(hostReviews);

  // Listings already carry their public rating and review count. When the review feed for this
  // account is empty, fall back to the review-weighted listing average so the KPI matches the
  // ratings shown on the Listings page.
  const listingRating = useMemo(() => {
    const rated = listings.filter((l) => (l.rating ?? 0) > 0);
    const weight = rated.reduce((sum, l) => sum + (l.reviewCount || 1), 0);
    if (!weight) return null;
    return {
      overall: rated.reduce((sum, l) => sum + (l.rating ?? 0) * (l.reviewCount || 1), 0) / weight,
      count: rated.reduce((sum, l) => sum + (l.reviewCount ?? 0), 0),
    };
  }, [listings]);
  const rating = reviewSummary
    ? { overall: reviewSummary.overall, count: hostReviews.length }
    : listingRating;

  const handleStatusChange = async (id: string, newStatus: "confirmed" | "cancelled") => {
    setIsProcessing(id);
    try {
      const result = await respondToReservationAction(id, newStatus === "confirmed" ? "confirm" : "decline");
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: result.data.status } : r)));
      if (newStatus === "confirmed") toast.success(t("toast.accepted"));
      else toast.info(t("toast.declined"));
    } catch {
      toast.error(t("toast.updateFailed"));
    } finally {
      setIsProcessing(null);
    }
  };

  const displayName = organization ? organization.name : currentUser?.name || t("hostFallback");
  // Agencies create experiences and trips; hotels/hostels add a property (lib/catalog-types.ts).
  const isAgency = canHostOffer(organization?.businessCategory ?? currentUser?.hostType, "trip");
  const dzdUnit = locale === "ar" ? "د.ج" : "DZD";
  // Copy and figures follow what this workspace may publish (lib/catalog-types HOST_ALLOWED_OFFERS).
  const kind: "agency" | "property" | "individual" = isAgency ? "agency" : organization ? "property" : "individual";
  const pendingCount = reservations.filter((r) => r.status === "pending").length;
  const ListingsIcon = kind === "agency" ? BrandPinIcon : kind === "property" ? CategoryHotelIcon : CategoryHouseIcon;

  const quickLinks = [
    { href: "/host/calendar", label: t("quick.calendar"), Icon: BrandCalendarIcon },
    { href: "/host/listings", label: t(`quick.listings_${kind}`, { count: listings.length }), Icon: ListingsIcon },
    { href: "/host/messages", label: t("quick.messages"), Icon: BrandMessageIcon },
    { href: "/host/settings", label: t("quick.payout"), Icon: BrandReceiptIcon },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Greeting */}
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="enter-up text-eyebrow uppercase text-secondary-700 rtl:normal-case rtl:tracking-normal">
            {kind === "agency" ? t("eyebrowAgency") : kind === "property" ? t("eyebrowProperty") : t("eyebrowIndividual")}
          </p>
          <h1
            className="enter-up mt-2 text-balance font-serif text-display-md text-primary-900"
            style={{ animationDelay: "60ms" }}
          >
            <bdi>{t("greeting", { name: displayName })}</bdi>
          </h1>
          <p
            className="enter-up mt-2 max-w-xl text-pretty text-body text-primary-600"
            style={{ animationDelay: "120ms" }}
          >
            {t("subtitle")}
          </p>
        </div>
        <div className="enter-up flex flex-wrap items-center gap-2" style={{ animationDelay: "160ms" }}>
          <Button
            href={isAgency ? "/host/listings/new?offer=experience" : "/host/listings/new"}
            leadingIcon={<BrandPlusIcon size={18} aria-hidden="true" />}
          >
            {isAgency ? t("createExperience") : organization ? t("addProperty") : t("createListing")}
          </Button>
          {isAgency && (
            <Button
              href="/host/agency/trips/new"
              variant="tertiary"
              leadingIcon={<BrandPlusIcon size={18} aria-hidden="true" />}
            >
              {t("createTrip")}
            </Button>
          )}
          <Button
            href="/host/calendar"
            variant="tertiary"
            leadingIcon={<BrandCalendarIcon size={18} aria-hidden="true" />}
          >
            {tHost("nav.calendar")}
          </Button>
        </div>
      </header>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <section aria-labelledby="host-today-pending" className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-600" />
            </span>
            <h2 id="host-today-pending" className="text-title text-primary-900">
              {t("pendingTitle", { count: pendingRequests.length })}
            </h2>
          </div>
          <ul className="grid gap-3 lg:grid-cols-2">
            {pendingRequests.map((req) => (
              <Card
                as="li"
                key={req.id}
                padding="sm"
                className="flex flex-col gap-4 ring-1 ring-amber-300/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800"
                  >
                    <BrandClockIcon size={20} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-body font-semibold text-primary-900">
                      {t("requestFor", { title: req.listing?.title || "" })}
                    </h3>
                    <p className="mt-0.5 text-meta text-primary-600">
                      {t.rich("requestDetails", {
                        dates: formatDateRange(req.startDate, req.endDate, locale),
                        guests: req.guestsCount,
                        payout: formatDzd(req.totalPrice, locale),
                        strong: (chunks) => <strong className="font-semibold text-primary-800">{chunks}</strong>,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={isProcessing === req.id}
                    disabled={isProcessing === req.id}
                    onClick={() => handleStatusChange(req.id, "confirmed")}
                    leadingIcon={<BrandCheckIcon size={16} aria-hidden="true" />}
                  >
                    {t("acceptRequest")}
                  </Button>
                  <Button
                    size="sm"
                    variant="tertiary"
                    disabled={isProcessing === req.id}
                    onClick={() => handleStatusChange(req.id, "cancelled")}
                    leadingIcon={<BrandCloseIcon size={16} aria-hidden="true" />}
                  >
                    {tHost("today.decline")}
                  </Button>
                </div>
              </Card>
            ))}
          </ul>
        </section>
      )}

      {/* KPIs */}
      <section aria-labelledby="host-today-performance" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="host-today-performance" className="font-serif text-heading text-primary-900">
            {t("performanceTitle")}
          </h2>
          <SegmentedControl
            options={PERIODS.map((p) => ({ value: p, label: t(`period.${p}`) }))}
            value={period}
            onChange={setPeriod}
            ariaLabel={t("periodLabel")}
            size="sm"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t("kpi.grossEarnings")}
            value={totalEarnings}
            unit={dzdUnit}
            format={(n) => formatAmountNumber(n, locale)}
            delta={change !== null ? { value: Math.round(change * 1000) / 10 } : undefined}
            hint={
              totalEarnings > 0
                ? t(change !== null ? "kpi.vsPrevious" : "kpi.earningsEur", {
                    eur: formatEur(convertDzdToEur(totalEarnings), locale),
                  })
                : t("kpi.noEarnings")
            }
            sparkline={hasSignal(earningsSpark) ? earningsSpark : undefined}
            icon={<BrandCashIcon size={18} />}
          />
          {kind === "agency" ? (
            // Night-based occupancy means nothing for experiences and trips: show open requests instead.
            <StatCard
              label={t("kpi.pendingRequests")}
              value={pendingCount}
              hint={t("kpi.pendingRequestsNote", { count: pendingCount })}
              icon={<BrandClockIcon size={18} />}
            />
          ) : occupancyStats ? (
            <StatCard
              label={t("kpi.occupancyRate")}
              value={Math.round(occupancyStats.rate * 100)}
              unit="%"
              hint={t("kpi.occupancyNote", {
                booked: formatNumber(occupancyStats.booked, locale),
                available: formatNumber(occupancyStats.available, locale),
              })}
              sparkline={hasSignal(occupancySpark) ? occupancySpark : undefined}
              icon={<BrandChartIcon size={18} />}
            />
          ) : (
            <Card className="flex flex-col justify-between gap-3">
              <p className="text-meta font-medium text-primary-600">{t("kpi.occupancyRate")}</p>
              <p className="text-meta text-neutral-600">{t(`kpi.noOccupancy_${kind}`)}</p>
            </Card>
          )}
          <StatCard
            label={t("kpi.activeBookings")}
            value={confirmedReservations.length}
            hint={t(`kpi.activeBookingsNote_${kind}`)}
            icon={<BrandBookingsIcon size={18} />}
          />
          {rating ? (
            <StatCard
              label={t("kpi.overallRating")}
              value={Math.round(rating.overall * 100)}
              format={(n) =>
                formatNumber(n / 100, locale, { minimumFractionDigits: 1, maximumFractionDigits: 2 })
              }
              unit="/ 5"
              hint={t("kpi.ratingNote", { count: rating.count })}
              icon={<BrandStarIcon size={18} />}
            />
          ) : (
            <Card className="flex flex-col justify-between gap-3">
              <p className="text-meta font-medium text-primary-600">{t("kpi.overallRating")}</p>
              <p className="font-serif text-display-md leading-none text-secondary-700">{t("kpi.ratingNew")}</p>
              <p className="text-meta text-neutral-600">{t("kpi.ratingNote", { count: 0 })}</p>
            </Card>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Main column */}
        <div className="space-y-8 lg:col-span-8">
          <Card as="section" padding="lg" aria-labelledby="host-today-arrivals">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="host-today-arrivals" className="font-serif text-heading text-primary-900">
                {t("upcomingTitle")}
              </h2>
              <Link
                href="/host/bookings"
                className={cn(
                  "inline-flex items-center gap-1 rounded-full text-meta font-semibold text-primary-800 underline-offset-4 hover:underline",
                  focusRing
                )}
              >
                {t("allBookings")}
                <BrandChevronRightIcon size={14} aria-hidden="true" className="rtl:rotate-180" />
              </Link>
            </div>

            {currentlyHosting.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl bg-secondary-50 px-4 py-3">
                <Badge tone="olive" dot>
                  {t("currentlyHosting", { count: currentlyHosting.length })}
                </Badge>
                {currentlyHosting.slice(0, 3).map((stay) => (
                  <span key={stay.id} className="text-meta text-primary-700">
                    <bdi>{stay.listing?.title}</bdi>
                    <span className="text-primary-500">
                      {" "}
                      · {t("stayEnds", { date: formatDateKey(stay.endDate, locale, { month: "short", day: "numeric" }) })}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {upcomingCheckIns.length === 0 ? (
              <KitEmptyState
                compact
                variant="calendar"
                title={t("noUpcoming")}
                description={t("noUpcomingHint")}
                className="mt-4"
              />
            ) : (
              <ol className="relative mt-6 space-y-5">
                <span
                  aria-hidden="true"
                  className="absolute bottom-3 start-[2.375rem] top-3 w-px bg-primary/[0.1] sm:start-[2.875rem]"
                />
                {upcomingCheckIns.map((stay) => {
                  const isToday = stay.startDate === today;
                  return (
                    <li key={stay.id} className="relative flex items-start gap-3 sm:gap-4">
                      <div className="flex w-14 shrink-0 flex-col items-center text-center sm:w-[4.5rem]">
                        <span className="text-[0.6875rem] font-semibold uppercase text-primary-500 rtl:normal-case">
                          {formatDateKey(stay.startDate, locale, { month: "short" })}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 flex h-10 w-10 items-center justify-center rounded-full font-serif text-title tabular-nums",
                            isToday ? "bg-cta text-white shadow-glow" : "bg-white text-primary-900 shadow-e1"
                          )}
                        >
                          {formatDateKey(stay.startDate, locale, { day: "numeric" })}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-darnaBg/70 p-3 transition-colors duration-fast ease-standard hover:bg-darnaBg">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-tertiary-100">
                          {stay.listing?.imageSrc?.[0] && (
                            <Image
                              src={stay.listing.imageSrc[0]}
                              alt=""
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isToday && <Badge tone="terracotta">{t("todayBadge")}</Badge>}
                            <Badge tone="neutral" icon={<BrandClockIcon size={12} aria-hidden="true" />}>
                              {t("checkInAt", { time: getStayRules(stay.listing ?? {}).checkInTime })}
                            </Badge>
                          </div>
                          <h3 className="mt-1 truncate text-body font-semibold text-primary-900">
                            <bdi>{stay.listing?.title}</bdi>
                          </h3>
                          <p className="text-meta text-primary-600">
                            {t("guestsNights", {
                              count: stay.guestsCount,
                              nights: nightsBetween(stay.startDate, stay.endDate),
                            })}
                          </p>
                        </div>
                        <Link
                          href="/host/messages"
                          aria-label={tHost("today.messageGuest")}
                          title={tHost("today.messageGuest")}
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-primary-700 shadow-e1",
                            "transition-shadow duration-fast ease-standard hover:shadow-e2",
                            focusRing
                          )}
                        >
                          <BrandMessageIcon size={18} aria-hidden="true" />
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          <Card as="section" padding="lg" aria-labelledby="host-today-reviews">
            <h2 id="host-today-reviews" className="font-serif text-heading text-primary-900">
              {t("recentReviews")}
            </h2>
            {hostReviews.length === 0 ? (
              <KitEmptyState compact variant="messages" title={rating ? t("noRecentReviews") : t("noReviews")} className="mt-2" />
            ) : (
              <ul className="mt-4 divide-y divide-primary/[0.06]">
                {hostReviews.slice(0, 3).map((rev) => (
                  <li key={rev.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={rev.user?.name || t("hostFallback")} src={rev.user?.image} size="sm" decorative />
                        <span className="truncate text-body font-semibold text-primary-900">{rev.user?.name}</span>
                      </div>
                      <span className="flex items-center gap-1 text-meta font-semibold text-primary-800 tabular-nums">
                        <BrandStarIcon size={13} aria-hidden="true" className="text-accent-600" />
                        {formatNumber(rev.rating, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </span>
                    </div>
                    <p className="text-pretty text-body text-primary-700">{rev.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6 lg:col-span-4">
          <nav aria-labelledby="host-today-quick">
            <h2 id="host-today-quick" className="mb-3 text-title text-primary-900">
              {t("quickActions")}
            </h2>
            <ul className="grid grid-cols-2 gap-3">
              {quickLinks.map(({ href, label, Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "group flex h-full min-h-[7rem] flex-col justify-between gap-3 rounded-2xl bg-white p-4 shadow-e1",
                      "transition-[box-shadow,transform] duration-base ease-out hover:-translate-y-0.5 hover:shadow-e2",
                      focusRing
                    )}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-100 text-secondary-800">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <span className="flex items-end justify-between gap-2 text-meta font-semibold text-primary-900">
                      <span>{label}</span>
                      <BrandChevronRightIcon
                        size={15}
                        aria-hidden="true"
                        className="shrink-0 text-primary-400 transition-transform duration-fast ease-standard group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <HostWalletWidget />

          <aside className="relative isolate overflow-hidden rounded-2xl bg-primary-800 p-6 text-white shadow-e2">
            <div aria-hidden="true" className="absolute inset-0 -z-10 texture-zellige opacity-[0.3] invert" />
            <p className="text-eyebrow uppercase text-tertiary-300 rtl:normal-case rtl:tracking-normal">
              {t("tip.eyebrow")}
            </p>
            <h2 className="mt-2 font-serif text-heading text-white">{t(`tip.${kind}.title`)}</h2>
            <p className="mt-2 text-pretty text-meta leading-relaxed text-white/90">{t(`tip.${kind}.body`)}</p>
            <Link
              href="/host/calendar"
              className="mt-4 inline-flex items-center gap-1 rounded-full text-meta font-semibold text-accent-200 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800"
            >
              {t("tip.cta")}
              <BrandChevronRightIcon size={14} aria-hidden="true" className="rtl:rotate-180" />
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
