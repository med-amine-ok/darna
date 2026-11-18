import "server-only";
import type { HostType, HostTypeCommissionRates, Wallet } from "@/types";
import { ApiError, api, apiAll } from "@/lib/api/client";
import {
  toEarnings,
  toInvoice,
  toWallet,
  toWalletStatus,
  type ApiEarnings,
  type ApiInvoice,
  type ApiWalletEntry,
  type ApiWalletState,
  type HostEarnings,
  type HostInvoice,
  type WalletOwner,
  type WalletStatus,
} from "@/lib/api/wallet";
import type { DateKey } from "@/lib/booking/dates";

export type { HostTypeCommissionRates };

/**
 * The host deposit (wallet) of the active workspace, its history, invoices,
 * earnings and payouts, from the Django API (backend apps/ledger and
 * apps/bookings). Top-ups are recorded by BLADUS admins (admin panel); a host
 * only reads. The backend scopes every call to the session's workspace.
 */

/** Most history lines the statement shows (newest first). */
const MAX_ENTRY_PAGES = 4;

/** Deposit of the active workspace with its newest history lines. Throws on API failure. */
export async function getMyWallet(owner: WalletOwner): Promise<{ wallet: Wallet; status: WalletStatus }> {
  const [state, entries] = await Promise.all([
    api<ApiWalletState>("/host/wallet"),
    apiAll<ApiWalletEntry>("/host/wallet/entries", {}, MAX_ENTRY_PAGES),
  ]);
  return { wallet: toWallet(state, entries, owner), status: toWalletStatus(state) };
}

/** Commission rates per host type, in percent (public settings). Null when the API cannot be reached. */
export async function getCommissionRates(): Promise<HostTypeCommissionRates | null> {
  try {
    const settings = await api<{ commission_bp?: Partial<Record<HostType, number>> }>("/settings/public", { anonymous: true });
    const bp = settings.commission_bp ?? {};
    return {
      individual: (bp.individual ?? 0) / 100,
      agency: (bp.agency ?? 0) / 100,
      hotel: (bp.hotel ?? 0) / 100,
      hostel: (bp.hostel ?? 0) / 100,
    };
  } catch (error) {
    console.error("[getCommissionRates]", error);
    return null;
  }
}

/** Monthly commission invoices of the active workspace. Throws on API failure. */
export async function getMyInvoices(): Promise<HostInvoice[]> {
  return (await apiAll<ApiInvoice>("/host/invoices")).map(toInvoice);
}

/** Earnings dashboard (GET /host/earnings); default window: 1 January to today. Throws on API failure. */
export async function getMyEarnings(range?: { from?: DateKey; to?: DateKey }): Promise<HostEarnings> {
  return toEarnings(await api<ApiEarnings>("/host/earnings", { query: { from: range?.from, to: range?.to } }));
}

/**
 * Whether payouts are switched on. While they are off (DEC-019: guests pay
 * hosts directly) GET /host/payouts answers 404, and the screens show the
 * disabled state instead of any list.
 */
export async function arePayoutsEnabled(): Promise<boolean> {
  try {
    await api("/host/payouts", { query: { page_size: 1 } });
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return false;
    throw error;
  }
}
