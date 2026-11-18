"use server";

import { revalidatePath } from "next/cache";
import type { HostType } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { getSessionUser, refreshSession } from "@/lib/server/session";
import { ApiError, api, newIdempotencyKey } from "@/lib/api/client";
import { apiAction, failFromError } from "@/lib/api/errors";
import { toE164 } from "@/lib/api/account";
import { isHostType, loadFlow, normaliseAnswers } from "@/lib/api/onboarding";
import type { ApiOrganization } from "@/lib/api/organization";

/**
 * Becoming a host goes only through onboarding drafts (BR-HST-01/02):
 * PUT /host/onboarding/drafts/{host_type} keeps the answers, POST .../submit
 * creates the host account (verification starts at "applied"). The answers
 * are keyed by the field ids of the published flow (GET /onboarding-flows).
 */

/** Organisation details the flows do not ask, saved on the new organisation after submit. */
export interface OrganizationExtras {
  businessEmail?: string;
  businessPhone?: string;
  description?: string;
  teamSizeEstimate?: "1" | "2-10" | "11-50" | "50+";
  hotelAmenities?: string[];
  hostelFacilities?: string[];
  totalRoomCount?: number;
}

export interface HostOnboardingInput {
  hostType: HostType;
  /** Every answer so far, keyed by flow field id (unknown ids are dropped on the server). */
  answers: Record<string, unknown>;
  organization?: OrganizationExtras;
}

export interface HostOnboardingResult {
  hostType: HostType;
  hostAccountId: string;
  organizationId: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Turn a 422 of the drafts API into the most helpful action error. */
function onboardingFail<T>(error: unknown, where: string): ActionResult<T> {
  if (error instanceof ApiError && error.status === 422) {
    if (error.code === "onboarding_incomplete") return actionFail("ONBOARDING_INCOMPLETE");
    const fields = error.errors ? Object.keys(error.errors) : [];
    if (fields.some((f) => /phone/i.test(f))) return actionFail("INVALID_PHONE");
    if (fields.some((f) => /email/i.test(f))) return actionFail("INVALID_EMAIL");
    return actionFail("HOST_DETAILS_MISSING");
  }
  if (error instanceof ApiError && error.code === "flow_not_published") return actionFail("NOT_FOUND");
  return failFromError<T>(error, where);
}

/** PUT the draft; unknown field ids (flow changed since the draft began) are dropped and the save retried once. */
async function putDraft(hostType: HostType, currentStep: string, answers: Record<string, unknown>): Promise<void> {
  const path = `/host/onboarding/drafts/${hostType}`;
  try {
    await api(path, { method: "PUT", body: { current_step: currentStep, answers } });
  } catch (error) {
    if (error instanceof ApiError && error.code === "unknown_field" && error.errors) {
      const unknown = new Set(Object.keys(error.errors));
      const kept = Object.fromEntries(Object.entries(answers).filter(([key]) => !unknown.has(key)));
      await api(path, { method: "PUT", body: { current_step: currentStep, answers: kept } });
      return;
    }
    throw error;
  }
}

/** Save and exit: keep the answers and the step reached on the server (one draft per host type). */
export async function saveHostDraftAction(
  hostType: HostType,
  stepIndex: number,
  answers: Record<string, unknown>,
): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  if (!isHostType(hostType) || !answers || typeof answers !== "object") return actionFail("INVALID_INPUT");
  const flow = await loadFlow(hostType);
  if (!flow?.steps.length) return actionFail("SERVER_ERROR");
  const index = Math.min(Math.max(0, Math.floor(Number(stepIndex) || 0)), flow.steps.length - 1);
  try {
    await putDraft(hostType, flow.steps[index].id, normaliseAnswers(flow.steps, answers));
    return actionOk(null);
  } catch (error) {
    return onboardingFail(error, "saveHostDraftAction");
  }
}

