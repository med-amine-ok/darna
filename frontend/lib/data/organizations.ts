import "server-only";
import type { Membership, Organization, OrganizationInvitation } from "@/types";
import { ApiError, api, apiOrNull, rowsOf } from "@/lib/api/client";
import { activeWorkspace, type ApiWorkspace } from "@/lib/api/me";
import {
  toInvitation,
  toMembership,
  toMembershipRole,
  toOrganization,
  toOrganizationFromPublic,
  type ApiInvitation,
  type ApiMember,
  type ApiOrganization,
  type ApiPublicOrganization,
} from "@/lib/api/organization";
import { getMe } from "@/lib/server/session";

/**
 * Organisations (agencies, hotels, hostels) from the Django API (backend apps/hosts).
 *
 * Public reads use GET /organizations and GET /organizations/{slug} (approved
 * organisations only; the backend also accepts the organisation id or its host
 * account id). Team reads use the caller's ACTIVE workspace
 * (/host/organization/*): another organisation's team is never readable.
 * Every read catches API failures and answers null or an empty list, so a
 * page shows its empty state instead of crashing.
 */

/** Fields whose change requires a new verification by BLADUS staff. */
export const ORGANIZATION_LEGAL_FIELDS = [
  "name",
  "businessRegistrationNumber",
  "businessType",
  "businessCategory",
  "address",
  "country",
] as const;

/** Fields an org admin/owner may edit through settings. */
export const ORGANIZATION_EDITABLE_FIELDS = [
  ...ORGANIZATION_LEGAL_FIELDS,
  "logo",
  "description",
  "businessEmail",
  "businessPhone",
  "teamSizeEstimate",
  "hotelStarRating",
  "totalRoomCount",
  "checkInTime",
  "checkOutTime",
  "hotelAmenities",
  "hostelFacilities",
  "curfewPolicy",
  "agePolicy",
  "bookingApprovalMode",
] as const;

export type OrganizationEditableField = (typeof ORGANIZATION_EDITABLE_FIELDS)[number];

function logFailure(where: string, error: unknown) {
  if (!(error instanceof ApiError) || error.status >= 500) console.error(`[organizations.${where}]`, error);
}

/** The caller's active organisation workspace, or null (signed out, solo host, guest). */
async function activeOrgWorkspace(): Promise<ApiWorkspace | null> {
  const bundle = await getMe().catch(() => null);
  const ws = bundle ? activeWorkspace(bundle.workspaces) : null;
  return ws && ws.kind === "organization" && ws.organization_id ? ws : null;
}

function matchesWorkspace(ws: ApiWorkspace, key: string): boolean {
  return ws.organization_id === key || ws.host_account_id === key || ws.organization_slug === key;
}

/** The active organisation's private profile (team view), or null. */
export async function getActiveOrganization(): Promise<Organization | null> {
  try {
    const org = await apiOrNull<ApiOrganization>("/host/organization");
    return org ? toOrganization(org) : null;
  } catch (error) {
    logFailure("getActiveOrganization", error);
    return null;
  }
}

/**
 * One organisation by id, host account id or slug. Public profile first;
 * when it is not public yet (pending verification) and it is the caller's
 * own active organisation, the private profile is returned instead.
 */
export async function getOrganizationById(id: string): Promise<Organization | null> {
  if (typeof id !== "string" || !id.trim()) return null;
  try {
    const org = await apiOrNull<ApiPublicOrganization>(`/organizations/${encodeURIComponent(id.trim())}`);
    if (org) return toOrganizationFromPublic(org);
  } catch (error) {
    logFailure("getOrganizationById", error);
  }
  const ws = await activeOrgWorkspace();
  return ws && matchesWorkspace(ws, id) ? getActiveOrganization() : null;
}

/** Every approved organisation (directory, sitemap), following the cursor pages. */
export async function getOrganizations(): Promise<Organization[]> {
  const out: Organization[] = [];
  let cursor: string | null = null;
  try {
    for (let page = 0; page < 20; page++) {
      const answer: { results?: ApiPublicOrganization[]; next_cursor?: string | null; has_more?: boolean } = await api(
        "/organizations",
        { query: { limit: 50, cursor }, anonymous: true },
      );
      out.push(...rowsOf<ApiPublicOrganization>(answer).map(toOrganizationFromPublic));
      if (!answer?.has_more || !answer.next_cursor) break;
      cursor = answer.next_cursor;
    }
  } catch (error) {
    logFailure("getOrganizations", error);
  }
  return out;
}

/**
 * Team of an organisation. Only the caller's active organisation has a
 * readable team (GET /host/organization/members); any other answers [].
 */
export async function getOrganizationMembers(organizationId: string): Promise<Membership[]> {
  const ws = await activeOrgWorkspace();
  if (!ws || !matchesWorkspace(ws, organizationId)) return [];
  try {
    const answer = await api<unknown>("/host/organization/members");
    return rowsOf<ApiMember>(answer).map((m) => toMembership(m, ws.organization_id ?? organizationId));
  } catch (error) {
    logFailure("getOrganizationMembers", error);
    return [];
  }
}

/** Invitations of the active organisation (owner and admins only; [] for other roles). */
export async function getOrganizationInvitations(): Promise<OrganizationInvitation[]> {
  try {
    const answer = await api<unknown>("/host/organization/invitations");
    return rowsOf<ApiInvitation>(answer).map(toInvitation);
  } catch (error) {
    logFailure("getOrganizationInvitations", error);
    return [];
  }
}

/**
 * Active organisation memberships of a user, from GET /me/workspaces. Only
 * the signed-in user's own memberships are known; anyone else answers [].
 */
export async function getMembershipsForUser(userId: string): Promise<Membership[]> {
  const bundle = await getMe().catch(() => null);
  if (!bundle || bundle.me.id !== userId) return [];
  return bundle.workspaces
    .filter((ws) => ws.kind === "organization" && ws.organization_id)
    .map((ws) => ({
      id: `${ws.host_account_id}:${userId}`,
      organizationId: ws.organization_id as string,
      userId,
      name: bundle.user.name,
      email: bundle.user.email,
      role: toMembershipRole(ws.role ?? "owner"),
      status: "active" as const,
      invitedBy: "",
      createdAt: "",
      joinedAt: null,
    }));
}

export async function getMembership(organizationId: string, userId: string): Promise<Membership | null> {
  const memberships = await getMembershipsForUser(userId);
  return memberships.find((m) => m.organizationId === organizationId) ?? null;
}

/** A member of the active organisation by membership id. */
export async function getMemberById(memberId: string): Promise<Membership | null> {
  const ws = await activeOrgWorkspace();
  if (!ws?.organization_id) return null;
  const members = await getOrganizationMembers(ws.organization_id);
  return members.find((m) => m.id === memberId) ?? null;
}
