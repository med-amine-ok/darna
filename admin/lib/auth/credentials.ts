import "server-only";

import { headers } from "next/headers";
import { ApiError, api } from "@/lib/api/client";
import type { ApiPendingSession, ApiStaffSession } from "@/lib/api/staff";
import { getClientIp } from "./client-ip";

/**
 * Calls of the staff sign-in flow on the Django API (STF-05, BR-ACC-04).
 * The caller keeps the tokens in httpOnly cookies (./session.ts) and must
 * never send them to the browser.
 */

export type StepFailure =
  | { ok: false; reason: "invalid_credentials" }
  | { ok: false; reason: "invalid_code" }
  | { ok: false; reason: "rate_limited"; retryAfterSecs: number }
  | { ok: false; reason: "expired" }
  | { ok: false; reason: "already_enrolled" }
  | { ok: false; reason: "unexpected" };

/** Headers that tell the backend who is really signing in (its rate limits and audit use them). */
function forwardedHeaders(): Record<string, string> {
  const out: Record<string, string> = {};
  const ip = getClientIp();
  if (ip && ip !== "unknown") out["X-Forwarded-For"] = ip;
  try {
    const ua = headers().get("user-agent");
    if (ua) out["User-Agent"] = ua.slice(0, 400);
  } catch {
    /* outside a request */
  }
  return out;
}

function retryAfterOf(error: ApiError): number {
  const payload = error.payload as { retry_after?: number } | null;
  const value = Number(payload?.retry_after);
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 60;
}

function failure(error: unknown): StepFailure {
  if (error instanceof ApiError) {
    if (error.status === 429) return { ok: false, reason: "rate_limited", retryAfterSecs: retryAfterOf(error) };
    if (error.code === "invalid_credentials") return { ok: false, reason: "invalid_credentials" };
    if (error.code === "totp_already_enrolled") return { ok: false, reason: "already_enrolled" };
    if (error.code === "invalid_code" || error.status === 400) return { ok: false, reason: "invalid_code" };
    if (error.status === 401 || error.status === 403) return { ok: false, reason: "expired" };
    console.error(`[admin sign-in] ${error.status} ${error.code}`);
  } else {
    console.error("[admin sign-in] unexpected failure");
  }
  return { ok: false, reason: "unexpected" };
}

/** Step 1: email and password. Answers the pending token and whether an authenticator is enrolled. */
export async function staffPasswordStep(
  email: string,
  password: string,
): Promise<{ ok: true; token: string; mfaEnrolled: boolean; authenticated: boolean } | StepFailure> {
  try {
    const answer = await api<ApiPendingSession>("/admin/auth/login", {
      method: "POST",
      body: { email, password },
      anonymous: true,
      retries: 0,
      headers: forwardedHeaders(),
    });
    const token = answer?.session_token || answer?.token;
    if (!token) return { ok: false, reason: "unexpected" };
    // "authenticated": the backend needs no authenticator code (STAFF_MFA_REQUIRED off), the session is complete.
    return { ok: true, token, mfaEnrolled: answer.mfa_enrolled !== false, authenticated: answer.status === "authenticated" };
  } catch (error) {
    if (error instanceof ApiError && error.status === 400 && error.code !== "invalid_credentials") {
      // Field validation (malformed email): same generic answer as a wrong password.
      return { ok: false, reason: "invalid_credentials" };
    }
    return failure(error);
  }
}

/** Secret and otpauth:// URL for a staff member enrolling the authenticator app (pending token). */
export async function staffTotpSetup(
  pendingToken: string,
): Promise<{ ok: true; secret: string; totpUrl: string } | StepFailure> {
  try {
    const answer = await api<{ secret: string; totp_url: string }>("/auth/authenticators/totp", {
      token: pendingToken,
      retries: 1,
      headers: forwardedHeaders(),
    });
    return { ok: true, secret: answer.secret, totpUrl: answer.totp_url };
  } catch (error) {
    return failure(error);
  }
}

/** Confirms the enrolment with a first 6-digit code. The pending session becomes complete. */
export async function staffTotpEnrol(
  pendingToken: string,
  code: string,
): Promise<{ ok: true; recoveryCodes: string[] } | StepFailure> {
  try {
    const answer = await api<{ recovery_codes?: string[] }>("/admin/auth/authenticators/totp", {
      method: "POST",
      body: { code },
      token: pendingToken,
      retries: 0,
      headers: forwardedHeaders(),
    });
    return { ok: true, recoveryCodes: Array.isArray(answer?.recovery_codes) ? answer.recovery_codes : [] };
  } catch (error) {
    return failure(error);
  }
}

/** Step 2: TOTP or recovery code. The pending token becomes the staff session. */
export async function staffSecondFactor(
  pendingToken: string,
  code: string,
): Promise<{ ok: true; session: ApiStaffSession; token: string } | StepFailure> {
  try {
    const answer = await api<ApiStaffSession>("/admin/auth/2fa/authenticate", {
      method: "POST",
      body: { code },
      token: pendingToken,
      retries: 0,
      headers: { ...forwardedHeaders(), "X-Session-Token": pendingToken },
    });
    return { ok: true, session: answer, token: answer.session_token || pendingToken };
  } catch (error) {
    return failure(error);
  }
}
