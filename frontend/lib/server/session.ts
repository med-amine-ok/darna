import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@/types";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  SessionPayload,
  sessionCookieOptions,
  signSession,
  verifySession,
} from "@/lib/auth/session-token";
import { API_TOKEN_COOKIE, api, currentApiToken } from "@/lib/api/client";
import { activeWorkspace, loadMe, type ApiWorkspace, type MeBundle } from "@/lib/api/me";

/**
 * Sessions backed by the Django API.
 *
 * Two httpOnly cookies:
 * - API_TOKEN_COOKIE holds the Django session token; every API call adds it
 *   as a Bearer header (lib/api/client.ts). The backend is the authority:
 *   a revoked or expired token makes getSessionUser() return null.
 * - SESSION_COOKIE is the small HMAC-signed claim set the Edge middleware
 *   can check without calling the API (signed in? host?). It is a hint for
 *   routing only; pages and actions always ask the API.
 */

/** Verified middleware claims of the current request, or null when signed out. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  if (!currentApiToken()) return null;
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySession(token);
});

/** The signed-in user, its profile and its workspaces, loaded once per request from the API. */
export const getMe = cache(async (): Promise<MeBundle | null> => {
  if (!currentApiToken()) return null;
  return loadMe();
});

/** The signed-in user as the frontend User type, or null. */
export const getSessionUser = cache(async (): Promise<User | null> => (await getMe())?.user ?? null);

function claimsFor(bundle: MeBundle, sid: string, exp: number): SessionPayload {
  const active = activeWorkspace(bundle.workspaces);
  return {
    sid,
    userId: bundle.me.id,
    hostType: active?.host_type ?? null,
    organizationId: active?.organization_id ?? null,
    exp,
  };
}

async function writeCookies(apiToken: string, payload: SessionPayload): Promise<void> {
  const options = sessionCookieOptions(SESSION_MAX_AGE_SECONDS);
  cookies().set(API_TOKEN_COOKIE, apiToken, options);
  cookies().set(SESSION_COOKIE, await signSession(payload), options);
}

/**
 * Start a session from a Django session token just issued by /auth/login,
 * /auth/signup or a second-factor step (route handlers and server actions only).
 * Returns the user, or null when the token is not usable.
 */
export async function startSession(apiToken: string): Promise<User | null> {
  const bundle = await loadMe(apiToken);
  if (!bundle) return null;
  await writeCookies(
    apiToken,
    claimsFor(bundle, globalThis.crypto.randomUUID(), Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS),
  );
  return bundle.user;
}

/**
 * Re-read the user after a change (became a host, switched organisation) and
 * re-issue the middleware claims. ``preferredOrganizationId`` (an organisation
 * or host account id) switches the active workspace on the backend first.
 */
export async function refreshSession(_user?: User | null, preferredOrganizationId?: string | null): Promise<User | null> {
  const apiToken = currentApiToken();
  if (!apiToken) return null;
  if (preferredOrganizationId) {
    const list = await api<{ results: ApiWorkspace[] }>("/me/workspaces");
    const target = list.results.find(
      (w) => w.organization_id === preferredOrganizationId || w.host_account_id === preferredOrganizationId,
    );
    if (target && !target.is_active) {
      await api("/me/workspaces/active", { method: "PUT", body: { host_account_id: target.host_account_id } });
    }
  }
  const bundle = await loadMe(apiToken);
  if (!bundle) return null;
  const current = await getSession();
  await writeCookies(
    apiToken,
    claimsFor(
      bundle,
      current?.sid ?? globalThis.crypto.randomUUID(),
      current?.exp ?? Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    ),
  );
  return bundle.user;
}

/** Revoke the token on the backend (best effort) and clear both cookies. */
export async function endSession(): Promise<void> {
  if (currentApiToken()) {
    await api("/auth/session", { method: "DELETE" }).catch(() => undefined);
  }
  const cleared = { ...sessionCookieOptions(0), maxAge: 0 };
  cookies().set(API_TOKEN_COOKIE, "", cleared);
  cookies().set(SESSION_COOKIE, "", cleared);
}
