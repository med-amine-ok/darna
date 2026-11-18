"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PENDING_TOKEN_SECONDS, RECOVERY_SHOWN_COOKIE, tokenCookieOptions } from "@/lib/auth/cookies";
import { getClientIp } from "@/lib/auth/client-ip";
import {
  staffPasswordStep,
  staffSecondFactor,
  staffTotpEnrol,
  staffTotpSetup,
  type StepFailure,
} from "@/lib/auth/credentials";
import { normalisePasswordInput } from "@/lib/auth/password";
import {
  checkLoginRateLimit,
  loginRateLimitKeys,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "@/lib/auth/rate-limit";
import { normalizeLocale, safeReturnTo } from "@/lib/auth/return-to";
import {
  clearPendingToken,
  endStaffSession,
  readPendingToken,
  setPendingToken,
  startStaffSession,
} from "@/lib/auth/session";

/**
 * Staff sign-in against the Django API (STF-05, BR-ACC-04):
 *
 *   1. loginAction          POST /admin/auth/login (email + password)
 *      -> "mfa"   when the staff member has an authenticator app
 *      -> "enrol" otherwise, with the secret to add to the app
 *   2a. verifySecondFactorAction  POST /admin/auth/2fa/authenticate (code or recovery code)
 *   2b. enrolAuthenticatorAction  POST /admin/auth/authenticators/totp (first code)
 *       -> recovery codes, shown once; the session is complete
 *
 * Tokens stay in httpOnly cookies; the browser only sees the step to show.
 */

export type LoginError =
  | { error: "invalidCredentials" }
  | { error: "invalidCode" }
  | { error: "rateLimited"; retryAfterSecs: number }
  | { error: "expired" }
  | { error: "alreadyEnrolled" }
  | { error: "unexpected" };

export type LoginResult =
  | LoginError
  | { step: "mfa" }
  | { step: "enrol"; secret: string; totpUrl: string };

export type EnrolResult = LoginError | { step: "recovery"; recoveryCodes: string[]; returnTo: string };

const MAX_EMAIL_LEN = 254;
const MAX_CODE_LEN = 32;

function toError(failure: StepFailure): LoginError {
  switch (failure.reason) {
    case "invalid_credentials":
      return { error: "invalidCredentials" };
    case "invalid_code":
      return { error: "invalidCode" };
    case "rate_limited":
      return { error: "rateLimited", retryAfterSecs: failure.retryAfterSecs };
    case "expired":
      return { error: "expired" };
    case "already_enrolled":
      return { error: "alreadyEnrolled" };
    default:
      return { error: "unexpected" };
  }
}

function readCode(formData: FormData): string {
  const raw = formData.get("code");
  return typeof raw === "string" ? raw.replace(/\s+/g, "").slice(0, MAX_CODE_LEN) : "";
}

/** Step 1. Never reveals whether the email exists or the account is inactive. */
export async function loginAction(formData: FormData): Promise<LoginResult> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim().slice(0, MAX_EMAIL_LEN) : "";
  const password = normalisePasswordInput(formData.get("password"));
  const keys = loginRateLimitKeys(email, getClientIp());

  const limit = checkLoginRateLimit(keys);
  if (!limit.allowed) return { error: "rateLimited", retryAfterSecs: limit.retryAfterSecs ?? 60 };
  if (!email || !password) {
    recordFailedLogin(keys);
    return { error: "invalidCredentials" };
  }

  const step = await staffPasswordStep(email, password);
  if (!step.ok) {
    if (step.reason === "invalid_credentials") recordFailedLogin(keys);
    return toError(step);
  }
  recordSuccessfulLogin(keys);

  // The authenticator step is switched off on the backend: the password alone opens the panel.
  if (step.authenticated) {
    const locale = normalizeLocale(formData.get("locale"));
    startStaffSession(step.token);
    redirect(safeReturnTo(formData.get("returnTo"), locale));
  }

  setPendingToken(step.token);

  if (step.mfaEnrolled) return { step: "mfa" };

  const setup = await staffTotpSetup(step.token);
  if (!setup.ok) {
    // An authenticator exists after all (enrolled in another tab): ask for its code.
    if (setup.reason === "already_enrolled" || setup.reason === "invalid_code") return { step: "mfa" };
    return toError(setup);
  }
  return { step: "enrol", secret: setup.secret, totpUrl: setup.totpUrl };
}

/** Step 2 for an enrolled staff member: on success sets the session cookie and redirects (never returns). */
export async function verifySecondFactorAction(formData: FormData): Promise<LoginError> {
  const locale = normalizeLocale(formData.get("locale"));
  const returnTo = safeReturnTo(formData.get("returnTo"), locale);
  const code = readCode(formData);
  const pending = readPendingToken();
  if (!pending) return { error: "expired" };
  if (!code) return { error: "invalidCode" };

  const result = await staffSecondFactor(pending, code);
  if (!result.ok) {
    if (result.reason === "expired") clearPendingToken();
    return toError(result);
  }
  startStaffSession(result.token);
  redirect(returnTo);
}

/**
 * Step 2 for a first sign-in: confirm the authenticator app with its first
 * code. The session is complete afterwards; the recovery codes are returned
 * this one time for the staff member to keep.
 */
export async function enrolAuthenticatorAction(formData: FormData): Promise<EnrolResult> {
  const locale = normalizeLocale(formData.get("locale"));
  const returnTo = safeReturnTo(formData.get("returnTo"), locale);
  const code = readCode(formData);
  const pending = readPendingToken();
  if (!pending) return { error: "expired" };
  if (!/^[0-9]{6}$/.test(code)) return { error: "invalidCode" };

  const result = await staffTotpEnrol(pending, code);
  if (!result.ok) {
    if (result.reason === "expired") clearPendingToken();
    return toError(result);
  }
  startStaffSession(pending);
  cookies().set(RECOVERY_SHOWN_COOKIE, "1", tokenCookieOptions(PENDING_TOKEN_SECONDS));
  return { step: "recovery", recoveryCodes: result.recoveryCodes, returnTo };
}

/** The staff member saved the recovery codes: the login page may redirect to the panel again. */
export async function finishEnrolmentAction(): Promise<void> {
  cookies().delete(RECOVERY_SHOWN_COOKIE);
}

/** Back to the password step (forgets the pending token). */
export async function cancelLoginAction(): Promise<void> {
  clearPendingToken();
}

/** Revokes the staff session on the backend, clears the cookies and goes to /{locale}/login. */
export async function logoutAction(formData: FormData): Promise<void> {
  const locale = normalizeLocale(formData.get("locale"));
  await endStaffSession();
  redirect(`/${locale}/login`);
}
