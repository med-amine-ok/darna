import "server-only";
// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import {
  HostWallet,
  WalletTransaction,
  PayoutRequest,
  HostType,
  PaginatedResult,
  AdminActor,
} from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { isValidCommissionRate, isValidDzdAmount, MAX_RECHARGE_DZD } from "@/lib/pricing";
import { isValidReason } from "@/lib/domain/transitions";
import { toCsv, type CsvExport } from "@/lib/utils/csv";
import { logAudit, logExport } from "./audit";
import { appendLedgerEntry, computeWalletAggregates, getHostBalance } from "./ledger";
import { DomainError, ValidationError } from "./errors";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface WalletFilterParams {
  hostType?: string;
  wilayaCode?: string;
  onlyNegative?: boolean;
  minBalance?: number;
  maxBalance?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Every wallet with balance/totals re-derived from the ledger. */
function derivedWallets(): HostWallet[] {
  const aggregates = computeWalletAggregates();
  return store.wallets.map((w) => {
    const agg = aggregates.get(w.hostId);
    const balance = agg?.balance ?? 0;
    return {
      ...w,
      balance,
      isNegative: balance < 0,
      totalEarned: agg?.totalEarned ?? 0,
      totalCommissionsPaid: agg?.totalCommissionsPaid ?? 0,
      totalPayouts: agg?.totalPayouts ?? 0,
      lastTransactionAt: agg?.lastTransactionAt ?? w.lastTransactionAt,
    };
  });
}

function filterWallets(all: HostWallet[], params: WalletFilterParams): HostWallet[] {
  let filtered = [...all];

  if (params.hostType && params.hostType !== "all") {
    filtered = filtered.filter((w) => w.hostType === params.hostType);
  }
  if (params.wilayaCode && params.wilayaCode !== "all") {
    filtered = filtered.filter((w) => w.wilayaCode === params.wilayaCode);
  }
  if (params.onlyNegative) {
    filtered = filtered.filter((w) => w.balance < 0);
  }
  if (typeof params.minBalance === "number" && Number.isFinite(params.minBalance)) {
    filtered = filtered.filter((w) => w.balance >= params.minBalance!);
  }
  if (typeof params.maxBalance === "number" && Number.isFinite(params.maxBalance)) {
    filtered = filtered.filter((w) => w.balance <= params.maxBalance!);
  }
  if (params.search?.trim()) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (w) =>
        w.ownerName.toLowerCase().includes(q) ||
        (w.businessName || "").toLowerCase().includes(q) ||
        w.id.toLowerCase().includes(q)
    );
  }
  filtered.sort((a, b) => b.balance - a.balance);
  return filtered;
}

export async function listWallets(
  params: WalletFilterParams = {}
): Promise<PaginatedResult<HostWallet>> {
  await delay(190);

  const page = params.page || 1;
  const pageSize = params.pageSize || 12;
  const all = derivedWallets();
  const filtered = filterWallets(all, params);

  // Facets are computed over ALL wallets with ledger-derived balances.
  const facets: Record<string, Record<string, number>> = {
    hostType: {
      all: all.length,
      individual: all.filter((w) => w.hostType === "individual").length,
      agency: all.filter((w) => w.hostType === "agency").length,
      hotel: all.filter((w) => w.hostType === "hotel").length,
      hostel: all.filter((w) => w.hostType === "hostel").length,
    },
    solvency: {
      healthy: all.filter((w) => w.balance >= 0).length,
      negative: all.filter((w) => w.balance < 0).length,
    },
  };

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { rows, total, page, pageSize, totalPages, facets };
}

export interface TransactionFilterParams {
  hostId?: string;
  type?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

function filterTransactions(params: TransactionFilterParams): WalletTransaction[] {
  let filtered = [...store.transactions];

  if (params.hostId) {
    filtered = filtered.filter((t) => t.hostId === params.hostId);
  }
  if (params.type && params.type !== "all") {
    filtered = filtered.filter((t) => t.type === params.type);
  }
  if (params.search?.trim()) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.reference.toLowerCase().includes(q) ||
        t.hostName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.bookingRef || "").toLowerCase().includes(q)
    );
  }
  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return filtered;
}

