import React from "react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/Skeleton";

/** Skeleton in the final geometry of the listing detail (title, bento, content + booking card). */
export default async function Loading() {
  const t = await getTranslations("listing");
  return (
    <div className="min-h-[100dvh] bg-darnaBg pt-6 sm:pt-8 pb-28 lg:pb-16" aria-busy="true">
      <span className="sr-only" role="status">
        {t("loading")}
      </span>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-10 lg:space-y-12">
        {/* Phones: full-bleed photo + overlapping sheet */}
        <div className="md:hidden -mx-4 sm:-mx-6 -mt-6 sm:-mt-8">
          <Skeleton className="aspect-[4/3.4] w-full !rounded-none" />
          <div className="relative -mt-7 rounded-t-[1.75rem] bg-darnaBg px-5 pt-7 flex flex-col items-center gap-3">
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-8 w-3/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        {/* Desktop: title row + bento */}
        <div className="hidden md:block space-y-6">
          <div className="flex items-end justify-between gap-6">
            <div className="space-y-3 w-full max-w-xl">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex gap-2.5">
              <Skeleton shape="pill" className="h-10 w-24" />
              <Skeleton shape="pill" className="h-10 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[440px] lg:h-[520px] rounded-3xl overflow-hidden">
            <Skeleton className="col-span-2 row-span-2 !rounded-none h-full" />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="!rounded-none h-full" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          <div className="lg:col-span-7 xl:col-span-8 space-y-10">
            <div className="flex items-center justify-between gap-6 pb-8 border-b border-primary/[0.08]">
              <div className="space-y-3 w-full max-w-md">
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton shape="circle" className="h-14 w-14 shrink-0" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-7 w-48" />
              <Skeleton shape="text" lines={4} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-32 !rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
            <div className="w-full max-w-sm ms-auto bg-white rounded-3xl p-7 shadow-e3 space-y-5">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-32 w-full !rounded-2xl" />
              <Skeleton shape="pill" className="h-12 w-full" />
              <Skeleton shape="text" lines={3} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
