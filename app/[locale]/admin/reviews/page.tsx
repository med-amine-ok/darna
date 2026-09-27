import React from "react";
import { getReviews } from "@/lib/data";
import { getTranslations } from "next-intl/server";
import AdminReviewsClient from "@/components/admin/AdminReviewsClient";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const reviews = await getReviews();
  const t = await getTranslations("admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          {t("reviews")}
        </h1>
        <p className="text-neutral-500 text-sm mt-1">
          {t("reviewsSubtitle")}
        </p>
      </div>

      <AdminReviewsClient initialReviews={reviews} />
    </div>
  );
}
