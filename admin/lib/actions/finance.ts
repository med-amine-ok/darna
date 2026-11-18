"use server";

import * as data from "@/lib/data/finance";
import {
  runAction,
  id,
  str,
  num,
  obj,
  dzd,
  rate,
  reason,
  oneOf,
  requireAlso,
  InvalidInputError,
} from "@/lib/auth/run-action";
import type { HostType } from "@/lib/types";
import { MAX_RECHARGE_DZD, MAX_MONEY_DZD } from "@/lib/pricing";

type WalletParams = data.WalletFilterParams;
type TxParams = data.TransactionFilterParams;
type ListParams = { status?: string; hostId?: string; page?: number; pageSize?: number };

const optStr = (v: unknown, field: string, max = 200) => (v === undefined || v === null ? undefined : str(v, field, max));
const optNum = (v: unknown, field: string) => (v === undefined || v === null ? undefined : num(v, field));

function listParams(params: unknown): ListParams {
  const p = obj<ListParams>(params ?? {}, "params");
  return {
    status: optStr(p.status, "status", 50),
    hostId: optStr(p.hostId, "hostId"),
    page: optNum(p.page, "page"),
    pageSize: optNum(p.pageSize, "pageSize"),
  };
}

export async function listWallets(params: WalletParams = {}) {
  return runAction("wallets.view", () => data.listWallets(params ?? {}));
}

export async function listTransactions(params: TxParams = {}) {
  return runAction("wallets.view", () => data.listTransactions(params ?? {}));
}

export async function listPayouts(params: { status?: string } = {}) {
  return runAction("wallets.view", () => data.listPayouts(params ?? {}));
}

export async function listRefunds(params: { page?: number; pageSize?: number; status?: string; overdue?: boolean } = {}) {
  return runAction("wallets.view", () => {
    const p = obj<typeof params>(params ?? {}, "params");
    return data.listRefunds({
      page: optNum(p.page, "page"),
      pageSize: optNum(p.pageSize, "pageSize"),
      status: optStr(p.status, "status", 50),
      overdue: p.overdue === true,
    });
  });
}

export async function settleRefund(refundId: string, note: string) {
  return runAction("bookings.refund", () => data.settleRefund(id(refundId), reason(note, "note", 2000)));
}

export async function getFinanceSummary() {
  return runAction("wallets.view", () => data.getFinanceSummary());
}

export async function getCommissionRates() {
  return runAction("wallets.view", () => data.getCommissionRates());
}

/** Manual top-up (BR-PAY-07): sent with an Idempotency-Key; may wait for a second admin. */
export async function rechargeWallet(input: {
  hostId: string;
  amount: number;
  method: string;
  reason: string;
  receiptReference: string;
}) {
  return runAction("wallets.recharge", (actor) => {
    const i = obj<typeof input>(input, "recharge");
    const receipt = str(i.receiptReference, "receiptReference", 200).trim();
    if (receipt.length < 3) throw new InvalidInputError("A receipt reference of at least 3 characters is required");
    return data.rechargeWallet({
      hostId: id(i.hostId, "hostId"),
      amount: dzd(i.amount, "amount", 1, MAX_RECHARGE_DZD),
      method: oneOf(i.method, data.TOPUP_METHODS, "method"),
      reason: str(i.reason ?? "", "reason", 2000),
      receiptReference: receipt,
      actor,
    });
  });
}

export async function listTopups(params: ListParams = {}) {
  return runAction("wallets.view", (actor) => data.listTopups(listParams(params), actor));
}

/** Four-eyes: the backend refuses (403) when the approver recorded the top-up. */
export async function approveTopup(topupId: string) {
  return runAction("wallets.recharge", (actor) => data.approveTopup(id(topupId), actor));
}

export async function rejectTopup(topupId: string, rejectionReason: string) {
  return runAction("wallets.recharge", (actor) => data.rejectTopup(id(topupId), reason(rejectionReason), actor));
}

export async function listAdjustments(params: ListParams = {}) {
  return runAction("wallets.view", (actor) => data.listAdjustments(listParams(params), actor));
}

