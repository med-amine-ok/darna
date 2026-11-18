import "server-only";

import { ApiError, api, apiAll, newIdempotencyKey, totalOf } from "@/lib/api/client";
import { logReadError, minor, moneyInput, write } from "@/lib/api/mapping";
import {
  toAdjustment,
  toConflict,
  toInvoice,
  toOutbox,
  toRefund,
  toTopup,
  toWallet,
  type AdjustmentRow,
  type ApiAdjustment,
  type ApiAdminWallet,
  type ApiFinanceSummary,
  type ApiInventoryConflict,
  type ApiInvoice,
  type ApiOutboxMessage,
  type ApiRefundObligation,
  type ApiTopup,
  type ConflictRow,
  type InvoiceRow,
  type OutboxRow,
  type RefundRow,
  type TopupRow,
} from "@/lib/api/finance";
import type { HostWallet, WalletTransaction, PayoutRequest, HostType, PaginatedResult, AdminActor } from "@/lib/types";
import { toCsv, type CsvExport } from "@/lib/utils/csv";
import { logExport } from "./audit";
import { allLedgerTransactions, hostNameMap, listLedgerTransactions } from "./ledger";

export type { AdjustmentRow, ConflictRow, InvoiceRow, OutboxRow, RefundRow, TopupRow };

/**
 * Admin finance on the Django ledger app (BR-PAY-*). Money is in centimes in
 * the API and in DZD in the screens. Every money write carries an
 * Idempotency-Key. Balances, four-eyes rules and limits are enforced by the
 * backend; the admin app only shows its answers.
 */

const HOST_TYPES: readonly HostType[] = ["individual", "agency", "hotel", "hostel"];

// ------------------------------------------------------------------ wallets

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

function walletQuery(params: WalletFilterParams) {
  return {
    host_type: params.hostType && params.hostType !== "all" ? params.hostType : undefined,
    wilaya: params.wilayaCode && params.wilayaCode !== "all" ? params.wilayaCode : undefined,
    state: params.onlyNegative ? "negative,below_floor" : undefined,
    min_balance_minor: Number.isFinite(params.minBalance) ? minor(params.minBalance as number) : undefined,
    max_balance_minor: Number.isFinite(params.maxBalance) ? minor(params.maxBalance as number) : undefined,
    q: params.search?.trim() || undefined,
    ordering: "-balance",
  };
}

async function walletFacets(): Promise<Record<string, Record<string, number>>> {
  const count = async (query: Record<string, string>) =>
    totalOf(await api<unknown>("/admin/wallets", { query: { ...query, page_size: 1 } }));
  const [all, negative, ...perType] = await Promise.all([
    count({}),
    count({ state: "negative,below_floor" }),
    ...HOST_TYPES.map((h) => count({ host_type: h })),
  ]);
  const hostType: Record<string, number> = { all };
  HOST_TYPES.forEach((h, i) => (hostType[h] = perType[i]));
  return { hostType, solvency: { healthy: all - negative, negative } };
}

export async function listWallets(params: WalletFilterParams = {}): Promise<PaginatedResult<HostWallet>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 12));
  const [answer, facets] = await Promise.all([
    api<{ count: number; results: ApiAdminWallet[] }>("/admin/wallets", {
      query: { ...walletQuery(params), page, page_size: pageSize },
    }),
    walletFacets().catch((error) => {
      logReadError("wallet facets", error);
      return undefined;
    }),
  ]);
  const total = totalOf(answer);
  return {
    rows: (answer?.results ?? []).map(toWallet),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    facets,
  };
}

/** One host wallet, or null when the host does not exist. */
export async function getWallet(hostId: string): Promise<HostWallet | null> {
  try {
    const raw = await api<ApiAdminWallet>(`/admin/wallets/${encodeURIComponent(hostId)}`);
    return toWallet(raw);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    logReadError("getWallet", error);
    return null;
  }
}

/** Full filtered wallet list as CSV; audited. */
export async function exportWallets(params: WalletFilterParams, actor: AdminActor): Promise<CsvExport> {
  const rows = (await write(() => apiAll<ApiAdminWallet>("/admin/wallets", { query: walletQuery(params) }, 40))).map(toWallet);
  const csv = toCsv(
    ["Host ID", "Host", "Host Type", "State", "Balance (DZD)", "Credit Limit (DZD)", "Approved Top-ups (DZD)", "Commission Kept (DZD)", "Commission Rate (%)", "Last Entry"],
    rows.map((w) => [
      w.hostId,
      w.ownerName,
      w.hostType,
      w.walletState,
      w.balance,
      w.creditLimitDzd,
      w.totalEarned,
      w.totalCommissionsPaid,
      w.commissionRate,
      w.lastTransactionAt,
    ])
  );
  await logExport(actor, "wallets", rows.length, { ...params });
  return { filename: `darna_wallets_${new Date().toISOString().slice(0, 10)}.csv`, csv, rowCount: rows.length };
}

