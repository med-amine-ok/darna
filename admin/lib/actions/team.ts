"use server";

import * as team from "@/lib/data/team";
import { runAction, id, oneOf, obj, str } from "@/lib/auth/run-action";
import type { AdminRole } from "@/lib/types";

const ADMIN_ROLES: readonly AdminRole[] = ["super_admin", "moderator", "support", "finance", "analyst"];

export async function listTeamMembers() {
  return runAction("team.manage", () => team.listTeamMembers());
}

export async function updateMemberRole(userId: string, newRole: AdminRole) {
  return runAction("team.manage", (actor) =>
    team.updateMemberRole(id(userId), oneOf(newRole, ADMIN_ROLES, "role"), actor)
  );
}

export async function toggleMemberActive(userId: string) {
  return runAction("team.manage", (actor) => team.toggleMemberActive(id(userId), actor));
}

export async function inviteMember(input: { name: string; email: string; role: AdminRole }) {
  return runAction("team.manage", (actor) => {
    const i = obj<typeof input>(input, "invite");
    return team.inviteMember(
      { name: str(i.name, "name", 120), email: str(i.email, "email", 200), role: oneOf(i.role, ADMIN_ROLES, "role") },
      actor
    );
  });
}
