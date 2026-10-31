"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Lightbulb, Check } from "lucide-react";

export interface TipsCardProps {
  title?: string;
  tips: string[];
  className?: string;
}

export const TipsCard: React.FC<TipsCardProps> = ({
  title,
  tips = [],
  className = "",
}) => {
  const t = useTranslations("uiKit.tips");
  return (
    <div
      className={`bg-white rounded-2xl shadow-e1 p-4 ${className}`}
    >
      <div className="flex items-center gap-2 pb-3 border-b border-primary/[0.06] mb-3">
        <div aria-hidden="true" className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Lightbulb className="w-3.5 h-3.5" />
        </div>
        <h4 className="text-xs font-semibold text-primary-900">{title ?? t("title")}</h4>
      </div>

      <ul className="space-y-2">
        {tips.map((tip, idx) => (
          <li key={idx} className="flex items-start gap-2 text-xs text-primary-600">
            <span aria-hidden="true" className="w-4 h-4 rounded-full bg-secondary-100 text-secondary-800 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3 stroke-[2.5]" />
            </span>
            <span className="leading-snug">{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
