import "server-only";
// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { AdminUser, AdminRole, AdminActor } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { logAudit } from "./audit";
import { DomainError, ValidationError } from "./errors";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ADMIN_ROLES: AdminRole[] = ["super_admin", "moderator", "support", "finance", "analyst"];

export async function listTeamMembers(): Promise<AdminUser[]> {
  await delay(120);
  return store.team.map((u) => ({ ...u }));
}

/**
 * Single source of truth for staff accounts: the same records back /team and
 * the sign-in / session checks, so role and isActive changes apply at once.
 */
export async function getTeamMemberById(id: string): Promise<AdminUser | null> {
  const member = store.team.find((u) => u.id === id);
  return member ? { ...member } : null;
}

export async function findTeamMemberByEmail(email: string): Promise<AdminUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const member = store.team.find((u) => u.email.toLowerCase() === normalized);
  return member ? { ...member } : null;
}

export async function recordTeamMemberLogin(id: string): Promise<void> {
  const idx = store.team.findIndex((u) => u.id === id);
  if (idx === -1) return;
  store.team[idx] = { ...store.team[idx], lastLoginAt: new Date().toISOString() };
}

export async function updateMemberRole(
  userId: string,
  newRole: AdminRole,
  actor: AdminActor
): Promise<AdminUser> {
  assertCan(actor.role, "team.manage");
  if (!ADMIN_ROLES.includes(newRole)) throw new Error("Invalid role");
  await delay(180);

  const idx = store.team.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("Team member not found");

  // Protection: cannot demote the last ACTIVE super_admin (inactive ones can't sign in)
  if (store.team[idx].role === "super_admin" && store.team[idx].isActive && newRole !== "super_admin") {
    const superAdminCount = store.team.filter((u) => u.role === "super_admin" && u.isActive).length;
    if (superAdminCount <= 1) {
      throw new Error("Cannot demote the last remaining Super Admin.");
    }
  }

  const prev = { ...store.team[idx] };
  store.team[idx] = {
    ...store.team[idx],
    role: newRole,
  };

  await logAudit(
    actor,
    "TEAM_ROLE_UPDATE",
    "user",
    userId,
    `Changed role of ${prev.name} from ${prev.role} to ${newRole}`,
    prev,
    store.team[idx]
  );

  return store.team[idx];
}

export async function toggleMemberActive(
  userId: string,
  actor: AdminActor
): Promise<AdminUser> {
  assertCan(actor.role, "team.manage");
  await delay(180);

  const idx = store.team.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("Team member not found");

  if (store.team[idx].status === "invited") {
    throw new DomainError("An invited member becomes active only after accepting the invitation");
  }

  if (store.team[idx].role === "super_admin" && store.team[idx].isActive) {
    const activeSuperAdmins = store.team.filter((u) => u.role === "super_admin" && u.isActive).length;
    if (activeSuperAdmins <= 1) {
      throw new Error("Cannot deactivate the last active Super Admin.");
    }
  }

  store.team[idx] = {
    ...store.team[idx],
    isActive: !store.team[idx].isActive,
    status: store.team[idx].isActive ? "deactivated" : "active",
  };

  await logAudit(
    actor,
    "TEAM_STATUS_TOGGLE",
    "user",
    userId,
    `Toggled staff member ${store.team[idx].name} active to ${store.team[idx].isActive}`
  );

  return store.team[idx];
}

/**
 * Creates an INVITED staff account: inactive, no password (no entry in
 * store.credentials) until the invitation is accepted — it cannot sign in.
 * Mock only: no email is actually sent.
 */
export async function inviteMember(
  input: { name: string; email: string; role: AdminRole },
  actor: AdminActor
): Promise<AdminUser> {
  assertCan(actor.role, "team.manage");
  if (!ADMIN_ROLES.includes(input.role)) throw new ValidationError("Invalid role");
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name) throw new ValidationError("A name is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("A valid email address is required");
  await delay(180);

  if (store.team.some((u) => u.email.toLowerCase() === email)) {
    throw new DomainError("A staff account with this email already exists");
  }

  const now = new Date().toISOString();
  const member: AdminUser = {
    id: `adm_inv_${Date.now().toString(36)}`,
    name,
    email,
    role: input.role,
    isActive: false,
    status: "invited",
    createdAt: now,
    invitedAt: now,
    invitedBy: actor.name,
  };
  store.team.push(member);

  await logAudit(
    actor,
    "TEAM_MEMBER_INVITE",
    "team",
    member.id,
    `Invited ${name} <${email}> as ${input.role}`,
    undefined,
    { email, role: input.role, status: "invited" }
  );

  return { ...member };
}
