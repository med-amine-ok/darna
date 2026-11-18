"use server";

import * as team from "@/lib/data/team";
import { runAction, id, obj, str } from "@/lib/auth/run-action";
import { InvalidInputError } from "@/lib/auth/run-action";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function roleCode(value: unknown): string {
  const role = str(value, "role", 32).trim();
  if (!/^[a-z_]+$/.test(role)) throw new InvalidInputError("Invalid role");
  return role;
}

export async function listTeamMembers() {
  return runAction("team.manage", () => team.listTeamMembers());
}

/** Members and the roles of the database, for the team screen. */
export async function getTeamOverview() {
  return runAction("team.manage", async () => {
    const [members, roles] = await Promise.all([team.listTeamMembers(), team.listStaffRoles()]);
    return { members, roles };
  });
}

export async function updateMemberRole(userId: string, newRole: string) {
  return runAction("team.manage", (actor) => team.updateMemberRole(id(userId), roleCode(newRole), actor));
}

export async function toggleMemberActive(userId: string) {
  return runAction("team.manage", (actor) => team.toggleMemberActive(id(userId), actor));
}

export async function resetMemberMfa(userId: string) {
  return runAction("team.manage", (actor) => team.resetMemberMfa(id(userId), actor));
}

export async function inviteMember(input: { name: string; email: string; role: string }) {
  return runAction("team.manage", (actor) => {
    const i = obj<typeof input>(input, "invite");
    const email = str(i.email, "email", 254).trim();
    if (!EMAIL_RE.test(email)) throw new InvalidInputError("Invalid email");
    return team.inviteMember({ name: str(i.name, "name", 160).trim(), email, role: roleCode(i.role) }, actor);
  });
}
