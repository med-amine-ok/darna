import "server-only";

import { api, apiAll, apiOrNull, newIdempotencyKey, totalOf } from "@/lib/api/client";
import { filterValue, logReadError, moneyInput, write } from "@/lib/api/mapping";
import { hasOpenDispute, matchesVertical, toBooking, type ApiAdminBooking } from "@/lib/api/bookings";
import type { Booking, PaginatedResult, AdminActor, DisputeOutcome } from "@/lib/types";
import { toCsv, type CsvExport } from "@/lib/utils/csv";
import { logExport } from "./audit";

/**
 * Admin bookings, read from and written to the Django API
 * (/admin/bookings, /admin/bookings/{id}, cancel, refunds, dispute/resolve).
 * Permissions are checked by lib/actions (runAction) and again by the backend.
 */

export interface BookingFilterParams {
  /** Only bookings of this listing (sent to the API as ?listing=). */
  listingId?: string;
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

/** Most rows read when a filter the API does not offer must be applied here. */
const LOCAL_SCAN_PAGES = 20; // 20 x 50 = 1,000 bookings

/** Backend statuses behind one admin status (declined and expired show as cancelled). */
function apiStatusFilter(status: string | undefined): string | undefined {
  switch (status) {
    case "pending":
    case "confirmed":
    case "completed":
      return status;
    case "cancelled":
      return "cancelled,declined,expired";
    default:
      return undefined;
  }
}

const REFERENCE_RE = /^[A-Z]{2,5}-[0-9A-Z-]{4,}$/i;

/** True when the filters can be answered by one page of the API. */
function serverSide(params: BookingFilterParams): boolean {
  const status = filterValue(params.status);
  const search = params.search?.trim();
  return (
    !filterValue(params.vertical) &&
    !filterValue(params.hostType) &&
    !filterValue(params.wilayaCode) &&
    !filterValue(params.paymentStatus) &&
    !filterValue(params.approvalMode) &&
    !params.pendingOver24h &&
    status !== "disputed" &&
    status !== "refunded" &&
    (!search || REFERENCE_RE.test(search)) &&
    (params.sortBy ?? "created") === "created" &&
    params.sortOrder !== "asc"
  );
}

function baseQuery(params: BookingFilterParams) {
  const search = params.search?.trim();
  return {
    status: apiStatusFilter(filterValue(params.status)),
    reference: search && REFERENCE_RE.test(search) ? search : undefined,
    listing: params.listingId || undefined,
  };
}

function applyLocalFilters(rows: ApiAdminBooking[], params: BookingFilterParams): Booking[] {
  const status = filterValue(params.status);
  const vertical = filterValue(params.vertical);
  const hostType = filterValue(params.hostType);
  const paymentStatus = filterValue(params.paymentStatus);
  const approvalMode = filterValue(params.approvalMode);
  const q = params.search?.trim().toLowerCase();
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

  let out = rows
    .filter((raw) => !vertical || matchesVertical(raw, vertical))
    .filter((raw) => status !== "disputed" || hasOpenDispute(raw))
    .map(toBooking);
  if (status) out = out.filter((b) => b.status === status);
  if (hostType) out = out.filter((b) => b.hostType === hostType);
  if (paymentStatus) out = out.filter((b) => b.paymentStatus === paymentStatus);
  if (approvalMode) out = out.filter((b) => b.approvalMode === approvalMode);
  // The API has no wilaya on bookings: a wilaya filter can only match nothing.
  if (filterValue(params.wilayaCode)) out = out.filter((b) => b.wilayaCode === params.wilayaCode);
  if (q) {
    out = out.filter(
      (b) =>
        b.reference.toLowerCase().includes(q) ||
        b.guestName.toLowerCase().includes(q) ||
        b.hostName.toLowerCase().includes(q) ||
        b.listingTitle.toLowerCase().includes(q)
    );
  }
  if (params.pendingOver24h) {
    out = out.filter((b) => b.status === "pending" && Date.parse(b.createdAt) < dayAgo);
  }

  const sortBy = params.sortBy || "created";
  const order = params.sortOrder === "asc" ? 1 : -1;
  out.sort((a, b) => {
    if (sortBy === "amount") return (a.totalAmountDzd - b.totalAmountDzd) * order;
    if (sortBy === "checkIn") return (Date.parse(a.checkInDate) - Date.parse(b.checkInDate)) * order;
    return (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * order;
  });
  return out;
}

/** Every booking matching the filters (up to LOCAL_SCAN_PAGES pages of the API). */
async function scanBookings(params: BookingFilterParams): Promise<Booking[]> {
  const raw = await apiAll<ApiAdminBooking>("/admin/bookings", { query: baseQuery(params) }, LOCAL_SCAN_PAGES);
  return applyLocalFilters(raw, params);
}

/** Status counts for the tabs: one tiny request per backend status. */
async function statusFacets(): Promise<Record<string, number>> {
  const count = async (status?: string) =>
    totalOf(await api<unknown>("/admin/bookings", { query: { status, page_size: 1 } }));
  const [all, pending, confirmed, completed, cancelled] = await Promise.all([
    count(),
    count("pending"),
    count("confirmed"),
    count("completed"),
    count("cancelled,declined,expired"),
  ]);
  return { all, pending, confirmed, completed, cancelled };
}

export async function listBookings(params: BookingFilterParams = {}): Promise<PaginatedResult<Booking>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 12));
  try {
    const facetsPromise = statusFacets().catch((error) => {
      logReadError("bookings facets", error);
      return {} as Record<string, number>;
    });

    let result: PaginatedResult<Booking>;
    if (serverSide(params)) {
      const answer = await api<{ count: number; results: ApiAdminBooking[] }>("/admin/bookings", {
        query: { ...baseQuery(params), page, page_size: pageSize },
      });
      const total = totalOf(answer);
      result = {
        rows: (answer?.results ?? []).map(toBooking),
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    } else {
      const all = await scanBookings(params);
      result = {
        rows: all.slice((page - 1) * pageSize, page * pageSize),
        total: all.length,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(all.length / pageSize)),
      };
    }
    const status = await facetsPromise;
    return { ...result, facets: { status } };
  } catch (error) {
    logReadError("listBookings", error);
    throw error; // the screen shows its error toast and empty table
  }
}

