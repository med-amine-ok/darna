"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Layers,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Check,
  Download,
  ShieldAlert,
  Building,
  User,
  Tent,
  type LucideIcon,
} from "lucide-react";
import { getOnboardingConfig, updateOnboardingFlow } from "@/lib/actions/onboarding";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { OnboardingConfig, HostType, OnboardingStepConfig } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";

interface Props {
  locale: string;
}

type LocalizedText = { en?: string; fr?: string; ar?: string } | undefined;

/** Picks the step text in the UI locale, falling back to fr then en. */
function pickLocalized(text: LocalizedText, locale: string): string {
  if (!text) return "";
  return text[locale as "en" | "fr" | "ar"] || text.fr || text.en || "";
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const ICON_BUTTON =
  "p-1.5 rounded-lg border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function OnboardingClient({ locale }: Props) {
  const t = useTranslations("onboarding");
  const tHostTypes = useTranslations("hostTypes");
  const tCommon = useTranslations("common");
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [activeHostType, setActiveHostType] = useState<HostType>("individual");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Active steps being edited
  const [steps, setSteps] = useState<OnboardingStepConfig[]>([]);

  // Export JSON Contract modal
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const { success, error, warning, info } = useToast();
  const can = useCan();

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = unwrap(await getOnboardingConfig());
      setConfig(cfg);
      setSteps(cfg.flows[activeHostType]?.steps || []);
    } catch (err) {
      error(t("toasts.loadFailed"), errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [activeHostType, error, t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleHostTypeChange = (type: HostType) => {
    setActiveHostType(type);
    if (config) {
      setSteps(config.flows[type]?.steps || []);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSteps = [...steps];
    const temp = newSteps[index - 1];
    newSteps[index - 1] = newSteps[index];
    newSteps[index] = temp;
    // update order indices
    newSteps.forEach((s, i) => (s.order = i + 1));
    setSteps(newSteps);
  };

  const handleMoveDown = (index: number) => {
    if (index === steps.length - 1) return;
    const newSteps = [...steps];
    const temp = newSteps[index + 1];
    newSteps[index + 1] = newSteps[index];
    newSteps[index] = temp;
    newSteps.forEach((s, i) => (s.order = i + 1));
    setSteps(newSteps);
  };

  const handleToggleRequired = (index: number) => {
    const newSteps = [...steps];
    newSteps[index].isRequired = !newSteps[index].isRequired;
    setSteps(newSteps);
  };

  const handleAddStep = () => {
    // Enforcement: Solo flow capped at 2 pages
    if (activeHostType === "individual" && steps.length >= 2) {
      warning(t("toasts.soloLimitTitle"), t("toasts.soloLimitBody", { max: 2 }));
      return;
    }

    const newStep: OnboardingStepConfig = {
      id: `step_${Date.now()}`,
      order: steps.length + 1,
      name: {
        en: "New Custom Step",
        fr: "Nouvelle étape",
        ar: "خطوة جديدة",
      },
      description: {
        en: "Specify custom attributes for this partner category.",
        fr: "Spécifiez les attributs pour cette catégorie.",
        ar: "حدد البيانات الخاصة بهذه الفئة.",
      },
      isRequired: true,
      fields: [
        {
          key: "custom_notes",
          label: { en: "Additional Notes", fr: "Notes additionnelles", ar: "ملاحظات إضافية" },
          type: "text",
          required: false,
        },
      ],
    };

    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    newSteps.forEach((s, i) => (s.order = i + 1));
    setSteps(newSteps);
  };

  const handlePublish = async () => {
    // Enforcement check
    if (activeHostType === "individual" && steps.length > 2) {
      error(t("toasts.policyViolationTitle"), t("toasts.policyViolationBody", { max: 2 }));
      return;
    }

    setSaving(true);
    try {
      const updated = unwrap(await updateOnboardingFlow(activeHostType, steps));
      setConfig(updated);
      success(
        t("toasts.publishedTitle", { version: updated.version }),
        t("toasts.publishedBody", { hostType: tHostTypes(activeHostType) })
      );
    } catch (err) {
      error(t("toasts.publishFailed"), errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const categories: { key: HostType; label: string; icon: LucideIcon; maxPages?: number }[] = [
    { key: "individual", label: tHostTypes("individual"), icon: User, maxPages: 2 },
    { key: "agency", label: tHostTypes("agency"), icon: Tent },
    { key: "hotel", label: tHostTypes("hotel"), icon: Building },
    { key: "hostel", label: tHostTypes("hostel"), icon: Layers },
  ];

  return (
    <div className="space-y-6 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary tracking-tight">
              {t("title")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/15 text-secondary-700 border border-secondary/25">
              {t("contractVersionValue", { version: config?.version || 1 })}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportModalOpen(true)}
            className="text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5 me-1.5" aria-hidden="true" />
            {t("exportJson")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePublish}
            disabled={saving || !can("onboarding.edit")}
            className="text-xs font-bold"
          >
            <Check className="w-3.5 h-3.5 me-1.5" aria-hidden="true" />
            {saving ? t("publishing") : t("publishFlow")}
          </Button>
        </div>
      </div>

      {/* Host Type Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" role="group" aria-label={t("hostTypePicker")}>
        {categories.map((c) => {
          const Icon = c.icon;
          const isActive = activeHostType === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => handleHostTypeChange(c.key)}
              className={`p-3.5 rounded-2xl border text-start transition flex items-start gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
                isActive
                  ? "bg-white border-secondary ring-2 ring-secondary/20 shadow-darna-card"
                  : "bg-white/60 border-tertiary/70 hover:bg-white"
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  isActive ? "bg-secondary-700 text-white" : "bg-neutral-100 text-neutral-500"
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <span className="block text-xs font-bold text-primary">{c.label}</span>
                <span className="block text-[11px] text-neutral-500 mt-0.5">
                  {c.maxPages
                    ? t("categoryCapped", { max: c.maxPages })
                    : t("categoryMultiPage")}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Enforcement Alert Notice for Individual */}
      {activeHostType === "individual" && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-bold">{t("soloCapTitle")}</span>
            <p className="text-amber-800 mt-0.5">
              {t("soloCapNotice")}
            </p>
          </div>
        </div>
      )}

      {/* Step Sequence Editor */}
      <div className="bg-white p-6 rounded-2xl border border-tertiary/80 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-tertiary/50 pb-3">
          <div>
            <h2 className="text-sm font-bold text-primary">
              {t("stepsHeading", { hostType: tHostTypes(activeHostType), count: steps.length })}
            </h2>
            <p className="text-xs text-neutral-500">
              {t("subtitle")}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddStep}
            className="text-xs font-bold text-secondary-700 border-secondary/40 hover:bg-secondary/10"
          >
            <Plus className="w-3.5 h-3.5 me-1" aria-hidden="true" />
            {t("addStep")}
          </Button>
        </div>

        {/* Steps List */}
        {loading && steps.length === 0 ? (
          <p className="text-xs text-neutral-500 py-4 text-center">{tCommon("loading")}</p>
        ) : steps.length === 0 ? (
          <p className="text-xs text-neutral-500 py-4 text-center">{t("noSteps")}</p>
        ) : null}
        <ol className="space-y-3">
          {steps.map((s, index) => {
            const stepName = pickLocalized(s.name ?? s.title, locale) || t("step");
            return (
            <li
              key={s.id}
              className="p-4 rounded-xl border border-tertiary/70 bg-darnaBg/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-7 h-7 rounded-lg bg-primary text-white font-mono font-bold text-xs flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  {s.order}
                </span>

                <div>
                  <h3 className="text-xs font-bold text-primary">
                    <span className="sr-only">{t("stepNumber", { number: s.order ?? index + 1 })} </span>
                    {stepName}
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{pickLocalized(s.description, locale)}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">
                      {t("fieldsCount", { count: s.fields.length })}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleRequired(index)}
                      aria-pressed={!!s.isRequired}
                      aria-label={t("requiredToggleLabel", { name: stepName })}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
                        s.isRequired
                          ? "bg-secondary/15 text-secondary-700 border-secondary/30"
                          : "bg-neutral-100 text-neutral-600 border-neutral-200"
                      }`}
                    >
                      {s.isRequired ? t("required") : t("optional")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step Controls */}
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleMoveUp(index)}
                  className={`${ICON_BUTTON} border-tertiary bg-white text-neutral-600 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed`}
                  title={t("moveUp")}
                  aria-label={t("moveUpLabel", { name: stepName })}
                >
                  <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={index === steps.length - 1}
                  onClick={() => handleMoveDown(index)}
                  className={`${ICON_BUTTON} border-tertiary bg-white text-neutral-600 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed`}
                  title={t("moveDown")}
                  aria-label={t("moveDownLabel", { name: stepName })}
                >
                  <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveStep(index)}
                  className={`${ICON_BUTTON} border-accent/30 bg-accent/10 text-accent-700 hover:bg-accent-600 hover:text-white transition`}
                  title={t("removeStep")}
                  aria-label={t("removeStepLabel", { name: stepName })}
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
            );
          })}
        </ol>
      </div>

      {/* Contract JSON Viewer Modal */}
      <Dialog
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title={t("exportDialog.title")}
        size="lg"
      >
        <div className="space-y-4 text-start">
          <p className="text-xs text-neutral-600">
            {t.rich("exportDialog.description", {
              schema: "OnboardingConfig",
              flow: "BecomeHostFlow",
              code: (chunks) => <code className="text-secondary-700 font-bold">{chunks}</code>,
            })}
          </p>
          <pre dir="ltr" className="p-4 rounded-xl bg-primary text-tertiary font-mono text-[11px] overflow-x-auto max-h-96 text-left">
            {JSON.stringify(config, null, 2)}
          </pre>
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(JSON.stringify(config, null, 2));
                info(t("toasts.copiedTitle"), t("toasts.copiedBody"));
              }}
              className="text-xs font-bold"
            >
              {t("exportDialog.copy")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
