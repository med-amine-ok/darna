import "server-only";
import type { CancellationPolicy, Listing, Reservation, ReservationStatus, Trip, User } from "@/types";
import { actionFail, type ActionErrorCode, type ActionResult } from "@/lib/action-result";
import type { PricingModel, ServerQuote } from "@/lib/booking/pricing";
import { ApiError } from "./client";
import { actionCodeFor } from "./errors";

/**
 * Bookings, quotes, cancellation previews and refunds of the Django API
 * (backend apps/bookings and apps/pricing) mapped onto the frontend types.
 * Money comes as integer centimes (`amount_minor`); the frontend types use
 * whole dinars, so every amount goes through `dzd()`.
 */

export interface ApiMoney {
  amount_minor: number;
  currency: string;
}

/** Centimes -> dinars (the frontend types hold DZD). */
export function dzd(money: ApiMoney | null | undefined): number {
  return money ? Math.round(money.amount_minor) / 100 : 0;
}

/** Dinars -> centimes, for amounts sent back to the API. */
export function toMinor(amountDzd: number): number {
  return Math.round(amountDzd * 100);
}

export interface ApiCancellationWindow {
  min_days_before: number;
  refund_bp: number;
}

/** Fields shared by the guest and host shapes of a booking (BookingBaseSerializer). */
export interface ApiBookingBase {
  id: string;
  reference: string;
  status: ReservationStatus | "disputed";
  payment_status: string;
  inventory_kind: "single" | "room_pool" | "slot" | "departure";
  vertical: string | null;
  listing_id: string | null;
  trip_id: string | null;
  room_type_id: string | null;
  experience_slot_id: string | null;
  trip_departure_id: string | null;
  title: string;
  check_in: string;
  check_out: string;
  check_in_at: string;
  check_out_at: string;
  guests: number;
  units: number;
  approval_mode_applied: "instant" | "request";
  request_expires_at: string | null;
  price_lines: unknown[];
  subtotal: ApiMoney;
  discount: ApiMoney;
  cleaning_fee: ApiMoney;
  taxes: ApiMoney;
  total: ApiMoney;
  refund_due: ApiMoney;
  cancellation_policy: { code: string | null; version: number | null; windows: ApiCancellationWindow[] };
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by_role: "guest" | "host" | "admin" | "system" | "" | null;
  cancel_reason: string;
  decline_reason: string;
  stay_confirmed_at: string | null;
  stay_confirmed_via: string | null;
  review_eligible: boolean;
}

/** GET /me/bookings[/{id}] (GuestBookingSerializer). */
export interface ApiGuestBooking extends ApiBookingBase {
  host: { id: string; display_name: string };
  address_line: string | null;
  location_exact: { latitude: number; longitude: number } | null;
  host_phone_e164: string | null;
  can_cancel: boolean;
  check_in_code: string | null;
}

/** GET /host/bookings[/{id}] (HostBookingSerializer). */
export interface ApiHostBooking extends ApiBookingBase {
  host_account_id: string;
  guest: { id: string; display_name: string };
  guest_phone_e164: string | null;
  commission_rate_bp: number;
  commission: ApiMoney;
  allowed_actions: string[];
}

export type ApiBooking = ApiGuestBooking | ApiHostBooking;

const POLICIES: CancellationPolicy[] = ["flexible", "moderate", "strict"];

function policyOf(code: string | null | undefined): CancellationPolicy | undefined {
  return POLICIES.includes(code as CancellationPolicy) ? (code as CancellationPolicy) : undefined;
}

function isHostBooking(b: ApiBooking): b is ApiHostBooking {
  return "guest" in b;
}

/** The guest of a host-side booking as a User (name, and phone once confirmed; never an email). */
function guestUser(b: ApiHostBooking): User {
  return {
    id: b.guest.id,
    name: b.guest.display_name,
    email: "",
    image: null,
    role: "guest",
    createdAt: "",
    favoriteIds: [],
    phone: b.guest_phone_e164 ?? undefined,
  };
}

export interface BookingJoin {
  /** Signed-in guest id, for guest-side bookings (the API does not repeat it). */
  guestId?: string;
  listing?: Listing | null;
  trip?: Trip | null;
}

