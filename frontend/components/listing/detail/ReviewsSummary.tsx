"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDate, formatNumber } from "@/lib/i18n/date-locale";
import type { Review } from "@/types";
import { Avatar, KitEmptyState } from "@/components/ui";
import { BrandStarIcon } from "@/components/icons";

export interface RatingMetric {
  key: string;
  label: string;
  score: number;
}

interface ReviewsSummaryProps {
  id?: string;
  reviews: Review[];
  /** Formatted overall rating, or null when the listing is new. */
  rating: string | null;
  reviewCount: number;
  metrics: RatingMetric[];
  /** Max review cards to show. */
  limit?: number;
  className?: string;
}

/**
 * Reviews block shared by every detail page: serif headline with the rating, category
 * bars that grow from the reading start when revealed (.reveal-bar), review cards, and an
 * honest empty state (a rating without written reviews is not "no reviews yet").
 */
export default function ReviewsSummary({ id = "reviews", reviews, rating, reviewCount, metrics, limit = 6, className }: ReviewsSummaryProps) {
  const t = useTranslations("listing");
  const locale = useLocale();
  const headingId = `${id}-heading`;
  const shown = reviews.slice(0, limit);

  return (
    <section id={id} data-reveal aria-labelledby={headingId} className={`scroll-mt-28 space-y-8 ${className ?? ""}`}>
      <div className="flex items-center gap-3">
        <BrandStarIcon size={26} className="text-accent-600 shrink-0" />
        <h2 id={headingId} className="font-serif text-display-md text-primary-900 tabular-nums">
          {rating ? t("ratingAndReviews", { rating, count: reviewCount }) : t("reviews")}
        </h2>
      </div>

      {metrics.length > 0 && (
        <dl className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-5 text-body">
          {metrics.map((m) => (
            // dt/dd must be direct children of the group div (valid <dl> markup), so the
            // bar lives in its own decorative <dd> spanning both columns.
            <div key={m.key} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 font-medium text-primary-800">
              <dt>{m.label}</dt>
              <dd className="tabular-nums font-semibold text-primary-900">
                {formatNumber(m.score, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </dd>
              <dd className="col-span-2 h-1 w-full bg-primary/[0.08] rounded-full overflow-hidden" aria-hidden="true">
                <div className="h-full reveal-bar" style={{ width: `${(m.score / 5) * 100}%` }}>
                  <div className="h-full w-full rounded-full bg-primary-800" />
                </div>
              </dd>
            </div>
          ))}
        </dl>
      )}

      {shown.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {shown.map((rev) => {
            const name = rev.user?.name || t("guestFallback");
            return (
              <li key={rev.id} className="p-6 rounded-2xl bg-white shadow-e1 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar name={name} src={rev.user?.image} size="md" decorative />
                  <div className="min-w-0">
                    <p className="font-semibold text-body text-primary-900 truncate">{name}</p>
                    {rev.createdAt && (
                      <p className="text-meta text-primary-500">{formatDate(rev.createdAt, locale, { month: "long", year: "numeric" })}</p>
                    )}
                  </div>
                </div>
                <p className="text-body text-primary-700">{rev.comment}</p>
              </li>
            );
          })}
        </ul>
      ) : reviewCount > 0 ? (
        <p className="rounded-2xl bg-white shadow-e1 p-5 text-body text-primary-600">
          {t("reviewsWithoutText", { count: reviewCount })}
        </p>
      ) : (
        <KitEmptyState compact variant="generic" title={t("noReviewsYet")} description={t("noReviewsYetDesc")} className="bg-white rounded-2xl shadow-e1" />
      )}
    </section>
  );
}
