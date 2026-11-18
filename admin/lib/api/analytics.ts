import "server-only";

import { dzd, type ApiMoney } from "./mapping";

/**
 * Mappers of the analytics endpoints (backend apps/trust):
 * GET /admin/analytics/kpis, GET /admin/analytics/charts, GET /admin/dashboard/attention.
 * Amounts arrive in centimes and leave here in dinars (the admin types).
 */

export const HOST_TYPE_KEYS = ["individual", "agency", "hotel", "hostel"] as const;
export type HostTypeKey = (typeof HOST_TYPE_KEYS)[number];

// ------------------------------------------------------------------ raw shapes

export interface RawKpiMetric {
  key: string;
  value: number;
  previous: number | null;
  change_bp: number | null;
  money: ApiMoney | null;
}

export interface RawKpiReport {
  from: string;
  to: string;
  previous_from: string;
  previous_to: string;
  metrics: RawKpiMetric[];
}

interface RawBucket {
  value: string;
  label?: string;
  count: number;
}

export interface RawCharts {
  revenue_by_month: { key: string; points: { x: string; y: number }[] }[];
  revenue_by_host_type: RawBucket[];
  revenue_by_vertical: RawBucket[];
  bookings_by_wilaya: RawBucket[];
  host_type_by_vertical: Record<string, Record<string, number | null>>;
}

export interface RawAttention {
  items: { kind: string; count: number; top: { id: string; title: string; href: string; since: string | null }[] }[];
}

// ------------------------------------------------------------------ admin shapes

/** One KPI: current value, previous-period value and change in percent (null when nothing to compare). */
export interface KpiValue {
  value: number;
  previous: number | null;
  changePercent: number | null;
}

export interface DashboardKpis {
  /** False when the API could not be read (the screen shows its error state). */
  available: boolean;
  from: string | null;
  to: string | null;
  previousFrom: string | null;
  previousTo: string | null;
  /** Bookings created in the window (all statuses). */
  bookings: KpiValue;
  /** Gross booking value of confirmed and completed stays (DZD). */
  grossBookingValueDzd: KpiValue;
  /** BLADUS commission kept on those bookings (DZD). */
  commissionNetDzd: KpiValue;
  /** Published listings now (snapshot, no previous value). */
  activeListings: KpiValue;
  /** Hosts with at least one sold booking in the window. */
  activeHosts: KpiValue;
  newUsers: KpiValue;
  cancellationRatePercent: KpiValue;
  /** Average host answer time to booking requests; null when no request was answered. */
  responseTimeMinutes: KpiValue | null;
  // Flat aliases kept for older callers.
  totalGrossVolumeDzd: number;
  netPlatformRevenueDzd: number;
  commissionRevenueDzd: number;
  totalBookingsCount: number;
  activeListingsCount: number;
  newUsersCount: number;
}

export interface MonthPoint {
  /** YYYY-MM */
  month: string;
  commissionDzd: number;
  grossDzd: number;
}

export interface DashboardCharts {
  available: boolean;
  monthly: MonthPoint[];
  /** Net commission per host type (DZD). */
  revenueByHostType: { key: HostTypeKey; commissionDzd: number }[];
  /** Net commission per offer: home, hotel, hostel, experience, vehicle, trip (or "stays" when grouped). */
  revenueByVertical: { key: string; commissionDzd: number }[];
  /** Sold bookings per wilaya, most first; the name is in the request locale. */
  bookingsByWilaya: { wilayaCode: string; wilayaName: string; bookings: number }[];
  /** Sold bookings per host type (sum of the cross tab). */
  bookingsByHostType: { key: HostTypeKey; bookings: number }[];
  /** Sold bookings per offer (sum of the cross tab). */
  bookingsByOffer: { key: string; bookings: number }[];
  /** Cross tab host type x offer; null = impossible combination. */
  hostTypeByVertical: Record<string, Record<string, number | null>>;
}

export interface AttentionRow {
  id: string;
  title: string;
  href: string;
  since: string | null;
}

