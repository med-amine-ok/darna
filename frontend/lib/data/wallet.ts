import { Wallet, Transaction, HostTypeCommissionRates, HostType } from "@/types";
export type { HostTypeCommissionRates };

export const DEFAULT_COMMISSION_RATES: HostTypeCommissionRates = {
  individual: 12.0, // 12% standard host take-rate
  agency: 15.0,     // 15% agency & tour package take-rate
  hotel: 18.0,      // 18% commercial hotel & resort take-rate
  hostel: 10.0,     // 10% youth hostel community rate
};

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

const WALLETS_STORAGE_KEY = "darna_host_wallets_v1";
const RATES_STORAGE_KEY = "darna_commission_rates_v1";

// In-memory cache for SSR and consistency
let memoryWallets: Wallet[] = JSON.parse(JSON.stringify(SEED_WALLETS));
let memoryRates: HostTypeCommissionRates = { ...DEFAULT_COMMISSION_RATES };

function computeBalance(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

function loadFromStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const rawWallets = localStorage.getItem(WALLETS_STORAGE_KEY);
    if (rawWallets) {
      const parsed = JSON.parse(rawWallets) as Wallet[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryWallets = parsed.map((w) => ({
          ...w,
          balance: computeBalance(w.transactions),
        }));
      }
    }

    const rawRates = localStorage.getItem(RATES_STORAGE_KEY);
    if (rawRates) {
      memoryRates = { ...DEFAULT_COMMISSION_RATES, ...JSON.parse(rawRates) };
    }
  } catch (err) {
    console.error("Failed to load wallets from localStorage:", err);
  }
}

function persistToStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(memoryWallets));
    localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(memoryRates));
  } catch (err) {
    console.error("Failed to save wallets to localStorage:", err);
  }
}

// Initialize on client
if (typeof window !== "undefined") {
  loadFromStorage();
}

export function getCommissionRates(): HostTypeCommissionRates {
  loadFromStorage();
  return { ...memoryRates };
}

export function saveCommissionRates(updates: Partial<HostTypeCommissionRates>): HostTypeCommissionRates {
  loadFromStorage();
  memoryRates = {
    ...memoryRates,
    ...updates,
  };
  persistToStorage();
  return { ...memoryRates };
}

export function getRateForHostType(hostType: HostType): number {
  loadFromStorage();
  return memoryRates[hostType] ?? DEFAULT_COMMISSION_RATES[hostType] ?? 12.0;
}

export async function getWallets(): Promise<Wallet[]> {
  loadFromStorage();
  return JSON.parse(JSON.stringify(memoryWallets));
}

export async function getWalletById(id: string): Promise<Wallet | null> {
  loadFromStorage();
  const found = memoryWallets.find((w) => w.id === id);
  return found ? JSON.parse(JSON.stringify(found)) : null;
}

export async function getWalletByOwner(
  ownerId: string,
  ownerType?: "user" | "organization"
): Promise<Wallet | null> {
  loadFromStorage();
  const found = memoryWallets.find((w) => {
    if (w.ownerId === ownerId) return true;
    if (ownerType && w.ownerType === ownerType && w.ownerId === ownerId) return true;
    return false;
  });
  return found ? JSON.parse(JSON.stringify(found)) : null;
}

export async function rechargeWallet(params: {
  walletId: string;
  amount: number;
  note?: string;
  adminUserId?: string;
}): Promise<{ wallet: Wallet; transaction: Transaction }> {
  loadFromStorage();
  const walletIndex = memoryWallets.findIndex((w) => w.id === params.walletId);
  if (walletIndex === -1) {
    throw new Error(`Wallet not found for ID: ${params.walletId}`);
  }

  const newTx: Transaction = {
    id: `tx_rec_${Date.now()}`,
    walletId: params.walletId,
    type: "recharge",
    amount: Math.abs(params.amount), // positive credit
    currency: "DZD",
    adminUserId: params.adminUserId || "usr_admin",
    note: params.note || "Manual offline balance recharge",
    timestamp: new Date().toISOString(),
  };

  const updatedTransactions = [newTx, ...memoryWallets[walletIndex].transactions];
  const updatedWallet: Wallet = {
    ...memoryWallets[walletIndex],
    transactions: updatedTransactions,
    balance: computeBalance(updatedTransactions),
    updatedAt: new Date().toISOString(),
  };

  memoryWallets[walletIndex] = updatedWallet;
  persistToStorage();

  return {
    wallet: JSON.parse(JSON.stringify(updatedWallet)),
    transaction: newTx,
  };
}

export async function deductBookingCommission(params: {
  bookingId: string;
  bookingTotal: number;
  hostUserId?: string | null;
  organizationId?: string | null;
  hostType?: HostType;
}): Promise<Transaction | null> {
  loadFromStorage();

  // Find target wallet
  let targetWallet = memoryWallets.find((w) => {
    if (params.organizationId && w.ownerId === params.organizationId) return true;
    if (params.hostUserId && w.ownerId === params.hostUserId) return true;
    return false;
  });

  // If wallet doesn't exist yet, create a default one for this host/org
  if (!targetWallet) {
    const ownerType: "user" | "organization" = params.organizationId ? "organization" : "user";
    const ownerId = params.organizationId || params.hostUserId || `usr_temp_${Date.now()}`;
    const hType: HostType = params.hostType || (params.organizationId ? "agency" : "individual");
    
    targetWallet = {
      id: `wal_${ownerId}`,
      ownerType,
      ownerId,
      ownerName: params.organizationId ? `Organization (${ownerId})` : `Host (${ownerId})`,
      hostType: hType,
      currency: "DZD",
      balance: 0,
      transactions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryWallets.push(targetWallet);
  }

  const commissionRate = getRateForHostType(targetWallet.hostType);
  const commissionAmount = Math.round((params.bookingTotal * commissionRate) / 100);

  const newTx: Transaction = {
    id: `tx_com_${Date.now()}`,
    walletId: targetWallet.id,
    type: "commission_deduction",
    amount: -commissionAmount, // negative deduction
    currency: "DZD",
    relatedBookingId: params.bookingId,
    note: `Platform ${commissionRate}% commission on confirmed booking ${params.bookingId} (Total: ${params.bookingTotal.toLocaleString("fr-DZ")} DZD)`,
    timestamp: new Date().toISOString(),
  };

  const walletIdx = memoryWallets.findIndex((w) => w.id === targetWallet!.id);
  if (walletIdx !== -1) {
    const updatedTransactions = [newTx, ...memoryWallets[walletIdx].transactions];
    memoryWallets[walletIdx] = {
      ...memoryWallets[walletIdx],
      transactions: updatedTransactions,
      balance: computeBalance(updatedTransactions),
      updatedAt: new Date().toISOString(),
    };
    persistToStorage();
  }

  return newTx;
}

export function resetWalletsToDefault(): Wallet[] {
  memoryWallets = JSON.parse(JSON.stringify(SEED_WALLETS));
  memoryRates = { ...DEFAULT_COMMISSION_RATES };
  persistToStorage();
  return JSON.parse(JSON.stringify(memoryWallets));
}
