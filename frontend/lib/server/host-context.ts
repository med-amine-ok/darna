import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { HostType, Membership, Organization, User } from "@/types";
import { isOrgHostType, OrgHostType } from "@/lib/host-types";
import { getSession, getSessionUser } from "./session";
import { resolveActiveOrganization } from "./active-org";

export { resolveActiveOrganization };

export interface HostContext {
  user: User;
  hostType: HostType;
  isOrgHost: boolean;
  organization: Organization | null;
  membership: Membership | null;
}

/**
 * Host context for the current request, derived from the verified session
 * and the server store only. Returns null when the user is logged out or is
 * not a host. For org hosts without an organization, `organization` is null.
 */
export const getHostContext = cache(async (): Promise<HostContext | null> => {
  const [session, user] = await Promise.all([getSession(), getSessionUser()]);
  if (!user || !user.hostType) return null;

  const hostType = user.hostType;
  if (!isOrgHostType(hostType)) {
    return { user, hostType, isOrgHost: false, organization: null, membership: null };
  }

  const active = await resolveActiveOrganization(user, session?.organizationId ?? user.organizationId);
  return {
    user: { ...user, organizationId: active?.organization.id ?? null },
    hostType,
    isOrgHost: true,
    organization: active?.organization ?? null,
    membership: active?.membership ?? null,
  };
});

/**
 * For pages under /host: redirects to login / onboarding when the visitor
 * isn't a fully set-up host. Never creates data.
 */
export async function requireHostContext(locale: string, callbackPath = "/host"): Promise<HostContext> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}${callbackPath}`)}`);
  }
  const ctx = await getHostContext();
  if (!ctx) {
    redirect(`/${locale}/become-a-host`);
  }
  if (ctx.isOrgHost && !ctx.organization) {
    redirect(`/${locale}/become-a-host/${ctx.hostType as OrgHostType}`);
  }
  return ctx;
}

/** Owner key used for listings/reservations/wallet queries. */
export function hostOwnerKey(ctx: HostContext): { userId?: string; organizationId?: string } {
  return ctx.isOrgHost && ctx.organization
    ? { organizationId: ctx.organization.id }
    : { userId: ctx.user.id };
}
