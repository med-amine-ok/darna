import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * "Continue with Google" on the website (ACC-10): the pieces kept between the
 * start route (which sends the visitor to Google) and the callback route
 * (where Google sends them back).
 *
 * - `state` stops forged callbacks (CSRF): it must come back unchanged.
 * - `verifier` is the PKCE secret: only its SHA-256 goes to Google, the
 *   backend sends the verifier when trading the code, so a stolen code alone
 *   is useless.
 * Both live in one short-lived httpOnly cookie scoped to /api/auth/google.
 */

export const GOOGLE_OAUTH_COOKIE = "bladus_google_oauth";
export const GOOGLE_OAUTH_MAX_AGE_SECONDS = 10 * 60;
export const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";

/**
 * The address Google sends the visitor back to. It must be registered,
 * exactly, in Google Cloud Console and in the backend's GOOGLE_REDIRECT_URIS.
 *
 * GOOGLE_CALLBACK_ORIGIN (a server-side variable, read at run time) wins when
 * set, for example "https://bladus.dz". Otherwise the origin the visitor used
 * (Vercel's x-forwarded-host / proto), so the live site and a laptop each send
 * their own address without a rebuild. A forged Host header cannot help an
 * attacker: Google and the backend both accept registered addresses only, and
 * the state cookie belongs to the real host.
 */
export function googleCallbackUrl(request: NextRequest): string {
  const configured = (process.env.GOOGLE_CALLBACK_ORIGIN || "").replace(/\/+$/, "");
  if (configured) return `${configured}/api/auth/google/callback`;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  const proto = (request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "")).split(",")[0].trim();
  return `${proto}://${host}/api/auth/google/callback`;
}

export interface GoogleOAuthState {
  state: string;
  verifier: string;
  callbackUrl: string;
  locale: string;
}

const base64Url = (bytes: Buffer) => bytes.toString("base64url");

export function newOAuthState(callbackUrl: string, locale: string): GoogleOAuthState {
  return { state: base64Url(randomBytes(32)), verifier: base64Url(randomBytes(48)), callbackUrl, locale };
}

/** PKCE S256 challenge of a verifier. */
export function codeChallenge(verifier: string): string {
  return base64Url(createHash("sha256").update(verifier).digest());
}

export function cookieValue(value: GoogleOAuthState): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function readCookieValue(raw: string | undefined): GoogleOAuthState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<GoogleOAuthState>;
    if (typeof parsed.state !== "string" || typeof parsed.verifier !== "string") return null;
    return {
      state: parsed.state,
      verifier: parsed.verifier,
      callbackUrl: typeof parsed.callbackUrl === "string" ? parsed.callbackUrl : "",
      locale: typeof parsed.locale === "string" ? parsed.locale : "fr",
    };
  } catch {
    return null;
  }
}

/** Constant-time comparison of the returned state with the stored one. */
export function sameState(a: string | null, b: string): boolean {
  if (!a) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    // Lax: the cookie must come back on Google's top-level redirect to the callback.
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge,
  };
}
