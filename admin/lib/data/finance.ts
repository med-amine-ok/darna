// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import {
  HostWallet,
  WalletTransaction,
  PayoutRequest,
  HostType,
  PaginatedResult,
} from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { logAudit } from "./audit";

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

export async function listWallets(
  params: WalletFilterParams = {}
): Promise<PaginatedResult<HostWallet>> {
  await delay(190);

  const page = params.page || 1;
  const pageSize = params.pageSize || 12;

  // Strict Ledger Rule: re-derive balance directly from stored transactions
  const walletsWithStrictBalances: HostWallet[] = store.wallets.map((w) => {
    const txs = store.transactions.filter((t) => t.hostId === w.hostId);
    const balance = txs.reduce((sum, t) => sum + t.amount, 0);
    return {
      ...w,
      balance,
      isNegative: balance < 0,
    };
  });

  let filtered = [...walletsWithStrictBalances];

  if (params.hostType && params.hostType !== "all") {
    filtered = filtered.filter((w) => w.hostType === params.hostType);
  }

  if (params.wilayaCode && params.wilayaCode !== "all") {
    filtered = filtered.filter((w) => w.wilayaCode === params.wilayaCode);
  }

  if (params.onlyNegative) {
    filtered = filtered.filter((w) => w.balance < 0);
  }

  if (params.minBalance !== undefined) {
    filtered = filtered.filter((w) => w.balance >= params.minBalance!);
  }

  if (params.maxBalance !== undefined) {
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

  const facets: Record<string, Record<string, number>> = {
    hostType: {
      all: store.wallets.length,
      individual: store.wallets.filter((w) => w.hostType === "individual").length,
      agency: store.wallets.filter((w) => w.hostType === "agency").length,
      hotel: store.wallets.filter((w) => w.hostType === "hotel").length,
      hostel: store.wallets.filter((w) => w.hostType === "hostel").length,
    },
    solvency: {
      healthy: store.wallets.filter((w) => w.balance >= 0).length,
      negative: store.wallets.filter((w) => w.balance < 0).length,
    },
  };

  filtered.sort((a, b) => b.balance - a.balance);

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages,
    facets,
  };
}

export async function listTransactions(params: {
  hostId?: string;
  type?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<WalletTransaction>> {
  await delay(180);

  const page = params.page || 1;
  const pageSize = params.pageSize || 15;

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

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function rechargeWallet(data: {
  hostId: string;
  amount: number;
  method: string;
  reason: string;
  receiptReference: string;
  actor: { id: string; name: string; role: any };
}): Promise<{ transaction: WalletTransaction; newBalance: number }> {
  assertCan(data.actor.role, "wallets.recharge");
  await delay(200);

  const host = store.hosts.find((h) => h.id === data.hostId);
  if (!host) throw new Error("Host not found");

  const existingTxs = store.transactions.filter((t) => t.hostId === data.hostId);
  const currentBalance = existingTxs.reduce((sum, t) => sum + t.amount, 0);
  const newBalance = currentBalance + data.amount;

  const newTx: WalletTransaction = {
    id: `tx_${Date.now()}`,
    walletId: `wlt_${data.hostId}`,
    hostId: data.hostId,
    hostName: host.businessName || host.ownerName,
    hostType: host.hostType,
    type: "wallet_recharge",
    amount: data.amount,
    balanceAfter: newBalance,
    reference: `TXN-REC-${Date.now().toString().slice(-6)}`,
    description: `Admin manual recharge: ${data.reason}`,
    receiptReference: data.receiptReference,
    adminActor: data.actor.name,
    createdAt: new Date().toISOString(),
  };

  store.transactions = [newTx, ...store.transactions];

  await logAudit(
    data.actor,
    "WALLET_RECHARGE",
    "wallet",
    `wlt_${data.hostId}`,
    `Credited ${data.amount} DZD to host ${host.ownerName} (Receipt: ${data.receiptReference})`,
    { balance: currentBalance },
    { balance: newBalance }
  );

  return { transaction: newTx, newBalance };
}

export async function getCommissionRates(): Promise<Record<HostType, number>> {
  await delay(100);
  return { ...store.platformSettings.defaultCommissionRates };
}

export async function updateCommissionRates(
  rates: Record<HostType, number>,
  actor: { id: string; name: string; role: any }
): Promise<Record<HostType, number>> {
  assertCan(actor.role, "commissions.manage");
  await delay(200);

  const prev = { ...store.platformSettings.defaultCommissionRates };
  store.platformSettings = {
    ...store.platformSettings,
    defaultCommissionRates: rates,
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

  return rates;
}

export async function listPayouts(): Promise<PayoutRequest[]> {
  await delay(150);
  return [
    {
      id: "pay_01",
      hostId: "hst_001",
      hostName: "Atlas Escapes Tourism SARL",
      hostType: "agency",
      amountDzd: 185000,
      payoutMethod: "ccp",
      accountDetails: { ccpRip: "00799999001234567890" },
      status: "pending",
      requestedAt: "2026-10-18T14:20:00Z",
    },
    {
      id: "pay_02",
      hostId: "hst_003",
      hostName: "Hôtel Les Zianides",
      hostType: "hotel",
      amountDzd: 420000,
      payoutMethod: "bank_wire",
      accountDetails: { rib: "00200012012345678901" },
      status: "pending",
      requestedAt: "2026-10-19T09:10:00Z",
    },
    {
      id: "pay_03",
      hostId: "hst_005",
      hostName: "Karim Benali",
      hostType: "individual",
      amountDzd: 65000,
      payoutMethod: "baridimob",
      accountDetails: { phone: "+213 555 89 12 34" },
      status: "approved",
      requestedAt: "2026-10-17T11:00:00Z",
      processedAt: "2026-10-18T10:00:00Z",
    },
  ];
}

export async function approvePayout(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<boolean> {
  assertCan(actor.role, "payouts.approve");
  await delay(200);

  await logAudit(
    actor,
    "PAYOUT_APPROVE",
    "payout",
    id,
    `Approved payout request ${id}`
  );

  return true;
}
