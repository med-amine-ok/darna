"use client";

import React from "react";
import { ShieldAlert, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

export interface TrainingModeBannerProps {
  isActive: boolean;
  onExit: () => void;
}

export const TrainingModeBanner: React.FC<TrainingModeBannerProps> = ({ isActive, onExit }) => {
  const t = useTranslations("training");

  if (!isActive) return null;

  return (
    <section
      aria-label={t("bannerLabel")}
      className="sticky top-0 z-40 bg-accent-700 text-white px-4 py-2 flex items-center justify-between gap-3 text-xs shadow-md animate-in slide-in-from-top duration-200"
    >
      <div className="flex items-center gap-2 font-medium">
        <ShieldAlert className="w-4 h-4 shrink-0 text-white" aria-hidden="true" />
        <p>{t("bannerMessage")}</p>
      </div>

      <button
        type="button"
        onClick={onExit}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold transition cursor-pointer text-[11px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-accent-700"
      >
        <RotateCcw className="w-3 h-3" aria-hidden="true" />
        <span>{t("exitAndReset")}</span>
      </button>
    </section>
  );
};