/** Map one API booking onto the Reservation type. */
export function toReservation(b: ApiBooking, join: BookingJoin = {}): Reservation {
  const status: ReservationStatus = b.status === "disputed" ? "completed" : b.status;
  const cancelledBy =
    b.cancelled_by_role === "guest" || b.cancelled_by_role === "host"
      ? b.cancelled_by_role
      : b.cancelled_by_role
        ? "system"
        : undefined;
  const base: Reservation = {
    id: b.id,
    reference: b.reference,
    title: b.title,
    vertical: b.vertical ?? undefined,
    userId: isHostBooking(b) ? b.guest.id : join.guestId ?? "",
    listingId: b.listing_id ?? b.trip_id ?? "",
    tripId: b.trip_id ?? undefined,
    startDate: b.check_in,
    endDate: b.check_out,
    checkInAt: b.check_in_at,
    checkOutAt: b.check_out_at,
    totalPrice: dzd(b.total),
    subtotal: dzd(b.subtotal),
    discount: dzd(b.discount),
    cleaningFee: dzd(b.cleaning_fee),
    serviceFee: 0,
    taxes: dzd(b.taxes),
    guestsCount: b.guests,
    unitCount: b.inventory_kind === "room_pool" ? b.units : undefined,
    status,
    // DEC-001: the guest pays the host directly, BLADUS collects nothing.
    paymentStatus: undefined,
    createdAt: b.created_at,
    cancellationPolicy: policyOf(b.cancellation_policy?.code),
    refundAmount: status === "cancelled" && b.refund_due ? dzd(b.refund_due) : undefined,
    cancelledAt: b.cancelled_at ?? undefined,
    cancelledBy,
    cancelReason: b.cancel_reason || undefined,
    approvalMode: b.approval_mode_applied,
    expiresAt: b.request_expires_at ?? undefined,
    declineReason: b.decline_reason || undefined,
    respondedAt: b.confirmed_at ?? undefined,
    selectedRoomTypeId: b.room_type_id ?? undefined,
    stayConfirmedAt: b.stay_confirmed_at,
    listing: join.listing ?? undefined,
    trip: join.trip ?? undefined,
  };
  if (isHostBooking(b)) {
    return {
      ...base,
      user: guestUser(b),
      commissionAmount: dzd(b.commission),
      commissionRate: b.commission_rate_bp / 100,
      allowedActions: b.allowed_actions,
    };
  }
  return {
    ...base,
    canCancel: b.can_cancel,
    checkInCode: b.check_in_code,
    hostName: b.host?.display_name,
    hostPhone: b.host_phone_e164,
    addressLine: b.address_line,
  };
}

// ---------------------------------------------------------------------------
// Quotes (POST /quotes)
// ---------------------------------------------------------------------------

export interface ApiQuoteLine {
  kind: "night" | "seat" | "discount" | "cleaning_fee" | string;
  label: string;
  date: string | null;
  quantity: number;
  unit_amount: ApiMoney;
  amount: ApiMoney;
}

export interface ApiQuote {
  id: string;
  expires_at: string;
  listing_id: string | null;
  room_type_id: string | null;
  experience_slot_id: string | null;
  trip_departure_id: string | null;
  inventory_kind: "single" | "room_pool" | "slot" | "departure";
  check_in: string | null;
  check_out: string | null;
  nights: number;
  guests: number;
  units: number | null;
  lines: ApiQuoteLine[];
  subtotal: ApiMoney;
  discount: ApiMoney;
  cleaning_fee: ApiMoney;
  taxes: ApiMoney;
  total: ApiMoney;
  platform_fee: ApiMoney;
  approval_mode: "instant" | "request";
  cancellation_policy: { code: string; version: number | null; label: string; windows: ApiCancellationWindow[] };
}

export type { ServerQuote };

const MODEL_BY_KIND: Record<ApiQuote["inventory_kind"], PricingModel> = {
  single: "per_night",
  room_pool: "per_room_night",
  slot: "per_person",
  departure: "per_traveller",
};

export function toServerQuote(q: ApiQuote, model?: PricingModel): ServerQuote {
  const priced = q.lines.filter((l) => l.kind === "night" || l.kind === "seat");
  const unitPrices = Array.from(new Set(priced.map((l) => l.unit_amount.amount_minor)));
  const nights = q.inventory_kind === "slot" || q.inventory_kind === "departure" ? 1 : Math.max(0, q.nights);
  const quantity =
    q.inventory_kind === "room_pool" ? q.units ?? 1 : q.inventory_kind === "single" ? 1 : q.guests;
  const subtotal = dzd(q.subtotal);
  const unitPrice = priced.length > 0 ? dzd(priced[0].unit_amount) : 0;
  const units = nights * quantity;
  return {
    model: model ?? MODEL_BY_KIND[q.inventory_kind],
    nights,
    quantity,
    unitPrice,
    averageUnitPrice: units > 0 ? Math.round(subtotal / units) : unitPrice,
    hasPriceOverrides: unitPrices.length > 1,
    subtotal,
    cleaningFee: dzd(q.cleaning_fee),
    serviceFeeRate: 0,
    serviceFee: dzd(q.platform_fee),
    taxRate: 0,
    taxes: dzd(q.taxes),
    total: dzd(q.total),
    discount: dzd(q.discount),
    quoteId: q.id,
    expiresAt: q.expires_at,
    approvalMode: q.approval_mode,
    cancellationPolicy: policyOf(q.cancellation_policy?.code),
  };
}

// ---------------------------------------------------------------------------
// Cancellation previews and refunds
// ---------------------------------------------------------------------------

/** GET .../cancellation-preview (CancellationPreviewSerializer). */
export interface ApiCancellationPreview {
  policy_code: string;
  days_before_check_in: number;
  refund_percent_bp: number;
  refund_amount: ApiMoney;
  kept_by_host: ApiMoney;
  commission_returned_to_host: ApiMoney;
  allowed: boolean;
  not_allowed_code: string | null;
}

