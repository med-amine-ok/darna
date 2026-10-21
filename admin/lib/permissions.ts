import { AdminRole, Permission } from "@/lib/types";

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: [
    "hosts.view",
    "hosts.approve",
    "hosts.reject",
    "hosts.suspend",
    "hosts.delete",
    "hosts.commission_override",
    "listings.view",
    "listings.approve",
    "listings.reject",
    "listings.suspend",
    "listings.delete",
    "listings.feature",
    "users.view",
    "users.suspend",
    "users.ban",
    "users.delete",
    "bookings.view",
    "bookings.cancel",
    "bookings.refund",
    "bookings.dispute",
    "reviews.view",
    "reviews.moderate",
    "reviews.delete",
    "wallets.view",
    "wallets.recharge",
    "commissions.manage",
    "payouts.approve",
    "onboarding.edit",
    "categories.manage",
    "promotions.manage",
    "reports.export",
    "audit.view",
    "team.manage",
    "settings.manage",
  ],
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

export function hasPermission(role: AdminRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function assertCan(role: AdminRole | undefined, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Unauthorized: Role '${role || "anonymous"}' does not have required permission '${permission}'.`);
  }
}

export const ROLE_LABELS: Record<AdminRole, { en: string; fr: string; ar: string }> = {
  super_admin: { en: "Super Admin", fr: "Super Administrateur", ar: "مدير رئيسي" },
  moderator: { en: "Content Moderator", fr: "Modérateur Contenu", ar: "مشرف محتوى" },
  support: { en: "Customer Support", fr: "Support Client", ar: "دعم العملاء" },
  finance: { en: "Finance & Accounts", fr: "Finances & Comptabilité", ar: "المالية والمحاسبة" },
  analyst: { en: "Data Analyst", fr: "Analyste Données", ar: "محلل بيانات" },
};
