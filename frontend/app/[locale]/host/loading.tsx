import { Skeleton } from "@/components/ui";

/** Host workspace loading state: page title, KPI row and two panels, matching the Today and Listings geometry. */
export default function HostLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8" aria-busy="true">
      <div className="space-y-3">
        <Skeleton shape="pill" className="h-4 w-36" />
        <Skeleton className="h-10 w-72 max-w-full rounded-xl" />
        <Skeleton shape="text" className="w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <Skeleton className="h-80 rounded-2xl lg:col-span-8" />
        <Skeleton className="h-80 rounded-2xl lg:col-span-4" />
      </div>
    </div>
  );
}
