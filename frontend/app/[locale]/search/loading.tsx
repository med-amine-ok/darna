import React from "react";
import { getTranslations } from "next-intl/server";
import { Skeleton, SkeletonListingCard } from "@/components/ui/Skeleton";

/** First-load skeleton in the exact geometry of the search page (filter bar, header, cards, map panel). */
export default async function Loading() {
  const t = await getTranslations("search");
  return (
    <div className="flex flex-col bg-darnaBg" aria-busy="true">
      <span className="sr-only" role="status">
        {t("loadingResults")}
      </span>
      <div className="glass border-b border-primary/[0.08]">
        <div className="mx-auto flex max-w-[1920px] items-center gap-2 overflow-hidden px-4 py-3.5 sm:px-6 lg:px-8">
          {[120, 96, 132, 112, 104, 140, 128].map((w, i) => (
            <span key={i} style={{ width: w }} className="shrink-0">
              <Skeleton shape="pill" className="h-10" />
            </span>
          ))}
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-[1920px] grid-cols-1 gap-8 px-4 pt-6 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-7">
          <Skeleton className="h-8 w-2/3 max-w-md" />
          <Skeleton className="mt-2 h-4 w-48" />
          <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonListingCard key={i} />
            ))}
          </div>
        </div>
        <div className="hidden lg:col-span-5 lg:block">
          <span className="skeleton block h-[calc(100dvh-184px)] min-h-[480px] rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
