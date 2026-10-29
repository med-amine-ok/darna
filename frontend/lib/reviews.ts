import type { Review } from "@/types";

export type ReviewCategory = "cleanliness" | "accuracy" | "communication" | "location" | "value";

export interface ReviewSummary {
  count: number;
  overall: number;
  categories: Record<ReviewCategory, number>;
}

const CATEGORIES: ReviewCategory[] = ["cleanliness", "accuracy", "communication", "location", "value"];

const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

/** Averages computed from real reviews; null when there are none (show "New"). */
export function summarizeReviews(reviews: Review[] | null | undefined): ReviewSummary | null {
  const valid = (reviews ?? []).filter((r) => typeof r.rating === "number" && r.rating > 0);
  if (valid.length === 0) return null;
  const categories = Object.fromEntries(
    CATEGORIES.map((key) => {
      const scores = valid.map((r) => r[key]).filter((v): v is number => typeof v === "number" && v > 0);
      return [key, scores.length ? average(scores) : 0];
    })
  ) as Record<ReviewCategory, number>;
  return { count: valid.length, overall: average(valid.map((r) => r.rating)), categories };
}