export async function listTransactions(params: TransactionFilterParams): Promise<PaginatedResult<WalletTransaction>> {
  await delay(180);

  const page = params.page || 1;
  const pageSize = params.pageSize || 15;
  const filtered = filterTransactions(params);

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { rows, total, page, pageSize, totalPages };
}

/** Full filtered ledger (all pages) as CSV; audited. */
export async function exportTransactions(params: TransactionFilterParams, actor: AdminActor): Promise<CsvExport> {
  const rows = filterTransactions(params);
  const csv = toCsv(
    ["Date", "Reference", "Host", "Host Type", "Type", "Amount (DZD)", "Balance After (DZD)", "Booking Ref", "Receipt Ref", "Description", "Admin"],
    rows.map((t) => [
      t.createdAt,
      t.reference,
      t.hostName,
      t.hostType,
      t.type,
      t.amount,
      t.balanceAfter,
      t.bookingRef,
      t.receiptReference,
      t.description,
      t.adminActor,
    ])
  );
  await logExport(actor, "wallet_ledger", rows.length, { ...params });
  return { filename: `darna_ledger_${new Date().toISOString().slice(0, 10)}.csv`, csv, rowCount: rows.length };
}

/** Full filtered wallet list as CSV; audited. */
export async function exportWallets(params: WalletFilterParams, actor: AdminActor): Promise<CsvExport> {
  const rows = filterWallets(derivedWallets(), params);
  const csv = toCsv(
    ["Wallet ID", "Host ID", "Owner", "Business", "Host Type", "Wilaya", "Balance (DZD)", "Total Earned (DZD)", "Commissions Paid (DZD)", "Payouts (DZD)", "Last Transaction"],
    rows.map((w) => [
      w.id,
      w.hostId,
      w.ownerName,
      w.businessName,
      w.hostType,
      w.wilayaCode,
      w.balance,
      w.totalEarned,
      w.totalCommissionsPaid,
      w.totalPayouts,
      w.lastTransactionAt,
    ])
  );
  await logExport(actor, "wallets", rows.length, { ...params });
  return { filename: `darna_wallets_${new Date().toISOString().slice(0, 10)}.csv`, csv, rowCount: rows.length };
}

export async function rechargeWallet(data: {
  hostId: string;
  amount: number;
  method: string;
  reason: string;
  receiptReference: string;
  actor: AdminActor;
}): Promise<{ transaction: WalletTransaction; newBalance: number }> {
  assertCan(data.actor.role, "wallets.recharge");
  // Defense in depth (lib/actions validates too).
  if (!isValidDzdAmount(data.amount, 1, MAX_RECHARGE_DZD)) {
    throw new ValidationError(`Recharge amount must be a whole number between 1 and ${MAX_RECHARGE_DZD} DZD`);
  }
  if (!data.receiptReference.trim()) throw new ValidationError("A receipt reference is required");
  await delay(200);

  const host = store.hosts.find((h) => h.id === data.hostId);
  if (!host) throw new DomainError("Host not found");

  const currentBalance = getHostBalance(host.id);
  const tx = appendLedgerEntry({
    host,
    type: "wallet_recharge",
    amount: data.amount,
    description: `Admin manual recharge (${data.method}): ${data.reason}`,
    receiptReference: data.receiptReference.trim(),
    adminActor: data.actor.name,
  });

  await logAudit(
    data.actor,
    "WALLET_RECHARGE",
    "wallet",
    `wlt_${data.hostId}`,
    `Credited ${data.amount} DZD to host ${host.ownerName} (Receipt: ${data.receiptReference})`,
    { balance: currentBalance },
    { balance: tx.balanceAfter, transactionId: tx.id }
  );

  return { transaction: tx, newBalance: tx.balanceAfter };
}

export async function getCommissionRates(): Promise<Record<HostType, number>> {
  await delay(100);
  return { ...store.platformSettings.defaultCommissionRates };
}

