import "server-only";
// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { Host, PaginatedResult, AdminActor, Permission } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { canHostAction, isValidReason, type HostAction } from "@/lib/domain/transitions";
import { isValidCommissionRate } from "@/lib/pricing";
import { toCsv, type CsvExport } from "@/lib/utils/csv";
import { logAudit, logExport } from "./audit";
import { computeWalletAggregates, getHostBalance } from "./ledger";
import { DomainError, ValidationError } from "./errors";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface HostFilterParams {
  category?: string; // "all" | ProviderCategory
  hostType?: string; // "all" | HostType
  status?: string; // "all" | HostStatus
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

export function getProviderCategory(h: Host): "host" | "hotel_hostel" | "travel_agency" | "experience_company" | "rental_agency" {
  if (h.providerCategory) return h.providerCategory;
  if (h.hostType === "hotel" || h.hostType === "hostel") return "hotel_hostel";
  if (h.hostType === "agency" && h.verticalsOffered?.includes("trip")) return "travel_agency";
  if (h.verticalsOffered?.includes("vehicle")) return "rental_agency";
  if (h.verticalsOffered?.includes("experience")) return "experience_company";
  return "host";
}

export async function listHosts(
  params: HostFilterParams = {}
): Promise<PaginatedResult<Host>> {
  await delay(200);

  const page = params.page || 1;
  const pageSize = params.pageSize || 12;

  const matchStatus = (hStatus: string, filterStatus?: string) => {
    if (!filterStatus || filterStatus === "all") return true;
    const parts = filterStatus.split(",").map((s) => s.trim().toLowerCase());
    return parts.includes(hStatus.toLowerCase());
  };

  // Wallet balances are always derived from the ledger.
  const aggregates = computeWalletAggregates();
  const withBalances: Host[] = store.hosts.map((h) => ({ ...h, walletBalance: aggregates.get(h.id)?.balance ?? 0 }));

  // Base filtering across all filters EXCEPT category (for category facets)
  let baseline = [...withBalances];

  // 1. Host Type Tab
  if (params.hostType && params.hostType !== "all") {
    baseline = baseline.filter((h) => h.hostType === params.hostType);
  }

  // 2. Status (supports comma-separated)
  if (params.status && params.status !== "all") {
    baseline = baseline.filter((h) => matchStatus(h.status, params.status));
  }

  // 3. Verification
  if (params.verificationStatus && params.verificationStatus !== "all") {
    baseline = baseline.filter((h) => h.verificationStatus === params.verificationStatus);
  }

  // 4. Wilayas (support single or array)
  if (params.wilayaCode && params.wilayaCode !== "all") {
    const codes = Array.isArray(params.wilayaCode) ? params.wilayaCode : [params.wilayaCode];
    if (codes.length > 0) {
      baseline = baseline.filter((h) => codes.includes(h.wilayaCode));
    }
  }

  // 5. Search
  if (params.search?.trim()) {
    const q = params.search.toLowerCase();
    baseline = baseline.filter((h) => {
      const matchName = h.ownerName.toLowerCase().includes(q);
      const matchBiz = (h.businessName || "").toLowerCase().includes(q);
      const matchEmail = h.email.toLowerCase().includes(q);
      const matchPhone = h.phone.toLowerCase().includes(q);
      const matchCity = h.city.toLowerCase().includes(q);
      return matchName || matchBiz || matchEmail || matchPhone || matchCity;
    });
  }

  // 6. Approval Mode
  if (params.approvalMode && params.approvalMode !== "all") {
    baseline = baseline.filter((h) => h.bookingApprovalMode === params.approvalMode);
  }

  // 7. Verticals Offered
  if (params.vertical && params.vertical !== "all") {
    baseline = baseline.filter((h) => h.verticalsOffered.includes(params.vertical as any));
  }

  // 8. Rating & Activity
  if (params.minRating && params.minRating > 0) {
    baseline = baseline.filter((h) => h.rating >= params.minRating!);
  }
  if (params.minBookings && params.minBookings > 0) {
    baseline = baseline.filter((h) => h.bookingsCount >= params.minBookings!);
  }
  if (params.minListings && params.minListings > 0) {
    baseline = baseline.filter((h) => h.listingsCount >= params.minListings!);
  }
  if (params.onlyNegativeBalance) {
    baseline = baseline.filter((h) => h.walletBalance < 0);
  }

  // 9. Hotel stars / Agency trips
  if (params.minStars && params.minStars > 0) {
    baseline = baseline.filter((h) => (h.hotelMetadata?.starRating || 0) >= params.minStars!);
  }
  if (params.hasTrips) {
    baseline = baseline.filter((h) => !!h.agencyMetadata?.hasTrips);
  }

  // Compute category facets dynamically based on baseline matching current filters
  const facets: Record<string, Record<string, number>> = {
    category: {
      all: baseline.length,
      host: baseline.filter((h) => getProviderCategory(h) === "host").length,
      hotel_hostel: baseline.filter((h) => getProviderCategory(h) === "hotel_hostel").length,
      travel_agency: baseline.filter((h) => getProviderCategory(h) === "travel_agency").length,
      experience_company: baseline.filter((h) => getProviderCategory(h) === "experience_company").length,
      rental_agency: baseline.filter((h) => getProviderCategory(h) === "rental_agency").length,
    },
    hostType: {
      all: store.hosts.length,
      individual: store.hosts.filter((h) => h.hostType === "individual").length,
      agency: store.hosts.filter((h) => h.hostType === "agency").length,
      hotel: store.hosts.filter((h) => h.hostType === "hotel").length,
      hostel: store.hosts.filter((h) => h.hostType === "hostel").length,
    },
    status: {
      all: store.hosts.length,
      applied: store.hosts.filter((h) => h.status === "applied").length,
      under_review: store.hosts.filter((h) => h.status === "under_review").length,
      approved: store.hosts.filter((h) => h.status === "approved").length,
      rejected: store.hosts.filter((h) => h.status === "rejected").length,
      suspended: store.hosts.filter((h) => h.status === "suspended").length,
      banned: store.hosts.filter((h) => h.status === "banned").length,
    },
  };

  // Now apply category filter to get final results
  let filtered = params.category && params.category !== "all"
    ? baseline.filter((h) => getProviderCategory(h) === params.category)
    : baseline;

  // Sorting
  const sortBy = params.sortBy || "joined";
  const order = params.sortOrder === "asc" ? 1 : -1;

  filtered.sort((a, b) => {
    if (sortBy === "rating") return (a.rating - b.rating) * order;
    if (sortBy === "listings") return (a.listingsCount - b.listingsCount) * order;
    if (sortBy === "bookings") return (a.bookingsCount - b.bookingsCount) * order;
    if (sortBy === "balance") return (a.walletBalance - b.walletBalance) * order;
    return (new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()) * order;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize).map((h) => ({
    ...h,
    providerCategory: getProviderCategory(h),
    formattedId: h.formattedId || `#P${h.id.replace("hst_", "").padStart(5, "0")}`,
  }));

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages,
    facets,
  };
}

export async function getHostById(id: string): Promise<Host | null> {
  await delay(150);
  const host = store.hosts.find((h) => h.id === id);
  return host ? { ...host, walletBalance: getHostBalance(host.id) } : null;
}

/** Full filtered host list (all pages) as CSV; audited. */
export async function exportHosts(params: HostFilterParams, actor: AdminActor): Promise<CsvExport> {
  const result = await listHosts({ ...params, page: 1, pageSize: Number.MAX_SAFE_INTEGER });
  const rows = result.rows;
  const csv = toCsv(
    ["ID", "Owner", "Business", "Email", "Phone", "Host Type", "Category", "Status", "Verification", "Wilaya", "City", "Rating", "Listings", "Bookings", "Wallet Balance (DZD)", "Commission (%)", "Joined"],
    rows.map((h) => [
      h.formattedId || h.id, h.ownerName, h.businessName, h.email, h.phone, h.hostType, h.providerCategory, h.status,
      h.verificationStatus, h.wilayaCode, h.city, h.rating, h.listingsCount, h.bookingsCount, h.walletBalance,
      h.commissionRate, h.joinedAt,
    ])
  );
  await logExport(actor, "hosts", rows.length, { ...params });
  return { filename: `darna_hosts_${new Date().toISOString().slice(0, 10)}.csv`, csv, rowCount: rows.length };
}

const HOST_ACTION_PERMISSION: Record<HostAction, Permission> = {
  approve: "hosts.approve",
  reject: "hosts.reject",
  suspend: "hosts.suspend",
  unsuspend: "hosts.suspend",
  ban: "hosts.delete",
  delete: "hosts.delete",
  restore: "hosts.delete",
};

const HOST_ACTION_AUDIT: Record<HostAction, string> = {
  approve: "HOST_APPROVE",
  reject: "HOST_REJECT",
  suspend: "HOST_SUSPEND",
  unsuspend: "HOST_UNSUSPEND",
  ban: "HOST_BAN",
  delete: "HOST_DELETE",
  restore: "HOST_RESTORE",
};

const HOST_ACTIONS_REQUIRING_REASON: readonly HostAction[] = ["reject", "suspend", "ban"];

/**
 * Single guarded entry point for host moderation. Validates permission, the
 * mandatory reason, and the allowed-transition map (lib/domain/transitions)
 * before writing; soft delete remembers the previous status and restore
 * returns to it.
 */
async function transitionHost(id: string, action: HostAction, actor: AdminActor, reason?: string): Promise<Host> {
  assertCan(actor.role, HOST_ACTION_PERMISSION[action]);
  if (HOST_ACTIONS_REQUIRING_REASON.includes(action) && !isValidReason(reason)) {
    throw new ValidationError(`A reason is required to ${action} a host`);
  }
  await delay(200);

  const idx = store.hosts.findIndex((h) => h.id === id);
  if (idx === -1) throw new DomainError("Host not found");
  const prev = { ...store.hosts[idx] };
  if (!canHostAction(prev.status, action)) {
    throw new DomainError(`Cannot ${action} a host whose status is ${prev.status}`);
  }

  let next: Host;
  switch (action) {
    case "approve":
      next = { ...prev, status: "approved", verificationStatus: "verified" };
      break;
    case "reject":
      next = { ...prev, status: "rejected", adminNotes: [...prev.adminNotes, `Rejected: ${reason}`] };
      break;
    case "suspend":
      next = { ...prev, status: "suspended", adminNotes: [...prev.adminNotes, `Suspended: ${reason}`] };
      break;
    case "unsuspend":
      next = { ...prev, status: "approved" };
      break;
    case "ban":
      next = { ...prev, status: "banned", adminNotes: [...prev.adminNotes, `Banned: ${reason}`] };
      break;
    case "delete":
      next = { ...prev, status: "deleted", statusBeforeDelete: prev.status };
      break;
    case "restore": {
      const restored = prev.statusBeforeDelete && prev.statusBeforeDelete !== "deleted" ? prev.statusBeforeDelete : "under_review";
      next = { ...prev, status: restored, statusBeforeDelete: undefined };
      break;
    }
  }
  store.hosts[idx] = next;

  await logAudit(
    actor,
    HOST_ACTION_AUDIT[action],
    "host",
    id,
    `${action} host ${prev.ownerName} (${prev.status} -> ${next.status})${reason ? `: ${reason}` : ""}`,
    { status: prev.status },
    { status: next.status }
  );

  return { ...next, walletBalance: getHostBalance(next.id) };
}

export async function approveHost(id: string, actor: AdminActor): Promise<Host> {
  return transitionHost(id, "approve", actor);
}

export async function rejectHost(id: string, reason: string, actor: AdminActor): Promise<Host> {
  return transitionHost(id, "reject", actor, reason);
}

export async function suspendHost(id: string, reason: string, actor: AdminActor): Promise<Host> {
  return transitionHost(id, "suspend", actor, reason);
}

export async function unsuspendHost(id: string, actor: AdminActor): Promise<Host> {
  return transitionHost(id, "unsuspend", actor);
}

export async function banHost(id: string, reason: string, actor: AdminActor): Promise<Host> {
  return transitionHost(id, "ban", actor, reason);
}

export async function deleteHost(id: string, actor: AdminActor): Promise<Host> {
  return transitionHost(id, "delete", actor);
}

export async function restoreHost(id: string, actor: AdminActor): Promise<Host> {
  return transitionHost(id, "restore", actor);
}

export async function overrideCommission(
  id: string,
  newRate: number,
  actor: AdminActor
): Promise<Host> {
  assertCan(actor.role, "hosts.commission_override");
  if (!isValidCommissionRate(newRate)) {
    throw new ValidationError("Commission rate must be between 0 and 100 with at most 2 decimals");
  }
  await delay(200);

  const idx = store.hosts.findIndex((h) => h.id === id);
  if (idx === -1) throw new DomainError("Host not found");

  const prev = { ...store.hosts[idx] };
  store.hosts[idx] = {
    ...store.hosts[idx],
    commissionRate: newRate,
    isCommissionOverridden: true,
  };

  await logAudit(
    actor,
    "HOST_COMMISSION_OVERRIDE",
    "host",
    id,
    `Overrode commission rate to ${newRate}% for host ${prev.ownerName}`,
    { commissionRate: prev.commissionRate, isCommissionOverridden: prev.isCommissionOverridden ?? false },
    { commissionRate: newRate, isCommissionOverridden: true }
  );

  return { ...store.hosts[idx], walletBalance: getHostBalance(id) };
}
