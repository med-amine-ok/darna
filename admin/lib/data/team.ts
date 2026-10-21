// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { AdminUser, AdminRole } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { logAudit } from "./audit";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listTeamMembers(): Promise<AdminUser[]> {
  await delay(120);
  return [...store.team];
}

export async function updateMemberRole(
  userId: string,
  newRole: AdminRole,
  actor: { id: string; name: string; role: any }
): Promise<AdminUser> {
  assertCan(actor.role, "team.manage");
  await delay(180);

  const idx = store.team.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("Team member not found");

  // Protection: Cannot remove the last super_admin
  if (store.team[idx].role === "super_admin" && newRole !== "super_admin") {
    const superAdminCount = store.team.filter((u) => u.role === "super_admin").length;
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
  actor: { id: string; name: string; role: any }
): Promise<AdminUser> {
  assertCan(actor.role, "team.manage");
  await delay(180);

  const idx = store.team.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("Team member not found");

  if (store.team[idx].role === "super_admin" && store.team[idx].isActive) {
    const activeSuperAdmins = store.team.filter((u) => u.role === "super_admin" && u.isActive).length;
    if (activeSuperAdmins <= 1) {
      throw new Error("Cannot deactivate the last active Super Admin.");
    }
  }

  store.team[idx] = {
    ...store.team[idx],
    isActive: !store.team[idx].isActive,
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
