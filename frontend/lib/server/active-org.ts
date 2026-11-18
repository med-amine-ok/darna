import "server-only";
import type { Membership, Organization, User } from "@/types";
import { getHostContext } from "./host-context";

export interface ActiveOrganization {
  organization: Organization;
  membership: Membership;
}

/**
 * The organisation the signed-in user acts for, from the backend's active
 * workspace (GET /me/workspaces, GET /host/organization). To act for another
 * organisation, switch the workspace with refreshSession(user, organizationId).
 * Kept for older callers; new code uses getHostContext().
 */
export async function resolveActiveOrganization(
  _user?: Pick<User, "id">,
  _preferredOrgId?: string | null,
): Promise<ActiveOrganization | null> {
  const ctx = await getHostContext();
  if (!ctx?.organization || !ctx.membership) return null;
  return { organization: ctx.organization, membership: ctx.membership };
}
