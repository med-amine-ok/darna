"use server";

import { revalidatePath } from "next/cache";
import type { Membership, Organization } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { orgPermissions } from "@/lib/host-types";
import { getOrgContext } from "@/lib/server/authz";
import { getSessionUser, refreshSession } from "@/lib/server/session";
import {
  addOrganizationMember,
  deleteOrganization,
  getMemberById,
  getOrganizationMembers,
  OrganizationEditableField,
  removeOrganizationMember,
  transferOrganizationOwnership,
  updateOrganization,
  updateOrganizationMemberRole,
} from "@/lib/data/organizations";
import { updateUserHostStatus } from "@/lib/data/auth";

type OrgPatch = Partial<Pick<Organization, OrganizationEditableField>>;

function cleanString(value: unknown, max: number): string | undefined {
  return typeof value === "string" ? value.trim().slice(0, max) : undefined;
}

function sanitizeOrgPatch(input: unknown): OrgPatch {
  if (!input || typeof input !== "object") return {};
  const d = input as Record<string, unknown>;
  const out: OrgPatch = {};
  const name = cleanString(d.name, 160);
  if (name) out.name = name;
  const rc = cleanString(d.businessRegistrationNumber, 80);
  if (rc) out.businessRegistrationNumber = rc;
  const type = cleanString(d.businessType, 120);
  if (type) out.businessType = type;
  const email = cleanString(d.businessEmail, 160);
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) out.businessEmail = email;
  const phone = cleanString(d.businessPhone, 40);
  if (phone) out.businessPhone = phone;
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
  return out;
}

/** Edits the CURRENT organization (owner/admin). Legal changes reset verification. */
export async function updateOrganizationAction(patch: unknown): Promise<ActionResult<Organization>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  const ctx = await getOrgContext(orgPermissions.canEditSettings);
  if (!ctx) return actionFail("ORG_ADMIN_REQUIRED");

  const updated = await updateOrganization(ctx.organization.id, sanitizeOrgPatch(patch));
  if (!updated) return actionFail("NOT_FOUND");
  revalidatePath("/", "layout");
  return actionOk(updated);
}

/** Owner only. `confirmName` must match the organization name exactly. */
export async function deleteOrganizationAction(confirmName: string): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  const ctx = await getOrgContext(orgPermissions.canDeleteOrganization);
  if (!ctx) return actionFail("ORG_OWNER_REQUIRED");
  if (confirmName !== ctx.organization.name) {
    return actionFail("ORG_NAME_MISMATCH");
  }

  const ok = await deleteOrganization(ctx.organization.id);
  if (!ok) return actionFail("NOT_FOUND");

  const refreshed = await updateUserHostStatus(user.id, { organizationId: null });
  if (refreshed) await refreshSession(refreshed, null);
  revalidatePath("/", "layout");
  return actionOk({ id: ctx.organization.id });
}

export async function inviteMemberAction(input: {
  name?: string;
  email: string;
  role: "admin" | "manager";
}): Promise<ActionResult<Membership>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  const ctx = await getOrgContext(orgPermissions.canInviteMembers);
  if (!ctx) return actionFail("ORG_ADMIN_REQUIRED");

  const email = cleanString(input?.email, 160)?.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return actionFail("INVALID_EMAIL");
  }
  const role = input.role === "admin" ? "admin" : "manager";
  // Only the owner may grant admin.
  if (role === "admin" && ctx.membership.role !== "owner") {
    return actionFail("ORG_OWNER_REQUIRED");
  }
  const existing = await getOrganizationMembers(ctx.organization.id);
  if (existing.some((m) => m.email.toLowerCase() === email && m.status !== "removed")) {
    return actionFail("ALREADY_MEMBER");
  }

  const member = await addOrganizationMember({
    organizationId: ctx.organization.id,
    name: cleanString(input.name, 120) || email.split("@")[0],
    email,
    role,
    invitedBy: user.id,
  });
  revalidatePath("/", "layout");
  return actionOk(member);
}

/** Owner only. Use transferOwnershipAction to make someone the owner. */
export async function changeMemberRoleAction(
  memberId: string,
  role: "admin" | "manager"
): Promise<ActionResult<Membership>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  const ctx = await getOrgContext(orgPermissions.canChangeRoles);
  if (!ctx) return actionFail("ORG_OWNER_REQUIRED");
  if (role !== "admin" && role !== "manager") return actionFail("INVALID_INPUT");

  const member = typeof memberId === "string" ? await getMemberById(memberId) : null;
  if (!member || member.organizationId !== ctx.organization.id) return actionFail("NOT_FOUND");
  if (member.role === "owner") {
    return actionFail("OWNER_ROLE_LOCKED");
  }

  const updated = await updateOrganizationMemberRole(member.id, role);
  if (!updated) return actionFail("NOT_FOUND");
  revalidatePath("/", "layout");
  return actionOk(updated);
}

export async function removeMemberAction(memberId: string): Promise<ActionResult<{ id: string }>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  const ctx = await getOrgContext(orgPermissions.canInviteMembers);
  if (!ctx) return actionFail("ORG_ADMIN_REQUIRED");

  const member = typeof memberId === "string" ? await getMemberById(memberId) : null;
  if (!member || member.organizationId !== ctx.organization.id) return actionFail("NOT_FOUND");
  if (!orgPermissions.canRemoveMember(ctx.membership.role, member.role)) {
    return actionFail(member.role === "owner" ? "OWNER_NOT_REMOVABLE" : "ORG_OWNER_REQUIRED");
  }

  const ok = await removeOrganizationMember(member.id);
  if (!ok) return actionFail("NOT_FOUND");
  revalidatePath("/", "layout");
  return actionOk({ id: member.id });
}

export async function transferOwnershipAction(memberId: string): Promise<ActionResult<Membership[]>> {
  if (!(await getSessionUser())) return actionFail("UNAUTHENTICATED");
  const ctx = await getOrgContext(orgPermissions.canTransferOwnership);
  if (!ctx) return actionFail("ORG_OWNER_REQUIRED");

  const member = typeof memberId === "string" ? await getMemberById(memberId) : null;
  if (!member || member.organizationId !== ctx.organization.id) return actionFail("NOT_FOUND");
  if (member.status !== "active" || !member.userId) {
    return actionFail("TRANSFER_TARGET_INACTIVE");
  }

  const ok = await transferOrganizationOwnership(ctx.organization.id, member.id);
  if (!ok) return actionFail("SERVER_ERROR");
  revalidatePath("/", "layout");
  return actionOk(await getOrganizationMembers(ctx.organization.id));
}
