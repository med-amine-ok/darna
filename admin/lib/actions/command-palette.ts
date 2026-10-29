"use server";

import * as palette from "@/lib/data/command-palette";
import { runAction, str } from "@/lib/auth/run-action";
import { ROLE_PERMISSIONS, hasPermission } from "@/lib/permissions";
import { canAccessPath } from "@/lib/route-permissions";
import type { CommandPaletteResult, Permission } from "@/lib/types";

const PALETTE_PERMISSION: Record<CommandPaletteResult["type"], Permission | null> = {
  host: "hosts.view",
  listing: "listings.view",
  user: "users.view",
  booking: "bookings.view",
  review: "reviews.view",
  action: null,
};

export async function searchGlobalCommandPalette(query: string) {
  return runAction(null, async (actor) => {
    const results = await palette.searchGlobalCommandPalette(str(query, "query", 200));
    const permissions = ROLE_PERMISSIONS[actor.role] ?? [];
    return results.filter((r) => {
      const perm = PALETTE_PERMISSION[r.type];
      return (perm === null || hasPermission(actor.role, perm)) && canAccessPath(r.href, permissions);
    });
  });
}
