"use client";

import React from "react";
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
}

export const ProgressChecklist: React.FC<ProgressChecklistProps> = ({
  steps,
  items,
  currentStep,
  totalSteps,
  className = "",
}) => {
  const stepList = items || steps || [];
  const maxSteps = totalSteps || stepList.length;

  return (
    <div
      className={`bg-white rounded-2xl border border-tertiary-200/80 shadow-darna-card p-4 ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3">
        <h4 className="text-xs font-bold text-primary">Progression de la création</h4>
        <span className="text-xs font-bold text-secondary tabular-nums">
          {currentStep}/{maxSteps}
        </span>
      </div>

      <div className="space-y-2.5">
        {stepList.map((st, idx) => {
          const stepId = st.stepNumber || st.number || st.id || idx + 1;
          const numericStepId = typeof stepId === "number" ? stepId : parseInt(String(stepId), 10) || (idx + 1);
          const isDone = st.completed !== undefined ? st.completed : numericStepId < currentStep;
          const isCurrent = numericStepId === currentStep;

          return (
            <div key={stepId} className="flex items-center gap-2.5 text-xs">
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
              ) : isCurrent ? (
                <CircleDot className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-neutral-300 shrink-0" />
              )}
              <span
                className={`font-medium ${
                  isCurrent
                    ? "font-bold text-primary"
                    : isDone
                    ? "text-neutral-700"
                    : "text-neutral-400"
                }`}
              >
                {st.label || st.title || ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
