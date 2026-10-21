"use server";

import { cookies } from "next/headers";
import {
  MOCK_ADMIN_ACCOUNTS,
  signSessionToken,
  SESSION_COOKIE_NAME,
  checkLoginRateLimit,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "@/lib/auth/session";

export async function loginAdminAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const ip = "197.200.45.12"; // Mock IP

  // Check Rate Limit
  const rateLimit = checkLoginRateLimit(ip);
  if (!rateLimit.allowed) {
    return {
      error: `Too many failed login attempts. Please wait ${rateLimit.remainingSecs} seconds before trying again.`,
    };
  }

  const account = MOCK_ADMIN_ACCOUNTS.find(
    (acc) => acc.email.toLowerCase() === email?.trim().toLowerCase() && acc.password === password
  );

  if (!account) {
    recordFailedLogin(ip);
    return { error: "Invalid email or password. Please verify your credentials." };
  }

  if (!account.isActive) {
    return { error: "Your administrator account has been deactivated. Contact Super Admin." };
  }

  recordSuccessfulLogin(ip);

  // Sign JWT
  const token = await signSessionToken({
    userId: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    avatar: account.avatar,
  });

  // Store in secure httpOnly cookie
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 8 * 60 * 60, // 8 hours
    path: "/",
  });

  return { success: true };
}
