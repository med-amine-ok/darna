import "server-only";
// TODO: replace with Supabase query (ledger table + per-wallet row lock)
import { store } from "@/lib/mock-data/store";
import type { Host, TransactionType, WalletTransaction } from "@/lib/types";
import { DomainError } from "./errors";

/**
 * Wallet ledger. A host's balance is ALWAYS the sum of its ledger entries;
 * nothing else (Host.walletBalance, HostWallet.balance) is authoritative.
 */

export interface WalletAggregate {
  balance: number;
  totalEarned: number;
  totalCommissionsPaid: number;
  totalPayouts: number;
  lastTransactionAt?: string;
}

/** One pass over the ledger → per-host aggregates. */
export function computeWalletAggregates(): Map<string, WalletAggregate> {
  const map = new Map<string, WalletAggregate>();
  for (const t of store.transactions) {
    let agg = map.get(t.hostId);
    if (!agg) {
      agg = { balance: 0, totalEarned: 0, totalCommissionsPaid: 0, totalPayouts: 0 };
      map.set(t.hostId, agg);
    }
    agg.balance += t.amount;
    if (t.type === "booking_payment") agg.totalEarned += t.amount;
    if (t.type === "commission_deduction") agg.totalCommissionsPaid += Math.abs(t.amount);
    if (t.type === "host_payout") agg.totalPayouts += Math.abs(t.amount);
    if (!agg.lastTransactionAt || t.createdAt > agg.lastTransactionAt) agg.lastTransactionAt = t.createdAt;
  }
  return map;
}

export function getHostBalance(hostId: string): number {
  let balance = 0;
  for (const t of store.transactions) if (t.hostId === hostId) balance += t.amount;
  return balance;
}

const REFERENCE_PREFIX: Record<TransactionType, string> = {
  booking_payment: "TXN-BKG",
  commission_deduction: "TXN-COM",
  host_payout: "TXN-PAY",
  wallet_recharge: "TXN-REC",
  booking_refund: "TXN-RFD",
  adjustment: "TXN-ADJ",
};

/**
 * Appends a ledger entry and returns it. MUST be called synchronously after
 * any balance check (no `await` in between) so check-and-write is atomic in
 * the single-threaded mock; a real DB would use a transaction + row lock.
 */
export function appendLedgerEntry(input: {
  host: Pick<Host, "id" | "ownerName" | "businessName" | "hostType">;
  type: TransactionType;
  amount: number;
  description: string;
  bookingRef?: string;
  receiptReference?: string;
  adminActor?: string;
}): WalletTransaction {
  if (!Number.isFinite(input.amount) || !Number.isInteger(input.amount) || input.amount === 0) {
    throw new DomainError("Ledger amounts must be non-zero whole DZD");
  }
  const now = new Date();
  const balanceAfter = getHostBalance(input.host.id) + input.amount;
  const suffix = `${now.getTime().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`.toUpperCase();
  const tx: WalletTransaction = {
    id: `tx_${now.getTime()}_${Math.floor(Math.random() * 10000)}`,
    walletId: `wlt_${input.host.id}`,
    hostId: input.host.id,
    hostName: input.host.businessName || input.host.ownerName,
    hostType: input.host.hostType,
    type: input.type,
    amount: input.amount,
    balanceAfter,
    reference: `${REFERENCE_PREFIX[input.type]}-${suffix}`,
    description: input.description,
    bookingRef: input.bookingRef,
    receiptReference: input.receiptReference,
    adminActor: input.adminActor,
    createdAt: now.toISOString(),
  };
  // Newest first, like the seed.
  store.transactions.unshift(tx);
  return tx;
}
