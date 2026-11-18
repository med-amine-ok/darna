import "server-only";

import { api } from "@/lib/api/client";
import { logReadError, write } from "@/lib/api/mapping";
import { toAdminUser, type ApiStaffMember, type ApiStaffRole } from "@/lib/api/staff";
import { toAdminRole, toBackendRole, toPermissions } from "@/lib/permissions";
import type { AdminActor, AdminRole, AdminUser, Permission } from "@/lib/types";
import { DomainError } from "./errors";

/**
 * Staff members, roles and invitations, from the Django API (/admin/staff*,
 * permission team.manage). Roles and their permissions are read from the
 * database (BR-STF-01); today there is one role, admin, with every permission.
 */

export interface StaffRoleInfo {
  /** Backend role code ("admin"). */
  code: string;
  /** Frontend role it shows as. */
  role: AdminRole;
  label: string;
  permissions: Permission[];
}

export async function listTeamMembers(): Promise<AdminUser[]> {
  const answer = await api<{ results: ApiStaffMember[] }>("/admin/staff");
  return (answer.results ?? []).map((row) => toAdminUser(row));
}

export async function listStaffRoles(): Promise<StaffRoleInfo[]> {
  try {
    const answer = await api<{ results: ApiStaffRole[] }>("/admin/staff/roles");
    return (answer.results ?? []).map((r) => ({
      code: r.role,
      role: toAdminRole(r.role),
      label: r.label,
      permissions: toPermissions(r.permissions),
    }));
  } catch (error) {
    logReadError("staff roles", error);
    return [];
  }
}

export async function getTeamMemberById(id: string): Promise<AdminUser | null> {
  const members = await listTeamMembers();
  return members.find((m) => m.id === id) ?? null;
}

export async function findTeamMemberByEmail(email: string): Promise<AdminUser | null> {
  const wanted = email.trim().toLowerCase();
  const members = await listTeamMembers();
  return members.find((m) => m.email.toLowerCase() === wanted) ?? null;
}

/** Sign-ins are recorded by the backend (last_login); kept for callers of the old store. */
export async function recordTeamMemberLogin(_id: string): Promise<void> {}

/** 409 last_super_admin when no admin would remain. */
export async function updateMemberRole(id: string, newRole: AdminRole | string, _actor: AdminActor): Promise<AdminUser> {
  const raw = await write(() =>
    api<ApiStaffMember>(`/admin/staff/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { role: toBackendRole(newRole) },
    }),
  );
  return toAdminUser(raw);
}

async function staffAction(id: string, action: "deactivate" | "activate" | "reset-mfa"): Promise<AdminUser> {
  const raw = await write(() => api<ApiStaffMember>(`/admin/staff/${encodeURIComponent(id)}/${action}`, { method: "POST" }));
  return toAdminUser(raw);
}

/** Deactivate an active member (sessions end at once) or activate a deactivated one. */
export async function toggleMemberActive(id: string, actor: AdminActor): Promise<AdminUser> {
  if (id === actor.id) throw new DomainError("You cannot deactivate your own account");
  const member = await getTeamMemberById(id);
  if (!member) throw new DomainError("Staff member not found");
  return staffAction(id, member.status === "deactivated" ? "activate" : "deactivate");
}

/** Remove the member's authenticator; they enrol a new one at the next sign-in. Sessions end at once. */
export async function resetMemberMfa(id: string, _actor: AdminActor): Promise<AdminUser> {
  return staffAction(id, "reset-mfa");
}

/** Invite by email (one-time link, 72 h). 409 email_taken when any account uses the email. */
export async function inviteMember(
  input: { name: string; email: string; role: AdminRole | string },
  _actor: AdminActor,
): Promise<AdminUser> {
  const raw = await write(() =>
    api<ApiStaffMember>("/admin/staff/invitations", {
      method: "POST",
      body: { email: input.email, display_name: input.name, role: toBackendRole(input.role) },
    }),
  );
  return toAdminUser(raw);
}
