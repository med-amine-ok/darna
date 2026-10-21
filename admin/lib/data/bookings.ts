// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { Booking, BookingStatus, PaginatedResult } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { logAudit } from "./audit";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface BookingFilterParams {
  status?: string; // "all" | BookingStatus
  vertical?: string;
  hostType?: string;
  wilayaCode?: string;
  paymentStatus?: string;
  approvalMode?: string;
  search?: string;
  pendingOver24h?: boolean;
  sortBy?: "created" | "checkIn" | "amount";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listBookings(
  params: BookingFilterParams = {}
): Promise<PaginatedResult<Booking>> {
  await delay(190);

  const page = params.page || 1;
  const pageSize = params.pageSize || 12;

  let filtered = [...store.bookings];

  // 1. Status Filter
  if (params.status && params.status !== "all") {
    filtered = filtered.filter((b) => b.status === params.status);
  }

  // 2. Vertical
  if (params.vertical && params.vertical !== "all") {
    filtered = filtered.filter((b) => b.vertical === params.vertical);
  }

  // 3. Host Type
  if (params.hostType && params.hostType !== "all") {
    filtered = filtered.filter((b) => b.hostType === params.hostType);
  }

  // 4. Wilaya
  if (params.wilayaCode && params.wilayaCode !== "all") {
    filtered = filtered.filter((b) => b.wilayaCode === params.wilayaCode);
  }

  // 5. Payment Status & Approval Mode
  if (params.paymentStatus && params.paymentStatus !== "all") {
    filtered = filtered.filter((b) => b.paymentStatus === params.paymentStatus);
  }
  if (params.approvalMode && params.approvalMode !== "all") {
    filtered = filtered.filter((b) => b.approvalMode === params.approvalMode);
  }

  // 6. Search
  if (params.search?.trim()) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter((b) => {
      const matchRef = b.reference.toLowerCase().includes(q);
      const matchGuest = b.guestName.toLowerCase().includes(q);
      const matchHost = b.hostName.toLowerCase().includes(q);
      const matchListing = b.listingTitle.toLowerCase().includes(q);
      return matchRef || matchGuest || matchHost || matchListing;
    });
  }

  // 7. Saved view: Pending Host Approval > 24h
  if (params.pendingOver24h) {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    filtered = filtered.filter(
      (b) => b.status === "pending" && new Date(b.createdAt).getTime() < oneDayAgo
    );
  }

  // Facets
  const facets: Record<string, Record<string, number>> = {
    status: {
      all: store.bookings.length,
      confirmed: store.bookings.filter((b) => b.status === "confirmed").length,
      completed: store.bookings.filter((b) => b.status === "completed").length,
      pending: store.bookings.filter((b) => b.status === "pending").length,
      cancelled: store.bookings.filter((b) => b.status === "cancelled").length,
      disputed: store.bookings.filter((b) => b.status === "disputed").length,
      refunded: store.bookings.filter((b) => b.status === "refunded").length,
    },
    vertical: {
      all: store.bookings.length,
      home: store.bookings.filter((b) => b.vertical === "home").length,
      hotel: store.bookings.filter((b) => b.vertical === "hotel").length,
      experience: store.bookings.filter((b) => b.vertical === "experience").length,
      vehicle: store.bookings.filter((b) => b.vertical === "vehicle").length,
      trip: store.bookings.filter((b) => b.vertical === "trip").length,
    },
  };

  // Sorting
  const sortBy = params.sortBy || "created";
  const order = params.sortOrder === "asc" ? 1 : -1;

  filtered.sort((a, b) => {
    if (sortBy === "amount") return (a.totalAmountDzd - b.totalAmountDzd) * order;
    if (sortBy === "checkIn") return (new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime()) * order;
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

export async function getBookingById(id: string): Promise<Booking | null> {
  await delay(150);
  const booking = store.bookings.find((b) => b.id === id);
  return booking ? { ...booking } : null;
}

export async function cancelBooking(
  id: string,
  reason: string,
  actor: { id: string; name: string; role: any }
): Promise<Booking> {
  assertCan(actor.role, "bookings.cancel");
  await delay(200);

  const idx = store.bookings.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error("Booking not found");

  const prev = { ...store.bookings[idx] };
  store.bookings[idx] = {
    ...store.bookings[idx],
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
    adminNotes: [...store.bookings[idx].adminNotes, `Admin cancelled: ${reason}`],
  };

  await logAudit(
    actor,
    "BOOKING_CANCEL",
    "booking",
    id,
    `Admin cancelled booking ${prev.reference}: ${reason}`,
    prev,
    store.bookings[idx]
  );

  return store.bookings[idx];
}

export async function refundBooking(
  id: string,
  amount: number,
  reason: string,
  actor: { id: string; name: string; role: any }
): Promise<Booking> {
  assertCan(actor.role, "bookings.refund");
  await delay(200);

  const idx = store.bookings.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error("Booking not found");

  const prev = { ...store.bookings[idx] };
  store.bookings[idx] = {
    ...store.bookings[idx],
    status: "refunded",
    paymentStatus: "refunded",
    adminNotes: [...store.bookings[idx].adminNotes, `Refund of ${amount} DZD issued: ${reason}`],
  };

  await logAudit(
    actor,
    "BOOKING_REFUND",
    "booking",
    id,
    `Issued refund of ${amount} DZD for booking ${prev.reference}: ${reason}`,
    prev,
    store.bookings[idx]
  );

  return store.bookings[idx];
}

export async function resolveDispute(
  id: string,
  resolution: string,
  actor: { id: string; name: string; role: any }
): Promise<Booking> {
  assertCan(actor.role, "bookings.dispute");
  await delay(200);

  const idx = store.bookings.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error("Booking not found");

  const prev = { ...store.bookings[idx] };
  store.bookings[idx] = {
    ...store.bookings[idx],
    status: "completed",
    adminNotes: [...store.bookings[idx].adminNotes, `Dispute resolved: ${resolution}`],
  };

  await logAudit(
    actor,
    "BOOKING_DISPUTE_RESOLVED",
    "booking",
    id,
    `Resolved dispute for booking ${prev.reference}: ${resolution}`,
    prev,
    store.bookings[idx]
  );

  return store.bookings[idx];
}
