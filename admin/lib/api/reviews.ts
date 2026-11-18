import "server-only";

import type { HostType, ListingVertical, ReviewItem, ReviewStatus } from "@/lib/types";

/** One report inside an AdminReview (reviews/serializers.py AdminReportSerializer). */
export interface ApiReviewReport {
  reason_code: string;
  note: string | null;
  status: string;
  created_at: string;
}

/** AdminReview of GET /admin/reviews (reviews/serializers.py AdminReviewSerializer). */
export interface ApiAdminReview {
  id: string;
  author: { id: string; display_name: string; avatar_url: string | null } | null;
  author_role: string;
  listing_id: string | null;
  trip_id: string | null;
  host_account_id: string;
  rating_overall: number;
  comment: string;
  language: string;
  status: string;
  stay_month: string | null;
  published_at: string | null;
  reply: { body: string; created_at: string; editable_until: string } | null;
  booking_reference: string;
  listing_title: string | null;
  vertical: string | null;
  wilaya_code: number | null;
  open_reports: number;
  reports: ApiReviewReport[];
}

/** Facet row of the list answer: `{"status": [{value, label, count}]}`. */
export interface ApiFacetRow {
  value: string;
  label: string;
  count: number;
}

export interface ApiReviewPage {
  results: ApiAdminReview[];
  meta: { page: number; page_size: number; total_count: number; total_pages: number };
  facets?: { status?: ApiFacetRow[] };
}

/** Statuses the moderation screen shows ("submitted" reviews wait for the other side and are not public yet). */
export const MODERATED_STATUSES = ["published", "flagged", "hidden", "removed"] as const;

/** Admin status name to the backend one ("deleted" is "removed" in the API). */
export function toApiReviewStatus(status: string): string {
  return status === "deleted" ? "removed" : status;
}

function toStatus(status: string): ReviewStatus {
  if (status === "removed") return "deleted";
  if (status === "flagged" || status === "hidden" || status === "published") return status;
  // "submitted" never reaches the screen (filtered out); keep a safe value if it does.
  return "published";
}

function toVertical(review: ApiAdminReview): ListingVertical {
  if (!review.listing_id && review.trip_id) return "trip";
  // The admin has no separate hostel vertical; its label covers hotels and hostels.
  if (review.vertical === "hostel") return "hotel";
  const known: ListingVertical[] = ["home", "hotel", "experience", "vehicle", "trip"];
  return known.includes(review.vertical as ListingVertical) ? (review.vertical as ListingVertical) : "home";
}

export function toReviewItem(review: ApiAdminReview): ReviewItem {
  const openReports = (review.reports ?? []).filter((r) => r.status === "open");
  const flagReason = openReports.length
    ? openReports.map((r) => (r.note ? `${r.reason_code}: ${r.note}` : r.reason_code)).join(" / ")
    : undefined;
  const firstReportAt = openReports.length ? openReports[openReports.length - 1].created_at : undefined;
  return {
    id: review.id,
    listingId: review.listing_id ?? review.trip_id ?? "",
    listingTitle: review.listing_title ?? "",
    vertical: toVertical(review),
    guestId: review.author?.id ?? "",
    guestName: review.author?.display_name ?? "",
    guestAvatar: review.author?.avatar_url ?? undefined,
    hostId: review.host_account_id,
    // The API gives only the host account id (no name or type) on AdminReview.
    hostName: "",
    hostType: "" as unknown as HostType,
    wilayaCode: review.wilaya_code ? String(review.wilaya_code).padStart(2, "0") : "",
    rating: review.rating_overall,
    comment: review.comment,
    status: toStatus(review.status),
    flagReason,
    flaggedAt: firstReportAt,
    openReports: review.open_reports ?? openReports.length,
    bookingReference: review.booking_reference,
    // No creation time on AdminReview: the publication time is the closest one.
    createdAt: review.published_at ?? firstReportAt ?? "",
    hostReply: review.reply ? { comment: review.reply.body, createdAt: review.reply.created_at } : undefined,
    adminNotes: [],
  };
}

/** Facet rows to the `{status: {all, published, flagged, hidden, deleted}}` shape of the screen. */
export function toStatusFacets(rows: ApiFacetRow[] | undefined): Record<string, number> {
  const out: Record<string, number> = { all: 0, published: 0, flagged: 0, hidden: 0, deleted: 0 };
  for (const row of rows ?? []) {
    if (!(MODERATED_STATUSES as readonly string[]).includes(row.value)) continue;
    const key = toStatus(row.value);
    out[key] = (out[key] ?? 0) + row.count;
    out.all += row.count;
  }
  return out;
}