export interface AttentionGroup {
  kind: string;
  count: number;
  top: AttentionRow[];
}

export interface AttentionItems {
  available: boolean;
  pendingHostsCount: number;
  pendingListingsCount: number;
  flaggedReviewsCount: number;
  disputedBookingsCount: number;
  negativeWalletsCount: number;
  pendingTopupsCount: number;
  totalAttentionCount: number;
  /** Oldest waiting item of each card (ISO date) or null. */
  oldestSince: { hosts: string | null; listings: string | null; reviews: string | null; disputes: string | null };
  groups: AttentionGroup[];
}

// ------------------------------------------------------------------ mappers

const MONEY_KEYS = new Set(["gross_booking_value", "commission_net"]);

function kpi(metric: RawKpiMetric | undefined, scale: (n: number) => number = (n) => n): KpiValue {
  if (!metric) return { value: 0, previous: null, changePercent: null };
  return {
    value: scale(metric.value ?? 0),
    previous: metric.previous === null || metric.previous === undefined ? null : scale(metric.previous),
    changePercent: metric.change_bp === null || metric.change_bp === undefined ? null : metric.change_bp / 100,
  };
}

export function emptyKpis(): DashboardKpis {
  const zero = { value: 0, previous: null, changePercent: null };
  return {
    available: false,
    from: null,
    to: null,
    previousFrom: null,
    previousTo: null,
    bookings: zero,
    grossBookingValueDzd: zero,
    commissionNetDzd: zero,
    activeListings: zero,
    activeHosts: zero,
    newUsers: zero,
    cancellationRatePercent: zero,
    responseTimeMinutes: null,
    totalGrossVolumeDzd: 0,
    netPlatformRevenueDzd: 0,
    commissionRevenueDzd: 0,
    totalBookingsCount: 0,
    activeListingsCount: 0,
    newUsersCount: 0,
  };
}

export function toKpis(raw: RawKpiReport): DashboardKpis {
  const byKey = new Map(raw.metrics.map((m) => [m.key, m]));
  const money = (key: string) => kpi(byKey.get(key), MONEY_KEYS.has(key) ? (n) => dzd(n) : undefined);
  const bookings = kpi(byKey.get("bookings"));
  const gross = money("gross_booking_value");
  const commission = money("commission_net");
  const activeListings = kpi(byKey.get("active_listings"));
  const newUsers = kpi(byKey.get("new_users"));
  const response = byKey.get("response_time_minutes");
  return {
    available: true,
    from: raw.from,
    to: raw.to,
    previousFrom: raw.previous_from,
    previousTo: raw.previous_to,
    bookings,
    grossBookingValueDzd: gross,
    commissionNetDzd: commission,
    activeListings,
    activeHosts: kpi(byKey.get("active_hosts")),
    newUsers,
    // basis points -> percent
    cancellationRatePercent: kpi(byKey.get("cancellation_rate_bp"), (n) => n / 100),
    // The API answers 0 when no request was answered in the window: treat it as "no data".
    responseTimeMinutes: response && response.value > 0 ? kpi(response) : null,
    totalGrossVolumeDzd: gross.value,
    netPlatformRevenueDzd: commission.value,
    commissionRevenueDzd: commission.value,
    totalBookingsCount: bookings.value,
    activeListingsCount: activeListings.value,
    newUsersCount: newUsers.value,
  };
}

export function emptyCharts(): DashboardCharts {
  return {
    available: false,
    monthly: [],
    revenueByHostType: [],
    revenueByVertical: [],
    bookingsByWilaya: [],
    bookingsByHostType: [],
    bookingsByOffer: [],
    hostTypeByVertical: {},
  };
}

