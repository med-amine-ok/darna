import "server-only";

import type { OnboardingFieldConfig, OnboardingFieldType, OnboardingStepConfig } from "@/lib/types";

type Text = { en: string; fr: string; ar: string };

/** Backend onboarding field and step (apps/config/serializers.py). */
export interface ApiFlowField {
  id: string;
  type: string;
  label: Text;
  help?: Text | null;
  required: boolean;
  core: boolean;
  options?: { value: string; label: Text }[];
  validation?: Record<string, unknown>;
}

export interface ApiFlowStep {
  id: string;
  title: Text;
  core: boolean;
  fields: ApiFlowField[];
}

export interface ApiFlowVersion {
  host_type: string;
  version: number;
  status: "draft" | "published" | "archived";
  steps: ApiFlowStep[];
  published_at: string | null;
}

export interface ApiFlowSummary {
  host_type: string;
  published_version: number | null;
  draft_version: number | null;
  published_at: string | null;
  draft_updated_at: string | null;
}

const EMPTY: Text = { en: "", fr: "", ar: "" };

const TO_FRONT: Record<string, OnboardingFieldType> = {
  text: "text",
  textarea: "textarea",
  number: "number",
  select: "select",
  multi_select: "multiselect",
  image_upload: "file",
  file_upload: "file",
  toggle: "boolean",
  location: "location",
  amenities: "amenities",
};

const TO_BACK: Record<OnboardingFieldType, string> = {
  text: "text",
  textarea: "textarea",
  number: "number",
  select: "select",
  multiselect: "multi_select",
  radio: "select",
  file: "file_upload",
  location: "location",
  amenities: "amenities",
  boolean: "toggle",
};

function text(value: Partial<Text> | null | undefined): Text {
  return { en: value?.en ?? "", fr: value?.fr ?? "", ar: value?.ar ?? "" };
}

export function toStepConfig(step: ApiFlowStep, index: number): OnboardingStepConfig {
  return {
    id: step.id,
    stepNumber: index + 1,
    order: index + 1,
    isCore: step.core,
    isActive: true,
    isRequired: step.core,
    title: text(step.title),
    name: text(step.title),
    description: { ...EMPTY },
    fields: step.fields.map(
      (f, i): OnboardingFieldConfig => ({
        id: f.id,
        key: f.id,
        label: text(f.label),
        type: TO_FRONT[f.type] ?? "text",
        required: f.required,
        order: i + 1,
        helpText: f.help ? text(f.help) : undefined,
        options: f.options?.map((o) => ({ value: o.value, label: text(o.label) })),
        isCore: f.core,
      }),
    ),
  };
}

/** A safe backend id from free text (letters, digits, underscore; starts with a letter). */
function safeId(raw: string | undefined, fallback: string): string {
  const cleaned = (raw ?? "").replace(/[^A-Za-z0-9_]/g, "_").replace(/^[^A-Za-z]+/, "");
  return (cleaned || fallback).slice(0, 48);
}

/**
 * Screen steps back to the backend shape. `previous` is the version being
 * edited, so a field keeps its exact backend type (image_upload stays
 * image_upload) and its validation rules when the screen did not change them.
 */
export function toApiSteps(steps: OnboardingStepConfig[], previous: ApiFlowStep[]): ApiFlowStep[] {
  const prevFields = new Map<string, ApiFlowField>();
  const prevSteps = new Map<string, ApiFlowStep>();
  for (const s of previous) {
    prevSteps.set(s.id, s);
    for (const f of s.fields) prevFields.set(f.id, f);
  }
  return steps.map((step, si) => {
    const id = safeId(step.id, `step_${si + 1}`);
    const old = prevSteps.get(id);
    return {
      id,
      title: text(step.title ?? step.name),
      core: old?.core ?? Boolean(step.isCore),
      fields: step.fields.map((field, fi) => {
        const fid = safeId(field.key ?? field.id, `${id}_field_${fi + 1}`);
        const before = prevFields.get(fid);
        const backType =
          before && TO_FRONT[before.type] === field.type ? before.type : TO_BACK[field.type] ?? "text";
        const out: ApiFlowField = {
          id: fid,
          type: backType,
          label: text(field.label),
          required: Boolean(field.required),
          core: before?.core ?? Boolean(field.isCore),
        };
        if (field.helpText) out.help = text(field.helpText);
        if (field.options?.length) out.options = field.options.map((o) => ({ value: o.value, label: text(o.label) }));
        if (before?.validation) out.validation = before.validation;
        return out;
      }),
    };
  });
}
