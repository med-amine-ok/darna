"use client";

import React, { useCallback, useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, X } from "lucide-react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { formatNumber } from "@/lib/utils/format";

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

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  className = "",
}) => {
  const t = useTranslations("uiKit.stepper");
  const tUi = useTranslations("ui");
  const locale = useLocale();
  const uid = useId();
  const sheetTitleId = `${uid}-sheet-title`;
  const [showStepSheet, setShowStepSheet] = React.useState(false);
  const closeSheet = useCallback(() => setShowStepSheet(false), []);
  const sheetRef = useDialogA11y<HTMLDivElement>(showStepSheet, { onEscape: closeSheet });

  const currentStepObj = steps.find((s) => s.id === currentStep) || steps[0];
  const progressPercent = steps.length > 0 ? (currentStep / steps.length) * 100 : 0;
  const stepOf = t("stepOf", { current: formatNumber(currentStep, locale), total: formatNumber(steps.length, locale) });

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile & Tablet Compact View (< lg) */}
      <div className="lg:hidden py-1">
        <button
          type="button"
          onClick={() => setShowStepSheet(true)}
          className={`w-full text-start group flex items-center justify-between rounded-lg ${focusRing}`}
          aria-haspopup="dialog"
          aria-expanded={showStepSheet}
        >
          <div className="min-w-0 flex-1 pe-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary-900 tabular-nums">{stepOf}</span>
              <span className="text-primary-300" aria-hidden="true">
                •
              </span>
              <span className="text-xs font-medium text-primary-600 truncate">
                {currentStepObj?.title || currentStepObj?.label}
              </span>
            </div>
            {/* Progress bar */}
            <div
              aria-hidden="true"
              className="w-full bg-primary/[0.08] h-1.5 rounded-full overflow-hidden mt-2"
            >
              <div
                className="bg-secondary-600 h-full w-full rounded-full origin-left rtl:origin-right transition-transform duration-base ease-out"
                style={{ transform: `scaleX(${progressPercent / 100})` }}
              />
            </div>
          </div>
          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-secondary-800 bg-secondary-100 px-2 py-1 rounded-lg shrink-0">
            {t("steps")}
            <ChevronDown className="w-3 h-3" aria-hidden="true" />
            <span className="sr-only">– {t("viewAll")}</span>
          </span>
        </button>

        {/* Step Sheet for Mobile */}
        {showStepSheet && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end backdrop-ink animate-in fade-in duration-200"
            onClick={closeSheet}
          >
            <div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={sheetTitleId}
              className="bg-white rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[80dvh] overflow-y-auto space-y-3 shadow-e4 animate-in slide-in-from-bottom-8 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-primary/[0.06]">
                <h3 id={sheetTitleId} className="font-semibold text-sm text-primary-900">
                  {t("allSteps")}
                </h3>
                <button
                  type="button"
                  onClick={closeSheet}
                  aria-label={tUi("closeDialog")}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-primary-500 hover:text-primary-900 hover:bg-primary/[0.06] transition-colors duration-fast ${focusRing}`}
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <ol className="space-y-2 py-2">
                {steps.map((step) => {
                  const isDone = step.id < currentStep;
                  const isCurrent = step.id === currentStep;
                  const isClickable = Boolean(onStepClick && (isDone || isCurrent));
                  const rowClass = `w-full flex items-center gap-3 p-3 rounded-xl transition-colors duration-fast ease-standard text-start ${
                    isCurrent
                      ? "bg-darnaBg-100 ring-1 ring-inset ring-primary/10"
                      : isDone
                      ? "hover:bg-darnaBg-100 cursor-pointer"
                      : "opacity-60"
                  }`;
                  const content = (
                    <>
                      <span
                        aria-hidden="true"
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold tabular-nums shrink-0 ${
                          isDone
                            ? "bg-secondary-700 text-white"
                            : isCurrent
                            ? "bg-primary-800 text-white ring-4 ring-primary/10"
                            : "ring-1 ring-inset ring-primary/20 text-primary-500 bg-white"
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : formatNumber(step.id, locale)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span
                          className={`text-xs block truncate ${
                            isCurrent
                              ? "font-semibold text-primary-900"
                              : isDone
                              ? "font-medium text-primary-800"
                              : "text-primary-600"
                          }`}
                        >
                          {step.title || step.label}
                        </span>
                      </span>
                      {isDone && <span className="text-[11px] text-secondary-700 font-medium">{t("done")}</span>}
                      {isCurrent && <span className="text-[11px] text-primary-800 font-semibold">{t("current")}</span>}
                    </>
                  );

                  return (
                    <li key={step.id} aria-current={isCurrent ? "step" : undefined}>
                      {isClickable ? (
                        <button
                          type="button"
                          onClick={() => {
                            onStepClick?.(step.id);
                            closeSheet();
                          }}
                          className={`${rowClass} ${focusRing}`}
                        >
                          {content}
                        </button>
                      ) : (
                        <div className={rowClass}>{content}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Responsive View (>= lg) */}
      <ol className="hidden lg:flex items-center justify-between w-full py-1" aria-label={t("progress")}>
        {steps.map((step, idx) => {
          const isDone = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isClickable = Boolean(onStepClick && (isDone || isCurrent));

          const inner = (
            <>
              <span
                aria-hidden="true"
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold tabular-nums transition-[background-color,box-shadow,color] duration-base ease-out shrink-0 ${
                  isDone
                    ? "bg-secondary-700 text-white"
                    : isCurrent
                    ? "bg-primary-800 text-white shadow-e1 ring-4 ring-primary/10"
                    : "ring-1 ring-inset ring-primary/20 text-primary-500 bg-white"
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : formatNumber(step.id, locale)}
              </span>
              <span
                className={`text-xs leading-tight transition-colors max-w-[6.5rem] xl:max-w-[9rem] line-clamp-2 ${
                  isCurrent
                    ? "font-semibold text-primary-900"
                    : isDone
                    ? "font-medium text-primary-800 group-hover:text-primary-900"
                    : "font-medium text-primary-600"
                }`}
              >
                {step.title || step.label}
              </span>
              {isDone && <span className="sr-only"> – {t("done")}</span>}
            </>
          );

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle & Label */}
              <li
                aria-current={isCurrent ? "step" : undefined}
                className="flex items-center select-none min-w-0"
              >
                {isClickable ? (
                  <button
                    type="button"
                    onClick={() => onStepClick?.(step.id)}
                    className={`flex items-center gap-1.5 xl:gap-2 cursor-pointer group rounded-full pe-1 ${focusRing}`}
                  >
                    {inner}
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 xl:gap-2 cursor-default">{inner}</span>
                )}
              </li>

              {/* Connecting Line between steps */}
              {idx < steps.length - 1 && (
                <li
                  aria-hidden="true"
                  role="presentation"
                  className="relative flex-1 h-0.5 mx-1.5 xl:mx-3 min-w-[8px] rounded-full bg-primary/10 overflow-hidden"
                >
                  <span
                    className={`absolute inset-0 rounded-full bg-secondary-600 origin-left rtl:origin-right transition-transform duration-base ease-out ${
                      step.id < currentStep ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </div>
  );
};
