import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/client";
import { safeCallbackUrl } from "@/lib/auth/callback-url";
import {
  GOOGLE_AUTHORIZE_URL,
  GOOGLE_OAUTH_COOKIE,
  GOOGLE_OAUTH_MAX_AGE_SECONDS,
  codeChallenge,
  cookieOptions,
  cookieValue,
  newOAuthState,
  googleCallbackUrl,
} from "@/lib/auth/google-oauth";

export const dynamic = "force-dynamic";

const LOCALES = new Set(["en", "fr", "ar"]);

/**
 * GET /api/auth/google/start?callbackUrl=&locale= : send the visitor to
 * Google's sign-in page (ACC-10). The public client id comes from the
 * backend (GET /auth/providers); the secret never leaves the backend.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const locale = LOCALES.has(params.get("locale") ?? "") ? (params.get("locale") as string) : "fr";
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"), locale);
  const loginWithError = (code: string) =>
    NextResponse.redirect(new URL(`/${locale}/login?error=${code}&callbackUrl=${encodeURIComponent(callbackUrl)}`, request.url));

  let clientId = "";
  try {
    const providers = await api<{ google_enabled: boolean; google_client_id: string }>("/auth/providers", { anonymous: true });
    clientId = providers.google_enabled ? providers.google_client_id : "";
  } catch (error) {
    console.error("[auth/google/start] providers", error);
    return loginWithError("google_unavailable");
  }
  if (!clientId) return loginWithError("google_disabled");

  const flow = newOAuthState(callbackUrl, locale);
  const authorize = new URL(GOOGLE_AUTHORIZE_URL);
  authorize.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleCallbackUrl(request),
    response_type: "code",
    scope: "openid email profile",
    state: flow.state,
    code_challenge: codeChallenge(flow.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
    hl: locale,
  }).toString();

  const res = NextResponse.redirect(authorize);
  res.cookies.set(GOOGLE_OAUTH_COOKIE, cookieValue(flow), cookieOptions(GOOGLE_OAUTH_MAX_AGE_SECONDS));
  return res;
}
