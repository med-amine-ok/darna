import "server-only";
import type { HostType, Transaction, TransactionType, Wallet } from "@/types";
import { dzd, type ApiMoney } from "./bookings";

/**
 * Host deposit (wallet), its history, invoices and earnings from the Django
 * API (backend apps/ledger and apps/bookings) mapped onto the frontend types.
 */

/** GET /host/wallet (WalletStateSerializer). */
export interface ApiWalletState {
  balance: ApiMoney;
  commission_rate_bp: number;
  credit_limit: ApiMoney;
  is_negative: boolean;
  can_accept_bookings: boolean;
}

/** One row of GET /host/wallet/entries (WalletEntrySerializer); amount is signed for the host. */
export interface ApiWalletEntry {
  id: string | number;
  kind: string;
  description: string;
  booking_id: string | null;
  occurred_at: string;
  amount: ApiMoney;
}

const TYPE_BY_KIND: Record<string, TransactionType> = {
  wallet_topup: "recharge",
  commission: "commission_deduction",
  commission_reversal: "adjustment",
  adjustment: "adjustment",
  payout: "payout",
};

export function toTransaction(entry: ApiWalletEntry, walletId: string): Transaction {
  return {
    id: String(entry.id),
    walletId,
    type: TYPE_BY_KIND[entry.kind] ?? "adjustment",
    amount: dzd(entry.amount),
    currency: "DZD",
    relatedBookingId: entry.booking_id,
    note: entry.description || undefined,
    timestamp: entry.occurred_at,
  };
}

export interface WalletOwner {
  id: string;
  ownerType: "user" | "organization";
  name: string;
  hostType: HostType;
}

export function toWallet(state: ApiWalletState, entries: ApiWalletEntry[], owner: WalletOwner): Wallet {
  const id = `wallet_${owner.id}`;
  const transactions = entries.map((e) => toTransaction(e, id));
  const newest = transactions[0]?.timestamp ?? new Date(0).toISOString();
  const oldest = transactions[transactions.length - 1]?.timestamp ?? newest;
  return {
    id,
    ownerType: owner.ownerType,
    ownerId: owner.id,
    ownerName: owner.name,
    hostType: owner.hostType,
    currency: "DZD",
    balance: dzd(state.balance),
    transactions,
    createdAt: oldest,
    updatedAt: newest,
  };
}

/** Deposit state the wallet widget needs besides the Wallet itself. */
export interface WalletStatus {
  /** Commission rate in percent (12 = 12%). */
  commissionRate: number;
  /** How far below zero the deposit may go before new bookings stop (DZD, positive). */
  creditLimit: number;
  canAcceptBookings: boolean;
}

export function toWalletStatus(state: ApiWalletState): WalletStatus {
  return {
    commissionRate: state.commission_rate_bp / 100,
    creditLimit: Math.abs(dzd(state.credit_limit)),
    canAcceptBookings: state.can_accept_bookings,
  };
}

/** GET /host/invoices (InvoiceSerializer). */
export interface ApiInvoice {
  id: string;
  number: string;
  host_account_id: string;
  period_start: string;
  period_end: string;
  amount_ht: ApiMoney;
  vat: ApiMoney;
  amount_ttc: ApiMoney;
  status: string;
  pdf_url: string | null;
  issued_at: string | null;
}

export interface HostInvoice {
  id: string;
  number: string;
  periodStart: string;
  periodEnd: string;
  amountHt: number;
  vat: number;
  amountTtc: number;
  status: string;
  pdfUrl: string | null;
  issuedAt: string | null;
}

export function toInvoice(i: ApiInvoice): HostInvoice {
  return {
    id: i.id,
    number: i.number,
    periodStart: i.period_start,
    periodEnd: i.period_end,
    amountHt: dzd(i.amount_ht),
    vat: dzd(i.vat),
    amountTtc: dzd(i.amount_ttc),
    status: i.status,
    pdfUrl: i.pdf_url,
    issuedAt: i.issued_at,
  };
}

/** GET /host/earnings (EarningsSerializer). */
export interface ApiEarnings {
  from: string;
  to: string;
  upcoming: ApiMoney;
  completed: ApiMoney;
  commission_paid: ApiMoney;
  refunds_owed: ApiMoney;
  by_month: { month: string; completed: ApiMoney; commission: ApiMoney }[];
}

export interface HostEarnings {
  from: string;
  to: string;
  upcoming: number;
  completed: number;
  commissionPaid: number;
  refundsOwed: number;
  byMonth: { month: string; completed: number; commission: number }[];
}

export function toEarnings(e: ApiEarnings): HostEarnings {
  return {
    from: e.from,
    to: e.to,
    upcoming: dzd(e.upcoming),
    completed: dzd(e.completed),
    commissionPaid: dzd(e.commission_paid),
    refundsOwed: dzd(e.refunds_owed),
    byMonth: e.by_month.map((m) => ({ month: m.month, completed: dzd(m.completed), commission: dzd(m.commission) })),
  };
}
