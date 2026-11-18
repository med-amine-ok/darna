import "server-only";

import type { HostType, HostWallet, TransactionType, WalletTransaction } from "@/lib/types";
import { dzd, type ApiMoney } from "./mapping";

/** Mappers of the ledger app (/admin/wallets, /admin/ledger/transactions, /admin/topups...). */

export interface ApiHostSummary {
  host_account_id: string;
  kind: string;
  host_type: string;
  display_name: string;
}

export interface ApiUserRef {
  id: string;
  display_name: string;
}

export interface ApiAdminWallet {
  host_account_id: string;
  balance: ApiMoney;
  credit_limit: ApiMoney;
  state: "ok" | "negative" | "below_floor" | string;
  commission_rate_bp: number;
  commission_rate_source: "default" | "override";
  updated_at: string;
  host: ApiHostSummary;
  total_topups: ApiMoney;
  total_commission: ApiMoney;
  last_entry_at: string | null;
}

export interface ApiFinanceSummary {
  wallets_total: ApiMoney;
  negative_wallets: number;
  below_floor_wallets: number;
  commission_this_month: ApiMoney;
  commission_reversed_this_month: ApiMoney;
  topups_this_month: ApiMoney;
  pending_topup_approvals: number;
  refunds_owed_this_month: ApiMoney;
  dormant?: { payouts_pending: number; escrow_balance: ApiMoney };
}

export interface ApiLedgerTransaction {
  id: string;
  kind: string;
  description: string;
  booking_id: string | null;
  booking_reference: string | null;
  topup_id: string | null;
  reverses_id: string | null;
  created_by: ApiUserRef | null;
  occurred_at: string;
  entries: Array<{ account_code: string; account_kind: string; amount: ApiMoney }>;
}

export interface ApiTopup {
  id: string;
  host_account_id: string;
  host: ApiHostSummary;
  method: string;
  amount: ApiMoney;
  receipt_reference: string;
  note: string;
  status: "pending_approval" | "approved" | "rejected";
  requested_by: ApiUserRef | null;
  approved_by: ApiUserRef | null;
  approved_at: string | null;
  rejection_reason: string | null;
  ledger_transaction_id: string | null;
  needs_second_approval: boolean;
  wallet_balance_after: ApiMoney | null;
  created_at: string;
}

export interface ApiAdjustment {
  id: string;
  host_account: string;
  host_name: string;
  amount: ApiMoney;
  reason: string;
  status: "pending_approval" | "approved" | "rejected";
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string;
  created_at: string;
}

export interface ApiInvoice {
  id: string;
  number: string;
  host_account_id: string;
  period_start: string;
  period_end: string;
  amount_ht: ApiMoney;
  vat: ApiMoney;
  amount_ttc: ApiMoney;
  status: "issued" | "cancelled";
  pdf_url: string | null;
  issued_at: string;
}

export interface ApiInventoryConflict {
  id: string;
  listing_id: string;
  room_type_id: string;
  room_type_name: string;
  night: string;
  external_total: number;
  sold: number;
  source: string;
  status: string;
  resolution_note: string;
  resolved_at: string | null;
  created_at: string;
}

export interface ApiOutboxMessage {
  id: string;
  topic: string;
  payload: unknown;
  status: string;
  attempts: number;
  next_attempt_at: string | null;
  last_error: string;
  created_at: string;
  sent_at: string | null;
}

// ---------------------------------------------------------------- view types

/** A top-up as the admin screen shows it. Amounts in DZD. */
export interface TopupRow {
  id: string;
  hostId: string;
  hostName: string;
  method: string;
  amountDzd: number;
  receiptReference: string;
  note: string;
  status: ApiTopup["status"];
  requestedBy: string;
  requestedById: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  needsSecondApproval: boolean;
  balanceAfterDzd: number | null;
  createdAt: string;
  /** True when the signed-in admin recorded it (four-eyes: may not approve). */
  ownRequest: boolean;
}

export interface AdjustmentRow {
  id: string;
  hostId: string;
  hostName: string;
  amountDzd: number;
  reason: string;
  status: ApiAdjustment["status"];
  requestedById: string | null;
  approvedAt: string | null;
  rejectionReason: string;
  createdAt: string;
  ownRequest: boolean;
}

export interface InvoiceRow {
  id: string;
  number: string;
  hostId: string;
  hostName: string;
  periodStart: string;
  periodEnd: string;
  amountHtDzd: number;
  vatDzd: number;
  amountTtcDzd: number;
  status: ApiInvoice["status"];
  issuedAt: string;
}

