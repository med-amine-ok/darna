import "server-only";

import { api, apiAll, apiOrNull } from "@/lib/api/client";
import { logReadError, write } from "@/lib/api/mapping";
import {
  toBackendHostStatuses,
  toHost,
  toHostExtras,
  type ApiAdminHost,
  type ApiAdminWallet,
  type HostExtras,
} from "@/lib/api/hosts";
import type { AdminActor, Host, PaginatedResult } from "@/lib/types";
import { toCsv, type CsvExport } from "@/lib/utils/csv";
import { ValidationError } from "./errors";

/**
 * Host accounts, from the Django API (/admin/hosts, /admin/documents,
 * /admin/wallets for balances). The backend filters by verification status
 * and host type; the other screen filters (search, approval mode, balance)
 * are applied here on the fetched rows. The backend checks every staff
 * permission again and writes the audit trail itself.
 */

export interface HostFilterParams {
  category?: string; // "all" | ProviderCategory
  hostType?: string; // "all" | HostType
  status?: string; // "all" | HostStatus (comma list allowed)
  verificationStatus?: string;
  wilayaCode?: string | string[];
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  approvalMode?: "all" | "instant" | "request";
  vertical?: string;
  minRating?: number;
  minBookings?: number;
  minListings?: number;
  onlyNegativeBalance?: boolean;
  minStars?: number; // hotel
  hasTrips?: boolean; // agency
  sortBy?: "joined" | "rating" | "listings" | "bookings" | "balance";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/** Most hosts read for one list screen (pages of 50). */
const MAX_HOST_PAGES = 10;

export function getProviderCategory(h: Host): "host" | "hotel_hostel" | "travel_agency" | "experience_company" | "rental_agency" {
  if (h.providerCategory) return h.providerCategory;
  if (h.hostType === "hotel" || h.hostType === "hostel") return "hotel_hostel";
  if (h.hostType === "agency" && h.verticalsOffered?.includes("trip")) return "travel_agency";
  if (h.verticalsOffered?.includes("vehicle")) return "rental_agency";
  if (h.verticalsOffered?.includes("experience")) return "experience_company";
  if (h.hostType === "agency") return "travel_agency";
  return "host";
}

async function walletsByHost(): Promise<Map<string, ApiAdminWallet>> {
  try {
    const rows = await apiAll<ApiAdminWallet>("/admin/wallets", {}, MAX_HOST_PAGES);
    return new Map(rows.map((w) => [w.host_account_id, w]));
  } catch (error) {
    logReadError("admin wallets for hosts", error);
    return new Map();
  }
}

async function walletOf(hostId: string): Promise<ApiAdminWallet | null> {
  try {
    return await apiOrNull<ApiAdminWallet>(`/admin/wallets/${encodeURIComponent(hostId)}`);
  } catch (error) {
    logReadError("admin wallet", error);
    return null;
  }
}

function matches(h: Host, params: HostFilterParams): boolean {
  if (params.status && params.status !== "all") {
    const wanted = params.status.split(",").map((s) => s.trim().toLowerCase());
    if (!wanted.includes(h.status)) return false;
  }
  if (params.verificationStatus && params.verificationStatus !== "all" && h.verificationStatus !== params.verificationStatus) {
    return false;
  }
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    const hay = [h.ownerName, h.businessName, h.email, h.phone, h.id, h.formattedId].filter(Boolean).join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (params.approvalMode && params.approvalMode !== "all" && h.bookingApprovalMode !== params.approvalMode) return false;
  if (params.minRating && params.minRating > 0 && h.rating < params.minRating) return false;
  if (params.onlyNegativeBalance && h.walletBalance >= 0) return false;
  return true;
}

/** Every host account the API returns (deleted ones excluded by the backend unless asked). */
async function fetchAllHosts(): Promise<Host[]> {
  const [rows, wallets] = await Promise.all([
    apiAll<ApiAdminHost>("/admin/hosts", {}, MAX_HOST_PAGES),
    walletsByHost(),
  ]);
  return rows.map((raw) => {
    const host = toHost(raw, wallets.get(raw.host_account_id || raw.id));
    return { ...host, providerCategory: getProviderCategory(host) };
  });
}

function countBy(rows: Host[], key: (h: Host) => string, keys: string[]): Record<string, number> {
  const out: Record<string, number> = { all: rows.length };
  for (const k of keys) out[k] = 0;
  for (const row of rows) {
    const k = key(row);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export async function listHosts(params: HostFilterParams = {}): Promise<PaginatedResult<Host>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(params.pageSize || 12, 500));
  let all: Host[];
  try {
    all = await fetchAllHosts();
  } catch (error) {
    logReadError("admin hosts", error);
    return { rows: [], total: 0, page, pageSize, totalPages: 1, facets: {} };
  }

  const baseline = all.filter((h) => matches(h, params));
  const byType = params.hostType && params.hostType !== "all" ? baseline.filter((h) => h.hostType === params.hostType) : baseline;
  const filtered =
    params.category && params.category !== "all" ? byType.filter((h) => getProviderCategory(h) === params.category) : byType;

  const sortBy = params.sortBy || "joined";
  const order = params.sortOrder === "asc" ? 1 : -1;
  filtered.sort((a, b) => {
    if (sortBy === "rating") return (a.rating - b.rating) * order;
    if (sortBy === "listings") return (a.listingsCount - b.listingsCount) * order;
    if (sortBy === "bookings") return (a.bookingsCount - b.bookingsCount) * order;
    if (sortBy === "balance") return (a.walletBalance - b.walletBalance) * order;
    return (new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()) * order;
  });

  const facets: Record<string, Record<string, number>> = {
    category: countBy(byType, getProviderCategory, ["host", "hotel_hostel", "travel_agency", "experience_company", "rental_agency"]),
    hostType: countBy(baseline, (h) => h.hostType, ["individual", "agency", "hotel", "hostel"]),
    status: countBy(all, (h) => h.status, ["applied", "under_review", "approved", "rejected", "suspended", "banned"]),
  };

  const total = filtered.length;
  return {
    rows: filtered.slice((page - 1) * pageSize, page * pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    facets,
  };
}

export async function getHostById(id: string): Promise<Host | null> {
  const detail = await getHostDetail(id);
  return detail?.host ?? null;
}

/** One host with its documents, checklist, credit floor and wallet state. Null when unknown or unreachable. */
export async function getHostDetail(id: string): Promise<{ host: Host; extras: HostExtras } | null> {
  try {
    const [raw, wallet] = await Promise.all([
      apiOrNull<ApiAdminHost>(`/admin/hosts/${encodeURIComponent(id)}`),
      walletOf(id),
    ]);
    if (!raw) return null;
    const host = toHost(raw, wallet);
    return { host: { ...host, providerCategory: getProviderCategory(host) }, extras: toHostExtras(raw, wallet) };
  } catch (error) {
    logReadError("admin host", error);
    return null;
  }
}

/** Full filtered host list (all pages) as CSV. */
export async function exportHosts(params: HostFilterParams, _actor: AdminActor): Promise<CsvExport> {
  const result = await listHosts({ ...params, page: 1, pageSize: 500 });
  const rows = result.rows;
  const csv = toCsv(
    ["ID", "Owner", "Business", "Email", "Phone", "Host Type", "Status", "Verification", "Rating", "Wallet Balance (DZD)", "Commission (%)", "Joined"],
    rows.map((h) => [
      h.id, h.ownerName, h.businessName, h.email, h.phone, h.hostType, h.status,
      h.verificationStatus, h.rating, h.walletBalance, h.commissionRate, h.joinedAt,
    ]),
  );
  return { filename: `bladus_hosts_${new Date().toISOString().slice(0, 10)}.csv`, csv, rowCount: rows.length };
}

type HostDecision = "approve" | "reject" | "request-changes" | "suspend" | "unsuspend" | "ban";

async function decide(id: string, action: HostDecision, reason?: string): Promise<Host> {
  const raw = await write(() =>
    api<ApiAdminHost>(`/admin/hosts/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
      body: reason ? { reason } : {},
    }),
  );
  return toHost(raw, await walletOf(id));
}

export async function approveHost(id: string, _actor: AdminActor): Promise<Host> {
  return decide(id, "approve");
}

export async function rejectHost(id: string, reason: string, _actor: AdminActor): Promise<Host> {
  return decide(id, "reject", reason);
}

export async function requestHostChanges(id: string, reason: string, _actor: AdminActor): Promise<Host> {
  return decide(id, "request-changes", reason);
}

export async function suspendHost(id: string, reason: string, _actor: AdminActor): Promise<Host> {
  return decide(id, "suspend", reason);
}

export async function unsuspendHost(id: string, _actor: AdminActor): Promise<Host> {
  return decide(id, "unsuspend");
}

export async function banHost(id: string, reason: string, _actor: AdminActor): Promise<Host> {
  return decide(id, "ban", reason);
}

/** Soft delete (409 has_future_bookings while bookings are upcoming). */
export async function deleteHost(id: string, _actor: AdminActor): Promise<Host> {
  const before = await getHostById(id);
  await write(() => api(`/admin/hosts/${encodeURIComponent(id)}`, { method: "DELETE" }));
  return before ? { ...before, status: "deleted", statusBeforeDelete: before.status } : ({ id, status: "deleted" } as Host);
}

export async function restoreHost(id: string, _actor: AdminActor): Promise<Host> {
  const raw = await write(() => api<ApiAdminHost>(`/admin/hosts/${encodeURIComponent(id)}/restore`, { method: "POST" }));
  return toHost(raw, await walletOf(id));
}

/** Own commission rate for one host, in percent (0 to 100, 2 decimals) with the reason the backend requires. */
export async function overrideCommission(id: string, newRate: number, _actor: AdminActor, reason?: string): Promise<Host> {
  const rateBp = Math.round(newRate * 100);
  if (!Number.isInteger(rateBp) || rateBp < 0 || rateBp > 10_000) {
    throw new ValidationError("Commission rate must be between 0 and 100 with at most 2 decimals");
  }
  const raw = await write(() =>
    api<ApiAdminHost>(`/admin/hosts/${encodeURIComponent(id)}/commission-override`, {
      method: "PUT",
      body: { rate_bp: rateBp, reason: reason ?? "" },
    }),
  );
  return toHost(raw, await walletOf(id));
}

/** Back to the default rate of the host type. */
export async function clearCommissionOverride(id: string, _actor: AdminActor): Promise<Host | null> {
  await write(() => api(`/admin/hosts/${encodeURIComponent(id)}/commission-override`, { method: "DELETE" }));
  return getHostById(id);
}

/** The host's own credit floor (how far below zero the wallet may go), in dinars, with a reason. */
export async function setCreditLimit(id: string, amountDzd: number, reason: string, _actor: AdminActor): Promise<Host> {
  const raw = await write(() =>
    api<ApiAdminHost>(`/admin/hosts/${encodeURIComponent(id)}/credit-limit-override`, {
      method: "PUT",
      body: { credit_limit: { amount_minor: Math.round(amountDzd * 100), currency: "DZD" }, reason },
    }),
  );
  return toHost(raw, await walletOf(id));
}

/** A 5-minute link to a KYC document; every call is audited by the backend (BR-MED-02). */
export async function getDocumentUrl(documentId: string, _actor: AdminActor): Promise<{ url: string; expiresAt: string }> {
  const answer = await write(() =>
    api<{ url: string; expires_at: string }>(`/admin/documents/${encodeURIComponent(documentId)}/url`),
  );
  return { url: answer.url, expiresAt: answer.expires_at };
}

export async function reviewDocument(
  documentId: string,
  approve: boolean,
  reason: string | undefined,
  _actor: AdminActor,
): Promise<{ id: string; status: string }> {
  const answer = await write(() =>
    api<{ id: string; status: string }>(
      `/admin/documents/${encodeURIComponent(documentId)}/${approve ? "approve" : "reject"}`,
      { method: "POST", body: reason ? { reason } : {} },
    ),
  );
  return { id: answer.id, status: answer.status };
}
