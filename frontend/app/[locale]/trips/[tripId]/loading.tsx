import React from "react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/Skeleton";

/** Skeleton in the final geometry of the trip detail (cinematic cover, content + booking card). */
export default async function Loading() {
  const t = await getTranslations("tripDetail");
  return (
    <div className="min-h-[100dvh] bg-darnaBg pt-4 sm:pt-6 pb-28 lg:pb-16" aria-busy="true">
      <span className="sr-only" role="status">
        {t("loading")}
      </span>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-10 lg:space-y-12">
        <div>
          <Skeleton className="hidden md:block h-5 w-40 mb-4 mt-3" />
          <div className="-mx-4 sm:-mx-6 md:mx-0 -mt-4 sm:-mt-6 md:mt-0">
            <Skeleton className="h-[68svh] min-h-[420px] max-h-[640px] md:h-[560px] !rounded-none md:!rounded-3xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 md:pt-6">
          <div className="lg:col-span-7 xl:col-span-8 space-y-10">
            <Skeleton className="h-28 w-full !rounded-3xl" />
            <div className="space-y-4">
              <Skeleton className="h-7 w-56" />
              <Skeleton shape="text" lines={4} />
            </div>
            <div className="space-y-6">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex gap-6">
                  <Skeleton shape="circle" className="h-10 w-10 shrink-0" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton shape="text" lines={2} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
            <div className="w-full max-w-sm ms-auto bg-white rounded-3xl p-7 shadow-e3 space-y-5">
              <Skeleton className="h-8 w-1/2" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-16 !rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-14 w-full" />
              <Skeleton shape="pill" className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
