import React from "react";

export default function Loading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 animate-pulse">
      {/* Category Strip Skeleton */}
      <div className="flex items-center gap-3 overflow-hidden pb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-28 bg-neutral-200/80 rounded-full shrink-0"
          />
        ))}
      </div>

      {/* Grid of Skeleton Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <div className="w-full aspect-square bg-neutral-200/80 rounded-3xl" />
            <div className="h-4 bg-neutral-200/80 rounded-md w-3/4" />
            <div className="h-3 bg-neutral-200/60 rounded-md w-1/2" />
            <div className="h-4 bg-neutral-200/80 rounded-md w-1/3 pt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
