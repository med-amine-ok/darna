"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/utils/format";
import { CheckCircle2, CircleDot, Circle } from "lucide-react";

export interface ProgressStep {
  id?: number | string;
  stepNumber?: number;
  number?: number;
  label?: string;
  title?: string;
  completed?: boolean;
}

export interface ProgressChecklistProps {
  steps?: ProgressStep[];
  items?: ProgressStep[];
  currentStep: number;
  totalSteps?: number;
  className?: string;
  /** Heading; defaults to the translated "Creation progress". */
  title?: string;
}

export const ProgressChecklist: React.FC<ProgressChecklistProps> = ({
  steps,
  items,
  currentStep,
  totalSteps,
  className = "",
  title,
}) => {
  const t = useTranslations("uiKit");
  const locale = useLocale();
  const stepList = items || steps || [];
  const maxSteps = totalSteps || stepList.length;

  return (
    <div
      className={`bg-white rounded-2xl border border-tertiary-200/80 shadow-darna-card p-4 ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3">
        <h4 className="text-xs font-bold text-primary">{title ?? t("checklist.title")}</h4>
        <span className="text-xs font-bold text-secondary-700 tabular-nums">
          <span aria-hidden="true">
            {formatNumber(currentStep, locale)}/{formatNumber(maxSteps, locale)}
          </span>
          <span className="sr-only">
            {t("stepper.stepOf", { current: formatNumber(currentStep, locale), total: formatNumber(maxSteps, locale) })}
          </span>
        </span>
      </div>

      <ol className="space-y-2.5">
        {stepList.map((st, idx) => {
          const stepId = st.stepNumber || st.number || st.id || idx + 1;
          const numericStepId = typeof stepId === "number" ? stepId : parseInt(String(stepId), 10) || (idx + 1);
          const isDone = st.completed !== undefined ? st.completed : numericStepId < currentStep;
          const isCurrent = numericStepId === currentStep;

          return (
            <li key={stepId} aria-current={isCurrent ? "step" : undefined} className="flex items-center gap-2.5 text-xs">
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" aria-hidden="true" />
              ) : isCurrent ? (
                <CircleDot className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              ) : (
                <Circle className="w-4 h-4 text-neutral-300 shrink-0" aria-hidden="true" />
              )}
              <span
                className={`font-medium ${
                  isCurrent
                    ? "font-bold text-primary"
                    : isDone
                    ? "text-neutral-700"
                    : "text-neutral-500"
                }`}
              >
                {st.label || st.title || ""}
                {isDone && <span className="sr-only"> – {t("checklist.done")}</span>}
                {isCurrent && <span className="sr-only"> – {t("checklist.current")}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
