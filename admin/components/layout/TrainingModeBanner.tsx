"use client";

import React from "react";
import { ShieldAlert, RotateCcw } from "lucide-react";
import { useLocale } from "next-intl";

export interface TrainingModeBannerProps {
  isActive: boolean;
  onExit: () => void;
}

export const TrainingModeBanner: React.FC<TrainingModeBannerProps> = ({
  isActive,
  onExit,
}) => {
  const locale = useLocale() as "en" | "fr" | "ar";

  if (!isActive) return null;

  return (
    <aside
      aria-label={
        locale === "fr"
          ? "Bannière du mode entraînement"
          : locale === "ar"
          ? "شريط وضع التدريب"
          : "Training mode banner"
      }
      className="sticky top-0 z-40 bg-[#C96F4F] text-white px-4 py-2 flex items-center justify-between gap-3 text-xs shadow-md animate-in slide-in-from-top duration-200"
    >
      <div className="flex items-center gap-2 font-medium">
        <ShieldAlert className="w-4 h-4 shrink-0 text-white" />
        <span>
          {locale === "fr"
            ? "Mode entraînement actif : aucune action effectuée ici n'affecte les vraies données. Entraînez-vous en toute sécurité !"
            : locale === "ar"
            ? "وضع التدريب مفعّل: لن تؤثر أي عملية على البيانات الحقيقية. تدربوا بكل حرية وأمان!"
            : "Training mode: nothing you do here is real. Practice freely without fear of breaking anything!"}
        </span>
      </div>

      <button
        type="button"
        onClick={onExit}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold transition cursor-pointer text-[11px] shrink-0"
      >
        <RotateCcw className="w-3 h-3" />
        <span>
          {locale === "fr"
            ? "Quitter et réinitialiser"
            : locale === "ar"
            ? "الخروج وإعادة التعيين"
            : "Exit and reset data"}
        </span>
      </button>
    </aside>
  );
};
