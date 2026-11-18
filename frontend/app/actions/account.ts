"use server";

import { revalidatePath } from "next/cache";
import type { User } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { getSessionUser } from "@/lib/server/session";
import { changePassword, updateMyProfile } from "@/lib/data/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-rules";
import { ApiError, api } from "@/lib/api/client";
import { apiAction, failFromError } from "@/lib/api/errors";
import {
  splitName,
  toAuthenticator,
  toE164,
  toLanguageCodes,
  type ApiAuthenticator,
  type Authenticator,
} from "@/lib/api/account";

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");

  const currentPassword = typeof input?.currentPassword === "string" ? input.currentPassword : "";
  const newPassword = typeof input?.newPassword === "string" ? input.newPassword : "";
  const confirmPassword = typeof input?.confirmPassword === "string" ? input.confirmPassword : "";

  if (!currentPassword || !newPassword) return actionFail("PASSWORD_FIELDS_REQUIRED");
  if (newPassword !== confirmPassword) return actionFail("PASSWORD_MISMATCH");
  if (newPassword === currentPassword) return actionFail("PASSWORD_SAME_AS_CURRENT");

  try {
    const result = await changePassword(currentPassword, newPassword);
    if (!result.ok) {
      if (result.reason === "WRONG_PASSWORD") return actionFail("WRONG_PASSWORD");
      if (result.reason === "WEAK_PASSWORD") return actionFail("PASSWORD_TOO_SHORT", { min: MIN_PASSWORD_LENGTH });
      return actionFail("NOT_FOUND");
    }
    return actionOk(null);
  } catch (error) {
    return failFromError(error, "changePasswordAction");
  }
}

/**
 * Self-service profile edits (PATCH /me, whitelisted fields only). The phone
 * has its own flow (requestPhoneCodeAction + verifyPhoneAction); the email
 * cannot be changed from the website yet.
 */
export async function updateProfileAction(patch: {
  name?: string;
  arabicName?: string;
  bio?: string;
  address?: string;
  languages?: string[];
}): Promise<ActionResult<User>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (!patch || typeof patch !== "object") return actionFail("INVALID_INPUT");
  if (patch.name !== undefined && (typeof patch.name !== "string" || !patch.name.trim())) {
    return actionFail("NAME_EMPTY");
  }

  const body: Record<string, unknown> = {};
  if (typeof patch.name === "string") Object.assign(body, splitName(patch.name));
  if (typeof patch.arabicName === "string") body.full_name_ar = patch.arabicName.trim().slice(0, 160);
  if (typeof patch.bio === "string") body.bio = patch.bio.slice(0, 500);
  if (typeof patch.address === "string") body.address_line = patch.address.trim().slice(0, 255);
  if (Array.isArray(patch.languages)) {
    body.spoken_languages = toLanguageCodes(patch.languages.filter((l): l is string => typeof l === "string"));
  }
  if (Object.keys(body).length === 0) return actionFail("INVALID_INPUT");

  try {
    const updated = await updateMyProfile(body);
    if (!updated) return actionFail("UNAUTHENTICATED");
    revalidatePath("/", "layout");
    return actionOk(updated);
  } catch (error) {
    return failFromError(error, "updateProfileAction");
  }
}

/** Shape of a profile link name; the backend checks it again (and reserved words, and uniqueness). */
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,29}$/;

/**
 * PATCH /me {handle}: change the name in the profile link (/users/<handle>, ACC-06).
 * The old link stops working; links by id keep working.
 */
export async function updateProfileHandleAction(handle: string): Promise<ActionResult<{ handle: string }>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  const wanted = typeof handle === "string" ? handle.trim().toLowerCase() : "";
  if (!HANDLE_RE.test(wanted)) return actionFail("INVALID_HANDLE");
  try {
    const updated = await updateMyProfile({ handle: wanted });
    if (!updated) return actionFail("UNAUTHENTICATED");
    revalidatePath("/", "layout");
    return actionOk({ handle: updated.handle ?? wanted });
  } catch (error) {
    return failFromError(error, "updateProfileHandleAction");
  }
}

/** PUT /me/phone: store the new phone as unverified and text a 6-digit code. */
export async function requestPhoneCodeAction(phone: string): Promise<ActionResult<{ phone: string }>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  const e164 = toE164(typeof phone === "string" ? phone : "");
  if (!e164) return actionFail("INVALID_PHONE");
  return apiAction("requestPhoneCodeAction", async () => {
    await api("/me/phone", { method: "PUT", body: { phone: e164 } });
    revalidatePath("/", "layout");
    return { phone: e164 };
  });
}

