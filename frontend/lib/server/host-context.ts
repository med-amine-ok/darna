import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { HostType, Membership, Organization, User } from "@/types";
import { isOrgHostType, OrgHostType, listingOffer } from "@/lib/host-types";
import { canHostOffer, type HostOffer } from "@/lib/catalog-types";
import { api } from "@/lib/api/client";
import { activeWorkspace, type ApiWorkspace } from "@/lib/api/me";
import { membershipFromWorkspace, toOrganization, type ApiOrganization } from "@/lib/api/organization";
import { getMe, getSessionUser } from "./session";
import { resolveActiveOrganization } from "./active-org";

export { resolveActiveOrganization };

export interface HostContext {
  user: User;
  /**
   * Type of the workspace the user is acting in. For org hosts this is the
   * ACTIVE organization's category (an agency owner who also owns a hotel acts
   * as "hotel" while that hotel is active), else the user's own host type.
   */
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
  const bundle = await getMe();
  if (!bundle) return null;
  const ws: ApiWorkspace | null = activeWorkspace(bundle.workspaces);
  if (!ws || !ws.host_type) return null;
  const user = bundle.user;

  if (ws.kind !== "organization" || !isOrgHostType(ws.host_type)) {
    return { user: { ...user, hostType: ws.host_type, organizationId: null }, hostType: ws.host_type, isOrgHost: false, organization: null, membership: null };
  }

  const org = await api<ApiOrganization>("/host/organization").catch(() => null);
  const membership = membershipFromWorkspace(ws, user);
  const organization = org ? toOrganization(org, ws.role === "owner" ? user.id : "") : null;
  return {
    user: { ...user, hostType: ws.host_type, organizationId: organization?.id ?? null },
    hostType: ws.host_type,
    isOrgHost: true,
    organization,
    membership: organization ? { ...membership, organizationId: organization.id } : null,
  };
});

/**
 * For pages under /host: redirects to login / onboarding when the visitor
 * isn't a host at all, or is an org host whose organization doesn't exist
 * yet. A real host is never bounced (an individual with zero listings gets
 * the workspace with empty states). Never creates data.
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
    redirect(`/${locale}/become-a-host/${user.hostType as OrgHostType}`);
  }
  return ctx;
}

/** Owner key used for listings/reservations/wallet queries. */
export function hostOwnerKey(ctx: HostContext): { userId?: string; organizationId?: string } {
  return ctx.isOrgHost && ctx.organization
    ? { organizationId: ctx.organization.id }
    : { userId: ctx.user.id };
}

/**
 * THE publishing rule check for listings (lib/catalog-types.ts canHostOffer):
 * may this host workspace publish a listing with this content? Used by every
 * listing create/update server action.
 */
export function hostMayPublishListing(hostType: HostType | null | undefined, input: unknown): boolean {
  const d = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const offer: HostOffer | null = listingOffer(d.category, hostType, Array.isArray(d.roomTypes) && d.roomTypes.length > 0);
  return !!offer && canHostOffer(hostType, offer);
}
