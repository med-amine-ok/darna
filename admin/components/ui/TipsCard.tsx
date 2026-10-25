"use client";

import React from "react";
import { Lightbulb, Check } from "lucide-react";

export interface TipsCardProps {
  title?: string;
  tips: string[];
  className?: string;
}

export const TipsCard: React.FC<TipsCardProps> = ({
  title = "Conseils pour une bonne annonce",
  tips = [],
  className = "",
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-tertiary-200/80 shadow-darna-card p-4 ${className}`}
    >
      <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 mb-3">
        <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Lightbulb className="w-3.5 h-3.5" />
        </div>
        <h4 className="text-xs font-bold text-primary">{title}</h4>
      </div>

      <div className="space-y-2">
        {tips.map((tip, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs text-neutral-600">
            <span className="w-4 h-4 rounded-full bg-secondary-100 text-secondary-800 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3 stroke-[2.5]" />
            </span>
            <span className="leading-snug">{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