export async function updateCommissionRates(
  rates: Record<HostType, number>,
  actor: AdminActor
): Promise<Record<HostType, number>> {
  assertCan(actor.role, "commissions.manage");
  for (const [k, v] of Object.entries(rates)) {
    if (!isValidCommissionRate(v)) throw new ValidationError(`Invalid commission rate for ${k}`);
  }
  await delay(200);

  const prev = { ...store.platformSettings.defaultCommissionRates };
  store.platformSettings = {
    ...store.platformSettings,
    defaultCommissionRates: { ...rates },
  };

  await logAudit(
    actor,
    "COMMISSION_RATES_UPDATE",
    "setting",
    "platform_commissions",
    `Updated platform commission rates: Individual: ${rates.individual}%, Agency: ${rates.agency}%, Hotel: ${rates.hotel}%, Hostel: ${rates.hostel}%`,
    prev,
    rates
  );

  return { ...rates };
}

// ------------------------------------------------------------------ payouts

export async function listPayouts(params: { status?: string } = {}): Promise<PayoutRequest[]> {
  await delay(150);
  let rows = [...store.payouts];
  if (params.status && params.status !== "all") rows = rows.filter((p) => p.status === params.status);
  rows.sort((a, b) => {
    // Pending first, then most recent request.
    if ((a.status === "pending") !== (b.status === "pending")) return a.status === "pending" ? -1 : 1;
    return b.requestedAt.localeCompare(a.requestedAt);
  });
  return rows.map((p) => ({ ...p, accountDetails: { ...p.accountDetails } }));
}

function findPendingPayout(id: string): { idx: number; payout: PayoutRequest } {
  const idx = store.payouts.findIndex((p) => p.id === id);
  if (idx === -1) throw new DomainError("Payout request not found");
  const payout = store.payouts[idx];
  if (payout.status !== "pending") {
    throw new DomainError(`Payout ${id} is already ${payout.status}; only pending requests can be processed`);
  }
  return { idx, payout };
}

/**
 * pending → approved. Debits the host wallet with a negative `host_payout`
 * ledger entry. Refuses when the ledger balance is insufficient. The status
 * check, balance check, ledger write and status write run synchronously (no
 * await in between) so a second/concurrent approval fails cleanly.
 */
export async function approvePayout(id: string, actor: AdminActor): Promise<PayoutRequest> {
  assertCan(actor.role, "payouts.approve");
  await delay(200);

  // ---- atomic section (no await) ----
  const { idx, payout } = findPendingPayout(id);
  const host = store.hosts.find((h) => h.id === payout.hostId);
  if (!host) throw new DomainError("Host not found for this payout");
  if (!Number.isInteger(payout.amountDzd) || payout.amountDzd <= 0) {
    throw new DomainError("Payout amount is invalid");
  }
  const balanceBefore = getHostBalance(host.id);
  if (balanceBefore < payout.amountDzd) {
    throw new DomainError(
      `Insufficient wallet balance: ${balanceBefore} DZD available, ${payout.amountDzd} DZD requested`
    );
  }
  const tx = appendLedgerEntry({
    host,
    type: "host_payout",
    amount: -payout.amountDzd,
    description: `Payout ${payout.id} via ${payout.payoutMethod}`,
    adminActor: actor.name,
  });
  const updated: PayoutRequest = {
    ...payout,
    status: "approved",
    processedAt: tx.createdAt,
    processedBy: actor.name,
    transactionId: tx.id,
  };
  store.payouts[idx] = updated;
  // ---- end atomic section ----

  await logAudit(
    actor,
    "PAYOUT_APPROVE",
    "payout",
    id,
    `Approved payout ${id} of ${payout.amountDzd} DZD to ${payout.hostName}`,
    { status: payout.status, balance: balanceBefore },
    { status: updated.status, balance: tx.balanceAfter, transactionId: tx.id }
  );

  return { ...updated };
}

