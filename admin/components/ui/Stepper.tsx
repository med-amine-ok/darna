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
  const [showStepSheet, setShowStepSheet] = React.useState(false);
  const currentStepObj = steps.find((s) => s.id === currentStep) || steps[0];
  const progressPercent = steps.length > 0 ? (currentStep / steps.length) * 100 : 0;

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile & Tablet Compact View (< lg) */}
      <div className="lg:hidden py-1">
        <button
          type="button"
          onClick={() => setShowStepSheet(true)}
          className="w-full text-start group flex items-center justify-between"
          aria-label="Voir toutes les étapes"
        >
          <div className="min-w-0 flex-1 pe-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary">
                Étape {currentStep} sur {steps.length}
              </span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs font-semibold text-neutral-600 truncate">
                {currentStepObj?.title || currentStepObj?.label}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] font-semibold text-secondary-700 bg-secondary-50 px-2 py-1 rounded-md shrink-0">
            Étapes ▾
          </span>
        </button>

        {/* Step Sheet Drawer for Mobile */}
        {showStepSheet && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div
              className="bg-white rounded-t-2xl p-5 max-h-[80dvh] overflow-y-auto space-y-3 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-tertiary-200">
                <h3 className="font-bold text-sm text-primary">Toutes les étapes</h3>
                <button
                  type="button"
                  onClick={() => setShowStepSheet(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:bg-neutral-100 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 py-2">
                {steps.map((step) => {
                  const isDone = step.id < currentStep;
                  const isCurrent = step.id === currentStep;
                  const isClickable = onStepClick && (isDone || isCurrent);

                  return (
                    <div
                      key={step.id}
                      onClick={() => {
                        if (isClickable && onStepClick) {
                          onStepClick(step.id);
                          setShowStepSheet(false);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl transition ${
                        isCurrent
                          ? "bg-primary/5 border border-primary/20"
                          : isDone
                          ? "hover:bg-neutral-50 cursor-pointer"
                          : "opacity-60"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isDone
                            ? "bg-secondary text-white"
                            : isCurrent
                            ? "bg-primary text-white"
                            : "border-2 border-neutral-300 text-neutral-400"
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-xs block truncate ${
                            isCurrent
                              ? "font-bold text-primary"
                              : isDone
                              ? "font-semibold text-neutral-700"
                              : "text-neutral-400"
                          }`}
                        >
                          {step.title || step.label}
                        </span>
                      </div>
                      {isDone && (
                        <span className="text-[10px] text-secondary font-medium">Terminé</span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] text-primary font-bold">En cours</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Responsive View (>= lg) */}
      <div className="hidden lg:flex items-center justify-between w-full py-2">
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
                className={`flex items-center gap-1.5 xl:gap-2 select-none shrink-0 ${
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
                  className={`text-xs whitespace-nowrap transition-colors max-w-[70px] xl:max-w-none truncate ${
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
                  className={`flex-1 h-0.5 mx-1.5 xl:mx-3 transition-colors min-w-[8px] ${
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
