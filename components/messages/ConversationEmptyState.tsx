"use client";

import React from "react";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { TbMessageCircleOff } from "react-icons/tb";

interface Props {
  isFiltered: boolean;
  onClearFilters?: () => void;
}

export default function ConversationEmptyState({ isFiltered, onClearFilters }: Props) {
  const router = useRouter();
  const t = useTranslations("messages");

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none my-auto">
      {/* Icon: speech bubble outline, medium gray */}
      <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
        <TbMessageCircleOff size={28} />
      </div>

      {isFiltered ? (
        <>
          <h2 className="text-base font-bold text-neutral-900 leading-snug">
            {t("filteredTitle")}
          </h2>
          <p className="text-xs text-neutral-500 mt-1 max-w-[220px]">
            {t("filteredSubtitle")}
          </p>
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-4 px-4 py-2 rounded-full border border-neutral-300 hover:border-neutral-900 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition cursor-pointer"
            >
              {t("clearAllFilters")}
            </button>
          )}
        </>
      ) : (
        <>
          <h2 className="text-base font-bold text-neutral-900 leading-snug">
            {t("trueEmptyTitle")}
          </h2>
          <p className="text-xs text-neutral-500 mt-1 max-w-[240px]">
            {t("trueEmptySubtitle")}
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 px-4 py-2 rounded-full bg-neutral-900 hover:bg-black text-xs font-semibold text-white transition cursor-pointer shadow-2xs"
          >
            {t("exploreHomes")}
          </button>
        </>
      )}
    </div>
  );
}
