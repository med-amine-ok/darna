import { Skeleton, SkeletonListingCard } from "@/components/ui/Skeleton";

/** Loading state matching ProfileHero + tabs + a listings row (profile, users, agencies). */
export default function ProfileSkeleton() {
  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-darnaBg pb-20 pt-6 sm:pt-10" aria-busy="true">
      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-white shadow-e1">
          <Skeleton className="h-36 w-full rounded-none sm:h-48 lg:h-56" />
          <div className="px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
              <Skeleton className="relative -mt-20 aspect-[4/5] w-28 shrink-0 rounded-t-full ring-4 ring-white sm:-mt-24 sm:w-36" />
              <div className="w-full max-w-sm space-y-3 pb-1">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-9 w-64 max-w-full" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-6 border-b border-primary/[0.08] pb-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} shape="pill" className="h-5 w-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <SkeletonListingCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
