// TODO: replace with Supabase query
import "server-only";
import { Wallet, Transaction, HostTypeCommissionRates, HostType } from "@/types";
import { newId } from "@/lib/ids";
import { clone, globalStore } from "./_store";
import { DEFAULT_COMMISSION_RATES } from "@/lib/booking/config";
export type { HostTypeCommissionRates };

export { DEFAULT_COMMISSION_RATES };

const SEED_WALLETS: Wallet[] = [
  {
    id: "wal_amina",
    ownerType: "user",
    ownerId: "usr_amina",
    ownerName: "Amina Benali",
    hostType: "individual",
    currency: "DZD",
    balance: 32000,
    createdAt: "2024-01-15T09:00:00.000Z",
    updatedAt: "2026-10-08T14:20:00.000Z",
    transactions: [
      {
        id: "tx_am_01",
        walletId: "wal_amina",
        type: "recharge",
        amount: 50000,
        currency: "DZD",
        adminUserId: "usr_admin",
        note: "CCP offline recharge confirmation #CCP-ALG-881204",
        timestamp: "2026-09-01T10:00:00.000Z",
      },
      {
        id: "tx_am_02",
        walletId: "wal_amina",
        type: "commission_deduction",
        amount: -8400,
        currency: "DZD",
        relatedBookingId: "res_tipaza_01",
        note: "Platform 12% commission on booking res_tipaza_01 (Total: 70,000 DZD)",
        timestamp: "2026-09-18T16:30:00.000Z",
      },
      {
        id: "tx_am_03",
        walletId: "wal_amina",
        type: "commission_deduction",
        amount: -9600,
        currency: "DZD",
        relatedBookingId: "res_tipaza_02",
        note: "Platform 12% commission on booking res_tipaza_02 (Total: 80,000 DZD)",
        timestamp: "2026-10-08T14:20:00.000Z",
      },
    ],
  },
  {
    id: "wal_atlas_escapes",
    ownerType: "organization",
    ownerId: "org_atlas_escapes",
    ownerName: "Atlas Escapes Tourism SARL",
    hostType: "agency",
    currency: "DZD",
    balance: 145000,
    createdAt: "2024-02-01T11:00:00.000Z",
    updatedAt: "2026-10-09T17:45:00.000Z",
    transactions: [
      {
        id: "tx_at_01",
        walletId: "wal_atlas_escapes",
        type: "recharge",
        amount: 150000,
        currency: "DZD",
        adminUserId: "usr_admin",
        note: "BNA Commercial bank transfer ref #BNA-984012",
        timestamp: "2026-08-15T09:30:00.000Z",
      },
      {
        id: "tx_at_02",
        walletId: "wal_atlas_escapes",
        type: "recharge",
        amount: 100000,
        currency: "DZD",
        adminUserId: "usr_admin",
        note: "BaridiMob instant deposit confirmation #BM-77412",
        timestamp: "2026-09-10T12:00:00.000Z",
      },
      {
        id: "tx_at_03",
        walletId: "wal_atlas_escapes",
        type: "commission_deduction",
        amount: -36000,
        currency: "DZD",
        relatedBookingId: "res_trip_tassili_01",
        note: "Platform 15% commission on 5-Day Tassili Expedition (Total: 240,000 DZD)",
        timestamp: "2026-09-22T14:10:00.000Z",
      },
      {
        id: "tx_at_04",
        walletId: "wal_atlas_escapes",
        type: "commission_deduction",
        amount: -24000,
        currency: "DZD",
        relatedBookingId: "res_trip_ghardaia_01",
        note: "Platform 15% commission on M'zab Valley Architecture Tour (Total: 160,000 DZD)",
        timestamp: "2026-10-01T11:30:00.000Z",
      },
      {
        id: "tx_at_05",
        walletId: "wal_atlas_escapes",
        type: "commission_deduction",
        amount: -45000,
        currency: "DZD",
        relatedBookingId: "res_trip_hoggar_01",
        note: "Platform 15% commission on Hoggar Sunset Trek (Total: 300,000 DZD)",
        timestamp: "2026-10-09T17:45:00.000Z",
      },
    ],
  },
  {
    id: "wal_el_djazair",
    ownerType: "organization",
    ownerId: "org_el_djazair_hotel",
    ownerName: "El Djazaïr Heritage Palace Hotel",
    hostType: "hotel",
    currency: "DZD",
    balance: 310000,
    createdAt: "2024-03-01T08:00:00.000Z",
    updatedAt: "2026-10-07T16:00:00.000Z",
    transactions: [
      {
        id: "tx_hd_01",
        walletId: "wal_el_djazair",
        type: "recharge",
        amount: 500000,
        currency: "DZD",
        adminUserId: "usr_admin",
        note: "BEA Corporate wire transfer #BEA-CORP-44019",
        timestamp: "2026-08-01T10:00:00.000Z",
      },
      {
        id: "tx_hd_02",
        walletId: "wal_el_djazair",
        type: "commission_deduction",
        amount: -110000,
        currency: "DZD",
        relatedBookingId: "res_hotel_suite_01",
        note: "Platform 18% commission on Presidential Suite booking (Total: 611,111 DZD)",
        timestamp: "2026-09-15T15:20:00.000Z",
      },
      {
        id: "tx_hd_03",
        walletId: "wal_el_djazair",
        type: "commission_deduction",
        amount: -80000,
        currency: "DZD",
        relatedBookingId: "res_hotel_deluxe_01",
        note: "Platform 18% commission on Deluxe Botanical Room (Total: 444,444 DZD)",
        timestamp: "2026-10-07T16:00:00.000Z",
      },
    ],
  },
  {
    id: "wal_casbah_hostel",
    ownerType: "organization",
    ownerId: "org_casbah_hostel",
    ownerName: "Casbah Medina Nomad Hostel",
    hostType: "hostel",
    currency: "DZD",
    balance: -4200, // Explicit negative balance for testing alert & action-needed state
    createdAt: "2024-04-10T12:00:00.000Z",
    updatedAt: "2026-10-10T18:15:00.000Z",
    transactions: [
      {
        id: "tx_ch_01",
        walletId: "wal_casbah_hostel",
        type: "recharge",
        amount: 15000,
        currency: "DZD",
        adminUserId: "usr_admin",
        note: "Initial CCP account activation recharge #CCP-CAS-1002",
        timestamp: "2026-08-20T10:00:00.000Z",
      },
      {
        id: "tx_ch_02",
        walletId: "wal_casbah_hostel",
        type: "commission_deduction",
        amount: -11200,
        currency: "DZD",
        relatedBookingId: "res_hostel_dorm_01",
        note: "Platform 10% commission on 4x 8-Bed Dorm Bookings (Total: 112,000 DZD)",
        timestamp: "2026-09-28T14:40:00.000Z",
      },
      {
        id: "tx_ch_03",
        walletId: "wal_casbah_hostel",
        type: "commission_deduction",
        amount: -8000,
        currency: "DZD",
        relatedBookingId: "res_hostel_priv_01",
        note: "Platform 10% commission on Private Medina Room booking (Total: 80,000 DZD)",
        timestamp: "2026-10-10T18:15:00.000Z",
      },
    ],
  },
  {
    id: "wal_karim",
    ownerType: "user",
    ownerId: "usr_karim",
    ownerName: "Karim Mansouri (Solo Host)",
    hostType: "individual",
    currency: "DZD",
    balance: 40000,
    createdAt: "2024-05-01T10:00:00.000Z",
    updatedAt: "2026-09-25T11:00:00.000Z",
    transactions: [
      {
        id: "tx_km_01",
        walletId: "wal_karim",
        type: "recharge",
        amount: 40000,
        currency: "DZD",
        adminUserId: "usr_admin",
        note: "BaridiMob transfer reference #BM-KARIM-901",
        timestamp: "2026-09-25T11:00:00.000Z",
      },
    ],
  },
];

