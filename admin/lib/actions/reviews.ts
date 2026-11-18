"use server";

import * as data from "@/lib/data/reviews";
import { runAction, id, str } from "@/lib/auth/run-action";

type ListParams = Parameters<typeof data.listReviews>[0];

const optReason = (value: unknown) => (value === undefined || value === null ? undefined : str(value, "reason", 2000));

export async function listReviews(params: ListParams = {}) {
  return runAction("reviews.view", () => data.listReviews(params ?? {}));
}

export async function hideReview(reviewId: string, reason?: string) {
  return runAction("reviews.moderate", (actor) => data.hideReview(id(reviewId), actor, optReason(reason)));
}

export async function restoreReview(reviewId: string, reason?: string) {
  return runAction("reviews.moderate", (actor) => data.restoreReview(id(reviewId), actor, optReason(reason)));
}

export async function deleteReview(reviewId: string) {
  return runAction("reviews.delete", (actor) => data.deleteReview(id(reviewId), actor));
}

export async function dismissFlag(reviewId: string, reason?: string) {
  return runAction("reviews.moderate", (actor) => data.dismissFlag(id(reviewId), actor, optReason(reason)));
}