/** POST /auth/phone/verify with the code received by SMS. */
export async function verifyPhoneAction(code: string): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  const clean = typeof code === "string" ? code.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(clean)) return actionFail("INVALID_CODE");
  try {
    await api("/auth/phone/verify", { method: "POST", body: { code: clean } });
    revalidatePath("/", "layout");
    return actionOk(null);
  } catch (error) {
    if (error instanceof ApiError && error.status < 500 && error.status !== 401 && error.status !== 429) {
      return actionFail("INVALID_CODE");
    }
    return failFromError(error, "verifyPhoneAction");
  }
}

/** POST /auth/email/resend: email the verification link again. */
export async function resendEmailVerificationAction(): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  return apiAction("resendEmailVerificationAction", async () => {
    await api("/auth/email/resend", { method: "POST" });
    return null;
  });
}

/** GET /auth/authenticators: my confirmed second factors. */
export async function listAuthenticatorsAction(): Promise<ActionResult<Authenticator[]>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  return apiAction("listAuthenticatorsAction", async () => {
    const answer = await api<{ results: ApiAuthenticator[] }>("/auth/authenticators");
    return (answer?.results ?? []).map(toAuthenticator);
  });
}

/** GET /auth/authenticators/totp: a secret and its otpauth:// URL to add to an authenticator app. */
export async function startTotpEnrolmentAction(): Promise<ActionResult<{ secret: string; totpUrl: string }>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  return apiAction("startTotpEnrolmentAction", async () => {
    const answer = await api<{ secret: string; totp_url: string }>("/auth/authenticators/totp");
    return { secret: answer.secret, totpUrl: answer.totp_url };
  });
}

/** POST /auth/authenticators/totp with the first code; answers the recovery codes (shown once). */
export async function confirmTotpEnrolmentAction(code: string): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  const clean = typeof code === "string" ? code.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(clean)) return actionFail("INVALID_CODE");
  try {
    const answer = await api<{ recovery_codes: string[] }>("/auth/authenticators/totp", {
      method: "POST",
      body: { code: clean },
    });
    revalidatePath("/", "layout");
    return actionOk({ recoveryCodes: answer?.recovery_codes ?? [] });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 422)) return actionFail("INVALID_CODE");
    return failFromError(error, "confirmTotpEnrolmentAction");
  }
}

/**
 * POST /me/data-requests (BR-PRV-02): "access" asks for a copy of my data,
 * "deletion" asks BLADUS to close the account and erase it. Answered within 30 days.
 */
export async function requestDataAction(kind: "access" | "deletion"): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  if (kind !== "access" && kind !== "deletion") return actionFail("INVALID_INPUT");
  try {
    await api("/me/data-requests", { method: "POST", body: { kind } });
    return actionOk(null);
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return actionFail("DATA_REQUEST_OPEN");
    return failFromError(error, "requestDataAction");
  }
}

/** PATCH /me preferred_locale: the language of emails and SMS. */
export async function setPreferredLocaleAction(locale: string): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  if (locale !== "en" && locale !== "fr" && locale !== "ar") return actionFail("INVALID_INPUT");
  return apiAction("setPreferredLocaleAction", async () => {
    await api("/me", { method: "PATCH", body: { preferred_locale: locale } });
    return null;
  });
}


/** A sign-in account connected to mine (ACC-10), as Settings shows it. */
export interface ConnectedAccount {
  id: string;
  provider: string;
  email: string;
  createdAt: string;
}

/** GET /me/social-accounts: connected sign-ins and whether the account has a password. */
export async function listConnectedAccountsAction(): Promise<ActionResult<{ accounts: ConnectedAccount[]; hasPassword: boolean }>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  return apiAction("listConnectedAccountsAction", async () => {
    const answer = await api<{
      results: { id: string; provider: string; email: string; created_at: string }[];
      has_password: boolean;
    }>("/me/social-accounts");
    return {
      accounts: answer.results.map((row) => ({ id: row.id, provider: row.provider, email: row.email, createdAt: row.created_at })),
      hasPassword: answer.has_password,
    };
  });
}

/** DELETE /me/social-accounts/{id}: refused (LAST_SIGN_IN_METHOD) while it is the only way to sign in. */
export async function disconnectAccountAction(accountId: string): Promise<ActionResult<{ id: string }>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  if (typeof accountId !== "string" || !/^[0-9a-f-]{36}$/i.test(accountId)) return actionFail("INVALID_INPUT");
  return apiAction("disconnectAccountAction", async () => {
    await api(`/me/social-accounts/${accountId}`, { method: "DELETE" });
    return { id: accountId };
  });
}

