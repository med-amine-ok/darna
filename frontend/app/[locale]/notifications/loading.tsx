import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";

/** Notifications placeholder: header lines, then one grouped card of rows. */
export default function NotificationsLoading() {
  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-darnaBg pb-20 pt-8 sm:pt-12" aria-busy="true">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <Skeleton shape="pill" className="h-3 w-28" />
        <Skeleton className="mt-4 h-10 w-64 rounded-xl" />
        <Skeleton className="mt-3 h-4 w-72 rounded-md" />
        <div className="mt-10 space-y-3 rounded-2xl bg-white p-5 shadow-e1">
          {Array.from({ length: 5 }, (_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