export function toCharts(raw: RawCharts): DashboardCharts {
  const series = (key: string) => new Map((raw.revenue_by_month.find((s) => s.key === key)?.points ?? []).map((p) => [p.x, p.y]));
  const revenue = series("revenue");
  const gross = series("gross_booking_value");
  const months = Array.from(new Set(Array.from(revenue.keys()).concat(Array.from(gross.keys())))).sort();
  const cross = raw.host_type_by_vertical ?? {};
  const offerTotals = new Map<string, number>();
  for (const row of Object.values(cross)) {
    for (const [offer, n] of Object.entries(row ?? {})) offerTotals.set(offer, (offerTotals.get(offer) ?? 0) + (n ?? 0));
  }
  return {
    available: true,
    monthly: months.map((month) => ({ month, commissionDzd: dzd(revenue.get(month) ?? 0), grossDzd: dzd(gross.get(month) ?? 0) })),
    revenueByHostType: HOST_TYPE_KEYS.map((key) => ({
      key,
      commissionDzd: dzd(raw.revenue_by_host_type.find((b) => b.value === key)?.count ?? 0),
    })),
    revenueByVertical: raw.revenue_by_vertical.map((b) => ({ key: b.value, commissionDzd: dzd(b.count) })),
    bookingsByWilaya: raw.bookings_by_wilaya.map((b) => ({
      wilayaCode: b.value.padStart(2, "0"),
      wilayaName: b.label || b.value,
      bookings: b.count,
    })),
    bookingsByHostType: HOST_TYPE_KEYS.map((key) => ({
      key,
      bookings: Object.values(cross[key] ?? {}).reduce<number>((sum, n) => sum + (n ?? 0), 0),
    })),
    bookingsByOffer: Array.from(offerTotals, ([key, bookings]) => ({ key, bookings })),
    hostTypeByVertical: cross,
  };
}

export function emptyAttention(): AttentionItems {
  return {
    available: false,
    pendingHostsCount: 0,
    pendingListingsCount: 0,
    flaggedReviewsCount: 0,
    disputedBookingsCount: 0,
    negativeWalletsCount: 0,
    pendingTopupsCount: 0,
    totalAttentionCount: 0,
    oldestSince: { hosts: null, listings: null, reviews: null, disputes: null },
    groups: [],
  };
}

/** Moderation queues behind each dashboard card. */
const CARD_KINDS = {
  hosts: ["moderation.host_verification", "moderation.document"],
  listings: ["moderation.listing_review", "moderation.listing_revision", "moderation.trip_review"],
  reviews: ["moderation.review_report"],
  disputes: ["moderation.dispute"],
} as const;

export function toAttention(raw: RawAttention): AttentionItems {
  const groups: AttentionGroup[] = (raw.items ?? []).map((g) => ({
    kind: g.kind,
    count: g.count,
    top: (g.top ?? []).map((r) => ({ id: r.id, title: r.title, href: r.href, since: r.since })),
  }));
  const count = (kinds: readonly string[]) => groups.filter((g) => kinds.includes(g.kind)).reduce((s, g) => s + g.count, 0);
  const oldest = (kinds: readonly string[]): string | null => {
    const dates = groups
      .filter((g) => kinds.includes(g.kind))
      .flatMap((g) => g.top.map((r) => r.since))
      .filter((d): d is string => Boolean(d))
      .sort();
    return dates[0] ?? null;
  };
  const hosts = count(CARD_KINDS.hosts);
  const listings = count(CARD_KINDS.listings);
  const reviews = count(CARD_KINDS.reviews);
  const disputes = count(CARD_KINDS.disputes);
  return {
    available: true,
    pendingHostsCount: hosts,
    pendingListingsCount: listings,
    flaggedReviewsCount: reviews,
    disputedBookingsCount: disputes,
    negativeWalletsCount: count(["wallets.below_zero"]),
    pendingTopupsCount: count(["wallets.topups_pending"]),
    totalAttentionCount: groups.reduce((s, g) => s + g.count, 0),
    oldestSince: {
      hosts: oldest(CARD_KINDS.hosts),
      listings: oldest(CARD_KINDS.listings),
      reviews: oldest(CARD_KINDS.reviews),
      disputes: oldest(CARD_KINDS.disputes),
    },
    groups,
  };
}
