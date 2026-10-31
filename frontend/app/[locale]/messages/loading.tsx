import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";

/** Inbox placeholder with the same two-pane geometry as MessagesClient. */
export default function MessagesLoading() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 bg-darnaBg md:p-4 lg:px-6 lg:pb-6" aria-busy="true">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl overflow-hidden bg-white md:rounded-3xl md:shadow-e2">
        <div className="w-full shrink-0 space-y-4 border-e border-primary/[0.08] p-5 md:w-[340px] lg:w-[380px]">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton shape="pill" className="h-9 w-40" />
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
        <div className="hidden flex-1 flex-col gap-4 bg-darnaBg/60 p-8 md:flex">
          <Skeleton className="h-11 w-2/3 rounded-2xl" />
          <Skeleton className="ms-auto h-11 w-1/2 rounded-2xl" />
          <Skeleton className="h-16 w-3/5 rounded-2xl" />
          <Skeleton className="ms-auto h-11 w-2/5 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
