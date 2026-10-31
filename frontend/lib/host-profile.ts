/**
 * Public host profile routes, one per host category (client-safe):
 *  - individual hosts      /users/[userId]
 *  - travel agencies       /agencies/[organizationId]
 *  - hotels                /hotels/[organizationId]
 *  - hostels               /hostels/[organizationId]
 */
import type { PublicOrganization } from "@/types";

export type HostKind = "individual" | PublicOrganization["businessCategory"];

export const ORG_PROFILE_PATH: Record<PublicOrganization["businessCategory"], string> = {
  agency: "/agencies",
  hotel: "/hotels",
  hostel: "/hostels",
};

export function orgProfileHref(org: Pick<PublicOrganization, "id" | "businessCategory">): string {
  return `${ORG_PROFILE_PATH[org.businessCategory]}/${encodeURIComponent(org.id)}`;
}

export function userProfileHref(userId: string): string {
  return `/users/${encodeURIComponent(userId)}`;
}

/** Who a listing is offered by, as shown on listing pages (built server-side). */
export interface HostProfileLink {
  kind: HostKind;
  name: string;
  image?: string | null;
  href: string;
}
