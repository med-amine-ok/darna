import "server-only";

import { cookies } from "next/headers";
import { ApiError, api } from "@/lib/api/client";
import type { ApiStaffSession } from "@/lib/api/staff";
import {
  ADMIN_TOKEN_COOKIE,
  PENDING_TOKEN_COOKIE,
  PENDING_TOKEN_SECONDS,
  STAFF_IDLE_SECONDS,
  TOUCHED_AT_COOKIE,
  TOUCH_INTERVAL_SECONDS,
  tokenCookieOptions,
} from "./cookies";

export {
  ADMIN_TOKEN_COOKIE as SESSION_COOKIE_NAME,
  STAFF_SESSION_MAX_SECONDS as SESSION_TTL_SECONDS,
  STAFF_IDLE_SECONDS,
} from "./cookies";

/**
 * The staff session lives in the Django API. This module only stores its
 * opaque token in httpOnly cookies and asks the backend who it belongs to:
 *
 *   POST /admin/auth/login            -> pending token (PENDING_TOKEN_COOKIE)
 *   POST /admin/auth/authenticators/totp or /admin/auth/2fa/authenticate
 *                                     -> the same token becomes the session (ADMIN_TOKEN_COOKIE)
 *   GET  /admin/auth/session          -> staff member and permissions
 *   DELETE /admin/auth/session        -> sign out
 *
 * Cookie writes only work in server actions and route handlers.
 */

/** Token of the complete staff session, or null. */
export function readSessionToken(): string | null {
  try {
    return cookies().get(ADMIN_TOKEN_COOKIE)?.value || null;
  } catch {
    return null;
  }
}

/** Store the complete session token (the step 1 token once its second factor is checked). */
export function startStaffSession(token: string): void {
  const jar = cookies();
  jar.set(ADMIN_TOKEN_COOKIE, token, tokenCookieOptions(STAFF_IDLE_SECONDS));
  jar.delete(PENDING_TOKEN_COOKIE);
}

/**
 * Renew the idle window of the session cookie from a server action (middleware
 * does it for page views). At most once every TOUCH_INTERVAL_SECONDS: setting
 * a cookie in an action makes Next refresh the page, and doing that on every
 * action re-ran the screens' loaders in a loop.
 */
export function touchStaffSession(): void {
  const token = readSessionToken();
  if (!token) return;
  try {
    const jar = cookies();
    const now = Math.floor(Date.now() / 1000);
    const last = Number(jar.get(TOUCHED_AT_COOKIE)?.value ?? 0);
    if (Number.isFinite(last) && now - last < TOUCH_INTERVAL_SECONDS) return;
    jar.set(ADMIN_TOKEN_COOKIE, token, tokenCookieOptions(STAFF_IDLE_SECONDS));
    jar.set(TOUCHED_AT_COOKIE, String(now), tokenCookieOptions(STAFF_IDLE_SECONDS));
  } catch {
    /* read-only cookies (server component render) */
  }
}

/** Forget every sign-in cookie (after sign-out or when the backend refused the token). */
export function clearStaffSession(): void {
  const jar = cookies();
  jar.delete(ADMIN_TOKEN_COOKIE);
  jar.delete(PENDING_TOKEN_COOKIE);
  jar.delete(TOUCHED_AT_COOKIE);
}

/** Keep the step 1 token while the second factor or the enrolment is due. */
export function setPendingToken(token: string): void {
  const jar = cookies();
  jar.set(PENDING_TOKEN_COOKIE, token, tokenCookieOptions(PENDING_TOKEN_SECONDS));
  jar.delete(ADMIN_TOKEN_COOKIE);
}

export function readPendingToken(): string | null {
  try {
    return cookies().get(PENDING_TOKEN_COOKIE)?.value || null;
  } catch {
    return null;
  }
}

export function clearPendingToken(): void {
  cookies().delete(PENDING_TOKEN_COOKIE);
}

export type StaffSessionLookup =
  | { state: "signed_in"; session: ApiStaffSession }
  | { state: "signed_out" }
  | { state: "unavailable"; error: string };

/**
 * Asks the backend for the staff session of `token` (default: the cookie).
 * 401 and 403 mean signed out (expired, idle 30 min, revoked, deactivated);
 * a network or server failure is "unavailable" so the panel can say so
 * instead of bouncing to the login page.
 */
export async function fetchStaffSession(token?: string | null): Promise<StaffSessionLookup> {
  const value = token === undefined ? readSessionToken() : token;
  if (!value) return { state: "signed_out" };
  try {
    const session = await api<ApiStaffSession>("/admin/auth/session", { token: value, retries: 1, timeoutMs: 8_000 });
    if (!session || !session.user) return { state: "signed_out" };
    return { state: "signed_in", session };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return { state: "signed_out" };
    const detail = error instanceof ApiError ? `${error.status} ${error.code}` : "network";
    console.error(`[admin session] lookup failed: ${detail}`);
    return { state: "unavailable", error: detail };
  }
}

/** Revoke the session on the backend (best effort) and clear the cookies. */
export async function endStaffSession(): Promise<void> {
  const token = readSessionToken();
  if (token) {
    try {
      await api("/admin/auth/session", { method: "DELETE", token, timeoutMs: 5_000 });
    } catch {
      /* already expired or backend down: the cookie goes anyway */
    }
  }
  clearStaffSession();
}