export interface RefundRow {
  id: string;
  bookingId: string;
  reference: string;
  hostId: string;
  hostName: string;
  amountDzd: number;
  status: "open" | "declared" | "disputed" | "settled";
  dueAt: string | null;
  isOverdue: boolean;
  declaredAt: string | null;
  paymentReference: string | null;
  settledAt: string | null;
  note: string | null;
  date: string;
}

export interface ConflictRow {
  id: string;
  listingId: string;
  roomTypeName: string;
  night: string;
  externalTotal: number;
  sold: number;
  source: string;
  status: string;
  resolutionNote: string;
  resolvedAt: string | null;
  createdAt: string;
}

export interface OutboxRow {
  id: string;
  topic: string;
  status: string;
  attempts: number;
  nextAttemptAt: string | null;
  lastError: string;
  createdAt: string;
  sentAt: string | null;
}

// ------------------------------------------------------------------- mappers

const HOST_TYPES: readonly HostType[] = ["individual", "agency", "hotel", "hostel"];

export function toHostType(value: string | null | undefined): HostType {
  return HOST_TYPES.includes(value as HostType) ? (value as HostType) : "individual";
}

export function toWallet(raw: ApiAdminWallet): HostWallet {
  const balance = dzd(raw.balance);
  return {
    id: raw.host_account_id,
    hostId: raw.host_account_id,
    ownerName: raw.host?.display_name ?? "",
    hostName: raw.host?.display_name ?? "",
    hostType: toHostType(raw.host?.host_type),
    wilayaCode: "",
    balance,
    balanceDzd: balance,
    // The API reports approved top-ups, not booking earnings (guests pay hosts directly, DEC-001).
    totalEarned: dzd(raw.total_topups),
    totalCommissionsPaid: dzd(raw.total_commission),
    totalCommissionsPaidDzd: dzd(raw.total_commission),
    totalPayouts: 0,
    lastTransactionAt: raw.last_entry_at ?? raw.updated_at,
    isNegative: balance < 0,
    commissionRate: (raw.commission_rate_bp ?? 0) / 100,
    creditLimitDzd: dzd(raw.credit_limit),
    walletState: raw.state,
    commissionRateSource: raw.commission_rate_source,
  };
}

/** Admin ledger types -> backend transaction kinds (filter). */
export const KINDS_BY_TYPE: Record<TransactionType, string> = {
  wallet_recharge: "wallet_topup",
  commission_deduction: "commission,commission_reversal",
  booking_refund: "refund_due,refund_settled,refund",
  adjustment: "adjustment",
  host_payout: "payout",
  booking_payment: "guest_payment",
};

function typeOfKind(kind: string): TransactionType {
  switch (kind) {
    case "wallet_topup":
      return "wallet_recharge";
    case "commission":
    case "commission_reversal":
      return "commission_deduction";
    case "refund_due":
    case "refund_settled":
    case "refund":
      return "booking_refund";
    case "payout":
      return "host_payout";
    case "guest_payment":
      return "booking_payment";
    default:
      return "adjustment";
  }
}

/** Host account id from a ledger account code such as "host_wallet:<uuid>". */
function hostIdOf(code: string): string | null {
  const i = code.indexOf(":");
  return i > 0 ? code.slice(i + 1) : null;
}

/**
 * One ledger transaction as one row of the host ledger. The amount is the
 * host's point of view: the wallet line with its sign flipped (a credit to
 * the wallet is a negative line). Memo transactions without a wallet line
 * (refunds owed) show the debt as a negative amount.
 */
export function toWalletTransaction(raw: ApiLedgerTransaction, hostNames: Map<string, string>): WalletTransaction {
  const walletLine = raw.entries.find((e) => e.account_kind === "host_wallet");
  const hostLine = walletLine ?? raw.entries.find((e) => hostIdOf(e.account_code));
  const hostId = (hostLine && hostIdOf(hostLine.account_code)) || "";
  let amountMinor: number;
  if (walletLine) {
    amountMinor = -walletLine.amount.amount_minor;
  } else {
    const moved = raw.entries.reduce((s, e) => s + Math.max(0, e.amount.amount_minor), 0);
    amountMinor = raw.kind === "refund_due" ? -moved : moved;
  }
  const amount = dzd(amountMinor);
  return {
    id: raw.id,
    walletId: hostId,
    hostId,
    hostName: hostNames.get(hostId) ?? "",
    hostType: "individual",
    type: typeOfKind(raw.kind),
    amount,
    amountDzd: amount,
    balanceAfter: Number.NaN, // not reported by the API per transaction
    reference: raw.booking_reference || `TX-${raw.id.slice(0, 8).toUpperCase()}`,
    description: raw.description,
    bookingRef: raw.booking_reference ?? undefined,
    adminActor: raw.created_by?.display_name,
    createdAt: raw.occurred_at,
    kind: raw.kind,
  };
}

