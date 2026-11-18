import "server-only";

import type { Booking, BookingStatus, DisputeOutcome, HostType, ListingVertical } from "@/lib/types";
import { dzd, type ApiMoney } from "./mapping";

/** Booking as GET /admin/bookings and /admin/bookings/{id} send it (AdminBookingSerializer). */
export interface ApiAdminBooking {
  id: string;
  reference: string;
  status: "pending" | "confirmed" | "declined" | "expired" | "cancelled" | "completed";
  payment_status: string;
  inventory_kind?: string;
  vertical: string | null;
  listing_id: string | null;
  trip_id: string | null;
  title: string;
  check_in: string;
  check_out: string;
  check_in_at?: string;
  check_out_at?: string;
  guests: number;
  units?: number;
  approval_mode_applied: string;
  subtotal: ApiMoney;
  discount: ApiMoney;
  cleaning_fee: ApiMoney;
  taxes: ApiMoney;
  total: ApiMoney;
  refund_due: ApiMoney;
  created_at: string;
  confirmed_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancelled_by_role?: string | null;
  cancel_reason?: string | null;
  decline_reason?: string | null;
  host_account_id: string;
  guest: { id: string; display_name: string } | null;
  guest_phone_e164: string | null;
  commission_rate_bp: number | null;
  commission: ApiMoney;
  host?: { host_account_id: string; host_type: string; display_name: string } | null;
  listing_snapshot?: Record<string, unknown> | null;
  events?: Array<{
    from_status: string | null;
    to_status: string;
    actor_role: string;
    actor: { display_name: string } | null;
    note: string;
    created_at: string;
  }>;
  dispute?: {
    id: string;
    reason_code: string | null;
    guest_statement: string | null;
    host_statement: string | null;
    outcome: DisputeOutcome | null;
    refund: ApiMoney | null;
    resolution_note: string | null;
    resolved_at: string | null;
    created_at: string;
  } | null;
}

const HOST_TYPES: readonly HostType[] = ["individual", "agency", "hotel", "hostel"];

export function toVertical(value: string | null | undefined): ListingVertical {
  switch (value) {
    case "hotel":
    case "hostel":
      return "hotel";
    case "experience":
      return "experience";
    case "vehicle":
      return "vehicle";
    case "trip":
      return "trip";
    default:
      return "home";
  }
}

/** Admin verticals that the backend snapshot values map to (for local filtering). */
export function matchesVertical(raw: ApiAdminBooking, vertical: string): boolean {
  return toVertical(raw.vertical) === vertical;
}

export function hasOpenDispute(raw: ApiAdminBooking): boolean {
  return Boolean(raw.dispute && !raw.dispute.outcome);
}

/**
 * The admin screen's status: the backend has no "disputed" or "refunded"
 * booking status. An open dispute shows as disputed; a booking whose whole
 * total is owed back shows as refunded; declined and expired requests show
 * as cancelled (the original value is kept in apiStatus).
 */
export function toBookingStatus(raw: ApiAdminBooking): BookingStatus {
  if (hasOpenDispute(raw)) return "disputed";
  const total = raw.total?.amount_minor ?? 0;
  const refunded = raw.refund_due?.amount_minor ?? 0;
  if (total > 0 && refunded >= total) return "refunded";
  if (raw.status === "declined" || raw.status === "expired") return "cancelled";
  return raw.status;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(checkIn);
  const b = Date.parse(checkOut);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function toBooking(raw: ApiAdminBooking): Booking {
  const total = dzd(raw.total);
  const refunded = dzd(raw.refund_due);
  const commission = dzd(raw.commission);
  const snapshot = (raw.listing_snapshot ?? {}) as Record<string, unknown>;
  const hostType = HOST_TYPES.includes(raw.host?.host_type as HostType)
    ? (raw.host?.host_type as HostType)
    : "individual";

  // DEC-001: the guest pays the host directly; BLADUS never collects. The
  // screen's payment state therefore follows the refunds the host owes.
  const paymentStatus: Booking["paymentStatus"] =
    refunded <= 0 ? "paid" : refunded >= total ? "refunded" : "partially_refunded";

  const notes: string[] = [];
  for (const event of raw.events ?? []) {
    if (event.note) notes.push(`${event.to_status}: ${event.note}`);
  }
  if (raw.cancel_reason) notes.push(raw.cancel_reason);
  if (raw.decline_reason) notes.push(raw.decline_reason);

  const dispute = raw.dispute ?? null;
  const disputeReason = dispute
    ? [dispute.reason_code, dispute.guest_statement, dispute.host_statement].filter(Boolean).join(" | ")
    : undefined;

  return {
    id: raw.id,
    reference: raw.reference,
    listingId: raw.listing_id ?? raw.trip_id ?? "",
    listingTitle: raw.title || String(snapshot.title ?? ""),
    listingImage: "",
    vertical: toVertical(raw.vertical),
    hostId: raw.host_account_id,
    hostName: raw.host?.display_name ?? "",
    hostType,
    guestId: raw.guest?.id ?? "",
    guestName: raw.guest?.display_name ?? "",
    guestEmail: "",
    guestPhone: raw.guest_phone_e164 ?? "",
    wilayaCode: "",
    status: toBookingStatus(raw),
    approvalMode: raw.approval_mode_applied === "request" ? "request" : "instant",
    checkInDate: raw.check_in,
    checkOutDate: raw.check_out,
    nightsCount: nightsBetween(raw.check_in, raw.check_out),
    guestsCount: raw.guests ?? 0,
    basePriceDzd: dzd(raw.subtotal) - dzd(raw.discount),
    serviceFeeDzd: dzd(raw.cleaning_fee) + dzd(raw.taxes),
    totalAmountDzd: total,
    commissionRate: (raw.commission_rate_bp ?? 0) / 100,
    commissionAmountDzd: commission,
    hostPayoutDzd: total - commission,
    paymentStatus,
    refundedAmountDzd: refunded,
    paymentMethod: "cash_on_arrival",
    createdAt: raw.created_at,
    cancelledAt: raw.cancelled_at ?? undefined,
    disputeReason: disputeReason || undefined,
    disputeResolution:
      dispute && dispute.outcome
        ? {
            outcome: dispute.outcome,
            refundAmountDzd: dzd(dispute.refund),
            note: dispute.resolution_note ?? "",
            resolvedAt: dispute.resolved_at ?? "",
            resolvedBy: "",
          }
        : undefined,
    adminNotes: notes,
    apiStatus: raw.status,
    commune: typeof snapshot.commune === "string" ? snapshot.commune : undefined,
  };
}
