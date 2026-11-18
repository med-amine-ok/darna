"use server";

import { revalidatePath } from "next/cache";
import type { Membership, Organization, OrganizationInvitation } from "@/types";
import { ActionResult, ActionErrorCode, actionFail, actionOk } from "@/lib/action-result";
import { ApiError, api } from "@/lib/api/client";
import { actionCodeFor, failFromError } from "@/lib/api/errors";
import type { ApiWorkspace } from "@/lib/api/me";
import {
  toE164Phone,
  toInvitation,
  toMembership,
  toOrganization,
  type ApiInvitation,
  type ApiMember,
  type ApiOrganization,
} from "@/lib/api/organization";
import { getHostContext } from "@/lib/server/host-context";
import { getMe, getSessionUser, refreshSession } from "@/lib/server/session";
import { getOrganizationMembers, type OrganizationEditableField } from "@/lib/data/organizations";

/**
 * Organisation settings, team and workspace switching, on the Django API
 * (backend apps/hosts, /host/organization*). Every call acts on the
 * session's ACTIVE workspace; the backend checks the member's permissions
 * (BR-ORG-05) and answers 403, mapped here to the role the UI explains.
 */

type OrgPatch = Partial<Pick<Organization, OrganizationEditableField>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanString(value: unknown, max: number): string | undefined {
  return typeof value === "string" ? value.trim().slice(0, max) : undefined;
}

/** A refusal of the backend, with 403 explained as the role the action needs. */
function failWith<T>(error: unknown, where: string, forbidden: ActionErrorCode): ActionResult<T> {
  if (error instanceof ApiError && error.status === 403 && actionCodeFor(error) === "FORBIDDEN") {
    return actionFail<T>(forbidden);
  }
  if (error instanceof ApiError && error.errors && "business_phone_e164" in error.errors) {
    return actionFail<T>("INVALID_PHONE");
  }
  return failFromError<T>(error, where);
}

/** Signed in and acting for an organisation workspace, else the failure to return. */
async function requireOrgWorkspace(): Promise<ActionErrorCode | null> {
  if (!(await getSessionUser())) return "UNAUTHENTICATED";
  const ctx = await getHostContext();
  if (!ctx?.isOrgHost || !ctx.organization) return "FORBIDDEN";
  return null;
}

function sanitizeOrgPatch(input: unknown): OrgPatch {
  if (!input || typeof input !== "object") return {};
  const d = input as Record<string, unknown>;
  const out: OrgPatch = {};
  const name = cleanString(d.name, 160);
  if (name) out.name = name;
  const rc = cleanString(d.businessRegistrationNumber, 80);
  if (rc !== undefined) out.businessRegistrationNumber = rc;
  const type = cleanString(d.businessType, 120);
  if (type !== undefined) out.businessType = type;
  const email = cleanString(d.businessEmail, 160);
  if (email !== undefined) out.businessEmail = email;
  const phone = cleanString(d.businessPhone, 40);
  if (phone !== undefined) out.businessPhone = phone;
  const address = cleanString(d.address, 240);
  if (address !== undefined) out.address = address;
  const description = cleanString(d.description, 4000);
  if (description !== undefined) out.description = description;
  if (d.teamSizeEstimate === "1" || d.teamSizeEstimate === "2-10" || d.teamSizeEstimate === "11-50" || d.teamSizeEstimate === "50+") {
    out.teamSizeEstimate = d.teamSizeEstimate;
  }
  if (d.bookingApprovalMode === "instant" || d.bookingApprovalMode === "request") {
    out.bookingApprovalMode = d.bookingApprovalMode;
  }
  for (const key of ["checkInTime", "checkOutTime", "curfewPolicy", "agePolicy"] as const) {
    const v = cleanString(d[key], 120);
    if (v !== undefined) out[key] = v;
  }
  if (typeof d.hotelStarRating === "number" && d.hotelStarRating >= 1 && d.hotelStarRating <= 5) {
    out.hotelStarRating = Math.round(d.hotelStarRating);
  }
  if (typeof d.totalRoomCount === "number" && d.totalRoomCount >= 0) out.totalRoomCount = Math.round(d.totalRoomCount);
  for (const key of ["hotelAmenities", "hostelFacilities"] as const) {
    if (Array.isArray(d[key])) {
      out[key] = (d[key] as unknown[]).filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 80)).slice(0, 40);
    }
  }
  return out;
}