export function toTopup(raw: ApiTopup, actorId: string | null): TopupRow {
  return {
    id: raw.id,
    hostId: raw.host_account_id,
    hostName: raw.host?.display_name ?? "",
    method: raw.method,
    amountDzd: dzd(raw.amount),
    receiptReference: raw.receipt_reference,
    note: raw.note ?? "",
    status: raw.status,
    requestedBy: raw.requested_by?.display_name ?? "",
    requestedById: raw.requested_by?.id ?? null,
    approvedBy: raw.approved_by?.display_name ?? null,
    approvedAt: raw.approved_at,
    rejectionReason: raw.rejection_reason,
    needsSecondApproval: raw.needs_second_approval,
    balanceAfterDzd: raw.wallet_balance_after ? dzd(raw.wallet_balance_after) : null,
    createdAt: raw.created_at,
    ownRequest: Boolean(actorId && raw.requested_by?.id === actorId),
  };
}

export function toAdjustment(raw: ApiAdjustment, actorId: string | null): AdjustmentRow {
  return {
    id: raw.id,
    hostId: raw.host_account,
    hostName: raw.host_name,
    amountDzd: dzd(raw.amount),
    reason: raw.reason,
    status: raw.status,
    requestedById: raw.requested_by,
    approvedAt: raw.approved_at,
    rejectionReason: raw.rejection_reason ?? "",
    createdAt: raw.created_at,
    ownRequest: Boolean(actorId && raw.requested_by === actorId),
  };
}

export function toInvoice(raw: ApiInvoice, hostNames: Map<string, string>): InvoiceRow {
  return {
    id: raw.id,
    number: raw.number,
    hostId: raw.host_account_id,
    hostName: hostNames.get(raw.host_account_id) ?? "",
    periodStart: raw.period_start,
    periodEnd: raw.period_end,
    amountHtDzd: dzd(raw.amount_ht),
    vatDzd: dzd(raw.vat),
    amountTtcDzd: dzd(raw.amount_ttc),
    status: raw.status,
    issuedAt: raw.issued_at,
  };
}

export interface ApiRefundObligation {
  id: string;
  booking_id: string;
  booking_reference: string;
  host_account_id: string;
  guest_id: string;
  amount: ApiMoney;
  status: RefundRow["status"];
  due_at: string | null;
  is_overdue: boolean;
  declared_at: string | null;
  payment_reference: string | null;
  settled_at: string | null;
  note: string | null;
  created_at: string;
}

export function toRefund(raw: ApiRefundObligation, hostNames: Map<string, string>): RefundRow {
  return {
    id: raw.id,
    bookingId: raw.booking_id,
    reference: raw.booking_reference,
    hostId: raw.host_account_id,
    hostName: hostNames.get(raw.host_account_id) ?? "",
    amountDzd: dzd(raw.amount),
    status: raw.status,
    dueAt: raw.due_at,
    isOverdue: raw.is_overdue,
    declaredAt: raw.declared_at,
    paymentReference: raw.payment_reference,
    settledAt: raw.settled_at,
    note: raw.note,
    date: raw.created_at,
  };
}

export function toConflict(raw: ApiInventoryConflict): ConflictRow {
  return {
    id: raw.id,
    listingId: raw.listing_id,
    roomTypeName: raw.room_type_name,
    night: raw.night,
    externalTotal: raw.external_total,
    sold: raw.sold,
    source: raw.source,
    status: raw.status,
    resolutionNote: raw.resolution_note ?? "",
    resolvedAt: raw.resolved_at,
    createdAt: raw.created_at,
  };
}

export function toOutbox(raw: ApiOutboxMessage): OutboxRow {
  return {
    id: raw.id,
    topic: raw.topic,
    status: raw.status,
    attempts: raw.attempts,
    nextAttemptAt: raw.next_attempt_at,
    lastError: raw.last_error ?? "",
    createdAt: raw.created_at,
    sentAt: raw.sent_at,
  };
}
