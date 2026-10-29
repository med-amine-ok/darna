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
  requireAlso,
  InvalidInputError,
} from "@/lib/auth/run-action";
import type { HostType } from "@/lib/types";
import { MAX_RECHARGE_DZD } from "@/lib/pricing";

type WalletParams = data.WalletFilterParams;
type TxParams = data.TransactionFilterParams;

export async function listWallets(params: WalletParams = {}) {
  return runAction("wallets.view", () => data.listWallets(params ?? {}));
}

export async function listTransactions(params: TxParams = {}) {
  return runAction("wallets.view", () => data.listTransactions(params ?? {}));
}

export async function listPayouts(params: { status?: string } = {}) {
  return runAction("wallets.view", () => data.listPayouts(params ?? {}));
}

export async function listRefunds(params: { page?: number; pageSize?: number } = {}) {
  return runAction("wallets.view", () => data.listRefunds(params ?? {}));
}

export async function getFinanceSummary() {
  return runAction("wallets.view", () => data.getFinanceSummary());
}

export async function getCommissionRates() {
  return runAction("wallets.view", () => data.getCommissionRates());
}

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
    if (!receipt) throw new InvalidInputError("A receipt reference is required");
    return data.rechargeWallet({
      hostId: id(i.hostId, "hostId"),
      amount: dzd(i.amount, "amount", 1, MAX_RECHARGE_DZD),
      method: str(i.method, "method", 100),
      reason: str(i.reason, "reason"),
      receiptReference: receipt,
      actor,
    });
  });
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

const optStr = (v: unknown, field: string, max = 200) => (v === undefined || v === null ? undefined : str(v, field, max));

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
        minBalance: p.minBalance === undefined ? undefined : num(p.minBalance, "minBalance"),
        maxBalance: p.maxBalance === undefined ? undefined : num(p.maxBalance, "maxBalance"),
      },
      actor
    );
  });
}