/** Signed correction in DZD (positive adds, negative takes); waits for a second admin. */
export async function requestAdjustment(input: { hostId: string; amount: number; reason: string }) {
  return runAction("ledger.adjust", (actor) => {
    const i = obj<typeof input>(input, "adjustment");
    const amount = num(i.amount, "amount");
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > MAX_MONEY_DZD) {
      throw new InvalidInputError(`amount must be a non-zero whole number of DZD up to ${MAX_MONEY_DZD}`);
    }
    return data.requestAdjustment({ hostId: id(i.hostId, "hostId"), amount, reason: reason(i.reason) }, actor);
  });
}

export async function approveAdjustment(adjustmentId: string) {
  return runAction("ledger.adjust", (actor) => data.approveAdjustment(id(adjustmentId), actor));
}

export async function rejectAdjustment(adjustmentId: string, rejectionReason: string) {
  return runAction("ledger.adjust", (actor) => data.rejectAdjustment(id(adjustmentId), reason(rejectionReason), actor));
}

export async function listInvoices(params: { hostId?: string; year?: number; page?: number; pageSize?: number } = {}) {
  return runAction("wallets.view", () => {
    const p = obj<typeof params>(params ?? {}, "params");
    return data.listInvoices({
      hostId: optStr(p.hostId, "hostId"),
      year: optNum(p.year, "year"),
      page: optNum(p.page, "page"),
      pageSize: optNum(p.pageSize, "pageSize"),
    });
  });
}

export async function listInventoryConflicts(params: ListParams = {}) {
  return runAction("wallets.view", () => data.listInventoryConflicts(listParams(params)));
}

export async function resolveInventoryConflict(conflictId: string, note: string) {
  return runAction("settings.manage", () => data.resolveInventoryConflict(id(conflictId), reason(note, "note", 2000)));
}

export async function listOutbox(params: ListParams & { topic?: string } = {}) {
  return runAction("wallets.view", () => {
    const p = obj<typeof params>(params ?? {}, "params");
    return data.listOutbox({ ...listParams(p), topic: optStr(p.topic, "topic", 100) });
  });
}

export async function retryOutbox(messageId: string) {
  return runAction("settings.manage", () => data.retryOutbox(id(messageId)));
}

export async function updateCommissionRates(rates: Record<HostType, number>) {
  return runAction("commissions.manage", (actor) => {
    const r = obj<Record<HostType, number>>(rates, "rates");
    return data.updateCommissionRates(
      {
        individual: rate(r.individual, "individual"),
        agency: rate(r.agency, "agency"),
        hotel: rate(r.hotel, "hotel"),
        hostel: rate(r.hostel, "hostel"),
      },
      actor
    );
  });
}

export async function approvePayout(payoutId: string) {
  return runAction("payouts.approve", (actor) => data.approvePayout(id(payoutId), actor));
}

export async function rejectPayout(payoutId: string, rejectionReason: string) {
  return runAction("payouts.approve", (actor) =>
    data.rejectPayout(id(payoutId), reason(rejectionReason), actor)
  );
}

/** Full filtered ledger as CSV (all pages). Requires reports.export + wallets.view. */
export async function exportTransactions(params: TxParams = {}) {
  return runAction("reports.export", (actor) => {
    requireAlso(actor, "wallets.view");
    const p = obj<TxParams>(params ?? {}, "params");
    return data.exportTransactions(
      {
        type: optStr(p.type, "type", 50),
        search: optStr(p.search, "search"),
        hostId: optStr(p.hostId, "hostId"),
      },
      actor
    );
  });
}

/** Full filtered wallet list as CSV (all pages). Requires reports.export + wallets.view. */
export async function exportWallets(params: WalletParams = {}) {
  return runAction("reports.export", (actor) => {
    requireAlso(actor, "wallets.view");
    const p = obj<WalletParams>(params ?? {}, "params");
    return data.exportWallets(
      {
        hostType: optStr(p.hostType, "hostType", 50),
        wilayaCode: optStr(p.wilayaCode, "wilayaCode", 10),
        onlyNegative: p.onlyNegative === true,
        search: optStr(p.search, "search"),
        minBalance: optNum(p.minBalance, "minBalance"),
        maxBalance: optNum(p.maxBalance, "maxBalance"),
      },
      actor
    );
  });
}
