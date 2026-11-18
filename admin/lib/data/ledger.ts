import "server-only";

import { cache } from "react";
import { api, apiAll, totalOf } from "@/lib/api/client";
import { logReadError } from "@/lib/api/mapping";
import { KINDS_BY_TYPE, toWalletTransaction, type ApiAdminWallet, type ApiLedgerTransaction } from "@/lib/api/finance";
import type { PaginatedResult, TransactionType, WalletTransaction } from "@/lib/types";

/**
 * Double-entry ledger of the backend (GET /admin/ledger/transactions).
 * Balances are kept by the backend from ledger lines; the admin app never
 * computes or writes a balance itself.
 */

export interface LedgerFilterParams {
  hostId?: string;
  type?: string;
  /** Booking id or BLD reference. */
  booking?: string;
  /** First and last day, YYYY-MM-DD. */
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Host display names by host account id, read once per request from
 * /admin/wallets (ledger lines and invoices carry only the id).
 */
export const hostNameMap = cache(async (): Promise<Map<string, string>> => {
  try {
    const rows = await apiAll<ApiAdminWallet>("/admin/wallets", {}, 10);
    return new Map(rows.map((w) => [w.host_account_id, w.host?.display_name ?? ""]));
  } catch (error) {
    logReadError("hostNameMap", error);
    return new Map();
  }
});

function ledgerQuery(params: LedgerFilterParams) {
  const type = params.type && params.type !== "all" ? (params.type as TransactionType) : undefined;
  return {
    host_account: params.hostId || undefined,
    kind: type ? KINDS_BY_TYPE[type] ?? type : undefined,
    booking: params.booking || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
    q: params.search?.trim() || undefined,
  };
}

/** One page of ledger transactions, newest first. Throws on API failure. */
export async function listLedgerTransactions(params: LedgerFilterParams = {}): Promise<PaginatedResult<WalletTransaction>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 15));
  const [answer, names] = await Promise.all([
    api<{ count: number; results: ApiLedgerTransaction[] }>("/admin/ledger/transactions", {
      query: { ...ledgerQuery(params), page, page_size: pageSize },
    }),
    hostNameMap(),
  ]);
  const total = totalOf(answer);
  return {
    rows: (answer?.results ?? []).map((tx) => toWalletTransaction(tx, names)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Every matching transaction (up to maxPages x 50), for CSV exports. */
export async function allLedgerTransactions(params: LedgerFilterParams = {}, maxPages = 40): Promise<WalletTransaction[]> {
  const [rows, names] = await Promise.all([
    apiAll<ApiLedgerTransaction>("/admin/ledger/transactions", { query: ledgerQuery(params) }, maxPages),
    hostNameMap(),
  ]);
  return rows.map((tx) => toWalletTransaction(tx, names));
}
