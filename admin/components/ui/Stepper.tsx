"use client";

import React from "react";
import { Check } from "lucide-react";

export interface StepItem {
  id: number;
  label?: string;
  title?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  className = "",
}) => {
  return (
    <div className={`w-full py-4 overflow-x-auto ${className}`}>
      <div className="flex items-center min-w-[600px] justify-between">
        {steps.map((step, idx) => {
          const isDone = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > currentStep;
          const isClickable = onStepClick && (isDone || isCurrent);

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle & Label */}
              <div
                onClick={() => isClickable && onStepClick(step.id)}
                className={`flex items-center gap-2.5 select-none ${
                  isClickable ? "cursor-pointer group" : "cursor-default"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                    isDone
                      ? "bg-secondary text-white"
                      : isCurrent
                      ? "bg-primary text-white shadow-xs ring-4 ring-primary/10"
                      : "border-2 border-neutral-300 text-neutral-400 bg-white"
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.id}
                </div>
                <span
                  className={`text-xs whitespace-nowrap transition-colors ${
                    isCurrent
                      ? "font-bold text-primary"
                      : isDone
                      ? "font-semibold text-neutral-700 group-hover:text-primary"
                      : "font-medium text-neutral-400"
                  }`}
                >
                  {step.title || step.label}
                </span>
              </div>

              {/* Connecting Line between steps */}
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 transition-colors ${
                    step.id < currentStep ? "bg-secondary" : "bg-neutral-200"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
