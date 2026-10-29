import "server-only";
// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { Booking, PaginatedResult, AdminActor, DisputeOutcome } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { canCancelBooking, canTransitionBooking, refundableAmount, isValidReason } from "@/lib/domain/transitions";
import { toCsv, type CsvExport } from "@/lib/utils/csv";
import { logAudit, logExport } from "./audit";
import { appendLedgerEntry } from "./ledger";
import { DomainError, ValidationError } from "./errors";

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

function filterBookings(params: BookingFilterParams): Booking[] {
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

  // Sorting
  const sortBy = params.sortBy || "created";
  const order = params.sortOrder === "asc" ? 1 : -1;

  filtered.sort((a, b) => {
    if (sortBy === "amount") return (a.totalAmountDzd - b.totalAmountDzd) * order;
    if (sortBy === "checkIn") return (new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime()) * order;
    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order;
  });

  return filtered;
}

export async function listBookings(
  params: BookingFilterParams = {}
): Promise<PaginatedResult<Booking>> {
  await delay(190);

  const page = params.page || 1;
  const pageSize = params.pageSize || 12;

  const filtered = filterBookings(params);

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

export async function exportBookings(params: BookingFilterParams, actor: AdminActor): Promise<CsvExport> {
  const rows = filterBookings(params);
  const csv = toCsv(
    ["Reference", "Status", "Payment Status", "Vertical", "Listing", "Host", "Guest", "Guest Email", "Wilaya", "Check-in", "Check-out", "Nights", "Base (DZD)", "Service Fee (DZD)", "Total (DZD)", "Commission (DZD)", "Host Payout (DZD)", "Refunded (DZD)", "Created"],
    rows.map((b) => [
      b.reference, b.status, b.paymentStatus, b.vertical, b.listingTitle, b.hostName, b.guestName, b.guestEmail,
      b.wilayaCode, b.checkInDate, b.checkOutDate, b.nightsCount, b.basePriceDzd, b.serviceFeeDzd, b.totalAmountDzd,
      b.commissionAmountDzd, b.hostPayoutDzd, b.refundedAmountDzd ?? 0, b.createdAt,
    ])
  );
  await logExport(actor, "bookings", rows.length, { ...params });
  return { filename: `darna_bookings_${new Date().toISOString().slice(0, 10)}.csv`, csv, rowCount: rows.length };
}

function findBooking(id: string): number {
  const idx = store.bookings.findIndex((b) => b.id === id);
  if (idx === -1) throw new DomainError("Booking not found");
  return idx;
}

/** pending | confirmed → cancelled. Completed / cancelled / refunded bookings can't be cancelled. */
export async function cancelBooking(
  id: string,
  reason: string,
  actor: AdminActor
): Promise<Booking> {
  assertCan(actor.role, "bookings.cancel");
  if (!isValidReason(reason)) throw new ValidationError("A cancellation reason is required");
  await delay(200);

  const idx = findBooking(id);
  const prev = { ...store.bookings[idx] };
  if (!canCancelBooking(prev)) {
    throw new DomainError(`A ${prev.status} booking cannot be cancelled`);
  }
  store.bookings[idx] = {
    ...prev,
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
    adminNotes: [...prev.adminNotes, `Admin cancelled: ${reason}`],
  };

  await logAudit(
    actor,
    "BOOKING_CANCEL",
    "booking",
    id,
    `Admin cancelled booking ${prev.reference}: ${reason}`,
    { status: prev.status },
    { status: "cancelled" }
  );

  return { ...store.bookings[idx] };
}

/**
 * Applies a refund to booking `idx` (no await inside, so it is atomic in the
 * single-threaded mock): validates 0 < amount <= total - refundedSoFar
 * (integer DZD), updates refundedAmountDzd / paymentStatus / status, and
 * writes a `booking_refund` ledger entry clawing back the host share.
 */
function applyRefund(idx: number, amount: number, note: string, actor: AdminActor): { prev: Booking; next: Booking } {
  const prev = { ...store.bookings[idx] };
  const remaining = refundableAmount(prev);
  if (remaining <= 0) {
    throw new DomainError(`Booking ${prev.reference} is not refundable (status ${prev.status}, payment ${prev.paymentStatus})`);
  }
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    throw new ValidationError("Refund amount must be a positive whole number of DZD");
  }
  if (amount > remaining) {
    throw new DomainError(`Refund of ${amount} DZD exceeds the refundable balance of ${remaining} DZD`);
  }

  const refundedAmountDzd = (prev.refundedAmountDzd ?? 0) + amount;
  const full = refundedAmountDzd >= prev.totalAmountDzd;
  if (full && !canTransitionBooking(prev.status, "refunded")) {
    throw new DomainError(`A ${prev.status} booking cannot move to refunded`);
  }
  const now = new Date().toISOString();

  // Host share of the refunded amount (the host payout is a share of the total paid).
  const hostShare = prev.totalAmountDzd > 0 ? Math.round((amount * prev.hostPayoutDzd) / prev.totalAmountDzd) : 0;
  const host = store.hosts.find((h) => h.id === prev.hostId);
  if (host && hostShare > 0) {
    appendLedgerEntry({
      host,
      type: "booking_refund",
      amount: -hostShare,
      description: `Refund ${amount} DZD to guest on ${prev.reference} (host share): ${note}`,
      bookingRef: prev.reference,
      adminActor: actor.name,
    });
  }

  const next: Booking = {
    ...prev,
    status: full ? "refunded" : prev.status,
    paymentStatus: full ? "refunded" : "partially_refunded",
    refundedAmountDzd,
    refundedAt: now,
    adminNotes: [...prev.adminNotes, `Refund of ${amount} DZD issued: ${note}`],
  };
  store.bookings[idx] = next;
  return { prev, next };
}

