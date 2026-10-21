// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { Listing, ListingStatus, ListingVertical, PaginatedResult } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { logAudit } from "./audit";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ListingFilterParams {
  status?: string; // "all" | ListingStatus
  vertical?: string; // "all" | ListingVertical
  hostType?: string;
  wilayaCode?: string | string[];
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  approvalMode?: "all" | "instant" | "request";
  isFeatured?: boolean;
  isReported?: boolean;
  minCapacity?: number;
  minBedrooms?: number;
  amenity?: string;
  sortBy?: "created" | "price" | "rating" | "bookings";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listListings(
  params: ListingFilterParams = {}
): Promise<PaginatedResult<Listing>> {
  await delay(200);

  const page = params.page || 1;
  const pageSize = params.pageSize || 12;

  let filtered = [...store.listings];

  // 1. Status Filter
  if (params.status && params.status !== "all") {
    filtered = filtered.filter((l) => l.status === params.status);
  }

  // 2. Vertical Filter
  if (params.vertical && params.vertical !== "all") {
    filtered = filtered.filter((l) => l.category === params.vertical);
  }

  // 3. Host Type
  if (params.hostType && params.hostType !== "all") {
    filtered = filtered.filter((l) => l.hostType === params.hostType);
  }

  // 4. Wilaya
  if (params.wilayaCode && params.wilayaCode !== "all") {
    const codes = Array.isArray(params.wilayaCode) ? params.wilayaCode : [params.wilayaCode];
    if (codes.length > 0) {
      filtered = filtered.filter((l) => codes.includes(l.wilayaCode));
    }
  }

  // 5. Price Range
  if (params.minPrice !== undefined && params.minPrice > 0) {
    filtered = filtered.filter((l) => l.price >= params.minPrice!);
  }
  if (params.maxPrice !== undefined && params.maxPrice > 0) {
    filtered = filtered.filter((l) => l.price <= params.maxPrice!);
  }

  // 6. Search
  if (params.search?.trim()) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter((l) => {
      const matchTitle = l.title.toLowerCase().includes(q);
      const matchHost = l.hostName.toLowerCase().includes(q);
      const matchCity = l.city.toLowerCase().includes(q);
      const matchType = l.propertyType.toLowerCase().includes(q);
      return matchTitle || matchHost || matchCity || matchType;
    });
  }

  // 7. Flags & Features
  if (params.approvalMode && params.approvalMode !== "all") {
    filtered = filtered.filter((l) => l.bookingApprovalMode === params.approvalMode);
  }
  if (params.isFeatured !== undefined) {
    filtered = filtered.filter((l) => l.isFeatured === params.isFeatured);
  }
  if (params.isReported !== undefined) {
    filtered = filtered.filter((l) => l.isReported === params.isReported);
  }
  if (params.minCapacity && params.minCapacity > 0) {
    filtered = filtered.filter((l) => l.guestCapacity >= params.minCapacity!);
  }
  if (params.minBedrooms && params.minBedrooms > 0) {
    filtered = filtered.filter((l) => (l.bedroomCount || 0) >= params.minBedrooms!);
  }
  if (params.amenity && params.amenity !== "all") {
    filtered = filtered.filter((l) => l.amenities.includes(params.amenity!));
  }

  // Facets
  const facets: Record<string, Record<string, number>> = {
    status: {
      all: store.listings.length,
      pending_review: store.listings.filter((l) => l.status === "pending_review").length,
      approved: store.listings.filter((l) => l.status === "approved").length,
      changes_requested: store.listings.filter((l) => l.status === "changes_requested").length,
      rejected: store.listings.filter((l) => l.status === "rejected").length,
      suspended: store.listings.filter((l) => l.status === "suspended").length,
      archived: store.listings.filter((l) => l.status === "archived").length,
    },
    vertical: {
      all: store.listings.length,
      home: store.listings.filter((l) => l.category === "home").length,
      hotel: store.listings.filter((l) => l.category === "hotel").length,
      experience: store.listings.filter((l) => l.category === "experience").length,
      vehicle: store.listings.filter((l) => l.category === "vehicle").length,
      trip: store.listings.filter((l) => l.category === "trip").length,
    },
  };

  // Sorting
  const sortBy = params.sortBy || "created";
  const order = params.sortOrder === "asc" ? 1 : -1;

  filtered.sort((a, b) => {
    if (sortBy === "price") return (a.price - b.price) * order;
    if (sortBy === "rating") return (a.rating - b.rating) * order;
    if (sortBy === "bookings") return (a.bookingsCount - b.bookingsCount) * order;
    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order;
  });

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

