import { SignJWT, jwtVerify } from "jose";
import { AdminUser, AdminRole } from "@/lib/types";

const SECRET_KEY = new TextEncoder().encode(
  process.env.ADMIN_AUTH_SECRET || "darna-admin-super-secure-secret-key-2026-dz"
);

export const SESSION_COOKIE_NAME = "darna_admin_session";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
  avatar?: string;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Seed admin accounts for mock environment
export const MOCK_ADMIN_ACCOUNTS: (AdminUser & { password: string })[] = [
  {
    id: "adm_01",
    name: "DARNA Administrator",
    email: process.env.ADMIN_SEED_EMAIL || "admin@darna.dz",
    password: process.env.ADMIN_SEED_PASSWORD || "DarnaAdmin2026!",
    role: "super_admin",
    avatar: "/assets/avatar.png",
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    lastLoginAt: "2026-10-20T08:00:00Z",
  },
  {
    id: "adm_02",
    name: "Yassine Mansour",
    email: "moderator@darna.dz",
    password: "DarnaMod2026!",
    role: "moderator",
    avatar: "/assets/avatar.png",
    isActive: true,
    createdAt: "2026-02-15T00:00:00Z",
    lastLoginAt: "2026-10-19T14:30:00Z",
  },
  {
    id: "adm_03",
    name: "Sara Benali",
    email: "support@darna.dz",
    password: "DarnaSupport2026!",
    role: "support",
    avatar: "/assets/avatar.png",
    isActive: true,
    createdAt: "2026-03-01T00:00:00Z",
    lastLoginAt: "2026-10-20T07:15:00Z",
  },
  {
    id: "adm_04",
    name: "Karim Hadj",
    email: "finance@darna.dz",
    password: "DarnaFinance2026!",
    role: "finance",
    avatar: "/assets/avatar.png",
    isActive: true,
    createdAt: "2026-01-20T00:00:00Z",
    lastLoginAt: "2026-10-18T16:45:00Z",
  },
  {
    id: "adm_05",
    name: "Lina Cherif",
    email: "analyst@darna.dz",
    password: "DarnaAnalyst2026!",
    role: "analyst",
    avatar: "/assets/avatar.png",
    isActive: true,
    createdAt: "2026-04-10T00:00:00Z",
    lastLoginAt: "2026-10-17T11:20:00Z",
  },
];

// Simple in-memory rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; lockedUntil?: number }>();

export function checkLoginRateLimit(ip: string): { allowed: boolean; remainingSecs?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };

  if (record.lockedUntil && record.lockedUntil > now) {
    return { allowed: false, remainingSecs: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  if (record.lockedUntil && record.lockedUntil <= now) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLogin(ip: string): void {
  const record = loginAttempts.get(ip) || { count: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = Date.now() + 60 * 1000; // 1 min lock
  }
  loginAttempts.set(ip, record);
}

export function recordSuccessfulLogin(ip: string): void {
  loginAttempts.delete(ip);
}
