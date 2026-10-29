import "server-only";
import type { Membership, Organization, User } from "@/types";
import { getMembershipsForUser, getOrganizationById } from "@/lib/data/organizations";

export interface ActiveOrganization {
  organization: Organization;
  membership: Membership;
}

/**
 * Resolves the organization a user acts for, ONLY through their active
 * memberships. `preferredOrgId` (from the signed session or the user record)
 * is honoured only if the user is actually a member of it.
 */
export async function resolveActiveOrganization(
  user: Pick<User, "id">,
  preferredOrgId?: string | null
): Promise<ActiveOrganization | null> {
  const memberships = await getMembershipsForUser(user.id);
  if (memberships.length === 0) return null;

  const chosen =
    (preferredOrgId && memberships.find((m) => m.organizationId === preferredOrgId)) || memberships[0];
  const organization = await getOrganizationById(chosen.organizationId);
  if (!organization) return null;
  return { organization, membership: chosen };
}
