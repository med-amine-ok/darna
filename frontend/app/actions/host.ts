"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { isOrgHostType, OrgHostType } from "@/lib/host-types";
import { getSessionUser, refreshSession } from "@/lib/server/session";
import { getHostContext } from "@/lib/server/host-context";
import { updateUserHostStatus } from "@/lib/data/auth";
import { createListing } from "@/lib/data/listings";
import { ListingInputError, sanitizeListingInput } from "@/lib/data/_sanitize";
import { createOrganization } from "@/lib/data/organizations";

export interface OrganizationOnboardingInput {
  name: string;
  businessRegistrationNumber: string;
  businessType?: string;
  businessEmail: string;
  businessPhone: string;
  address: string;
  description?: string;
  teamSizeEstimate?: "1" | "2-10" | "11-50" | "50+";
  hotelStarRating?: number;
  totalRoomCount?: number;
  checkInTime?: string;
  checkOutTime?: string;
  hotelAmenities?: string[];
  hostelFacilities?: string[];
  curfewPolicy?: string;
  agePolicy?: string;
  bookingApprovalMode?: "instant" | "request";
  invitedMembers?: { email: string; role: "admin" | "manager" }[];
}

export type HostOnboardingInput =
  | { hostType: "individual"; listing: unknown }
  | { hostType: OrgHostType; organization: OrganizationOnboardingInput; property?: unknown };

export interface HostOnboardingResult {
  hostType: "individual" | OrgHostType;
  organizationId: string | null;
  listingId: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function optNumber(v: unknown, min: number, max: number): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : undefined;
}

function optList(v: unknown): string[] | undefined {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 80)).slice(0, 40)
    : undefined;
}

/**
 * Completes "become a host". The user is always the session user; ids,
 * verification status and ownership are decided here. New organizations start
 * as `pending` verification.
 */
export async function completeHostOnboardingAction(
  input: HostOnboardingInput
): Promise<ActionResult<HostOnboardingResult>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (!input || typeof input !== "object") return actionFail("INVALID_INPUT");

  try {
    // ---- Individual listing -------------------------------------------------
    if (input.hostType === "individual") {
      const ctx = await getHostContext();

      // An existing org host adding a listing publishes it under their organization.
      if (ctx?.isOrgHost && ctx.organization) {
        const listing = await createListing(
          {
            hostUserId: user.id,
            organizationId: ctx.organization.id,
            businessCategory: ctx.organization.businessCategory,
          },
          input.listing
        );
        revalidatePath("/", "layout");
        return actionOk({ hostType: ctx.hostType as OrgHostType, organizationId: ctx.organization.id, listingId: listing.id });
      }

      const listing = await createListing({ hostUserId: user.id }, input.listing);
      const updated = await updateUserHostStatus(user.id, {
        hostType: "individual",
        bookingApprovalMode: listing.bookingApprovalMode || (listing.instantBook === false ? "request" : "instant"),
      });
      if (!updated) return actionFail("NOT_FOUND");
      await refreshSession(updated);
      revalidatePath("/", "layout");
      return actionOk({ hostType: "individual", organizationId: null, listingId: listing.id });
    }

    // ---- Agency / hotel / hostel -------------------------------------------
    if (!isOrgHostType(input.hostType)) return actionFail("INVALID_INPUT");
    const hostType = input.hostType;
    const o = (input.organization || {}) as unknown as Record<string, unknown>;

    const name = text(o.name, 160);
    const businessRegistrationNumber = text(o.businessRegistrationNumber, 80);
    const businessEmail = text(o.businessEmail, 160).toLowerCase();
    const businessPhone = text(o.businessPhone, 40);
    const address = text(o.address, 240);

    if (!name || !businessRegistrationNumber || !businessPhone || !address) return actionFail("HOST_DETAILS_MISSING");
    if (!businessEmail || !EMAIL_RE.test(businessEmail)) return actionFail("INVALID_EMAIL");

    const invitedMembers = Array.isArray(o.invitedMembers)
      ? (o.invitedMembers as unknown[])
          .map((m) => (m && typeof m === "object" ? (m as Record<string, unknown>) : {}))
          .map((m) => ({
            email: text(m.email, 160).toLowerCase(),
            role: (m.role === "admin" ? "admin" : "manager") as "admin" | "manager",
          }))
          .filter((m) => EMAIL_RE.test(m.email) && m.email !== user.email.toLowerCase())
          .slice(0, 20)
      : [];

    // Validate the property (prices) before creating anything.
    if (input.property) sanitizeListingInput(input.property, "validation");

    const teamSize = o.teamSizeEstimate;
    const org = await createOrganization({
      name,
      businessCategory: hostType,
      businessRegistrationNumber,
      businessType: text(o.businessType, 120) || undefined,
      businessEmail,
      businessPhone,
      address,
      description: text(o.description, 4000) || undefined,
      owner: { userId: user.id, name: user.name, email: user.email },
      teamSizeEstimate:
        teamSize === "1" || teamSize === "2-10" || teamSize === "11-50" || teamSize === "50+" ? teamSize : undefined,
      hotelStarRating: optNumber(o.hotelStarRating, 1, 5),
      totalRoomCount: optNumber(o.totalRoomCount, 0, 100000),
      checkInTime: text(o.checkInTime, 10) || undefined,
      checkOutTime: text(o.checkOutTime, 10) || undefined,
      hotelAmenities: optList(o.hotelAmenities),
      hostelFacilities: optList(o.hostelFacilities),
      curfewPolicy: text(o.curfewPolicy, 200) || undefined,
      agePolicy: text(o.agePolicy, 200) || undefined,
      bookingApprovalMode: o.bookingApprovalMode === "request" ? "request" : "instant",
      invitedMembers,
    });

    let listingId: string | null = null;
    if (input.property && (hostType === "hotel" || hostType === "hostel")) {
      const listing = await createListing(
        { hostUserId: user.id, organizationId: org.id, businessCategory: hostType },
        input.property
      );
      listingId = listing.id;
    }

    const updated = await updateUserHostStatus(user.id, { hostType, organizationId: org.id });
    if (!updated) return actionFail("NOT_FOUND");
    await refreshSession(updated, org.id);
    revalidatePath("/", "layout");
    return actionOk({ hostType, organizationId: org.id, listingId });
  } catch (err) {
    if (err instanceof ListingInputError) return actionFail(err.code, err.params);
    console.error("[completeHostOnboardingAction] failed", err);
    return actionFail("REGISTRATION_FAILED");
  }
}

/** Individual host default: instant booking vs request-to-book. */
export async function setBookingApprovalModeAction(mode: "instant" | "request"): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (!user.hostType) return actionFail("FORBIDDEN");
  if (mode !== "instant" && mode !== "request") return actionFail("INVALID_INPUT");
  await updateUserHostStatus(user.id, { bookingApprovalMode: mode });
  return actionOk(null);
}