/** "14:00" -> "14:00:00" for the backend time fields; empty clears. */
function timeOf(value: string): string | null {
  if (!value) return null;
  return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
}

/**
 * Edits the ACTIVE organisation (PATCH /host/organization, needs org.edit).
 * A change of a legal number sends an approved host back to review (BR-ORG-06).
 * The booking approval mode lives on the host account (PATCH /host/account).
 */
export async function updateOrganizationAction(patch: unknown): Promise<ActionResult<Organization>> {
  const refused = await requireOrgWorkspace();
  if (refused) return actionFail(refused);
  const p = sanitizeOrgPatch(patch);
  if (p.businessEmail && !EMAIL_RE.test(p.businessEmail)) return actionFail("INVALID_EMAIL");

  try {
    const current = await api<ApiOrganization>("/host/organization");
    const body: Record<string, unknown> = {};
    if (p.name !== undefined) body.display_name = p.name;
    if (p.businessRegistrationNumber !== undefined) body.rc_number = p.businessRegistrationNumber;
    if (p.businessType !== undefined) body.legal_name = p.businessType;
    if (p.businessEmail !== undefined) body.business_email = p.businessEmail;
    if (p.businessPhone !== undefined) {
      if (!p.businessPhone) body.business_phone_e164 = "";
      else {
        const phone = toE164Phone(p.businessPhone);
        if (!phone) return actionFail("INVALID_PHONE");
        body.business_phone_e164 = phone;
      }
    }
    if (p.address !== undefined) body.address_line = p.address;
    if (p.description !== undefined) body.description = p.description;
    if (p.hotelStarRating !== undefined) body.star_rating = p.hotelStarRating;
    if (p.checkInTime !== undefined) body.check_in_time = timeOf(p.checkInTime);
    if (p.checkOutTime !== undefined) body.check_out_time = timeOf(p.checkOutTime);

    // Policies are one JSON object on the backend: merge, never drop keys we do not edit.
    const policies: Record<string, unknown> = { ...(current.policies ?? {}) };
    let policiesChanged = false;
    const setPolicy = (key: string, value: unknown) => {
      if (value === undefined) return;
      policies[key] = value;
      policiesChanged = true;
    };
    setPolicy("curfew", p.curfewPolicy);
    if (p.agePolicy !== undefined) {
      delete policies.age_policy;
      setPolicy("age", p.agePolicy);
    }
    setPolicy("hotel_amenities", p.hotelAmenities);
    setPolicy("hostel_facilities", p.hostelFacilities);
    setPolicy("total_room_count", p.totalRoomCount);
    setPolicy("team_size_estimate", p.teamSizeEstimate);
    if (policiesChanged) body.policies = policies;

    let org = current;
    if (Object.keys(body).length > 0) {
      org = await api<ApiOrganization>("/host/organization", { method: "PATCH", body });
    }
    let approvalMode: "instant" | "request" | undefined;
    if (p.bookingApprovalMode) {
      const account = await api<{ default_approval_mode?: "instant" | "request" }>("/host/account", {
        method: "PATCH",
        body: { default_approval_mode: p.bookingApprovalMode },
      });
      approvalMode = account.default_approval_mode ?? p.bookingApprovalMode;
    }
    revalidatePath("/", "layout");
    return actionOk({ ...toOrganization(org), bookingApprovalMode: approvalMode });
  } catch (error) {
    return failWith(error, "updateOrganizationAction", "ORG_ADMIN_REQUIRED");
  }
}

