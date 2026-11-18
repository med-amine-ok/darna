import type { AdminActor, AdminRole, Permission } from "@/lib/types";

/**
 * Staff permissions.
 *
 * The frontend permission names are the backend staff permission codes
 * (GET /admin/staff/roles, apps/accounts/models.py STAFF_PERMISSIONS), one to
 * one. The signed-in admin's real permissions always come from
 * GET /admin/auth/session (read from the database on every request); the
 * role table below only serves screens that describe roles and as a fallback
 * when a caller only has a role.
 */

/** Every staff permission code the backend knows, in its own order. */
export const ALL_PERMISSIONS: readonly Permission[] = [
  "hosts.view",
  "hosts.approve",
  "hosts.reject",
  "hosts.suspend",
  "hosts.delete",
  "hosts.commission_override",
  "kyc.view_documents",
  "listings.view",
  "listings.approve",
  "listings.reject",
  "listings.suspend",
  "listings.feature",
  "listings.delete",
  "reviews.view",
  "reviews.moderate",
  "reviews.delete",
  "users.view",
  "users.suspend",
  "users.ban",
  "users.delete",
  "privacy.handle_requests",
  "bookings.view",
  "bookings.cancel",
  "bookings.dispute",
  "bookings.refund",
  "wallets.view",
  "wallets.recharge",
  "commissions.manage",
  "ledger.adjust",
  "payouts.approve",
  "onboarding.edit",
  "team.manage",
  "settings.manage",
  "categories.manage",
  "promotions.manage",
  "reports.export",
  "reports.view",
  "audit.view",
];

const KNOWN = new Set<string>(ALL_PERMISSIONS);

/** Backend permission codes to frontend permissions (unknown codes are dropped). */
export function toPermissions(codes: unknown): Permission[] {
  if (!Array.isArray(codes)) return [];
  return codes.filter((code): code is Permission => typeof code === "string" && KNOWN.has(code));
}

/** Frontend permission to the backend code (the same string today). */
export function toBackendPermission(permission: Permission): string {
  return permission;
}

/**
 * Backend staff roles to frontend roles. The backend has one role today,
 * "admin", with every permission (DEC-016); it shows as the super admin.
 */
const BACKEND_ROLE_TO_ROLE: Record<string, AdminRole> = {
  admin: "super_admin",
  super_admin: "super_admin",
  moderator: "moderator",
  support: "support",
  finance: "finance",
  analyst: "analyst",
};

export function toAdminRole(backendRole: unknown): AdminRole {
  return (typeof backendRole === "string" && BACKEND_ROLE_TO_ROLE[backendRole]) || "super_admin";
}

/** Frontend role to the backend role code ("admin" for the only role the backend has). */
export function toBackendRole(role: AdminRole | string): string {
  if (role === "super_admin" || role === "admin") return "admin";
  return role;
}

/** Descriptive role table (screens and role-only fallbacks). The backend admin role maps to super_admin. */
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: [...ALL_PERMISSIONS],
  moderator: [
    "hosts.view",
    "hosts.approve",
    "hosts.reject",
    "hosts.suspend",
    "listings.view",
    "listings.approve",
    "listings.reject",
    "listings.suspend",
    "listings.feature",
    "users.view",
    "users.suspend",
    "reviews.view",
    "reviews.moderate",
    "categories.manage",
    "promotions.manage",
    "reports.export",
    "audit.view",
  ],
  support: [
    "hosts.view",
    "listings.view",
    "users.view",
    "users.suspend",
    "bookings.view",
    "bookings.cancel",
    "bookings.refund",
    "bookings.dispute",
    "reviews.view",
    "audit.view",
  ],
  finance: [
    "hosts.view",
    "hosts.commission_override",
    "bookings.view",
    "bookings.refund",
    "wallets.view",
    "wallets.recharge",
    "commissions.manage",
    "payouts.approve",
    "reports.export",
    "audit.view",
  ],
  analyst: [
    "hosts.view",
    "listings.view",
    "users.view",
    "bookings.view",
    "reviews.view",
    "wallets.view",
    "reports.export",
    "audit.view",
  ],
};

type Subject = AdminRole | Pick<AdminActor, "role" | "permissions"> | undefined | null;

/**
 * True when the subject holds `permission`. An actor carrying the
 * permissions of its session is checked against them; a bare role is
 * checked against the role table.
 */
export function hasPermission(subject: Subject, permission: Permission): boolean {
  if (!subject) return false;
  if (typeof subject === "object") {
    if (Array.isArray(subject.permissions)) return subject.permissions.includes(permission);
    return (ROLE_PERMISSIONS[subject.role] ?? []).includes(permission);
  }
  return (ROLE_PERMISSIONS[subject] ?? []).includes(permission);
}

export function assertCan(subject: Subject, permission: Permission): void {
  if (!hasPermission(subject, permission)) {
    const who = typeof subject === "object" && subject ? subject.role : subject;
    throw new Error(`Unauthorized: Role '${who || "anonymous"}' does not have required permission '${permission}'.`);
  }
}

export const ROLE_LABELS: Record<AdminRole, { en: string; fr: string; ar: string }> = {
  super_admin: { en: "Admin", fr: "Administrateur", ar: "مدير" },
  moderator: { en: "Content Moderator", fr: "Modérateur Contenu", ar: "مشرف محتوى" },
  support: { en: "Customer Support", fr: "Support Client", ar: "دعم العملاء" },
  finance: { en: "Finance & Accounts", fr: "Finances & Comptabilité", ar: "المالية والمحاسبة" },
  analyst: { en: "Data Analyst", fr: "Analyste Données", ar: "محلل بيانات" },
};