// Server-side store (shared on globalThis). Wallet balances and commission
// rates are never stored in the browser.
const walletsStore = globalStore<Wallet[]>("__darna_wallets__", () => clone(SEED_WALLETS));
const ratesStore = globalStore<{ rates: HostTypeCommissionRates }>("__darna_commission_rates__", () => ({
  rates: { ...DEFAULT_COMMISSION_RATES },
}));

function computeBalance(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

export async function getCommissionRates(): Promise<HostTypeCommissionRates> {
  return { ...ratesStore.rates };
}

/** Admin-only operation (no caller in the public app). */
export async function saveCommissionRates(
  updates: Partial<HostTypeCommissionRates>
): Promise<HostTypeCommissionRates> {
  ratesStore.rates = { ...ratesStore.rates, ...updates };
  return { ...ratesStore.rates };
}

export function getRateForHostType(hostType: HostType): number {
  return ratesStore.rates[hostType] ?? DEFAULT_COMMISSION_RATES[hostType] ?? 12.0;
}

export async function getWallets(): Promise<Wallet[]> {
  return clone(walletsStore);
}

export async function getWalletById(id: string): Promise<Wallet | null> {
  const found = walletsStore.find((w) => w.id === id);
  return found ? clone(found) : null;
}

export async function getWalletByOwner(
  ownerId: string,
  ownerType?: "user" | "organization"
): Promise<Wallet | null> {
  const found = walletsStore.find((w) => {
    if (w.ownerId === ownerId) return true;
    if (ownerType && w.ownerType === ownerType && w.ownerId === ownerId) return true;
    return false;
  });
  return found ? clone(found) : null;
}

export async function rechargeWallet(params: {
  walletId: string;
  amount: number;
  note?: string;
  adminUserId?: string;
}): Promise<{ wallet: Wallet; transaction: Transaction }> {
  const walletIndex = walletsStore.findIndex((w) => w.id === params.walletId);
  if (walletIndex === -1) {
    throw new Error(`Wallet not found for ID: ${params.walletId}`);
  }

  const newTx: Transaction = {
    id: newId("tx_rec"),
    walletId: params.walletId,
    type: "recharge",
    amount: Math.abs(params.amount), // positive credit
    currency: "DZD",
    adminUserId: params.adminUserId || "usr_admin",
    note: params.note || "Manual offline balance recharge",
    timestamp: new Date().toISOString(),
  };

  const updatedTransactions = [newTx, ...walletsStore[walletIndex].transactions];
  const updatedWallet: Wallet = {
    ...walletsStore[walletIndex],
    transactions: updatedTransactions,
    balance: computeBalance(updatedTransactions),
    updatedAt: new Date().toISOString(),
  };

  walletsStore[walletIndex] = updatedWallet;

  return {
    wallet: clone(updatedWallet),
    transaction: newTx,
  };
}

function findOrCreateWallet(params: {
  hostUserId?: string | null;
  organizationId?: string | null;
  hostType: HostType;
  ownerName?: string;
}): Wallet | null {
  if (!params.organizationId && !params.hostUserId) return null;
  const ownerId = (params.organizationId || params.hostUserId) as string;
  const ownerType: "user" | "organization" = params.organizationId ? "organization" : "user";

  let wallet = walletsStore.find((w) => w.ownerId === ownerId && w.ownerType === ownerType);
  if (!wallet) {
    const now = new Date().toISOString();
    wallet = {
      id: `wal_${ownerId}`,
      ownerType,
      ownerId,
      ownerName: params.ownerName || (params.organizationId ? `Organization (${ownerId})` : `Host (${ownerId})`),
      hostType: params.hostType,
      currency: "DZD",
      balance: 0,
      transactions: [],
      createdAt: now,
      updatedAt: now,
    };
    walletsStore.push(wallet);
  }
  return wallet;
}

function appendTransaction(wallet: Wallet, tx: Transaction) {
  const idx = walletsStore.findIndex((w) => w.id === wallet.id);
  if (idx === -1) return;
  const transactions = [tx, ...walletsStore[idx].transactions];
  walletsStore[idx] = {
    ...walletsStore[idx],
    transactions,
    balance: computeBalance(transactions),
    updatedAt: tx.timestamp,
  };
}

/** Net commission currently charged for a booking (deductions minus reversals). */
function netCommissionFor(bookingId: string): { wallet: Wallet; net: number } | null {
  for (const wallet of walletsStore) {
    const related = wallet.transactions.filter(
      (t) => t.relatedBookingId === bookingId && (t.type === "commission_deduction" || t.type === "adjustment")
    );
    if (related.length > 0) {
      return { wallet, net: -related.reduce((sum, t) => sum + t.amount, 0) };
    }
  }
  return null;
}

/**
 * Charges DARNA's commission for a confirmed booking — idempotent: a booking
 * is charged at most once (no-op when a non-reversed charge exists).
 * The commission base is the accommodation subtotal: DARNA's guest service
 * fee and the cleaning fee are excluded. The rate comes from the owner's
 * host type (individual / agency / hotel / hostel).
 */
export async function deductBookingCommission(params: {
  bookingId: string;
  commissionBase: number;
  hostType: HostType;
  hostUserId?: string | null;
  organizationId?: string | null;
  ownerName?: string;
}): Promise<{ transaction: Transaction | null; rate: number; amount: number }> {
  const existing = netCommissionFor(params.bookingId);
  if (existing && existing.net > 0) {
    return { transaction: null, rate: getRateForHostType(existing.wallet.hostType), amount: existing.net };
  }

  const wallet = findOrCreateWallet(params);
  const rate = getRateForHostType(wallet?.hostType ?? params.hostType);
  const amount = Math.round((Math.max(0, params.commissionBase) * rate) / 100);
  if (!wallet || amount <= 0) return { transaction: null, rate, amount: 0 };

  const tx: Transaction = {
    id: newId("tx_com"),
    walletId: wallet.id,
    type: "commission_deduction",
    amount: -amount,
    currency: "DZD",
    relatedBookingId: params.bookingId,
    note: `Platform ${rate}% commission on booking ${params.bookingId} (subtotal: ${params.commissionBase.toLocaleString("fr-DZ")} DZD)`,
    timestamp: new Date().toISOString(),
  };
  appendTransaction(wallet, tx);
  return { transaction: tx, rate, amount };
}

/**
 * Reverses the commission of a cancelled / declined booking (idempotent).
 * `keepShare` (0–1) keeps that share of the commission, matching the share
 * of the subtotal the host keeps after a partial guest refund.
 */
export async function reverseBookingCommission(bookingId: string, keepShare = 0): Promise<Transaction | null> {
  const existing = netCommissionFor(bookingId);
  if (!existing || existing.net <= 0) return null;

  const original = -existing.wallet.transactions
    .filter((t) => t.relatedBookingId === bookingId && t.type === "commission_deduction")
    .reduce((sum, t) => sum + t.amount, 0);
  const target = Math.round(original * Math.min(1, Math.max(0, keepShare)));
  const credit = existing.net - target;
  if (credit <= 0) return null;

  const tx: Transaction = {
    id: newId("tx_rev"),
    walletId: existing.wallet.id,
    type: "adjustment",
    amount: credit,
    currency: "DZD",
    relatedBookingId: bookingId,
    note: `Commission reversal for cancelled booking ${bookingId}`,
    timestamp: new Date().toISOString(),
  };
  appendTransaction(existing.wallet, tx);
  return tx;
}

/** Net commission currently charged for a booking, or null when none was charged. */
export function getBookingCommission(bookingId: string): number | null {
  const existing = netCommissionFor(bookingId);
  return existing ? existing.net : null;
}
