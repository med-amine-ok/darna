import type { Permission } from "@/lib/types";

/**
 * Client-safe map of panel routes (without locale prefix) to the permission
 * needed to open them. Longest matching prefix wins; `null` = any signed-in
 * admin. Used by the sidebar / bottom nav / command palette to hide links and
 * mirrored by `guardPage()` calls in the server pages (the server check is
 * the one that actually protects the data).
 */
// Legacy duplicates (/finance, /audit-log, /team, /onboarding, /providers) are
// server redirects to their canonical routes below and are never linked.
const ROUTE_PERMISSIONS: Array<[string, Permission | null]> = [
  ["/", null],
  ["/help", null],
  ["/messages", null],
  ["/where-did-it-go", null],

  ["/users", "users.view"],
  ["/hosts", "hosts.view"],
  ["/moderation", "hosts.view"],
  ["/approvals", "hosts.view"],

  ["/listings", "listings.view"],
  ["/network", "listings.view"],
  ["/search", "listings.view"],
  ["/stays", "listings.view"],
  ["/experiences", "listings.view"],
  ["/trips", "listings.view"],
  ["/cars", "listings.view"],
  ["/stays/new", "listings.approve"],
  ["/experiences/new", "listings.approve"],
  ["/trips/new", "listings.approve"],
  ["/cars/new", "listings.approve"],
  ["/stays/change-requests", "listings.approve"],
  ["/experiences/change-requests", "listings.approve"],

  ["/categories", "categories.manage"],
  ["/stays/categories", "categories.manage"],
  ["/experiences/categories", "categories.manage"],
  ["/trips/categories", "categories.manage"],
  ["/cars/categories", "categories.manage"],
  ["/stays/amenities", "categories.manage"],
  ["/experiences/amenities", "categories.manage"],

  ["/bookings", "bookings.view"],
  ["/trips/booking-requests", "bookings.view"],
  ["/cars/rentals", "bookings.view"],
  ["/cars/owners", "hosts.view"],

  ["/payments", "wallets.view"],

  ["/reviews", "reviews.view"],
  ["/promotions", "promotions.manage"],

  ["/stats", "reports.export"],
  ["/reports", "reports.export"],

  ["/settings", "settings.manage"],
  ["/settings/onboarding", "onboarding.edit"],
  ["/settings/commissions", "commissions.manage"],
  ["/settings/team", "team.manage"],
  ["/settings/audit-log", "audit.view"],
];

/** Permission required for a panel path (query string ignored). */
export function permissionForPath(href: string): Permission | null {
  const path = href.split(/[?#]/)[0] || "/";
  let best: [string, Permission | null] | null = null;
  for (const entry of ROUTE_PERMISSIONS) {
    const prefix = entry[0];
    const matches = prefix === "/" ? path === "/" : path === prefix || path.startsWith(prefix + "/");
    if (matches && (!best || prefix.length > best[0].length)) best = entry;
  }
  return best ? best[1] : null;
}

export function canAccessPath(href: string, permissions: readonly Permission[]): boolean {
  const perm = permissionForPath(href);
  return perm === null || permissions.includes(perm);
}
