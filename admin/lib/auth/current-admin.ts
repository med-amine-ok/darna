import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { getTeamMemberById } from "@/lib/data/team";
import { ROLE_PERMISSIONS, hasPermission } from "@/lib/permissions";
import type { AdminActor, AdminUser, Permission } from "@/lib/types";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";
import { getClientIp } from "./client-ip";

export class AuthError extends Error {
  readonly code = "unauthenticated" as const;
  constructor(message = "Your session has expired. Please sign in again.") {
    super(message);
    this.name = "AuthError";
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
  permissions: Permission[];
}

/**
 * Resolves the signed-in admin for this request:
 *   cookie -> verified JWT (sig, exp, iss, aud) -> admin store lookup.
 * Returns null when the token is missing/invalid or the account no longer
 * exists or is deactivated. Role is taken from the store, never from the JWT.
 * Memoised per request with React cache().
 */
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const admin = await getTeamMemberById(session.userId);
  if (!admin || !admin.isActive) return null;
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    avatar: admin.avatar,
    permissions: [...(ROLE_PERMISSIONS[admin.role] ?? [])],
  };
});

function toActor(admin: CurrentAdmin): AdminActor {
  return { id: admin.id, name: admin.name, role: admin.role, ip: getClientIp() };
}

/** Any active, signed-in admin. Throws AuthError otherwise. */
export async function requireAdmin(): Promise<AdminActor> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new AuthError();
  return toActor(admin);
}

/** Signed-in admin whose CURRENT role grants `permission`. */
export async function requirePermission(permission: Permission): Promise<AdminActor> {
  const actor = await requireAdmin();
  if (!hasPermission(actor.role, permission)) throw new ForbiddenError(permission);
  return actor;
}
