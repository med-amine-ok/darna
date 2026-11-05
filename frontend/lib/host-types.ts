/** Client-safe host/organization role helpers. */
import type { HostType, MembershipRole } from "@/types";
import { HOST_ALLOWED_OFFERS, type HostOffer } from "@/lib/catalog-types";

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

/**
 * Which offer (lib/catalog-types.ts HostOffer) a listing payload represents.
 * Hotel/hostel properties are stored as category "home" (or "hotel") with
 * room types, so for those workspaces such a payload is the "hotel" offer.
 * A missing category is a home (the data layer's default).
 */
export function listingOffer(
  category: unknown,
  hostType: HostType | null | undefined | string,
  hasRoomTypes: boolean
): HostOffer | null {
  const c = category === undefined || category === null || category === "" ? "home" : category;
  if (c === "hotel") return "hotel";
  if (c === "home") return (hostType === "hotel" || hostType === "hostel") && hasRoomTypes ? "hotel" : "home";
  if (c === "vehicle" || c === "experience" || c === "trip") return c;
  return null;
}

/** Offers a host workspace may publish, in display order (from HOST_ALLOWED_OFFERS). */
export function allowedOffersFor(hostType: HostType | null | undefined | string): HostOffer[] {
  return hostType && hostType in HOST_ALLOWED_OFFERS
    ? [...HOST_ALLOWED_OFFERS[hostType as keyof typeof HOST_ALLOWED_OFFERS]]
    : [];
}
