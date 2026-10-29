/** Client-safe host/organization role helpers. */
import type { HostType, MembershipRole } from "@/types";

/** Host types that operate through an Organization (and its team). */
export const ORG_HOST_TYPES = ["agency", "hotel", "hostel"] as const;
export type OrgHostType = (typeof ORG_HOST_TYPES)[number];

export function isOrgHostType(hostType: HostType | null | undefined | string): hostType is OrgHostType {
  return !!hostType && (ORG_HOST_TYPES as readonly string[]).includes(hostType);
}

/**
 * Organization permissions by role.
 *  - owner:   everything, incl. deleting the org, changing roles, transferring ownership
 *  - admin:   org settings, invite members, remove managers
 *  - manager: day-to-day operations only (listings, bookings, trips, calendar)
 */
export const orgPermissions = {
  canManageOperations: (role?: MembershipRole | null) => !!role,
  canEditSettings: (role?: MembershipRole | null) => role === "owner" || role === "admin",
  canInviteMembers: (role?: MembershipRole | null) => role === "owner" || role === "admin",
  canRemoveMember: (actor?: MembershipRole | null, target?: MembershipRole | null) =>
    actor === "owner" ? target !== "owner" : actor === "admin" ? target === "manager" : false,
  canChangeRoles: (role?: MembershipRole | null) => role === "owner",
  canTransferOwnership: (role?: MembershipRole | null) => role === "owner",
  canDeleteOrganization: (role?: MembershipRole | null) => role === "owner",
};
