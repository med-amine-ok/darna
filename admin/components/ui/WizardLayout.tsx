"use client";

import React from "react";
import { ArrowLeft, Save, ArrowRight, Check } from "lucide-react";
import { Stepper, StepItem } from "./Stepper";

export interface WizardLayoutProps {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel?: string;
  steps: StepItem[];
  currentStep: number;
  onStepChange?: (step: number) => void;
  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
  lastDraftSavedAt?: string;
  onNext?: () => void;
  onPrev?: () => void;
  onPublish?: () => void;
  isPublishStep?: boolean;
  publishLabel?: string;
  formContent: React.ReactNode;
  rightRailContent: React.ReactNode;
  className?: string;
}

export const WizardLayout: React.FC<WizardLayoutProps> = ({
  title,
  subtitle,
  backHref,
  backLabel = "Retour à la liste",
  steps,
  currentStep,
  onStepChange,
  onSaveDraft,
  isSavingDraft = false,
  lastDraftSavedAt,
  onNext,
  onPrev,
  onPublish,
  isPublishStep = false,
  publishLabel = "Publier l'annonce",
  formContent,
  rightRailContent,
  className = "",
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Navigation & Actions Bar */}
      <div>
        <a
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-primary transition mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
          <span>{backLabel}</span>
        </a>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {lastDraftSavedAt && (
              <span className="text-[11px] text-neutral-400 font-medium me-1 hidden md:inline">
                {lastDraftSavedAt}
              </span>
            )}

            {onSaveDraft && (
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={isSavingDraft}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-tertiary-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition shadow-2xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-neutral-500" />
                <span>
                  {isSavingDraft ? "Enregistrement..." : "Enregistrer en brouillon"}
                </span>
              </button>
            )}

            {isPublishStep ? (
              <button
                type="button"
                onClick={onPublish}
                className="inline-flex items-center gap-2 px-5 py-2 bg-secondary hover:bg-secondary-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{publishLabel}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <span>Suivant</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stepper Bar */}
      <div className="bg-white rounded-2xl border border-tertiary-200/80 px-6 py-2 shadow-xs">
        <Stepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={onStepChange}
        />
      </div>

      {/* Main 3-Column Layout: Form (Left/Middle) + Right Guidance Rail */}
      <div className="flex flex-col xl:flex-row items-start gap-6">
        {/* Form Area */}
        <div className="flex-1 w-full space-y-5 min-w-0">{formContent}</div>

        {/* Right Guidance Rail (Sticky ~320px) */}
        <div className="w-full xl:w-[320px] xl:shrink-0 space-y-4 xl:sticky xl:top-20">
          {rightRailContent}
        </div>
      </div>
    </div>
  );
};
