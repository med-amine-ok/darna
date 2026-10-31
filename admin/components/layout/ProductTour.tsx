"use client";

import React, { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Home, CheckSquare, Search, HelpCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export interface ProductTourProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Tour steps: text lives in tour.steps.<id>.{title, description}. */
const TOUR_STEPS: ReadonlyArray<{ id: string; icon: React.ElementType }> = [
  { id: "welcome", icon: Sparkles },
  { id: "home", icon: Home },
  { id: "approvals", icon: CheckSquare },
  { id: "search", icon: Search },
  { id: "help", icon: HelpCircle },
];

export const TOUR_STEP_COUNT = TOUR_STEPS.length;

export const ProductTour: React.FC<ProductTourProps> = ({ isOpen, onClose }) => {
  const t = useTranslations("tour");
  const [stepIndex, setStepIndex] = useState(0);
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const nextRef = useRef<HTMLButtonElement>(null);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[stepIndex];
  const StepIcon = currentStep.icon;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
      try {
        localStorage.setItem("darna_admin_tour_completed", "true");
      } catch {}
    } else {
      setStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  };

  return (
    // Dialog provides role="dialog" + aria-modal, focus trap, focus restore; Escape = skip (onClose).
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      labelledBy={titleId}
      describedBy={descId}
      initialFocusRef={nextRef}
    >
      <div className="p-6 text-start space-y-6">
        {/* Step indicator header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {TOUR_STEPS.map((step, i) => (
              <span
                key={step.id}
                className={`h-1.5 rounded-full transition-all duration-base ease-out ${
                  i === stepIndex ? "w-8 bg-secondary" : i < stepIndex ? "w-3 bg-secondary/50" : "w-3 bg-primary/10"
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] font-semibold text-primary-600">
            {t("stepCounter", { current: stepIndex + 1, total: TOUR_STEPS.length })}
          </p>
        </div>

        {/* Content Card (announced when the step changes) */}
        <div className="flex items-start gap-4" aria-live="polite">
          <div className="w-12 h-12 rounded-2xl bg-secondary-100 flex items-center justify-center shrink-0 text-secondary-700">
            <StepIcon className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <h2 id={titleId} className="text-title font-semibold text-primary-900">
              {t(`steps.${currentStep.id}.title`)}
            </h2>
            <p id={descId} className="text-meta text-primary-600 leading-relaxed">
              {t(`steps.${currentStep.id}.description`)}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-primary/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-primary-600 hover:text-primary-900 transition font-medium rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
          >
            {t("skip")}
          </button>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
                <span>{t("back")}</span>
              </Button>
            )}

            <Button ref={nextRef} variant="primary" size="sm" onClick={handleNext}>
              <span>{isLast ? t("getStarted") : t("next")}</span>
              {!isLast && <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
