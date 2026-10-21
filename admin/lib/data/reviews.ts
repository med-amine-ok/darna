// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { ReviewItem, ReviewStatus, PaginatedResult } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { logAudit } from "./audit";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ReviewFilterParams {
  status?: string; // "all" | ReviewStatus
  vertical?: string;
  rating?: number;
  wilayaCode?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listReviews(
  params: ReviewFilterParams = {}
): Promise<PaginatedResult<ReviewItem>> {
  await delay(180);

  const page = params.page || 1;
  const pageSize = params.pageSize || 12;

  let filtered = [...store.reviews];

  if (params.status && params.status !== "all") {
    filtered = filtered.filter((r) => r.status === params.status);
  }

  if (params.vertical && params.vertical !== "all") {
    filtered = filtered.filter((r) => r.vertical === params.vertical);
  }

  if (params.rating && params.rating > 0) {
    filtered = filtered.filter((r) => r.rating === params.rating);
  }

  if (params.wilayaCode && params.wilayaCode !== "all") {
    filtered = filtered.filter((r) => r.wilayaCode === params.wilayaCode);
  }

  if (params.search?.trim()) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter((r) => {
      const matchComment = r.comment.toLowerCase().includes(q);
      const matchGuest = r.guestName.toLowerCase().includes(q);
      const matchListing = r.listingTitle.toLowerCase().includes(q);
      return matchComment || matchGuest || matchListing;
    });
  }

  const facets: Record<string, Record<string, number>> = {
    status: {
      all: store.reviews.length,
      published: store.reviews.filter((r) => r.status === "published").length,
      flagged: store.reviews.filter((r) => r.status === "flagged").length,
      hidden: store.reviews.filter((r) => r.status === "hidden").length,
      deleted: store.reviews.filter((r) => r.status === "deleted").length,
    },
  };

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages,
    facets,
  };
}

export async function hideReview(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<ReviewItem> {
  assertCan(actor.role, "reviews.moderate");
  await delay(200);

  const idx = store.reviews.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("Review not found");

  const prev = { ...store.reviews[idx] };
  store.reviews[idx] = {
    ...store.reviews[idx],
    status: "hidden",
  };

  await logAudit(
    actor,
    "REVIEW_HIDE",
    "review",
    id,
    `Hidden review for ${prev.listingTitle}`,
    prev,
    store.reviews[idx]
  );

  return store.reviews[idx];
}

export async function restoreReview(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<ReviewItem> {
  assertCan(actor.role, "reviews.moderate");
  await delay(200);

  const idx = store.reviews.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("Review not found");

  const prev = { ...store.reviews[idx] };
  store.reviews[idx] = {
    ...store.reviews[idx],
    status: "published",
  };

  await logAudit(
    actor,
    "REVIEW_RESTORE",
    "review",
    id,
    `Restored published review for ${prev.listingTitle}`,
    prev,
    store.reviews[idx]
  );

  return store.reviews[idx];
}

export async function deleteReview(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<ReviewItem> {
  assertCan(actor.role, "reviews.delete");
  await delay(200);

  const idx = store.reviews.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("Review not found");

  const prev = { ...store.reviews[idx] };
  store.reviews[idx] = {
    ...store.reviews[idx],
    status: "deleted",
  };

  await logAudit(
    actor,
    "REVIEW_DELETE",
    "review",
    id,
    `Soft-deleted review for ${prev.listingTitle}`,
    prev,
    store.reviews[idx]
  );

  return store.reviews[idx];
}

export async function dismissFlag(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<ReviewItem> {
  assertCan(actor.role, "reviews.moderate");
  await delay(200);

  const idx = store.reviews.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("Review not found");

  const prev = { ...store.reviews[idx] };
  store.reviews[idx] = {
    ...store.reviews[idx],
    status: "published",
    flagReason: undefined,
  };

  await logAudit(
    actor,
    "REVIEW_FLAG_DISMISS",
    "review",
    id,
    `Dismissed flag on review for ${prev.listingTitle}`,
    prev,
    store.reviews[idx]
  );

  return store.reviews[idx];
}
