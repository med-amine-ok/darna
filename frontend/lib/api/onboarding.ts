import "server-only";
import type { HostType, OnboardingFieldConfig, OnboardingFieldType, OnboardingStepConfig } from "@/types";
import { ApiError, api, rowsOf } from "./client";
import { toE164 } from "./account";

/**
 * Become-a-host flows and drafts (backend apps/config onboarding flows,
 * apps/hosts onboarding drafts, BR-HST-01/02).
 */

type Localized = { en?: string; fr?: string; ar?: string } | null | undefined;

export interface ApiFlowField {
  id: string;
  type: string;
  label: Localized;
  help?: Localized;
  required?: boolean;
  core?: boolean;
  options?: { value: string | number; label: Localized }[];
  validation?: { placeholder?: Localized } | null;
}

export interface ApiFlowStep {
  id: string;
  title: Localized;
  description?: Localized;
  core?: boolean;
  fields?: ApiFlowField[];
}

export interface ApiFlow {
  host_type: HostType;
  version: number;
  steps: ApiFlowStep[];
}

export interface ApiOnboardingDraft {
  id: string;
  host_type: HostType;
  flow_version: number;
  current_step: string;
  answers: Record<string, unknown>;
  status: "in_progress" | "submitted" | "abandoned";
  updated_at: string;
}

/** A saved draft as the become-a-host screen restores it. */
export interface OnboardingDraft {
  hostType: HostType;
  /** Position of the saved step in the flow (0-based). */
  stepIndex: number;
  answers: Record<string, unknown>;
  updatedAt: string;
}

const HOST_TYPES: HostType[] = ["individual", "agency", "hotel", "hostel"];
export const isHostType = (value: unknown): value is HostType => HOST_TYPES.includes(value as HostType);

const text3 = (value: Localized) => ({ en: value?.en ?? "", fr: value?.fr ?? value?.en ?? "", ar: value?.ar ?? value?.en ?? "" });

const FIELD_TYPES: Record<string, OnboardingFieldType> = {
  text: "text",
  number: "number",
  textarea: "textarea",
  select: "select",
  multi_select: "multi-select",
  image_upload: "image-upload",
  toggle: "toggle",
};

function toField(field: ApiFlowField, index: number): OnboardingFieldConfig {
  return {
    id: field.id,
    label: text3(field.label),
    placeholder: field.validation?.placeholder ? text3(field.validation.placeholder) : undefined,
    helpText: field.help ? text3(field.help) : undefined,
    type: FIELD_TYPES[field.type] ?? "text",
    required: Boolean(field.required),
    options: field.options?.map((o) => ({ value: String(o.value), label: text3(o.label) })),
    order: index + 1,
    isCore: Boolean(field.core),
  };
}

/** Backend flow steps -> the OnboardingStepConfig the screens already render. */
export function toStepConfigs(steps: ApiFlowStep[]): OnboardingStepConfig[] {
  return steps.map((step, index) => ({
    id: step.id,
    stepNumber: index + 1,
    title: text3(step.title),
    description: step.description ? text3(step.description) : undefined,
    isActive: true,
    isCore: Boolean(step.core),
    fields: (step.fields ?? []).map(toField),
  }));
}

/** The published flow of one host type (GET /onboarding-flows/{host_type}); null when unavailable. */
export async function loadFlow(hostType: HostType): Promise<ApiFlow | null> {
  try {
    return await api<ApiFlow>(`/onboarding-flows/${hostType}`, { anonymous: true, retries: 1, timeoutMs: 6000 });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status >= 500) console.error("[loadFlow]", error);
    return null;
  }
}

/** Every published flow as step configs; a host type whose flow cannot be read is left out (the screen falls back to its local copy). */
export async function loadFlowConfigs(): Promise<Partial<Record<HostType, OnboardingStepConfig[]>>> {
  const flows = await Promise.all(HOST_TYPES.map((type) => loadFlow(type)));
  const out: Partial<Record<HostType, OnboardingStepConfig[]>> = {};
  flows.forEach((flow, i) => {
    if (flow?.steps?.length) out[HOST_TYPES[i]] = toStepConfigs(flow.steps);
  });
  return out;
}

/** The newest draft in progress (GET /host/onboarding/drafts), with its step position; null when none. */
export async function loadLatestDraft(): Promise<OnboardingDraft | null> {
  try {
    const rows = rowsOf<ApiOnboardingDraft>(await api("/host/onboarding/drafts"));
    const draft = rows.find((d) => d.status === "in_progress");
    if (!draft || !isHostType(draft.host_type)) return null;
    const flow = await loadFlow(draft.host_type);
    const index = flow ? flow.steps.findIndex((s) => s.id === draft.current_step) : -1;
    return {
      hostType: draft.host_type,
      stepIndex: Math.max(0, index),
      answers: draft.answers ?? {},
      updatedAt: draft.updated_at,
    };
  } catch (error) {
    if (!(error instanceof ApiError) || error.status >= 500) console.error("[loadLatestDraft]", error);
    return null;
  }
}

const isEmpty = (v: unknown) => v === null || v === undefined || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0);

/**
 * Keep only the answers the flow asks, in the shape the backend checks
 * (BR-HST-02): select -> one of its options, multi_select -> a subset,
 * number -> a number, toggle -> a boolean, phone fields -> E.164.
 * A required select whose value is not one of the options falls back to the
 * first option (the screen offers more choices than flow v1, e.g. vehicle
 * categories), so the person is never blocked by a missing choice.
 */
export function normaliseAnswers(steps: ApiFlowStep[], raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const step of steps) {
    for (const field of step.fields ?? []) {
      const value = raw[field.id];
      const options = (field.options ?? []).map((o) => String(o.value));
      switch (field.type) {
        case "select": {
          const v = value === undefined || value === null ? "" : String(value);
          if (options.length === 0 || options.includes(v)) {
            if (v) out[field.id] = v;
          } else if (field.required && options.length) {
            out[field.id] = options[0];
          }
          break;
        }
        case "multi_select": {
          if (Array.isArray(value)) {
            const list = value.map(String).filter((v) => options.length === 0 || options.includes(v));
            if (list.length) out[field.id] = list;
          }
          break;
        }
        case "number": {
          const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
          if (Number.isFinite(n)) out[field.id] = n;
          break;
        }
        case "toggle":
          if (typeof value === "boolean") out[field.id] = value;
          break;
        case "image_upload":
          if (Array.isArray(value)) {
            const list = value.filter((v): v is string => typeof v === "string" && v.length < 600).slice(0, 30);
            if (list.length) out[field.id] = list;
          } else if (typeof value === "string" && value) out[field.id] = value.slice(0, 600);
          break;
        default: {
          if (isEmpty(value)) break;
          let v = typeof value === "string" ? value.trim().slice(0, 4000) : String(value).slice(0, 4000);
          if (/phone/i.test(field.id)) v = toE164(v) || v;
          out[field.id] = v;
        }
      }
    }
  }
  return out;
}
