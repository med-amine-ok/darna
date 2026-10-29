"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminCredentials } from "@/lib/auth/credentials";
import { getClientIp } from "@/lib/auth/client-ip";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import {
  checkLoginRateLimit,
  loginRateLimitKeys,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "@/lib/auth/rate-limit";
import { normalizeLocale, safeReturnTo } from "@/lib/auth/return-to";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, signSessionToken } from "@/lib/auth/session";
import { logAudit } from "@/lib/data/audit";
import { findTeamMemberByEmail, recordTeamMemberLogin } from "@/lib/data/team";
import { getDevSeedPassword } from "@/lib/data/credentials";

export type LoginResult =
  | { error: "invalidCredentials" }
  | { error: "rateLimited"; retryAfterSecs: number }
  | { error: "unexpected" };

const MAX_EMAIL_LEN = 254;
const MAX_PASSWORD_LEN = 256;

/**
 * Sign-in. On success sets the httpOnly session cookie and redirects to the
 * validated returnTo (never returns). On failure returns a generic error code:
 * unknown email, wrong password and deactivated account are indistinguishable.
 */
export async function loginAction(formData: FormData): Promise<LoginResult> {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const locale = normalizeLocale(formData.get("locale"));
  const returnTo = safeReturnTo(formData.get("returnTo"), locale);

  const email = typeof rawEmail === "string" ? rawEmail.trim().slice(0, MAX_EMAIL_LEN) : "";
  const password = typeof rawPassword === "string" ? rawPassword.slice(0, MAX_PASSWORD_LEN) : "";
  const ip = getClientIp();
  const keys = loginRateLimitKeys(email, ip);

  const limit = checkLoginRateLimit(keys);
  if (!limit.allowed) {
    await logAudit(
      { id: "anonymous", name: email || "(empty)", role: "anonymous", ip },
      "LOGIN_BLOCKED",
      "auth",
      email || "unknown",
      `Sign-in attempt blocked by rate limiter (retry in ${limit.retryAfterSecs}s)`
    );
    return { error: "rateLimited", retryAfterSecs: limit.retryAfterSecs ?? 60 };
  }

  if (!email || !password) {
    recordFailedLogin(keys);
    return { error: "invalidCredentials" };
  }

  let check: Awaited<ReturnType<typeof verifyAdminCredentials>>;
  try {
    check = await verifyAdminCredentials(email, password);
  } catch (err) {
    console.error("[login]", err);
    return { error: "unexpected" };
  }

  if (!check.ok) {
    recordFailedLogin(keys);
    const who = check.admin;
    await logAudit(
      who
        ? { id: who.id, name: who.name, role: who.role, ip }
        : { id: "anonymous", name: email, role: "anonymous", ip },
      "LOGIN_FAILURE",
      "auth",
      who?.id ?? "unknown",
      `Failed sign-in for ${email} (${check.reason})`
    );
    return { error: "invalidCredentials" };
  }

  const admin = check.admin;
  recordSuccessfulLogin(keys);
  await recordTeamMemberLogin(admin.id);

  const token = await signSessionToken({
    userId: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    avatar: admin.avatar,
  });

  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });

  await logAudit(
    { id: admin.id, name: admin.name, role: admin.role, ip },
    "LOGIN_SUCCESS",
    "auth",
    admin.id,
    `${admin.name} signed in`
  );

  redirect(returnTo);
}

/** Deletes the httpOnly session cookie, audits, and redirects to /{locale}/login. */
export async function logoutAction(formData: FormData): Promise<void> {
  const locale = normalizeLocale(formData.get("locale"));
  const admin = await getCurrentAdmin();
  if (admin) {
    await logAudit(
      { id: admin.id, name: admin.name, role: admin.role, ip: getClientIp() },
      "LOGOUT",
      "auth",
      admin.id,
      `${admin.name} signed out`
    );
  }
  cookies().delete(SESSION_COOKIE_NAME);
  redirect(`/${locale}/login`);
}

/**
 * DEVELOPMENT ONLY: returns the seed password for a demo account so the
 * login page's quick-fill buttons work without shipping passwords in markup.
 * Always refuses outside `next dev`.
 */
export async function getDemoCredentials(email: string): Promise<{ email: string; password: string } | null> {
  if (process.env.NODE_ENV !== "development") return null;
  if (typeof email !== "string") return null;
  const admin = await findTeamMemberByEmail(email);
  if (!admin) return null;
  const password = await getDevSeedPassword(admin.id);
  return password ? { email: admin.email, password } : null;
}
