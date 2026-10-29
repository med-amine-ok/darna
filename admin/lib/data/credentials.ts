import "server-only";
// TODO: replace with an `admin_credentials` table (adminId, password_hash).
import { store } from "@/lib/mock-data/store";
import { SEED_ADMINS, getSeedPassword } from "@/lib/mock-data/admins";
import { hashPassword } from "@/lib/auth/password";
import type { AdminRole } from "@/lib/types";

/** Stored password hash for an admin ("scrypt$salt$hash"), or null if none. */
export async function getAdminPasswordHash(adminId: string): Promise<string | null> {
  const existing = store.credentials.get(adminId);
  if (existing) return existing;
  // Lazily hash the configured seed password the first time it is needed.
  const seed = getSeedPassword(adminId);
  if (!seed) return null;
  const hash = hashPassword(seed);
  store.credentials.set(adminId, hash);
  return hash;
}

/** DEVELOPMENT ONLY: demo accounts offered as quick-fill buttons on /login. */
export async function listDevDemoAccounts(): Promise<{ email: string; role: AdminRole }[]> {
  if (process.env.NODE_ENV !== "development") return [];
  return SEED_ADMINS.filter((a) => ["super_admin", "moderator", "finance"].includes(a.role)).map((a) => ({
    email: a.email,
    role: a.role,
  }));
}

/** DEVELOPMENT ONLY: plain seed password for the quick-fill buttons. */
export async function getDevSeedPassword(adminId: string): Promise<string | null> {
  if (process.env.NODE_ENV !== "development") return null;
  return getSeedPassword(adminId);
}
