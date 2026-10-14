"use client";

import React, { useState, useEffect } from "react";
import { HostType, OnboardingStepConfig, OnboardingFieldConfig, OnboardingFieldType } from "@/types";
import {
  getOnboardingSteps,
  saveOnboardingSteps,
  resetOnboardingSteps,
  defaultOnboardingConfigs,
} from "@/lib/data/onboarding-config";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import {
  BrandUserIcon,
  BrandBuildingIcon,
  BrandBedIcon,
  BrandPlusIcon,
  BrandTrashIcon,
  BrandChevronUpIcon,
  BrandChevronDownIcon,
  BrandChevronRightIcon,
  BrandCheckIcon,
  BrandCrossIcon,
  BrandEditIcon,
  BrandLockIcon,
  BrandRefreshIcon,
  BrandEyeIcon,
} from "@/components/icons";

export default function AdminOnboardingClient() {
  const [selectedHostType, setSelectedHostType] = useState<HostType>("individual");
  const [steps, setSteps] = useState<OnboardingStepConfig[]>([]);
  const [expandedStepId, setExpandedStepId] = useState<string | null>("category_vertical");
  const [localePreview, setLocalePreview] = useState<"en" | "fr" | "ar">("en");
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Dialog States
  const [deleteStepTarget, setDeleteStepTarget] = useState<OnboardingStepConfig | null>(null);
  const [deleteFieldTarget, setDeleteFieldTarget] = useState<{ stepId: string; field: OnboardingFieldConfig } | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState<boolean>(false);

  // Add / Edit Step Modal State
  const [isStepModalOpen, setIsStepModalOpen] = useState<boolean>(false);
  const [editingStep, setEditingStep] = useState<OnboardingStepConfig | null>(null);
  const [stepFormTitleEn, setStepFormTitleEn] = useState<string>("");
  const [stepFormTitleFr, setStepFormTitleFr] = useState<string>("");
  const [stepFormTitleAr, setStepFormTitleAr] = useState<string>("");
  const [stepFormDescEn, setStepFormDescEn] = useState<string>("");
  const [stepFormDescFr, setStepFormDescFr] = useState<string>("");
  const [stepFormDescAr, setStepFormDescAr] = useState<string>("");
  const [stepFormIsActive, setStepFormIsActive] = useState<boolean>(true);

  // Add / Edit Field Modal State
  const [isFieldModalOpen, setIsFieldModalOpen] = useState<boolean>(false);
  const [targetStepIdForField, setTargetStepIdForField] = useState<string>("");
  const [editingField, setEditingField] = useState<OnboardingFieldConfig | null>(null);
  const [fieldId, setFieldId] = useState<string>("");
  const [fieldLabelEn, setFieldLabelEn] = useState<string>("");
  const [fieldLabelFr, setFieldLabelFr] = useState<string>("");
  const [fieldLabelAr, setFieldLabelAr] = useState<string>("");
  const [fieldType, setFieldType] = useState<OnboardingFieldType>("text");
  const [fieldRequired, setFieldRequired] = useState<boolean>(true);
  const [fieldHelpEn, setFieldHelpEn] = useState<string>("");
  const [fieldPlaceholderEn, setFieldPlaceholderEn] = useState<string>("");
  const [fieldOptionsText, setFieldOptionsText] = useState<string>("");

  // Live Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Load steps on mount & host type change
  useEffect(() => {
    const loaded = getOnboardingSteps(selectedHostType);
    setSteps(loaded);
    setIsDirty(false);
    if (loaded.length > 0) {
      setExpandedStepId(loaded[0].id);
    }
  }, [selectedHostType]);

  // Host Type Tab Meta
  const hostTypeTabs: { type: HostType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { type: "individual", label: "Individual (Solo)", icon: BrandUserIcon },
    { type: "agency", label: "Agency & Tours", icon: BrandBuildingIcon },
    { type: "hotel", label: "Hotel & Resort", icon: BrandBuildingIcon },
    { type: "hostel", label: "Hostel & Backpacker", icon: BrandBedIcon },
  ];

  // Reorder Steps
  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const newSteps = [...steps];
    const [moved] = newSteps.splice(index, 1);
    newSteps.splice(targetIndex, 0, moved);

    // Reassign step numbers
    const updated = newSteps.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setSteps(updated);
    setIsDirty(true);
  };

  // Toggle Step Active/Inactive
  const handleToggleStepActive = (stepId: string) => {
    const updated = steps.map((s) => {
      if (s.id === stepId) {
        return { ...s, isActive: !s.isActive };
      }
      return s;
    });
    setSteps(updated);
    setIsDirty(true);
    toast.info("Step visibility toggled. Click 'Save Changes' to persist.");
  };

  // Open Add Step Modal
  const handleOpenAddStep = () => {
    setEditingStep(null);
    setStepFormTitleEn("");
    setStepFormTitleFr("");
    setStepFormTitleAr("");
    setStepFormDescEn("");
    setStepFormDescFr("");
    setStepFormDescAr("");
    setStepFormIsActive(true);
    setIsStepModalOpen(true);
  };

  // Open Edit Step Modal
  const handleOpenEditStep = (step: OnboardingStepConfig) => {
    setEditingStep(step);
    setStepFormTitleEn(step.title.en);
    setStepFormTitleFr(step.title.fr || step.title.en);
    setStepFormTitleAr(step.title.ar || step.title.en);
    setStepFormDescEn(step.description?.en || "");
    setStepFormDescFr(step.description?.fr || "");
    setStepFormDescAr(step.description?.ar || "");
    setStepFormIsActive(step.isActive);
    setIsStepModalOpen(true);
  };

  // Save Step (Add or Edit)
  const handleSaveStepModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepFormTitleEn.trim()) {
      toast.error("Please provide at least an English title for the step.");
      return;
    }

    if (editingStep) {
      const updated = steps.map((s) => {
        if (s.id === editingStep.id) {
          return {
            ...s,
            title: {
              en: stepFormTitleEn.trim(),
              fr: stepFormTitleFr.trim() || stepFormTitleEn.trim(),
              ar: stepFormTitleAr.trim() || stepFormTitleEn.trim(),
            },
            description: {
              en: stepFormDescEn.trim(),
              fr: stepFormDescFr.trim(),
              ar: stepFormDescAr.trim(),
            },
            isActive: stepFormIsActive,
          };
        }
        return s;
      });
      setSteps(updated);
    } else {
      const newStepId = `custom_step_${Date.now()}`;
      const newStep: OnboardingStepConfig = {
        id: newStepId,
        stepNumber: steps.length + 1,
        title: {
          en: stepFormTitleEn.trim(),
          fr: stepFormTitleFr.trim() || stepFormTitleEn.trim(),
          ar: stepFormTitleAr.trim() || stepFormTitleEn.trim(),
        },
        description: {
          en: stepFormDescEn.trim(),
          fr: stepFormDescFr.trim(),
          ar: stepFormDescAr.trim(),
        },
        isActive: stepFormIsActive,
        isCore: false,
        fields: [],
      };
      setSteps([...steps, newStep]);
      setExpandedStepId(newStepId);
    }

    setIsDirty(true);
    setIsStepModalOpen(false);
    toast.success("Step saved! Click 'Save Changes' to update live flow.");
  };

  // Confirm Delete Step
  const handleConfirmDeleteStep = () => {
    if (!deleteStepTarget) return;

    if (steps.length <= 1) {
      toast.error("You cannot delete the only remaining step in this flow.");
      setDeleteStepTarget(null);
      return;
    }

    const updated = steps
      .filter((s) => s.id !== deleteStepTarget.id)
      .map((s, i) => ({ ...s, stepNumber: i + 1 }));

    setSteps(updated);
    setIsDirty(true);
    setDeleteStepTarget(null);
    toast.success(`Step '${deleteStepTarget.title[localePreview]}' removed.`);
  };

  // Open Add Field Modal
  const handleOpenAddField = (stepId: string) => {
    setTargetStepIdForField(stepId);
    setEditingField(null);
    setFieldId(`field_${Date.now().toString().slice(-4)}`);
    setFieldLabelEn("");
    setFieldLabelFr("");
    setFieldLabelAr("");
    setFieldType("text");
    setFieldRequired(true);
    setFieldHelpEn("");
    setFieldPlaceholderEn("");
    setFieldOptionsText("");
    setIsFieldModalOpen(true);
  };

  // Open Edit Field Modal
  const handleOpenEditField = (stepId: string, field: OnboardingFieldConfig) => {
    setTargetStepIdForField(stepId);
    setEditingField(field);
    setFieldId(field.id);
    setFieldLabelEn(field.label.en);
    setFieldLabelFr(field.label.fr || field.label.en);
    setFieldLabelAr(field.label.ar || field.label.en);
    setFieldType(field.type);
    setFieldRequired(field.required);
    setFieldHelpEn(field.helpText?.en || "");
    setFieldPlaceholderEn(field.placeholder?.en || "");
    setFieldOptionsText(
      field.options
        ? field.options.map((o) => `${o.value}:${o.label.en}`).join("\n")
        : ""
    );
    setIsFieldModalOpen(true);
  };

  // Save Field Modal
  const handleSaveFieldModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldLabelEn.trim() || !fieldId.trim()) {
      toast.error("Field ID and English label are required.");
      return;
    }

    let parsedOptions = undefined;
    if (fieldType === "select" || fieldType === "multi-select") {
      parsedOptions = fieldOptionsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split(":");
          const val = parts[0].trim();
          const lbl = (parts[1] || parts[0]).trim();
          return {
            value: val,
            label: { en: lbl, fr: lbl, ar: lbl },
          };
        });
    }

    const fieldConfig: OnboardingFieldConfig = {
      id: fieldId.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      label: {
        en: fieldLabelEn.trim(),
        fr: fieldLabelFr.trim() || fieldLabelEn.trim(),
        ar: fieldLabelAr.trim() || fieldLabelEn.trim(),
      },
      placeholder: fieldPlaceholderEn.trim() ? { en: fieldPlaceholderEn.trim() } : undefined,
      helpText: fieldHelpEn.trim() ? { en: fieldHelpEn.trim() } : undefined,
      type: fieldType,
      required: fieldRequired,
      options: parsedOptions,
      order: editingField ? editingField.order : 99,
      isCore: editingField ? editingField.isCore : false,
    };

    const updated = steps.map((s) => {
      if (s.id === targetStepIdForField) {
        let newFields = [...s.fields];
        if (editingField) {
          newFields = newFields.map((f) => (f.id === editingField.id ? fieldConfig : f));
        } else {
          fieldConfig.order = newFields.length + 1;
          newFields.push(fieldConfig);
        }
        return { ...s, fields: newFields };
      }
      return s;
    });

    setSteps(updated);
    setIsDirty(true);
    setIsFieldModalOpen(false);
    toast.success("Field configuration updated.");
  };

  // Delete Field
  const handleConfirmDeleteField = () => {
    if (!deleteFieldTarget) return;
    const { stepId, field } = deleteFieldTarget;

    const updated = steps.map((s) => {
      if (s.id === stepId) {
        return {
          ...s,
          fields: s.fields.filter((f) => f.id !== field.id),
        };
      }
      return s;
    });

    setSteps(updated);
    setIsDirty(true);
    setDeleteFieldTarget(null);
    toast.success(`Field '${field.label[localePreview]}' removed.`);
  };

  // Move Field Up/Down
  const handleMoveField = (stepId: string, fieldIndex: number, direction: "up" | "down") => {
    const updated = steps.map((s) => {
      if (s.id === stepId) {
        const targetIndex = direction === "up" ? fieldIndex - 1 : fieldIndex + 1;
        if (targetIndex < 0 || targetIndex >= s.fields.length) return s;
        const newFields = [...s.fields];
        const [moved] = newFields.splice(fieldIndex, 1);
        newFields.splice(targetIndex, 0, moved);
        return {
          ...s,
          fields: newFields.map((f, i) => ({ ...f, order: i + 1 })),
        };
      }
      return s;
    });
    setSteps(updated);
    setIsDirty(true);
  };

  // Save All Changes to Persistence
  const handleSaveChanges = () => {
    saveOnboardingSteps(selectedHostType, steps);
    setIsDirty(false);
    toast.success(`Saved onboarding step flow for ${selectedHostType.toUpperCase()}!`);
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    const defaults = resetOnboardingSteps(selectedHostType);
    setSteps(defaults);
    setIsDirty(false);
    setIsResetDialogOpen(false);
    toast.success(`Reset ${selectedHostType} steps to default platform sequence.`);
  };

  const activeStepsCount = steps.filter((s) => s.isActive).length;
  const totalFieldsCount = steps.reduce((acc, s) => acc + s.fields.length, 0);

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-tertiary/60 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900">Onboarding Flow Builder</h1>
            <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
              Section 7 Engine
            </span>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Dynamically configure the sequence of steps and form fields required for each of the 4 host types.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Language Switcher for previewing labels */}
          <div className="flex items-center bg-bg-light rounded-xl p-1 border border-tertiary/60 text-xs">
            <button
              type="button"
              onClick={() => setLocalePreview("en")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                localePreview === "en" ? "bg-white text-primary shadow-xs" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocalePreview("fr")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                localePreview === "fr" ? "bg-white text-primary shadow-xs" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLocalePreview("ar")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                localePreview === "ar" ? "bg-white text-primary shadow-xs" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              AR
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-tertiary/80 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
          >
            <BrandEyeIcon className="w-4 h-4 text-neutral-500" />
            Live Preview
          </button>

          <button
            type="button"
            onClick={() => setIsResetDialogOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-tertiary/80 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition"
          >
            <BrandRefreshIcon className="w-4 h-4" />
            Reset Defaults
          </button>

          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={!isDirty}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition ${
              isDirty
                ? "bg-primary hover:bg-primary-dark cursor-pointer animate-pulse"
                : "bg-neutral-300 cursor-not-allowed"
            }`}
          >
            <BrandCheckIcon className="w-4 h-4" />
            Save Changes {isDirty && "•"}
          </button>
        </div>
      </div>

      {/* Host Type Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {hostTypeTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = selectedHostType === tab.type;
          return (
            <button
              key={tab.type}
              type="button"
              onClick={() => setSelectedHostType(tab.type)}
              className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? "bg-primary text-white border-primary shadow-md ring-2 ring-primary/20"
                  : "bg-white text-neutral-800 border-tertiary/70 hover:border-primary/40 hover:bg-neutral-50/50"
              }`}
            >
              <div
                className={`p-2.5 rounded-lg ${
                  isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm truncate">{tab.label}</div>
                <div className={`text-xs mt-0.5 ${isSelected ? "text-white/80" : "text-neutral-500"}`}>
                  {tab.type === selectedHostType ? `${activeStepsCount} active steps` : "View flow"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary KPI Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-primary/5 border border-primary/20 px-5 py-3 rounded-xl text-xs text-primary font-medium">
        <div className="flex items-center gap-4">
          <span>
            Target Host Type: <strong className="font-bold uppercase">{selectedHostType}</strong>
          </span>
          <span>•</span>
          <span>
            Total Steps: <strong>{steps.length}</strong> ({activeStepsCount} active)
          </span>
          <span>•</span>
          <span>
            Form Fields: <strong>{totalFieldsCount}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenAddStep}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition text-xs shadow-xs"
        >
          <BrandPlusIcon className="w-3.5 h-3.5" />
          Add New Step
        </button>
      </div>

      {/* Step Reorderable List */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isExpanded = expandedStepId === step.id;
          const isFirst = index === 0;
          const isLast = index === steps.length - 1;

          return (
            <div
              key={step.id}
              className={`bg-white rounded-2xl border transition-all ${
                isExpanded ? "border-primary/50 shadow-md ring-1 ring-primary/10" : "border-tertiary/60 shadow-xs"
              } ${!step.isActive ? "opacity-60 bg-neutral-50" : ""}`}
            >
              {/* Step Card Header */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Step Order Badge */}
                  <span
                    className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.isActive ? "bg-primary text-white" : "bg-neutral-300 text-neutral-600"
                    }`}
                  >
                    {step.stepNumber}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-neutral-900 text-sm sm:text-base truncate">
                        {step.title[localePreview] || step.title.en}
                      </h3>
                      {step.isCore && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold rounded-full">
                          <BrandLockIcon className="w-3 h-3" />
                          Core Step
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-[11px] font-semibold rounded-full">
                        {step.fields.length} {step.fields.length === 1 ? "field" : "fields"}
                      </span>
                      {!step.isActive && (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[11px] font-bold rounded-full">
                          Disabled
                        </span>
                      )}
                    </div>
                    {step.description && (
                      <p className="text-xs text-neutral-500 mt-0.5 truncate">
                        {step.description[localePreview] || step.description.en}
                      </p>
                    )}
                  </div>
                </div>

                {/* Step Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Move Up/Down Controls */}
                  <div className="flex items-center bg-neutral-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveStep(index, "up")}
                      className="p-1.5 text-neutral-600 hover:text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white rounded transition"
                      title="Move Step Up"
                    >
                      <BrandChevronUpIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveStep(index, "down")}
                      className="p-1.5 text-neutral-600 hover:text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white rounded transition"
                      title="Move Step Down"
                    >
                      <BrandChevronDownIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Active Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleStepActive(step.id)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                      step.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200"
                    }`}
                  >
                    {step.isActive ? "Active" : "Disabled"}
                  </button>

                  {/* Edit Step */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditStep(step)}
                    className="p-1.5 text-neutral-500 hover:text-primary hover:bg-neutral-100 rounded-lg transition"
                    title="Edit Step Details"
                  >
                    <BrandEditIcon className="w-4 h-4" />
                  </button>

                  {/* Delete Step */}
                  <button
                    type="button"
                    onClick={() => setDeleteStepTarget(step)}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Remove Step"
                  >
                    <BrandTrashIcon className="w-4 h-4" />
                  </button>

                  {/* Expand / Collapse Button */}
                  <button
                    type="button"
                    onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition ml-1"
                    title={isExpanded ? "Collapse Fields" : "Expand Fields"}
                  >
                    <BrandChevronRightIcon
                      className={`w-4 h-4 transition-transform rtl:rotate-180 ${isExpanded ? "rotate-90 rtl:rotate-90" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {/* Expanded Step Fields Drawer */}
              {isExpanded && (
                <div className="border-t border-tertiary/60 bg-bg-light/40 p-4 sm:p-6 space-y-4 rounded-b-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                        Configured Fields ({step.fields.length})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenAddField(step.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-white border border-tertiary text-neutral-700 text-xs font-bold rounded-lg hover:border-primary hover:text-primary transition shadow-2xs"
                    >
                      <BrandPlusIcon className="w-3.5 h-3.5 text-primary" />
                      Add Field
                    </button>
                  </div>

                  {step.fields.length === 0 ? (
                    <div className="p-6 text-center bg-white rounded-xl border border-dashed border-tertiary text-neutral-400 text-xs">
                      No standalone fields attached to this step (rendered by composite template).
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {step.fields.map((field, fieldIdx) => {
                        const isFieldFirst = fieldIdx === 0;
                        const isFieldLast = fieldIdx === step.fields.length - 1;

                        return (
                          <div
                            key={field.id}
                            className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-tertiary/60 shadow-2xs hover:border-primary/40 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="w-5 h-5 rounded-md bg-neutral-100 text-neutral-500 flex items-center justify-center text-[10px] font-bold">
                                {field.order}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-neutral-900 text-xs">
                                    {field.label[localePreview] || field.label.en}
                                  </span>
                                  <code className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded">
                                    {field.id}
                                  </code>
                                  <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary font-bold rounded">
                                    {field.type}
                                  </span>
                                  {field.required ? (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-rose-50 text-rose-600 font-bold rounded">
                                      Required
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded">
                                      Optional
                                    </span>
                                  )}
                                  {field.isCore && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 font-bold rounded">
                                      Core
                                    </span>
                                  )}
                                </div>
                                {field.helpText && (
                                  <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                                    {field.helpText[localePreview] || field.helpText.en}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Field Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={isFieldFirst}
                                onClick={() => handleMoveField(step.id, fieldIdx, "up")}
                                className="p-1 text-neutral-400 hover:text-neutral-800 disabled:opacity-20"
                                title="Move Field Up"
                              >
                                <BrandChevronUpIcon className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isFieldLast}
                                onClick={() => handleMoveField(step.id, fieldIdx, "down")}
                                className="p-1 text-neutral-400 hover:text-neutral-800 disabled:opacity-20"
                                title="Move Field Down"
                              >
                                <BrandChevronDownIcon className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditField(step.id, field)}
                                className="p-1 text-neutral-400 hover:text-primary rounded transition"
                                title="Edit Field"
                              >
                                <BrandEditIcon className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteFieldTarget({ stepId: step.id, field })}
                                className="p-1 text-neutral-400 hover:text-rose-600 rounded transition"
                                title="Delete Field"
                              >
                                <BrandTrashIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* STEP MODAL (ADD / EDIT) */}
      {isStepModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-tertiary space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-neutral-900">
                {editingStep ? "Edit Onboarding Step" : "Add New Onboarding Step"}
              </h2>
              <button
                type="button"
                onClick={() => setIsStepModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-lg"
              >
                <BrandCrossIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStepModal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Title (English) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={stepFormTitleEn}
                  onChange={(e) => setStepFormTitleEn(e.target.value)}
                  placeholder="e.g. Identity Verification & Legal Documents"
                  className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Title (French)
                  </label>
                  <input
                    type="text"
                    value={stepFormTitleFr}
                    onChange={(e) => setStepFormTitleFr(e.target.value)}
                    placeholder="Titre en français"
                    className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Title (Arabic)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={stepFormTitleAr}
                    onChange={(e) => setStepFormTitleAr(e.target.value)}
                    placeholder="العنوان بالعربية"
                    className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Description / Instruction (English)
                </label>
                <textarea
                  rows={2}
                  value={stepFormDescEn}
                  onChange={(e) => setStepFormDescEn(e.target.value)}
                  placeholder="Helpful guidance displayed to the host at this step..."
                  className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="stepActiveCheck"
                  checked={stepFormIsActive}
                  onChange={(e) => setStepFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-tertiary focus:ring-primary"
                />
                <label htmlFor="stepActiveCheck" className="text-sm font-semibold text-neutral-800">
                  Step is Active in the Live Registration Wizard
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsStepModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark shadow-xs"
                >
                  Save Step
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FIELD MODAL (ADD / EDIT) */}
      {isFieldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-tertiary space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-neutral-900">
                {editingField ? "Edit Form Field" : "Add Form Field to Step"}
              </h2>
              <button
                type="button"
                onClick={() => setIsFieldModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-lg"
              >
                <BrandCrossIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFieldModal} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Field Identifier Key <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={editingField?.isCore}
                    value={fieldId}
                    onChange={(e) => setFieldId(e.target.value)}
                    placeholder="e.g. deposit_dzd"
                    className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden disabled:bg-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Field Input Type
                  </label>
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value as OnboardingFieldType)}
                    className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden bg-white"
                  >
                    <option value="text">Short Text</option>
                    <option value="number">Numeric (e.g. Price, Count)</option>
                    <option value="textarea">Paragraph Textarea</option>
                    <option value="select">Dropdown Select</option>
                    <option value="multi-select">Multi-Select Tags</option>
                    <option value="toggle">Yes / No Switch</option>
                    <option value="image-upload">Photo / Media Upload</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Field Label (English) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fieldLabelEn}
                  onChange={(e) => setFieldLabelEn(e.target.value)}
                  placeholder="e.g. Security Deposit (DZD)"
                  className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Label (French)
                  </label>
                  <input
                    type="text"
                    value={fieldLabelFr}
                    onChange={(e) => setFieldLabelFr(e.target.value)}
                    placeholder="Libellé en français"
                    className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Label (Arabic)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={fieldLabelAr}
                    onChange={(e) => setFieldLabelAr(e.target.value)}
                    placeholder="التسمية بالعربية"
                    className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden text-right"
                  />
                </div>
              </div>

              {(fieldType === "select" || fieldType === "multi-select") && (
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Options (One per line as `value:Label`)
                  </label>
                  <textarea
                    rows={3}
                    value={fieldOptionsText}
                    onChange={(e) => setFieldOptionsText(e.target.value)}
                    placeholder="option1:First Choice&#10;option2:Second Choice"
                    className="w-full px-3 py-2 text-xs font-mono border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden resize-none"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fieldRequiredCheck"
                  checked={fieldRequired}
                  onChange={(e) => setFieldRequired(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-tertiary focus:ring-primary"
                />
                <label htmlFor="fieldRequiredCheck" className="text-sm font-semibold text-neutral-800">
                  Required field (host cannot advance without completing)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsFieldModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark shadow-xs"
                >
                  Save Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl p-6 shadow-2xl border border-tertiary flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-neutral-900">Live Step Sequence Preview</h2>
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase">
                  {selectedHostType}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-lg"
              >
                <BrandCrossIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 flex-1">
              {steps
                .filter((s) => s.isActive)
                .map((step, idx) => (
                  <div key={step.id} className="p-4 bg-neutral-50 rounded-xl border border-tertiary/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">
                        Step {idx + 1} of {activeStepsCount}
                      </span>
                      {step.isCore && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Core Step
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-neutral-900 text-sm">
                      {step.title[localePreview] || step.title.en}
                    </div>
                    {step.description && (
                      <p className="text-xs text-neutral-500">
                        {step.description[localePreview] || step.description.en}
                      </p>
                    )}

                    {step.fields.length > 0 && (
                      <div className="pt-2 border-t border-tertiary/40 mt-2 space-y-1.5">
                        <span className="text-[11px] font-semibold text-neutral-600 block">
                          Form Inputs:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {step.fields.map((f) => (
                            <div
                              key={f.id}
                              className="p-2 bg-white rounded-lg border text-xs flex items-center justify-between"
                            >
                              <span className="truncate">{f.label[localePreview] || f.label.en}</span>
                              <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                                {f.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Step Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteStepTarget}
        title="Remove Onboarding Step?"
        message={
          deleteStepTarget?.isCore
            ? `WARNING: '${deleteStepTarget?.title[localePreview]}' is marked as a CORE ONBOARDING STEP. Removing it will exclude these mandatory fields from the host registration wizard, which could prevent listings or organizations from completing. Are you sure you wish to proceed?`
            : `Are you sure you want to remove '${deleteStepTarget?.title[localePreview]}' from the ${selectedHostType} onboarding flow?`
        }
        confirmLabel="Remove Step"
        variant="destructive"
        onConfirm={handleConfirmDeleteStep}
        onCancel={() => setDeleteStepTarget(null)}
      />

      {/* Delete Field Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteFieldTarget}
        title="Remove Form Field?"
        message={`Are you sure you want to remove '${deleteFieldTarget?.field.label[localePreview]}' from this step?`}
        confirmLabel="Remove Field"
        variant="destructive"
        onConfirm={handleConfirmDeleteField}
        onCancel={() => setDeleteFieldTarget(null)}
      />

      {/* Reset Defaults Confirm Dialog */}
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        title="Reset Flow to Platform Defaults?"
        message={`This will overwrite any customized steps, reordered sequence, or newly created fields for '${selectedHostType.toUpperCase()}' with the official factory configuration. Continue?`}
        confirmLabel="Reset to Factory Defaults"
        variant="destructive"
        onConfirm={handleResetDefaults}
        onCancel={() => setIsResetDialogOpen(false)}
      />
    </div>
  );
}
