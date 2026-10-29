import "server-only";

import { findTeamMemberByEmail } from "@/lib/data/team";
import { getAdminPasswordHash } from "@/lib/data/credentials";
import type { AdminUser } from "@/lib/types";
import { burnPasswordCheck, verifyPassword } from "./password";

export type CredentialCheck =
  | { ok: true; admin: AdminUser }
  | { ok: false; reason: "unknown_account" | "bad_password" | "inactive"; admin: AdminUser | null };

/**
 * Verifies an email/password pair against the admin store. Always performs
 * one scrypt computation so timing does not reveal whether the account exists.
 * The caller must NOT surface `reason` to the client (generic error only).
 */
export async function verifyAdminCredentials(email: string, password: string): Promise<CredentialCheck> {
  const admin = await findTeamMemberByEmail(email);
  const hash = admin ? await getAdminPasswordHash(admin.id) : null;
  if (!admin || !hash) {
    burnPasswordCheck(password);
    return { ok: false, reason: "unknown_account", admin };
  }
  if (!verifyPassword(password, hash)) return { ok: false, reason: "bad_password", admin };
  if (!admin.isActive) return { ok: false, reason: "inactive", admin };
  return { ok: true, admin };
}
