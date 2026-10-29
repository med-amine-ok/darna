import "server-only";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { ForbiddenView } from "@/components/auth/ForbiddenView";
import type { Permission } from "@/lib/types";
import { getCurrentAdmin } from "./current-admin";

/**
 * Page-level gate for server pages:
 *
 *   const denied = await guardPage("wallets.view");
 *   if (denied) return denied;
 *
 * Redirects to the login page when there is no valid session (revoked,
 * deactivated or expired), returns a 403 view when the admin's CURRENT role
 * lacks `permission`, and null when access is granted.
 */
export async function guardPage(permission: Permission | null): Promise<JSX.Element | null> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect(`/${await getLocale()}/login`);
  }
  if (permission && !admin.permissions.includes(permission)) {
    return <ForbiddenView />;
  }
  return null;
}
