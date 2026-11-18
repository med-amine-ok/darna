import "server-only";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { ForbiddenView } from "@/components/auth/ForbiddenView";
import { SessionUnavailableView } from "@/components/auth/SessionUnavailableView";
import type { Permission } from "@/lib/types";
import { getAdminSession } from "./current-admin";

/**
 * Page-level gate for server pages:
 *
 *   const denied = await guardPage("wallets.view");
 *   if (denied) return denied;
 *
 * Redirects to the login page when the backend no longer accepts the staff
 * session (expired, 30 minutes idle, revoked, deactivated), shows a retry
 * view when the backend cannot be reached, a 403 view when the session
 * lacks `permission`, and returns null when access is granted.
 */
export async function guardPage(permission: Permission | null): Promise<JSX.Element | null> {
  const session = await getAdminSession();
  if (session.state === "unavailable") return <SessionUnavailableView />;
  if (session.state === "signed_out") {
    redirect(`/${await getLocale()}/login?expired=1`);
  }
  if (permission && !session.admin.permissions.includes(permission)) {
    return <ForbiddenView />;
  }
  return null;
}