// ------------------------------------------------------------------- ledger

export interface TransactionFilterParams {
  hostId?: string;
  type?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listTransactions(params: TransactionFilterParams): Promise<PaginatedResult<WalletTransaction>> {
  return listLedgerTransactions(params);
}

/** Full filtered ledger (all pages) as CSV; audited. */
export async function exportTransactions(params: TransactionFilterParams, actor: AdminActor): Promise<CsvExport> {
  const rows = await write(() => allLedgerTransactions(params));
  const csv = toCsv(
    ["Date", "Reference", "Host", "Kind", "Type", "Amount (DZD)", "Booking Ref", "Description", "Posted By"],
    rows.map((t) => [t.createdAt, t.reference, t.hostName, t.kind, t.type, t.amount, t.bookingRef, t.description, t.adminActor])
  );
  await logExport(actor, "wallet_ledger", rows.length, { ...params });
  return { filename: `darna_ledger_${new Date().toISOString().slice(0, 10)}.csv`, csv, rowCount: rows.length };
}

// ------------------------------------------------------------------ top-ups

export type TopupMethod = "ccp_transfer" | "bank_transfer" | "baridimob" | "cash_office";
export const TOPUP_METHODS: readonly TopupMethod[] = ["ccp_transfer", "bank_transfer", "baridimob", "cash_office"];

export interface RechargeResult {
  topup: TopupRow;
  /** Null while the top-up waits for a second admin. */
  newBalance: number | null;
  pendingApproval: boolean;
}

/**
 * Records a manual top-up (BR-PAY-07). Credited at once, or left
 * pending_approval when the four-eyes threshold is passed.
 */
export async function rechargeWallet(data: {
  hostId: string;
  amount: number;
  method: TopupMethod;
  reason: string;
  receiptReference: string;
  actor: AdminActor;
}): Promise<RechargeResult> {
  const raw = await write(() =>
    api<ApiTopup>(`/admin/wallets/${encodeURIComponent(data.hostId)}/topups`, {
      method: "POST",
      body: {
        amount: moneyInput(data.amount),
        method: data.method,
        receipt_reference: data.receiptReference,
        note: data.reason,
      },
      idempotencyKey: newIdempotencyKey(),
    })
  );
  const topup = toTopup(raw, data.actor.id);
  return { topup, newBalance: topup.balanceAfterDzd, pendingApproval: topup.status === "pending_approval" };
}

export async function listTopups(
  params: { status?: string; hostId?: string; page?: number; pageSize?: number },
  actor: AdminActor
): Promise<PaginatedResult<TopupRow>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 10));
  const answer = await api<{ count: number; results: ApiTopup[] }>("/admin/topups", {
    query: {
      status: params.status && params.status !== "all" ? params.status : undefined,
      host_account: params.hostId || undefined,
      page,
      page_size: pageSize,
    },
  });
  const total = totalOf(answer);
  return {
    rows: (answer?.results ?? []).map((t) => toTopup(t, actor.id)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Second admin approves (403 four_eyes_same_user for the admin who recorded it). */
export async function approveTopup(id: string, actor: AdminActor): Promise<TopupRow> {
  const raw = await write(() =>
    api<ApiTopup>(`/admin/topups/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      idempotencyKey: newIdempotencyKey(),
    })
  );
  return toTopup(raw, actor.id);
}

export async function rejectTopup(id: string, reason: string, actor: AdminActor): Promise<TopupRow> {
  const raw = await write(() =>
    api<ApiTopup>(`/admin/topups/${encodeURIComponent(id)}/reject`, { method: "POST", body: { reason } })
  );
  return toTopup(raw, actor.id);
}

// -------------------------------------------------------------- adjustments

export async function listAdjustments(
  params: { status?: string; hostId?: string; page?: number; pageSize?: number },
  actor: AdminActor
): Promise<PaginatedResult<AdjustmentRow>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 10));
  const answer = await api<{ count: number; results: ApiAdjustment[] }>("/admin/wallet-adjustments", {
    query: {
      status: params.status && params.status !== "all" ? params.status : undefined,
      host_account: params.hostId || undefined,
      page,
      page_size: pageSize,
    },
  });
  const total = totalOf(answer);
  return {
    rows: (answer?.results ?? []).map((a) => toAdjustment(a, actor.id)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Asks for a signed correction (DZD); nothing moves until a second admin approves. */
export async function requestAdjustment(
  data: { hostId: string; amount: number; reason: string },
  actor: AdminActor
): Promise<AdjustmentRow> {
  const raw = await write(() =>
    api<ApiAdjustment>("/admin/wallet-adjustments", {
      method: "POST",
      body: { host_account: data.hostId, amount_minor: minor(data.amount), reason: data.reason },
      idempotencyKey: newIdempotencyKey(),
    })
  );
  return toAdjustment(raw, actor.id);
}

export async function approveAdjustment(id: string, actor: AdminActor): Promise<AdjustmentRow> {
  const raw = await write(() =>
    api<ApiAdjustment>(`/admin/wallet-adjustments/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      idempotencyKey: newIdempotencyKey(),
    })
  );
  return toAdjustment(raw, actor.id);
}

export async function rejectAdjustment(id: string, reason: string, actor: AdminActor): Promise<AdjustmentRow> {
  const raw = await write(() =>
    api<ApiAdjustment>(`/admin/wallet-adjustments/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      body: { reason },
    })
  );
  return toAdjustment(raw, actor.id);
}

// -------------------------------------------------------------- commissions

interface ApiCommissionRates {
  individual_bp: number;
  agency_bp: number;
  hotel_bp: number;
  hostel_bp: number;
}

const fromBp = (raw: ApiCommissionRates): Record<HostType, number> => ({
  individual: raw.individual_bp / 100,
  agency: raw.agency_bp / 100,
  hotel: raw.hotel_bp / 100,
  hostel: raw.hostel_bp / 100,
});

export async function getCommissionRates(): Promise<Record<HostType, number>> {
  return fromBp(await api<ApiCommissionRates>("/admin/commission-rates"));
}

/** Replaces the four default rates (percent in, basis points to the API); new bookings only. */
export async function updateCommissionRates(
  rates: Record<HostType, number>,
  _actor: AdminActor
): Promise<Record<HostType, number>> {
  const raw = await write(() =>
    api<ApiCommissionRates>("/admin/commission-rates", {
      method: "PUT",
      body: {
        individual_bp: Math.round(rates.individual * 100),
        agency_bp: Math.round(rates.agency * 100),
        hotel_bp: Math.round(rates.hotel * 100),
        hostel_bp: Math.round(rates.hostel * 100),
      },
    })
  );
  return fromBp(raw);
}

// ------------------------------------------------------------------ payouts

export interface PayoutsAnswer {
  /** False while payouts are switched off (BR-PAY-11, DEC-019): the API answers 404. */
  enabled: boolean;
  rows: PayoutRequest[];
}

interface ApiPayout {
  id: string;
  host_account_id: string;
  amount: { amount_minor: number };
  status: string;
  approved_by: { display_name: string } | null;
  approved_at: string | null;
  bank_reference: string;
  rejection_reason: string;
  created_at: string;
}

export async function listPayouts(params: { status?: string } = {}): Promise<PayoutsAnswer> {
  try {
    const [rows, names] = await Promise.all([
      apiAll<ApiPayout>("/admin/payouts", {
        query: { status: params.status && params.status !== "all" ? params.status : undefined },
      }, 4),
      hostNameMap(),
    ]);
    return {
      enabled: true,
      rows: rows.map((p) => ({
        id: p.id,
        hostId: p.host_account_id,
        hostName: names.get(p.host_account_id) ?? "",
        hostType: "individual",
        amountDzd: p.amount.amount_minor / 100,
        payoutMethod: "bank_wire",
        accountDetails: {},
        status: (p.status === "requested" ? "pending" : p.status) as PayoutRequest["status"],
        requestedAt: p.created_at,
        processedAt: p.approved_at ?? undefined,
        processedBy: p.approved_by?.display_name,
        rejectionReason: p.rejection_reason || undefined,
      })),
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { enabled: false, rows: [] };
    throw error;
  }
}

export async function approvePayout(id: string, _actor: AdminActor): Promise<void> {
  await write(() =>
    api(`/admin/payouts/${encodeURIComponent(id)}/approve`, { method: "POST", idempotencyKey: newIdempotencyKey() })
  );
}

export async function rejectPayout(id: string, reason: string, _actor: AdminActor): Promise<void> {
  await write(() => api(`/admin/payouts/${encodeURIComponent(id)}/reject`, { method: "POST", body: { reason } }));
}

// --------------------------------------------------------------------- KPIs

export interface FinanceSummary {
  totalWalletBalanceDzd: number;
  negativeWalletCount: number;
  belowFloorWalletCount: number;
  walletCount: number;
  /** Net commission kept this month (taken minus returned). */
  monthCommissionsDzd: number;
  monthCommissionsReversedDzd: number;
  monthTopupsDzd: number;
  pendingTopupApprovals: number;
  /** Refunds hosts were told to pay guests this month (memo, DEC-019). */
  refundsTotalDzd: number;
  /** False while payouts and guest payments are switched off (BR-PAY-11). */
  payoutsEnabled: boolean;
  pendingPayoutsCount: number;
  /** Guest money held by BLADUS; always 0 while online payment is off. */
  escrowDzd: number;
  monthStart: string;
}

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const [raw, wallets] = await Promise.all([
    api<ApiFinanceSummary>("/admin/finance/summary"),
    api<unknown>("/admin/wallets", { query: { page_size: 1 } }).then(totalOf).catch(() => 0),
  ]);
  const now = new Date();
  const committed = (raw.commission_this_month?.amount_minor ?? 0) - (raw.commission_reversed_this_month?.amount_minor ?? 0);
  return {
    totalWalletBalanceDzd: (raw.wallets_total?.amount_minor ?? 0) / 100,
    negativeWalletCount: raw.negative_wallets,
    belowFloorWalletCount: raw.below_floor_wallets,
    walletCount: wallets,
    monthCommissionsDzd: committed / 100,
    monthCommissionsReversedDzd: (raw.commission_reversed_this_month?.amount_minor ?? 0) / 100,
    monthTopupsDzd: (raw.topups_this_month?.amount_minor ?? 0) / 100,
    pendingTopupApprovals: raw.pending_topup_approvals,
    refundsTotalDzd: (raw.refunds_owed_this_month?.amount_minor ?? 0) / 100,
    payoutsEnabled: Boolean(raw.dormant),
    pendingPayoutsCount: raw.dormant?.payouts_pending ?? 0,
    escrowDzd: (raw.dormant?.escrow_balance?.amount_minor ?? 0) / 100,
    monthStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
  };
}

// ------------------------------------------------------------------ refunds

/** Refunds hosts owe guests after cancellations (review R8), newest first. */
export async function listRefunds(
  params: { page?: number; pageSize?: number; status?: string; overdue?: boolean } = {}
): Promise<PaginatedResult<RefundRow>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 10));
  const [answer, names] = await Promise.all([
    api<{ count: number; results: ApiRefundObligation[] }>("/admin/refunds", {
      query: {
        status: params.status && params.status !== "all" ? params.status : undefined,
        overdue: params.overdue ? "true" : undefined,
        page,
        page_size: pageSize,
      },
    }),
    hostNameMap(),
  ]);
  const total = totalOf(answer);
  return {
    rows: (answer?.results ?? []).map((r) => toRefund(r, names)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Closes a refund debt after checking the proof. */
export async function settleRefund(id: string, note: string): Promise<RefundRow> {
  const raw = await write(() =>
    api<ApiRefundObligation>(`/admin/refunds/${encodeURIComponent(id)}/settle`, {
      method: "POST",
      body: { note },
      idempotencyKey: newIdempotencyKey(),
    })
  );
  return toRefund(raw, await hostNameMap());
}

// ----------------------------------------------------------------- invoices

export async function listInvoices(
  params: { hostId?: string; year?: number; page?: number; pageSize?: number } = {}
): Promise<PaginatedResult<InvoiceRow>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 10));
  const [answer, names] = await Promise.all([
    api<{ count: number; results: ApiInvoice[] }>("/admin/invoices", {
      query: { host_account: params.hostId || undefined, year: params.year, page, page_size: pageSize },
    }),
    hostNameMap(),
  ]);
  const total = totalOf(answer);
  return {
    rows: (answer?.results ?? []).map((i) => toInvoice(i, names)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// ---------------------------------------------------- sync health (R3, R14)

export async function listInventoryConflicts(
  params: { status?: string; page?: number; pageSize?: number } = {}
): Promise<PaginatedResult<ConflictRow>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 10));
  const answer = await api<{ count: number; results: ApiInventoryConflict[] }>("/admin/inventory-conflicts", {
    query: { status: params.status && params.status !== "all" ? params.status : undefined, page, page_size: pageSize },
  });
  const total = totalOf(answer);
  return { rows: (answer?.results ?? []).map(toConflict), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function resolveInventoryConflict(id: string, note: string): Promise<ConflictRow> {
  const raw = await write(() =>
    api<ApiInventoryConflict>(`/admin/inventory-conflicts/${encodeURIComponent(id)}/resolve`, {
      method: "POST",
      body: { note },
    })
  );
  return toConflict(raw);
}

export async function listOutbox(
  params: { status?: string; topic?: string; page?: number; pageSize?: number } = {}
): Promise<PaginatedResult<OutboxRow>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 10));
  const answer = await api<{ count: number; results: ApiOutboxMessage[] }>("/admin/outbox", {
    query: {
      status: params.status && params.status !== "all" ? params.status : undefined,
      topic: params.topic || undefined,
      page,
      page_size: pageSize,
    },
  });
  const total = totalOf(answer);
  return { rows: (answer?.results ?? []).map(toOutbox), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function retryOutbox(id: string): Promise<OutboxRow> {
  const raw = await write(() =>
    api<ApiOutboxMessage>(`/admin/outbox/${encodeURIComponent(id)}/retry`, { method: "POST" })
  );
  return toOutbox(raw);
}

