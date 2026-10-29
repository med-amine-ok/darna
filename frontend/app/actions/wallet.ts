"use server";

import type { Wallet } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { getHostContext } from "@/lib/server/host-context";
import { getRateForHostType, getWalletByOwner } from "@/lib/data/wallet";

/**
 * Read-only: the prepaid wallet of the current host (their org's wallet for
 * agency/hotel/hostel hosts). The owner is derived from the session.
 */
export async function getMyWalletAction(): Promise<ActionResult<{ wallet: Wallet | null; commissionRate: number }>> {
  const ctx = await getHostContext();
  if (!ctx) return actionFail("UNAUTHENTICATED");

  const wallet = ctx.isOrgHost
    ? ctx.organization
      ? await getWalletByOwner(ctx.organization.id, "organization")
      : null
    : await getWalletByOwner(ctx.user.id, "user");
  const commissionRate = getRateForHostType(wallet?.hostType || ctx.hostType);
  return actionOk({ wallet, commissionRate });
}