/** pending → rejected (reason required). No ledger movement. */
export async function rejectPayout(id: string, reason: string, actor: AdminActor): Promise<PayoutRequest> {
  assertCan(actor.role, "payouts.approve");
  if (!isValidReason(reason)) throw new ValidationError("A rejection reason is required");
  await delay(200);

  const { idx, payout } = findPendingPayout(id);
  const updated: PayoutRequest = {
    ...payout,
    status: "rejected",
    processedAt: new Date().toISOString(),
    processedBy: actor.name,
    rejectionReason: reason.trim(),
  };
  store.payouts[idx] = updated;

  await logAudit(
    actor,
    "PAYOUT_REJECT",
    "payout",
    id,
    `Rejected payout ${id} of ${payout.amountDzd} DZD to ${payout.hostName}: ${reason.trim()}`,
    { status: payout.status },
    { status: updated.status }
  );

  return { ...updated };
}

// --------------------------------------------------------------------- KPIs

export interface FinanceSummary {
  totalWalletBalanceDzd: number;
  negativeWalletCount: number;
  walletCount: number;
  pendingPayoutsDzd: number;
  pendingPayoutsCount: number;
  monthCommissionsDzd: number;
  monthPayoutsDzd: number;
  monthPayoutsCount: number;
  refundsTotalDzd: number;
  refundedBookingsCount: number;
  /** Guest money held for paid bookings not yet completed (confirmed / disputed). */
  escrowDzd: number;
  monthStart: string;
}

/** Aggregates over ALL rows of the store (never a single page). */
export async function getFinanceSummary(): Promise<FinanceSummary> {
  await delay(120);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const aggregates = computeWalletAggregates();
  let totalWalletBalanceDzd = 0;
  let negativeWalletCount = 0;
  for (const w of store.wallets) {
    const balance = aggregates.get(w.hostId)?.balance ?? 0;
    totalWalletBalanceDzd += balance;
    if (balance < 0) negativeWalletCount++;
  }

  let monthCommissionsDzd = 0;
  let monthPayoutsDzd = 0;
  let monthPayoutsCount = 0;
  for (const t of store.transactions) {
    if (t.createdAt < monthStart) continue;
    if (t.type === "commission_deduction") monthCommissionsDzd += Math.abs(t.amount);
    if (t.type === "host_payout") {
      monthPayoutsDzd += Math.abs(t.amount);
      monthPayoutsCount++;
    }
  }

  const pending = store.payouts.filter((p) => p.status === "pending");

  let refundsTotalDzd = 0;
  let refundedBookingsCount = 0;
  let escrowDzd = 0;
  for (const b of store.bookings) {
    const refunded = b.refundedAmountDzd ?? 0;
    if (refunded > 0) {
      refundsTotalDzd += refunded;
      refundedBookingsCount++;
    }
    if (
      (b.status === "confirmed" || b.status === "disputed") &&
      (b.paymentStatus === "paid" || b.paymentStatus === "partially_refunded")
    ) {
      escrowDzd += b.totalAmountDzd - refunded;
    }
  }

  return {
    totalWalletBalanceDzd,
    negativeWalletCount,
    walletCount: store.wallets.length,
    pendingPayoutsDzd: pending.reduce((s, p) => s + p.amountDzd, 0),
    pendingPayoutsCount: pending.length,
    monthCommissionsDzd,
    monthPayoutsDzd,
    monthPayoutsCount,
    refundsTotalDzd,
    refundedBookingsCount,
    escrowDzd,
    monthStart,
  };
}

/** Bookings with at least one refund, newest first (for the refunds tab). */
export async function listRefunds(params: { page?: number; pageSize?: number } = {}) {
  await delay(150);
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const rows = store.bookings
    .filter((b) => (b.refundedAmountDzd ?? 0) > 0)
    .sort((a, b) => (b.refundedAt ?? b.cancelledAt ?? b.createdAt).localeCompare(a.refundedAt ?? a.cancelledAt ?? a.createdAt));
  const total = rows.length;
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize).map((b) => ({
      id: b.id,
      reference: b.reference,
      guestName: b.guestName,
      hostName: b.hostName,
      totalAmountDzd: b.totalAmountDzd,
      refundedAmountDzd: b.refundedAmountDzd ?? 0,
      paymentStatus: b.paymentStatus,
      status: b.status,
      date: b.refundedAt ?? b.cancelledAt ?? b.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}