export async function getListingById(id: string): Promise<Listing | null> {
  await delay(150);
  const listing = store.listings.find((l) => l.id === id);
  return listing ? { ...listing } : null;
}

export async function approveListing(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<Listing> {
  assertCan(actor.role, "listings.approve");
  await delay(200);

  const idx = store.listings.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error("Listing not found");

  const prev = { ...store.listings[idx] };
  store.listings[idx] = {
    ...store.listings[idx],
    status: "approved",
  };

  await logAudit(
    actor,
    "LISTING_APPROVE",
    "listing",
    id,
    `Approved listing: ${prev.title}`,
    prev,
    store.listings[idx]
  );

  return store.listings[idx];
}

export async function rejectListing(
  id: string,
  reason: string,
  actor: { id: string; name: string; role: any }
): Promise<Listing> {
  assertCan(actor.role, "listings.reject");
  await delay(200);

  const idx = store.listings.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error("Listing not found");

  const prev = { ...store.listings[idx] };
  store.listings[idx] = {
    ...store.listings[idx],
    status: "rejected",
    adminNotes: [...store.listings[idx].adminNotes, `Rejected: ${reason}`],
  };

  await logAudit(
    actor,
    "LISTING_REJECT",
    "listing",
    id,
    `Rejected listing ${prev.title}: ${reason}`,
    prev,
    store.listings[idx]
  );

  return store.listings[idx];
}

export async function requestChangesListing(
  id: string,
  notes: string,
  actor: { id: string; name: string; role: any }
): Promise<Listing> {
  assertCan(actor.role, "listings.approve");
  await delay(200);

  const idx = store.listings.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error("Listing not found");

  const prev = { ...store.listings[idx] };
  store.listings[idx] = {
    ...store.listings[idx],
    status: "changes_requested",
    adminNotes: [...store.listings[idx].adminNotes, `Changes requested: ${notes}`],
  };

  await logAudit(
    actor,
    "LISTING_REQUEST_CHANGES",
    "listing",
    id,
    `Requested changes on listing ${prev.title}: ${notes}`,
    prev,
    store.listings[idx]
  );

  return store.listings[idx];
}

export async function suspendListing(
  id: string,
  reason: string,
  actor: { id: string; name: string; role: any }
): Promise<Listing> {
  assertCan(actor.role, "listings.suspend");
  await delay(200);

  const idx = store.listings.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error("Listing not found");

  const prev = { ...store.listings[idx] };
  store.listings[idx] = {
    ...store.listings[idx],
    status: "suspended",
    adminNotes: [...store.listings[idx].adminNotes, `Suspended: ${reason}`],
  };

  await logAudit(
    actor,
    "LISTING_SUSPEND",
    "listing",
    id,
    `Suspended listing ${prev.title}: ${reason}`,
    prev,
    store.listings[idx]
  );

  return store.listings[idx];
}

export async function featureListing(
  id: string,
  isFeatured: boolean,
  actor: { id: string; name: string; role: any }
): Promise<Listing> {
  assertCan(actor.role, "listings.feature");
  await delay(200);

  const idx = store.listings.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error("Listing not found");

  const prev = { ...store.listings[idx] };
  store.listings[idx] = {
    ...store.listings[idx],
    isFeatured,
  };

  await logAudit(
    actor,
    isFeatured ? "LISTING_FEATURE" : "LISTING_UNFEATURE",
    "listing",
    id,
    `${isFeatured ? "Featured" : "Unfeatured"} listing: ${prev.title}`,
    prev,
    store.listings[idx]
  );

  return store.listings[idx];
}

export async function deleteListing(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<Listing> {
  assertCan(actor.role, "listings.delete");
  await delay(200);

  const idx = store.listings.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error("Listing not found");

  const prev = { ...store.listings[idx] };
  store.listings[idx] = {
    ...store.listings[idx],
    status: "deleted",
  };

  await logAudit(
    actor,
    "LISTING_DELETE",
    "listing",
    id,
    `Soft-deleted listing: ${prev.title}`,
    prev,
    store.listings[idx]
  );

  return store.listings[idx];
}

export async function restoreListing(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<Listing> {
  assertCan(actor.role, "listings.delete");
  await delay(200);

  const idx = store.listings.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error("Listing not found");

  const prev = { ...store.listings[idx] };
  store.listings[idx] = {
    ...store.listings[idx],
    status: "approved",
  };

  await logAudit(
    actor,
    "LISTING_RESTORE",
    "listing",
    id,
    `Restored listing: ${prev.title}`,
    prev,
    store.listings[idx]
  );

  return store.listings[idx];
}
