"use server";

import type { Wallet } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { getHostContext } from "@/lib/server/host-context";
import { failFromError } from "@/lib/api/errors";
import { arePayoutsEnabled, getMyEarnings, getMyInvoices, getMyWallet } from "@/lib/data/wallet";
import type { HostEarnings, HostInvoice, WalletStatus } from "@/lib/api/wallet";

/**
 * Read-only: the prepaid deposit of the active host workspace (the
 * organisation's for agency/hotel/hostel hosts), resolved by the backend from
 * the session; the browser never chooses it.
 */
export async function getMyWalletAction(): Promise<
  ActionResult<{ wallet: Wallet | null; commissionRate: number; status: WalletStatus | null }>
> {
  const ctx = await getHostContext();
  if (!ctx) return actionFail("UNAUTHENTICATED");
  try {
    const owner = ctx.isOrgHost && ctx.organization
      ? { id: ctx.organization.id, ownerType: "organization" as const, name: ctx.organization.name, hostType: ctx.hostType }
      : { id: ctx.user.id, ownerType: "user" as const, name: ctx.user.name, hostType: ctx.hostType };
    const { wallet, status } = await getMyWallet(owner);
    return actionOk({ wallet, commissionRate: status.commissionRate, status });
  } catch (error) {
    return failFromError(error, "getMyWalletAction");
  }
}

/** Commission invoices, earnings summary and whether payouts exist, for the wallet statement. */
export async function getMyMoneyOverviewAction(): Promise<
  ActionResult<{ invoices: HostInvoice[]; earnings: HostEarnings | null; payoutsEnabled: boolean }>
> {
  const ctx = await getHostContext();
  if (!ctx) return actionFail("UNAUTHENTICATED");
  try {
    const [invoices, earnings, payoutsEnabled] = await Promise.all([
      getMyInvoices(),
      getMyEarnings().catch(() => null),
      arePayoutsEnabled().catch(() => false),
    ]);
    return actionOk({ invoices, earnings, payoutsEnabled });
  } catch (error) {
    return failFromError(error, "getMyMoneyOverviewAction");
  }
}
