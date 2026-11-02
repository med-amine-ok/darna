import "server-only";

import type { AdminUser } from "@/lib/types";

/**
 * Seed staff accounts for the mock back-office. These records seed the single
 * admin/team store (store.team) that both /team and the login flow use.
 *
 * Seed passwords come from env vars; the literal defaults below are only used
 * outside production (`next dev`, local e2e). In production an account whose
 * env var is missing simply has no password and cannot sign in.
 */

export const SEED_ADMINS: AdminUser[] = [
  {
    id: "adm_01",
    name: "BLADUS Administrator",
    email: process.env.ADMIN_SEED_EMAIL || "admin@bladus.dz",
    role: "super_admin",
    avatar: "/assets/avatar.png",
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    lastLoginAt: "2026-10-20T08:00:00Z",
  },
  {
    id: "adm_02",
    name: "Yassine Mansour",
    email: "moderator@bladus.dz",
    role: "moderator",
    avatar: "/assets/avatar.png",
    isActive: true,
    createdAt: "2026-02-15T00:00:00Z",
    lastLoginAt: "2026-10-19T14:30:00Z",
  },
  {
    id: "adm_03",
    name: "Sara Benali",
    email: "support@bladus.dz",
    role: "support",
    avatar: "/assets/avatar.png",
    isActive: true,
    createdAt: "2026-03-01T00:00:00Z",
    lastLoginAt: "2026-10-20T07:15:00Z",
  },
  {
    id: "adm_04",
    name: "Karim Hadj",
    email: "finance@bladus.dz",
    role: "finance",
    avatar: "/assets/avatar.png",
    isActive: true,
    createdAt: "2026-01-20T00:00:00Z",
    lastLoginAt: "2026-10-18T16:45:00Z",
  },
  {
    id: "adm_05",
    name: "Lina Cherif",
    email: "analyst@bladus.dz",
    role: "analyst",
    avatar: "/assets/avatar.png",
    isActive: true,
    createdAt: "2026-04-10T00:00:00Z",
    lastLoginAt: "2026-10-17T11:20:00Z",
  },
];

const SEED_PASSWORD_ENV: Record<string, { env: string; devDefault: string }> = {
  adm_01: { env: "ADMIN_SEED_PASSWORD", devDefault: "DarnaAdmin2026!" },
  adm_02: { env: "ADMIN_SEED_PASSWORD_MODERATOR", devDefault: "DarnaMod2026!" },
  adm_03: { env: "ADMIN_SEED_PASSWORD_SUPPORT", devDefault: "DarnaSupport2026!" },
  adm_04: { env: "ADMIN_SEED_PASSWORD_FINANCE", devDefault: "DarnaFinance2026!" },
  adm_05: { env: "ADMIN_SEED_PASSWORD_ANALYST", devDefault: "DarnaAnalyst2026!" },
};

/** Plain seed password for an admin id, or null if none is configured. */
export function getSeedPassword(adminId: string): string | null {
  const cfg = SEED_PASSWORD_ENV[adminId];
  if (!cfg) return null;
  const fromEnv = process.env[cfg.env];
  if (fromEnv) return fromEnv;
  return process.env.NODE_ENV === "production" ? null : cfg.devDefault;
}
