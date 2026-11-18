import "server-only";
import type { Listing, MembershipRole, Trip } from "@/types";
import { getHostContext, HostContext } from "./host-context";

/**
 * Authorization helpers shared by server actions and pages. They only decide
 * what the UI offers; the Django API is the authority and refuses (403/404)
 * anything outside the session's active workspace or the member's permissions.
 */

/** Does the current host own this listing (directly or through their org)? */
export function hostOwnsListing(ctx: HostContext, listing: Pick<Listing, "hostUserId" | "organizationId">): boolean {
  if (ctx.isOrgHost) {
    return Boolean(ctx.organization && listing.organizationId === ctx.organization.id);
  }
  return !listing.organizationId && listing.hostUserId === ctx.user.id;
}

export function hostOwnsTrip(ctx: HostContext, trip: Pick<Trip, "organizationId">): boolean {
  return Boolean(ctx.isOrgHost && ctx.organization && trip.organizationId === ctx.organization.id);
}

/**
 * Host context for acting on a reservation as its host. The backend scopes
 * /host/bookings/{id} to the active workspace, so a booking of someone else
 * answers 404 there; here we only require a host session.
 */
export async function getHostContextForReservation(_reservationId: string): Promise<HostContext | null> {
  return getHostContext();
}

/** Org host context where the member's role passes `check`. */
export async function getOrgContext(
  check: (role: MembershipRole | null | undefined) => boolean = () => true
): Promise<(HostContext & { organization: NonNullable<HostContext["organization"]>; membership: NonNullable<HostContext["membership"]> }) | null> {
  const ctx = await getHostContext();
  if (!ctx || !ctx.isOrgHost || !ctx.organization || !ctx.membership) return null;
  if (!check(ctx.membership.role)) return null;
  return ctx as HostContext & {
    organization: NonNullable<HostContext["organization"]>;
    membership: NonNullable<HostContext["membership"]>;
  };
}