/** Owner only. `confirmName` must match the organisation name exactly (backend checks it too). */
export async function deleteOrganizationAction(confirmName: string): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  const ctx = await getHostContext();
  if (!ctx?.isOrgHost || !ctx.organization) return actionFail("ORG_OWNER_REQUIRED");
  if (typeof confirmName !== "string" || confirmName !== ctx.organization.name) return actionFail("ORG_NAME_MISMATCH");
  try {
    await api("/host/organization", { method: "DELETE", query: { confirm_name: confirmName } });
  } catch (error) {
    return failWith(error, "deleteOrganizationAction", "ORG_OWNER_REQUIRED");
  }
  await refreshSession(user).catch(() => null);
  revalidatePath("/", "layout");
  return actionOk({ id: ctx.organization.id });
}

/** Team members and invitations of the active organisation (fresh read for the team page). */
export async function getTeamAction(): Promise<ActionResult<{ members: Membership[]; invitations: OrganizationInvitation[] }>> {
  const refused = await requireOrgWorkspace();
  if (refused) return actionFail(refused);
  const ctx = await getHostContext();
  const members = await getOrganizationMembers(ctx!.organization!.id);
  let invitations: OrganizationInvitation[] = [];
  try {
    const answer = await api<{ results: ApiInvitation[] }>("/host/organization/invitations");
    invitations = (answer.results ?? []).map(toInvitation);
  } catch {
    invitations = []; // roles without members.manage cannot see invitations
  }
  return actionOk({ members, invitations });
}

/**
 * Invite one person by email (POST /host/organization/invitations).
 * Email sending is not built on the backend yet: the raw token comes back
 * once, so the inviter gets the invitation link to pass on themselves.
 */
export async function inviteMemberAction(input: {
  name?: string;
  email: string;
  role: "admin" | "manager";
}): Promise<ActionResult<{ invitation: OrganizationInvitation; token: string }>> {
  const refused = await requireOrgWorkspace();
  if (refused) return actionFail(refused);
  const user = await getSessionUser();
  const email = cleanString(input?.email, 160)?.toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return actionFail("INVALID_EMAIL");
  if (user && email === user.email.toLowerCase()) return actionFail("ALREADY_MEMBER");
  const role = input?.role === "admin" ? "admin" : "manager";
  try {
    const created = await api<ApiInvitation>("/host/organization/invitations", {
      method: "POST",
      body: { email, role },
    });
    revalidatePath("/[locale]/host/agency/team", "page");
    return actionOk({ invitation: toInvitation(created), token: created.token ?? "" });
  } catch (error) {
    return failWith(error, "inviteMemberAction", "ORG_ADMIN_REQUIRED");
  }
}

/** Cancel a pending invitation; its link stops working. */
export async function revokeInvitationAction(invitationId: string): Promise<ActionResult<{ id: string }>> {
  const refused = await requireOrgWorkspace();
  if (refused) return actionFail(refused);
  if (typeof invitationId !== "string" || !invitationId) return actionFail("INVALID_INPUT");
  try {
    await api(`/host/organization/invitations/${encodeURIComponent(invitationId)}`, { method: "DELETE" });
    return actionOk({ id: invitationId });
  } catch (error) {
    return failWith(error, "revokeInvitationAction", "ORG_ADMIN_REQUIRED");
  }
}

