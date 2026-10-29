"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Settings,
  Layers,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Check,
  Eye,
  Download,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Building,
  User,
  Tent,
} from "lucide-react";
import { getOnboardingConfig, updateOnboardingFlow } from "@/lib/data/onboarding";
import { OnboardingConfig, HostType, OnboardingStepConfig } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";

interface Props {
  locale: string;
}

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

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await getOnboardingConfig();
      setConfig(cfg);
      setSteps(cfg.flows[activeHostType]?.steps || []);
    } catch (err: any) {
      error("Failed to load onboarding flows", err.message);
    } finally {
      setLoading(false);
    }
  }, [activeHostType, error]);

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
      warning(
        "Solo Flow Limit Reached",
        "Individual host onboarding flow is strictly capped at a maximum of 2 pages to guarantee fast completion."
      );
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
      error(
        "Policy Violation",
        "Individual host onboarding flow is strictly capped at a maximum of 2 pages."
      );
      return;
    }

    setSaving(true);
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      const updated = await updateOnboardingFlow(activeHostType, steps, actor);
      setConfig(updated);
      success(
        `Published Version ${updated.version}`,
        `Onboarding flow contract for ${activeHostType} is published and live.`
      );
    } catch (err: any) {
      error("Publishing Failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  const categories: { key: HostType; label: string; icon: any; maxPages?: number }[] = [
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
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/15 text-secondary border border-secondary/25">
              {t("contractVersion")} {config?.version || 1}
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
            <Download className="w-3.5 h-3.5 me-1.5" />
            {t("exportJson")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePublish}
            disabled={saving}
            className="text-xs font-bold"
          >
            <Check className="w-3.5 h-3.5 me-1.5" />
            {saving ? t("publishing") : t("publishFlow")}
          </Button>
        </div>
      </div>

      {/* Host Type Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map((c) => {
          const Icon = c.icon;
          const isActive = activeHostType === c.key;
          return (
            <button
              key={c.key}
              onClick={() => handleHostTypeChange(c.key)}
              className={`p-3.5 rounded-2xl border text-start transition flex items-start gap-3 cursor-pointer ${
                isActive
                  ? "bg-white border-secondary ring-2 ring-secondary/20 shadow-darna-card"
                  : "bg-white/60 border-tertiary/70 hover:bg-white"
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  isActive ? "bg-secondary text-white" : "bg-neutral-100 text-neutral-500"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-primary">{c.label}</h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {c.key === "individual"
                    ? "Strict 2-page solo limit"
                    : "Multi-page structured flow"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Enforcement Alert Notice for Individual */}
      {activeHostType === "individual" && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">DARNA UX Constraint: Solo Host Flow Cap</span>
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
            <h3 className="text-sm font-bold text-primary capitalize">
              {tHostTypes(activeHostType)} ({steps.length} {t("step")})
            </h3>
            <p className="text-xs text-neutral-500">
              {t("subtitle")}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddStep}
            className="text-xs font-bold text-secondary border-secondary/40 hover:bg-secondary/10"
          >
            <Plus className="w-3.5 h-3.5 me-1" />
            {t("addStep")}
          </Button>
        </div>

        {/* Steps List */}
        <div className="space-y-3">
          {steps.map((s, index) => (
            <div
              key={s.id}
              className="p-4 rounded-xl border border-tertiary/70 bg-darnaBg/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-primary text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {s.order}
                </span>

                <div>
                  <h4 className="text-xs font-bold text-primary">
                    {s.name?.en || s.title?.en || t("step")}{" "}
                    <span className="text-neutral-400 font-normal">
                      / {s.name?.fr || s.title?.fr || "Étape"} / {s.name?.ar || s.title?.ar || "خطوة"}
                    </span>
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{s.description.en}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">
                      {s.fields.length} field{s.fields.length > 1 ? "s" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleRequired(index)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${
                        s.isRequired
                          ? "bg-secondary/15 text-secondary border-secondary/30"
                          : "bg-neutral-100 text-neutral-400 border-neutral-200"
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
                  className="p-1.5 rounded-lg border border-tertiary bg-white text-neutral-600 hover:text-primary disabled:opacity-30 cursor-pointer"
                  title={t("moveUp")}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === steps.length - 1}
                  onClick={() => handleMoveDown(index)}
                  className="p-1.5 rounded-lg border border-tertiary bg-white text-neutral-600 hover:text-primary disabled:opacity-30 cursor-pointer"
                  title={t("moveDown")}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveStep(index)}
                  className="p-1.5 rounded-lg border border-accent/30 bg-accent/10 text-accent hover:bg-accent hover:text-white transition cursor-pointer"
                  title={t("removeStep")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contract JSON Viewer Modal */}
      <Dialog
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Exported Onboarding JSON Contract"
        size="lg"
      >
        <div className="space-y-4 text-start">
          <p className="text-xs text-neutral-600">
            This typed schema conforms to <code className="text-secondary font-bold">OnboardingConfig</code>. The public frontend&apos;s <code className="text-secondary">BecomeHostFlow</code> will consume this contract.
          </p>
          <pre className="p-4 rounded-xl bg-primary text-tertiary font-mono text-[11px] overflow-x-auto max-h-96">
            {JSON.stringify(config, null, 2)}
          </pre>
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(JSON.stringify(config, null, 2));
                info("Copied", "JSON contract copied to clipboard.");
              }}
              className="text-xs font-bold"
            >
              Copy to Clipboard
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
