import "server-only";

import { toAdminRole, toPermissions } from "@/lib/permissions";
import type { AdminUser, Permission } from "@/lib/types";

/** Backend StaffMember (apps/accounts/serializers.py StaffMemberSerializer). */
export interface ApiStaffMember {
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  status: "invited" | "active" | "deactivated";
  mfa_enrolled: boolean;
  invited_at: string | null;
  activated_at: string | null;
  last_login_at: string | null;
}

/** Backend StaffSession (GET /admin/auth/session, POST /admin/auth/2fa/authenticate). */
export interface ApiStaffSession {
  user: ApiStaffMember;
  permissions: string[];
  mfa_verified: boolean;
  expires_at: string;
  session_token?: string;
}

/** Backend Session answer of POST /admin/auth/login (step 1). */
export interface ApiPendingSession {
  status: "pending_flow" | "authenticated";
  session_token?: string;
  token?: string;
  mfa_enrolled?: boolean;
  expires_at?: string | null;
}

/** Backend StaffRole (GET /admin/staff/roles). */
export interface ApiStaffRole {
  role: string;
  label: string;
  permissions: string[];
}

export function toAdminUser(raw: ApiStaffMember, permissions?: Permission[]): AdminUser {
  return {
    id: raw.user_id,
    name: raw.display_name || raw.email,
    email: raw.email,
    role: toAdminRole(raw.role),
    backendRole: raw.role,
    isActive: raw.status === "active",
    status: raw.status,
    createdAt: raw.activated_at || raw.invited_at || new Date(0).toISOString(),
    invitedAt: raw.invited_at ?? undefined,
    lastLoginAt: raw.last_login_at ?? undefined,
    mfaEnrolled: Boolean(raw.mfa_enrolled),
    permissions,
  };
}

export function sessionPermissions(raw: ApiStaffSession): Permission[] {
  return toPermissions(raw.permissions);
}