/** Change a member's role (members.manage). Ownership moves only with transferOwnershipAction. */
export async function changeMemberRoleAction(
  memberId: string,
  role: "admin" | "manager"
): Promise<ActionResult<Membership>> {
  const refused = await requireOrgWorkspace();
  if (refused) return actionFail(refused);
  if (role !== "admin" && role !== "manager") return actionFail("INVALID_INPUT");
  if (typeof memberId !== "string" || !memberId) return actionFail("INVALID_INPUT");
  const ctx = await getHostContext();
  try {
    const member = await api<ApiMember>(`/host/organization/members/${encodeURIComponent(memberId)}`, {
      method: "PATCH",
      body: { role },
    });
    revalidatePath("/", "layout");
    return actionOk(toMembership(member, ctx!.organization!.id));
  } catch (error) {
    if (error instanceof ApiError && (error.code === "owner_protected" || error.code === "use_ownership_transfer")) {
      return actionFail("OWNER_ROLE_LOCKED");
    }
    return failWith(error, "changeMemberRoleAction", "ORG_ADMIN_REQUIRED");
  }
}

/** Remove a member (members.manage); the owner cannot be removed. */
export async function removeMemberAction(memberId: string): Promise<ActionResult<{ id: string }>> {
  const refused = await requireOrgWorkspace();
  if (refused) return actionFail(refused);
  if (typeof memberId !== "string" || !memberId) return actionFail("INVALID_INPUT");
  try {
    await api(`/host/organization/members/${encodeURIComponent(memberId)}`, { method: "DELETE" });
    revalidatePath("/", "layout");
    return actionOk({ id: memberId });
  } catch (error) {
    if (error instanceof ApiError && error.code === "owner_protected") return actionFail("OWNER_NOT_REMOVABLE");
    return failWith(error, "removeMemberAction", "ORG_ADMIN_REQUIRED");
  }
}

/** The owner hands the organisation to an active member and becomes admin (BR-ORG-04). */
export async function transferOwnershipAction(memberId: string): Promise<ActionResult<Membership[]>> {
  const refused = await requireOrgWorkspace();
  if (refused) return actionFail(refused);
  if (typeof memberId !== "string" || !memberId) return actionFail("INVALID_INPUT");
  const ctx = await getHostContext();
  try {
    await api("/host/organization/transfer-ownership", { method: "POST", body: { membership_id: memberId } });
  } catch (error) {
    if (error instanceof ApiError && error.code === "already_owner") return actionFail("TRANSFER_TARGET_INACTIVE");
    return failWith(error, "transferOwnershipAction", "ORG_OWNER_REQUIRED");
  }
  const user = await getSessionUser();
  await refreshSession(user).catch(() => null);
  revalidatePath("/", "layout");
  return actionOk(await getOrganizationMembers(ctx!.organization!.id));
}

/**
 * Switch the host workspace (an organisation or the user's own solo host
 * account). The id may be a host account id or an organisation id; the
 * backend remembers the choice on the session (PUT /me/workspaces/active).
 */
export async function switchWorkspaceAction(workspaceId: string): Promise<ActionResult<{ organizationId: string | null }>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (typeof workspaceId !== "string" || !workspaceId) return actionFail("INVALID_INPUT");
  const bundle = await getMe();
  const target = bundle?.workspaces.find(
    (w: ApiWorkspace) => w.host_account_id === workspaceId || w.organization_id === workspaceId,
  );
  if (!target) return actionFail("FORBIDDEN");
  try {
    await refreshSession(user, target.host_account_id);
  } catch (error) {
    return failFromError(error, "switchWorkspaceAction");
  }
  revalidatePath("/", "layout");
  return actionOk({ organizationId: target.organization_id });
}

/** Join a team with the token of an invitation link, then act for that organisation. */
export async function acceptInvitationAction(token: string): Promise<ActionResult<{ organizationId: string | null }>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  const clean = typeof token === "string" ? token.trim().slice(0, 200) : "";
  if (!clean) return actionFail("INVITATION_INVALID");
  let workspace: ApiWorkspace;
  try {
    workspace = await api<ApiWorkspace>("/invitations/accept", { method: "POST", body: { token: clean } });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return actionFail("INVITATION_INVALID");
    return failFromError(error, "acceptInvitationAction");
  }
  await refreshSession(user, workspace.host_account_id).catch(() => null);
  revalidatePath("/", "layout");
  return actionOk({ organizationId: workspace.organization_id });
}