/** Abandon the draft in progress (nothing to abandon is fine). */
export async function discardHostDraftAction(hostType: HostType): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  if (!isHostType(hostType)) return actionFail("INVALID_INPUT");
  try {
    await api(`/host/onboarding/drafts/${hostType}`, { method: "DELETE" });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) return failFromError(error, "discardHostDraftAction");
  }
  return actionOk(null);
}

/** Best effort: details of the new organisation the flows do not ask (contacts, amenities). */
async function saveOrganizationExtras(extras: OrganizationExtras | undefined): Promise<void> {
  if (!extras) return;
  try {
    const org = await api<ApiOrganization>("/host/organization");
    const patch: Record<string, unknown> = {};
    const email = extras.businessEmail?.trim().toLowerCase();
    if (email && EMAIL_RE.test(email) && !org.business_email) patch.business_email = email;
    const phone = extras.businessPhone ? toE164(extras.businessPhone) : "";
    if (phone && !org.business_phone_e164) patch.business_phone_e164 = phone;
    const description = extras.description?.trim();
    if (description && !org.description) patch.description = description.slice(0, 4000);
    const policies: Record<string, unknown> = { ...(org.policies ?? {}) };
    const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 40) : undefined);
    if (list(extras.hotelAmenities)?.length) policies.hotel_amenities = list(extras.hotelAmenities);
    if (list(extras.hostelFacilities)?.length) policies.hostel_facilities = list(extras.hostelFacilities);
    if (typeof extras.totalRoomCount === "number" && extras.totalRoomCount > 0) {
      policies.total_room_count = Math.round(extras.totalRoomCount);
    }
    if (extras.teamSizeEstimate) policies.team_size_estimate = extras.teamSizeEstimate;
    if (JSON.stringify(policies) !== JSON.stringify(org.policies ?? {})) patch.policies = policies;
    if (Object.keys(patch).length) await api("/host/organization", { method: "PATCH", body: patch });
  } catch (error) {
    console.error("[completeHostOnboardingAction] organisation details not saved", error);
  }
}

/**
 * Finish "become a host": save the final answers in the draft, submit it
 * (the backend creates the host account, and for agencies, hotels and
 * hostels the organisation with the caller as owner), switch the session to
 * the new workspace. The first listing is created afterwards by the screen
 * with createMyListingAction, in the new workspace.
 */
export async function completeHostOnboardingAction(
  input: HostOnboardingInput,
): Promise<ActionResult<HostOnboardingResult>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (!input || typeof input !== "object" || !isHostType(input.hostType)) return actionFail("INVALID_INPUT");
  if (!input.answers || typeof input.answers !== "object") return actionFail("INVALID_INPUT");
  const hostType = input.hostType;

  const flow = await loadFlow(hostType);
  if (!flow?.steps.length) return actionFail("SERVER_ERROR");

  let result: { host_account_id: string; organization_id: string | null };
  try {
    await putDraft(hostType, flow.steps[flow.steps.length - 1].id, normaliseAnswers(flow.steps, input.answers));
    result = await api(`/host/onboarding/drafts/${hostType}/submit`, {
      method: "POST",
      idempotencyKey: newIdempotencyKey(),
    });
  } catch (error) {
    return onboardingFail(error, "completeHostOnboardingAction");
  }

  try {
    await refreshSession(user, result.host_account_id);
  } catch (error) {
    console.error("[completeHostOnboardingAction] workspace switch failed", error);
  }
  if (hostType !== "individual") await saveOrganizationExtras(input.organization);
  revalidatePath("/", "layout");
  return actionOk({ hostType, hostAccountId: result.host_account_id, organizationId: result.organization_id });
}

/** Default booking approval mode of the active host account (PATCH /host/account, needs org.edit). */
export async function setBookingApprovalModeAction(mode: "instant" | "request"): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (mode !== "instant" && mode !== "request") return actionFail("INVALID_INPUT");
  return apiAction("setBookingApprovalModeAction", async () => {
    await api("/host/account", { method: "PATCH", body: { default_approval_mode: mode } });
    revalidatePath("/", "layout");
    return null;
  });
}