export async function getBookingById(id: string): Promise<Booking | null> {
  try {
    const raw = await apiOrNull<ApiAdminBooking>(`/admin/bookings/${encodeURIComponent(id)}`);
    return raw ? toBooking(raw) : null;
  } catch (error) {
    logReadError("getBookingById", error);
    return null;
  }
}

export async function exportBookings(params: BookingFilterParams, actor: AdminActor): Promise<CsvExport> {
  const rows = await write(() => scanBookings(params));
  const csv = toCsv(
    ["Reference", "Status", "Backend Status", "Vertical", "Listing", "Host", "Guest", "Check-in", "Check-out", "Nights", "Subtotal (DZD)", "Fees (DZD)", "Total (DZD)", "Commission (DZD)", "Host Share (DZD)", "Refund Owed (DZD)", "Created"],
    rows.map((b) => [
      b.reference, b.status, b.apiStatus, b.vertical, b.listingTitle, b.hostName, b.guestName,
      b.checkInDate, b.checkOutDate, b.nightsCount, b.basePriceDzd, b.serviceFeeDzd, b.totalAmountDzd,
      b.commissionAmountDzd, b.hostPayoutDzd, b.refundedAmountDzd ?? 0, b.createdAt,
    ])
  );
  await logExport(actor, "bookings", rows.length, { ...params });
  return { filename: `darna_bookings_${new Date().toISOString().slice(0, 10)}.csv`, csv, rowCount: rows.length };
}

const bookingPath = (id: string) => `/admin/bookings/${encodeURIComponent(id)}`;

/** pending | confirmed -> cancelled. A confirmed booking gets its whole total owed back by default. */
export async function cancelBooking(id: string, reason: string, _actor: AdminActor): Promise<Booking> {
  const raw = await write(() =>
    api<ApiAdminBooking>(`${bookingPath(id)}/cancel`, {
      method: "POST",
      body: { reason },
      idempotencyKey: newIdempotencyKey(),
    })
  );
  return toBooking(raw);
}

/** Full or partial refund owed by the host (BR-CAN-04). Amount in DZD, sent as centimes. */
export async function refundBooking(id: string, amount: number, reason: string, _actor: AdminActor): Promise<Booking> {
  const raw = await write(() =>
    api<ApiAdminBooking>(`${bookingPath(id)}/refunds`, {
      method: "POST",
      body: { amount: moneyInput(amount), reason },
      idempotencyKey: newIdempotencyKey(),
    })
  );
  return toBooking(raw);
}

/** Closes the open dispute of a booking (BR-CAN-05). */
export async function resolveDispute(
  id: string,
  outcome: DisputeOutcome,
  note: string,
  _actor: AdminActor,
  amount?: number
): Promise<Booking> {
  const raw = await write(() =>
    api<ApiAdminBooking>(`${bookingPath(id)}/dispute/resolve`, {
      method: "POST",
      body: {
        outcome,
        note,
        refund_amount: outcome === "refund_partial" && amount ? moneyInput(amount) : null,
      },
      idempotencyKey: newIdempotencyKey(),
    })
  );
  return toBooking(raw);
}