export async function refundBooking(
  id: string,
  amount: number,
  reason: string,
  actor: AdminActor
): Promise<Booking> {
  assertCan(actor.role, "bookings.refund");
  if (!isValidReason(reason)) throw new ValidationError("A refund reason is required");
  await delay(200);

  const idx = findBooking(id);
  const { prev, next } = applyRefund(idx, amount, reason, actor);

  await logAudit(
    actor,
    next.status === "refunded" ? "BOOKING_REFUND" : "BOOKING_PARTIAL_REFUND",
    "booking",
    id,
    `Issued refund of ${amount} DZD for booking ${prev.reference}: ${reason}`,
    { status: prev.status, paymentStatus: prev.paymentStatus, refundedAmountDzd: prev.refundedAmountDzd ?? 0 },
    { status: next.status, paymentStatus: next.paymentStatus, refundedAmountDzd: next.refundedAmountDzd }
  );

  return { ...next };
}

/**
 * disputed -> resolution:
 *  - refund_full:    refund the whole remaining amount -> refunded
 *  - refund_partial: refund `amount` (0 < amount < remaining) -> back to its
 *                    lifecycle status (completed if check-out passed, else confirmed)
 *  - declined:       no refund -> back to its lifecycle status
 */
export async function resolveDispute(
  id: string,
  outcome: DisputeOutcome,
  note: string,
  actor: AdminActor,
  amount?: number
): Promise<Booking> {
  assertCan(actor.role, "bookings.dispute");
  if (outcome !== "declined") assertCan(actor.role, "bookings.refund");
  if (!isValidReason(note)) throw new ValidationError("A resolution note is required");
  await delay(200);

  const idx = findBooking(id);
  const before = { ...store.bookings[idx] };
  if (before.status !== "disputed") {
    throw new DomainError(`Booking ${before.reference} is not under dispute (status ${before.status})`);
  }

  const lifecycleStatus: Booking["status"] =
    new Date(before.checkOutDate).getTime() < Date.now() ? "completed" : "confirmed";

  let refundAmountDzd = 0;
  if (outcome === "refund_full") {
    refundAmountDzd = refundableAmount(before);
    if (refundAmountDzd <= 0) throw new DomainError("Nothing left to refund on this booking");
    applyRefund(idx, refundAmountDzd, `Dispute resolved (full refund): ${note}`, actor);
  } else if (outcome === "refund_partial") {
    const remaining = refundableAmount(before);
    if (amount === undefined) throw new ValidationError("A partial refund amount is required");
    if (amount >= remaining) {
      throw new DomainError(`A partial refund must be lower than the refundable balance of ${remaining} DZD; use a full refund instead`);
    }
    refundAmountDzd = amount;
    applyRefund(idx, amount, `Dispute resolved (partial refund): ${note}`, actor);
  }

  const current = store.bookings[idx];
  const finalStatus: Booking["status"] = outcome === "refund_full" ? "refunded" : lifecycleStatus;
  store.bookings[idx] = {
    ...current,
    status: finalStatus,
    disputeResolution: {
      outcome,
      refundAmountDzd,
      note,
      resolvedAt: new Date().toISOString(),
      resolvedBy: actor.name,
    },
    adminNotes: [...current.adminNotes, `Dispute ${outcome === "declined" ? "declined" : "resolved"}: ${note}`],
  };

  await logAudit(
    actor,
    outcome === "declined" ? "BOOKING_DISPUTE_DECLINED" : "BOOKING_DISPUTE_RESOLVED",
    "booking",
    id,
    `Dispute on ${before.reference} -> ${outcome}${refundAmountDzd ? ` (${refundAmountDzd} DZD refunded)` : ""}: ${note}`,
    { status: before.status, refundedAmountDzd: before.refundedAmountDzd ?? 0 },
    { status: finalStatus, outcome, refundedAmountDzd: store.bookings[idx].refundedAmountDzd ?? 0 }
  );

  return { ...store.bookings[idx] };
}
