import "server-only";

import { api } from "@/lib/api/client";
import { emptyPage, filterValue, logReadError, write } from "@/lib/api/mapping";
import {
  MODERATED_STATUSES,
  toApiReviewStatus,
  toReviewItem,
  toStatusFacets,
  type ApiAdminReview,
  type ApiReviewPage,
} from "@/lib/api/reviews";
import { ReviewItem, PaginatedResult, AdminActor } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { ValidationError } from "./errors";

/** Review moderation, backed by /admin/reviews (BR-REV-03). The backend writes the audit log. */

export interface ReviewFilterParams {
  status?: string; // "all" | ReviewStatus
  /** Only reviews with open reports. */
  reported?: boolean;
  vertical?: string;
  rating?: number;
  wilayaCode?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** The backend asks for a written reason of at least 10 characters on hide. */
const MIN_API_REASON = 10;
const DEFAULT_HIDE_REASON = "Hidden by a moderator from the BLADUS admin console.";

export interface ReviewListResult extends PaginatedResult<ReviewItem> {
  /** False when the API could not be read (the screen shows its error state). */
  ok?: boolean;
}

export async function listReviews(params: ReviewFilterParams = {}): Promise<ReviewListResult> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 12));
  const status = filterValue(params.status);
  const vertical = filterValue(params.vertical);
  const filters = {
    vertical: vertical === "hotel" ? "hotel,hostel" : vertical,
    rating: params.rating && params.rating > 0 ? params.rating : undefined,
    wilaya: filterValue(params.wilayaCode) ? Number(params.wilayaCode) : undefined,
    q: params.search?.trim() || undefined,
  };
  try {
    const [answer, reported] = await Promise.all([
      api<ApiReviewPage>("/admin/reviews", {
        query: {
          ...filters,
          status: status ? toApiReviewStatus(status) : MODERATED_STATUSES.join(","),
          reported: params.reported ? true : undefined,
          page,
          page_size: pageSize,
        },
      }),
      // Count of reviews with open reports, for the "reports" counter.
      api<ApiReviewPage>("/admin/reviews", {
        query: { ...filters, status: MODERATED_STATUSES.join(","), reported: true, page: 1, page_size: 1 },
      }).catch(() => null),
    ]);
    const total = answer.meta?.total_count ?? 0;
    return {
      ok: true,
      rows: (answer.results ?? []).map(toReviewItem),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      facets: {
        status: toStatusFacets(answer.facets?.status),
        reported: { open: reported?.meta?.total_count ?? 0 },
      },
    };
  } catch (error) {
    logReadError("listReviews", error);
    return { ...emptyPage<ReviewItem>(page, pageSize), ok: false };
  }
}

function checkedReason(reason: string | undefined, fallback: string | undefined): string | undefined {
  const value = reason?.trim() || fallback;
  if (value === undefined) return undefined;
  if (value.length < MIN_API_REASON) {
    throw new ValidationError(`A reason of at least ${MIN_API_REASON} characters is required`);
  }
  return value;
}

async function move(id: string, action: "hide" | "restore" | "dismiss-reports", reason?: string): Promise<ReviewItem> {
  const body = reason ? { reason } : {};
  const review = await write(() =>
    api<ApiAdminReview>(`/admin/reviews/${encodeURIComponent(id)}/${action}`, { method: "POST", body }),
  );
  return toReviewItem(review);
}

export async function hideReview(id: string, actor: AdminActor, reason?: string): Promise<ReviewItem> {
  assertCan(actor.role, "reviews.moderate");
  return move(id, "hide", checkedReason(reason, DEFAULT_HIDE_REASON));
}

export async function restoreReview(id: string, actor: AdminActor, reason?: string): Promise<ReviewItem> {
  assertCan(actor.role, "reviews.moderate");
  return move(id, "restore", checkedReason(reason, undefined));
}

/** Removal is final on the backend (status "removed", super admin only). */
export async function deleteReview(id: string, actor: AdminActor): Promise<{ id: string; status: "deleted" }> {
  assertCan(actor.role, "reviews.delete");
  await write(() => api<null>(`/admin/reviews/${encodeURIComponent(id)}`, { method: "DELETE" }));
  return { id, status: "deleted" };
}

/** Dismisses the open reports and keeps the review published. */
export async function dismissFlag(id: string, actor: AdminActor, reason?: string): Promise<ReviewItem> {
  assertCan(actor.role, "reviews.moderate");
  return move(id, "dismiss-reports", checkedReason(reason, undefined));
}
