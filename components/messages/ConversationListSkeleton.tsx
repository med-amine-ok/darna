"use client";

import React from "react";

export default function ConversationListSkeleton() {
  return (
    <div className="w-full divide-y divide-tertiary/20">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="w-full px-4 py-3.5 flex items-center gap-3 animate-pulse">
          {/* Avatar Circle */}
          <div className="w-12 h-12 rounded-full bg-tertiary/40 flex-shrink-0" />

          {/* Text lines */}
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-3.5 bg-tertiary/40 rounded w-28" />
              <div className="h-3 bg-tertiary/40 rounded w-8" />
            </div>
            <div className="h-3 bg-tertiary/40 rounded w-44" />
          </div>
        </div>
      ))}
    </div>
  );
}
