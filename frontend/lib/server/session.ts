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
import { getUserById } from "@/lib/data/auth";
import { globalStore } from "@/lib/data/_store";
import { resolveActiveOrganization } from "./active-org";

/**
 * Revoked session ids (sid -> exp). Logout adds the sid here so a copied
 * cookie stops working on the server even before it expires.
 * TODO: replace with Supabase auth sessions.
 */
const revokedSessions = globalStore<Map<string, number>>(
  "__darna_revoked_sessions__",
  () => new Map(),
);

function pruneRevoked() {
  const now = Date.now() / 1000;
  revokedSessions.forEach((exp, sid) => {
    if (exp < now) revokedSessions.delete(sid);
  });
}

/** Verified session payload for the current request, or null. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = await verifySession(token);
  if (!payload || revokedSessions.has(payload.sid)) return null;
  return payload;
});

/**
 * The logged-in user, loaded from the server store using the id inside the
 * verified session. Unknown ids yield null (users are never auto-created).
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const session = await getSession();
  if (!session) return null;
  return getUserById(session.userId);
});

async function writeSessionCookie(payload: SessionPayload) {
  const token = await signSession(payload);
  cookies().set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions(
      Math.max(0, payload.exp - Math.floor(Date.now() / 1000)),
    ),
  );
}

/**
 * Starts a new session for `user` (route handlers / server actions only ,
 * cookies can't be written during a page render).
 */
export async function startSession(user: User): Promise<void> {
  const active = user.hostType
    ? await resolveActiveOrganization(user, user.organizationId)
    : null;
  await writeSessionCookie({
    sid: globalThis.crypto.randomUUID(),
    userId: user.id,
    hostType: user.hostType ?? null,
    organizationId: active?.organization.id ?? null,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Re-issues the cookie with fresh claims (e.g. after becoming a host) while
 * keeping the same session id and expiry.
 */
export async function refreshSession(
  user: User,
  preferredOrganizationId?: string | null,
): Promise<void> {
  const current = await getSession();
  if (!current || current.userId !== user.id) {
    await startSession(user);
    return;
  }
  const active = user.hostType
    ? await resolveActiveOrganization(
        user,
        preferredOrganizationId ??
          current.organizationId ??
          user.organizationId,
      )
    : null;
  await writeSessionCookie({
    ...current,
    hostType: user.hostType ?? null,
    organizationId: active?.organization.id ?? null,
  });
}

/** Revokes the current session server-side and clears the cookie. */
export async function endSession(): Promise<void> {
  const current = await getSession();
  if (current) {
    pruneRevoked();
    revokedSessions.set(current.sid, current.exp);
  }
  cookies().set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
}