export interface CancellationPreview {
  policy?: CancellationPolicy;
  daysBeforeCheckIn: number;
  refundPercent: number;
  refundAmount: number;
  keptByHost: number;
  commissionReturned: number;
  allowed: boolean;
  notAllowedCode: ActionErrorCode | null;
}

export function toCancellationPreview(p: ApiCancellationPreview): CancellationPreview {
  return {
    policy: policyOf(p.policy_code),
    daysBeforeCheckIn: p.days_before_check_in,
    refundPercent: p.refund_percent_bp / 100,
    refundAmount: dzd(p.refund_amount),
    keptByHost: dzd(p.kept_by_host),
    commissionReturned: dzd(p.commission_returned_to_host),
    allowed: p.allowed,
    notAllowedCode: p.not_allowed_code ? bookingCodeFor(new ApiError("", 409, p.not_allowed_code)) : null,
  };
}

/** GET /me/refunds, /host/refunds (RefundObligationSerializer). */
export interface ApiRefund {
  id: string;
  booking_id: string;
  booking_reference: string;
  host_account_id: string;
  guest_id: string;
  amount: ApiMoney;
  status: string;
  due_at: string | null;
  is_overdue: boolean;
  declared_at: string | null;
  payment_reference: string;
  settled_at: string | null;
  note: string;
  created_at: string;
}

/** A refund the host owes a guest after a cancellation (review R8). */
export interface RefundObligation {
  id: string;
  bookingId: string;
  bookingReference: string;
  amount: number;
  status: string;
  dueAt: string | null;
  isOverdue: boolean;
  declaredAt: string | null;
  paymentReference: string;
  settledAt: string | null;
  createdAt: string;
}

export function toRefund(r: ApiRefund): RefundObligation {
  return {
    id: r.id,
    bookingId: r.booking_id,
    bookingReference: r.booking_reference,
    amount: dzd(r.amount),
    status: r.status,
    dueAt: r.due_at,
    isOverdue: r.is_overdue,
    declaredAt: r.declared_at,
    paymentReference: r.payment_reference,
    settledAt: r.settled_at,
    createdAt: r.created_at,
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Booking-specific backend codes -> action codes (the generic ones live in lib/api/errors.ts). */
const BOOKING_CODES: Record<string, ActionErrorCode> = {
  // listing rules (inventory.listing_window_problem) and quote checks
  past: "PAST_DATE",
  // The API gives no count with these, and their messages need one: the widgets
  // check the same rules first with the listing's own figures.
  advance_notice: "INVALID_DATES",
  outside_window: "OUTSIDE_WINDOW",
  min_nights: "INVALID_DATES",
  max_nights: "INVALID_DATES",
  invalid_dates: "INVALID_DATES",
  capacity_exceeded: "INVALID_GUESTS",
  not_enough_units: "DATES_UNAVAILABLE",
  room_type_required: "INVALID_ROOM_COUNT",
  slot_required: "INVALID_DATES",
  invalid_target: "INVALID_INPUT",
  // booking creation
  phone_not_verified: "PHONE_NOT_VERIFIED",
  too_many_open_bookings: "TOO_MANY_OPEN_BOOKINGS",
  quote_expired: "QUOTE_EXPIRED",
  quote_already_used: "QUOTE_EXPIRED",
  price_changed: "PRICE_CHANGED",
  // lifecycle
  booking_not_pending: "REQUEST_NOT_PENDING",
  booking_not_cancellable: "RESERVATION_NOT_CANCELLABLE",
  too_late_to_cancel: "RESERVATION_NOT_CANCELLABLE",
  booking_not_confirmed: "RESERVATION_NOT_CANCELLABLE",
  deposit_below_floor: "DEPOSIT_TOO_LOW",
  reason_required: "REASON_REQUIRED",
  stay_not_started: "STAY_NOT_STARTED",
  invalid_code: "STAY_CODE_INVALID",
  // disputes and refunds
  booking_not_disputable: "DISPUTE_NOT_ALLOWED",
  dispute_exists: "DISPUTE_NOT_ALLOWED",
  dispute_window_closed: "DISPUTE_NOT_ALLOWED",
  refund_not_open: "CONFLICT",
  refund_settled: "CONFLICT",
  refund_not_declared: "CONFLICT",
  // host calendar
  dates_booked: "DATES_BOOKED",
  night_booked: "DATES_BOOKED",
};

export function bookingCodeFor(error: unknown): ActionErrorCode {
  if (error instanceof ApiError && BOOKING_CODES[error.code]) return BOOKING_CODES[error.code];
  return actionCodeFor(error);
}

/** Failed ActionResult for an error thrown by a booking call (unexpected errors are logged server-side). */
export function bookingFail<T = never>(error: unknown, where: string): ActionResult<T> {
  if (!(error instanceof ApiError) || error.status >= 500) console.error(`[${where}]`, error);
  return actionFail<T>(bookingCodeFor(error));
}
