import { NextRequest, NextResponse } from "next/server";
import { ApiError, api } from "@/lib/api/client";
import { MFA_PENDING_COOKIE, MFA_PENDING_MAX_AGE_SECONDS } from "@/lib/api/account";
import { safeCallbackUrl } from "@/lib/auth/callback-url";
import {
  GOOGLE_OAUTH_COOKIE,
  cookieOptions,
  readCookieValue,
  sameState,
  googleCallbackUrl,
} from "@/lib/auth/google-oauth";
import { sessionCookieOptions } from "@/lib/auth/session-token";
import { startSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** Terms version accepted by continuing with Google (the button shows the notice). */
const TERMS_VERSION = "2026-11";

/** Backend error codes the login page explains; anything else is a generic Google failure. */
const KNOWN_ERRORS = new Set([
  "google_email_unverified",
  "google_staff_account",
  "account_disabled",
  "google_unavailable",
  "google_disabled",
]);

/**
 * GET /api/auth/google/callback?code=&state= : where Google sends the visitor
 * back (ACC-10). Checks the state (forged callbacks), then lets the backend
 * trade the code with the PKCE verifier and open a BLADUS session.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const flow = readCookieValue(request.cookies.get(GOOGLE_OAUTH_COOKIE)?.value);
  const locale = flow?.locale ?? "fr";
  const callbackUrl = safeCallbackUrl(flow?.callbackUrl, locale);

  const finish = (res: NextResponse) => {
    // The state and verifier are single-use.
    res.cookies.set(GOOGLE_OAUTH_COOKIE, "", cookieOptions(0));
    return res;
  };
  /** Back to the login page with `error=<code>` or `mfa=1`, keeping where to go afterwards. */
  const toLogin = (query: Record<string, string>) => {
    const search = new URLSearchParams({ ...query, callbackUrl });
    return finish(NextResponse.redirect(new URL(`/${locale}/login?${search.toString()}`, request.url)));
  };

  // The person closed or refused Google's page.
  if (params.get("error")) return toLogin({ error: "google_cancelled" });
  const code = params.get("code");
  if (!flow || !code || !sameState(params.get("state"), flow.state)) return toLogin({ error: "google_failed" });

  let answer: { status: string; session_token?: string };
  try {
    answer = await api("/auth/google", {
      method: "POST",
      anonymous: true,
      body: {
        code,
        code_verifier: flow.verifier,
        redirect_uri: googleCallbackUrl(request),
        accept_terms_version: TERMS_VERSION,
        locale,
      },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) {
      return toLogin({ error: KNOWN_ERRORS.has(error.code) ? error.code : "google_failed" });
    }
    console.error("[auth/google/callback]", error);
    return toLogin({ error: "google_unavailable" });
  }

  if (answer.status === "pending_flow" && answer.session_token) {
    // An authenticator app protects this account: the login page asks for its code.
    const res = toLogin({ mfa: "1" });
    res.cookies.set(MFA_PENDING_COOKIE, answer.session_token, sessionCookieOptions(MFA_PENDING_MAX_AGE_SECONDS));
    return res;
  }
  const user = answer.session_token ? await startSession(answer.session_token) : null;
  if (!user) return toLogin({ error: "google_failed" });

  const res = finish(NextResponse.redirect(new URL(callbackUrl, request.url)));
  // UI preference only (not identity): which workspace to show by default.
  res.cookies.set("darna_mode", user.hostType ? "host" : "traveler", { path: "/", maxAge: 31536000, sameSite: "lax" });
  return res;
}
