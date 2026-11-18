import "server-only";

import { cache } from "react";
import { hasPermission, toAdminRole } from "@/lib/permissions";
import { sessionPermissions } from "@/lib/api/staff";
import type { AdminActor, AdminUser, Permission } from "@/lib/types";
import { fetchStaffSession } from "./session";
import { getClientIp } from "./client-ip";

export class AuthError extends Error {
  readonly code = "unauthenticated" as const;
  constructor(message = "Your session has expired. Please sign in again.") {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * The backend could not confirm the session right now (unreachable, 5xx, or
 * 429 rate limit). The session itself may be fine, so it must not be cleared.
 */
export class SessionUnavailableError extends Error {
  readonly code = "failed" as const;
  constructor(message = "The service cannot be reached right now. Please try again.") {
    super(message);
    this.name = "SessionUnavailableError";
  }
}

export class ForbiddenError extends Error {
  readonly code = "forbidden" as const;
  constructor(readonly permission: Permission) {
    super(`You do not have permission to perform this action (${permission}).`);
    this.name = "ForbiddenError";
  }
}

/** Public, client-safe view of the signed-in admin. */
export interface CurrentAdmin {
  id: string;
  name: string;
  email: string;
  role: AdminUser["role"];
  avatar?: string;
  /** Permissions of the session, read from the database by the backend on every request. */
  permissions: Permission[];
  /** End of the session (8 hours absolute; the 30 minutes idle limit comes first when unused). */
  expiresAt?: string;
}

export type AdminSessionState =
  | { state: "signed_in"; admin: CurrentAdmin }
  | { state: "signed_out" }
  | { state: "unavailable" };

/**
 * Resolves the signed-in admin for this request: cookie token ->
 * GET /admin/auth/session. Memoised per request with React cache(), so the
 * layout, guardPage() and server actions share one backend call.
 */
export const getAdminSession = cache(async (): Promise<AdminSessionState> => {
  const lookup = await fetchStaffSession();
  if (lookup.state === "signed_out") return { state: "signed_out" };
  if (lookup.state === "unavailable") return { state: "unavailable" };
  const { session } = lookup;
  const user = session.user;
  if (user.status !== "active" || !session.mfa_verified) return { state: "signed_out" };
  return {
    state: "signed_in",
    admin: {
      id: user.user_id,
      name: user.display_name || user.email,
      email: user.email,
      role: toAdminRole(user.role),
      permissions: sessionPermissions(session),
      expiresAt: session.expires_at,
    },
  };
});

/** The signed-in admin, or null (signed out, expired, idle, revoked, or the API is unreachable). */
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  const state = await getAdminSession();
  return state.state === "signed_in" ? state.admin : null;
});

function toActor(admin: CurrentAdmin): AdminActor {
  return { id: admin.id, name: admin.name, role: admin.role, ip: getClientIp(), permissions: admin.permissions };
}

/** Any active, signed-in admin. Throws AuthError when signed out, SessionUnavailableError when the backend cannot say. */
export async function requireAdmin(): Promise<AdminActor> {
  const state = await getAdminSession();
  if (state.state === "unavailable") throw new SessionUnavailableError();
  if (state.state !== "signed_in") throw new AuthError();
  return toActor(state.admin);
}

/** Signed-in admin whose session grants `permission` (the backend checks again on every call). */
export async function requirePermission(permission: Permission): Promise<AdminActor> {
  const actor = await requireAdmin();
  if (!hasPermission(actor, permission)) throw new ForbiddenError(permission);
  return actor;
}
