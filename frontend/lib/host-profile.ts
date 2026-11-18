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

/** Profile link of an organisation: its public slug when known, else its id (the API accepts both). */
export function orgProfileHref(org: Pick<PublicOrganization, "id" | "businessCategory"> & { slug?: string }): string {
  return `${ORG_PROFILE_PATH[org.businessCategory]}/${encodeURIComponent(org.slug || org.id)}`;
}

/** Profile link of a person: their handle when known (/users/karim-m), else their id (both work). */
export function userProfileHref(userIdOrHandle: string, handle?: string | null): string {
  return `/users/${encodeURIComponent(handle || userIdOrHandle)}`;
}

/** Who a listing is offered by, as shown on listing pages (built server-side). */
export interface HostProfileLink {
  kind: HostKind;
  name: string;
  image?: string | null;
  href: string;
}
