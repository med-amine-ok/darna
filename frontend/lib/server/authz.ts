import "server-only";
import type { Listing, MembershipRole, Trip } from "@/types";
import { getReservationOwner } from "@/lib/data/reservations";
import { getHostContext, HostContext } from "./host-context";

/**
 * Authorization helpers shared by server actions. Each returns the verified
 * context or null; callers translate null into a FORBIDDEN/UNAUTHENTICATED
 * action result.
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

/** Host context for a user allowed to act on the given reservation as its host. */
export async function getHostContextForReservation(reservationId: string): Promise<HostContext | null> {
  const ctx = await getHostContext();
  if (!ctx) return null;
  const owner = await getReservationOwner(reservationId);
  if (!owner) return null;

  if (ctx.isOrgHost) {
    return ctx.organization && owner.organizationId === ctx.organization.id ? ctx : null;
  }
  return !owner.organizationId && owner.hostUserId === ctx.user.id ? ctx : null;
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
