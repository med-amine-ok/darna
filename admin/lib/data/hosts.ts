// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { Host, HostType, HostStatus, PaginatedResult } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { logAudit } from "./audit";

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

  // Base filtering across all filters EXCEPT category (for category facets)
  let baseline = [...store.hosts];

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
  return host ? { ...host } : null;
}

export async function approveHost(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<Host> {
  assertCan(actor.role, "hosts.approve");
  await delay(200);

  const idx = store.hosts.findIndex((h) => h.id === id);
  if (idx === -1) throw new Error("Host not found");

  const prev = { ...store.hosts[idx] };
  store.hosts[idx] = {
    ...store.hosts[idx],
    status: "approved",
    verificationStatus: "verified",
  };

  await logAudit(
    actor,
    "HOST_APPROVE",
    "host",
    id,
    `Approved host ${prev.ownerName} (${prev.hostType})`,
    prev,
    store.hosts[idx]
  );

  return store.hosts[idx];
}

export async function rejectHost(
  id: string,
  reason: string,
  actor: { id: string; name: string; role: any }
): Promise<Host> {
  assertCan(actor.role, "hosts.reject");
  await delay(200);

  const idx = store.hosts.findIndex((h) => h.id === id);
  if (idx === -1) throw new Error("Host not found");

  const prev = { ...store.hosts[idx] };
  store.hosts[idx] = {
    ...store.hosts[idx],
    status: "rejected",
    adminNotes: [...store.hosts[idx].adminNotes, `Rejected: ${reason}`],
  };

  await logAudit(
    actor,
    "HOST_REJECT",
    "host",
    id,
    `Rejected host ${prev.ownerName}: ${reason}`,
    prev,
    store.hosts[idx]
  );

  return store.hosts[idx];
}

export async function suspendHost(
  id: string,
  reason: string,
  actor: { id: string; name: string; role: any }
): Promise<Host> {
  assertCan(actor.role, "hosts.suspend");
  await delay(200);

  const idx = store.hosts.findIndex((h) => h.id === id);
  if (idx === -1) throw new Error("Host not found");

  const prev = { ...store.hosts[idx] };
  store.hosts[idx] = {
    ...store.hosts[idx],
    status: "suspended",
    adminNotes: [...store.hosts[idx].adminNotes, `Suspended: ${reason}`],
  };

  await logAudit(
    actor,
    "HOST_SUSPEND",
    "host",
    id,
    `Suspended host ${prev.ownerName}: ${reason}`,
    prev,
    store.hosts[idx]
  );

  return store.hosts[idx];
}

export async function unsuspendHost(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<Host> {
  assertCan(actor.role, "hosts.suspend");
  await delay(200);

  const idx = store.hosts.findIndex((h) => h.id === id);
  if (idx === -1) throw new Error("Host not found");

  const prev = { ...store.hosts[idx] };
  store.hosts[idx] = {
    ...store.hosts[idx],
    status: "approved",
  };

  await logAudit(
    actor,
    "HOST_UNSUSPEND",
    "host",
    id,
    `Reactivated host ${prev.ownerName}`,
    prev,
    store.hosts[idx]
  );

  return store.hosts[idx];
}

export async function deleteHost(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<Host> {
  assertCan(actor.role, "hosts.delete");
  await delay(200);

  const idx = store.hosts.findIndex((h) => h.id === id);
  if (idx === -1) throw new Error("Host not found");

  const prev = { ...store.hosts[idx] };
  store.hosts[idx] = {
    ...store.hosts[idx],
    status: "deleted",
  };

  await logAudit(
    actor,
    "HOST_DELETE",
    "host",
    id,
    `Soft deleted host ${prev.ownerName}`,
    prev,
    store.hosts[idx]
  );

  return store.hosts[idx];
}

export async function restoreHost(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<Host> {
  assertCan(actor.role, "hosts.delete");
  await delay(200);

  const idx = store.hosts.findIndex((h) => h.id === id);
  if (idx === -1) throw new Error("Host not found");

  const prev = { ...store.hosts[idx] };
  store.hosts[idx] = {
    ...store.hosts[idx],
    status: "approved",
  };

  await logAudit(
    actor,
    "HOST_RESTORE",
    "host",
    id,
    `Restored soft-deleted host ${prev.ownerName}`,
    prev,
    store.hosts[idx]
  );

  return store.hosts[idx];
}

export async function overrideCommission(
  id: string,
  newRate: number,
  actor: { id: string; name: string; role: any }
): Promise<Host> {
  assertCan(actor.role, "hosts.commission_override");
  await delay(200);

  const idx = store.hosts.findIndex((h) => h.id === id);
  if (idx === -1) throw new Error("Host not found");

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
    prev,
    store.hosts[idx]
  );

  return store.hosts[idx];
}
