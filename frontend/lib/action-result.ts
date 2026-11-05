/**
 * Result envelope returned by every server action and auth API route
 * (client-safe types only). Failures carry a stable error code plus optional
 * ICU params, never an English sentence and never internal details. The
 * client turns code + params into translated text with `useActionError()`
 * (hook/useActionError.ts, messages: errors.codes.*).
 */
export const ERROR_CODES = [
  // Generic
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_INPUT",
  "CONFLICT",
  "SERVER_ERROR",
  // Auth / account
  "INVALID_CREDENTIALS",
  "EMAIL_TAKEN",
  "INVALID_REGISTRATION",
  "PASSWORD_FIELDS_REQUIRED",
  "PASSWORD_MISMATCH",
  "PASSWORD_SAME_AS_CURRENT",
  "PASSWORD_TOO_SHORT",
  "WRONG_PASSWORD",
  "NAME_EMPTY",
  // Booking requests (lib/booking/availability.ts)
  "INVALID_DATES",
  "PAST_DATE",
  "ADVANCE_NOTICE",
  "OUTSIDE_WINDOW",
  "MIN_ONE_NIGHT",
  "MIN_ONE_DAY",
  "MIN_NIGHTS",
  "MIN_DAYS",
  "MAX_NIGHTS",
  "MAX_DAYS",
  "MAX_BEDS",
  "MAX_ROOMS",
  "INVALID_ROOM_COUNT",
  "INVALID_GUESTS",
  "MAX_GUESTS",
  "DATES_UNAVAILABLE",
  "TRIP_NO_DEPARTURES",
  "INVALID_DEPARTURE",
  "DEPARTURE_PASSED",
  "INVALID_TRAVELERS",
  "DEPARTURE_FULL",
  "SEATS_LEFT",
  "SEATS_UNAVAILABLE",
  // Bookings
  "LISTING_UNAVAILABLE",
  "TRIP_UNAVAILABLE",
  "OWN_LISTING",
  "BOOKING_FAILED",
  "REQUEST_EXPIRED",
  "REQUEST_NOT_PENDING",
  "RESERVATION_NOT_CANCELLABLE",
  "CHECK_IN_PASSED",
  // Host calendar / listings
  "PAST_DATES_LOCKED",
  "PRICE_RANGE",
  "ROOM_TYPE_DATE_PRICES_UNSUPPORTED",
  "MAX_NIGHTS_BELOW_MIN",
  "HOST_DETAILS_MISSING",
  "HOST_OFFER_NOT_ALLOWED",
  "REGISTRATION_FAILED",
  // Messages
  "MESSAGE_EMPTY",
  "HOST_UNREACHABLE",
  "OWN_LISTING_MESSAGE",
  // Organizations
  "ORG_ADMIN_REQUIRED",
  "ORG_OWNER_REQUIRED",
  "ORG_NAME_MISMATCH",
  "INVALID_EMAIL",
  "ALREADY_MEMBER",
  "OWNER_ROLE_LOCKED",
  "OWNER_NOT_REMOVABLE",
  "TRANSFER_TARGET_INACTIVE",
  // Agency trips
  "AGENCY_ONLY",
  "GROUP_SIZE_RANGE",
  "TRIP_TITLE_REQUIRED",
  "TRIP_TYPE_REQUIRED",
  "EXPERIENCE_TYPE_REQUIRED",
] as const;

export type ActionErrorCode = (typeof ERROR_CODES)[number];
export type ActionErrorParams = Record<string, string | number>;

export interface ActionError {
  code: ActionErrorCode;
  params?: ActionErrorParams;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | ({ ok: false } & ActionError);

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionFail<T = never>(
  code: ActionErrorCode,
  params?: ActionErrorParams,
): ActionResult<T> {
  return params ? { ok: false, code, params } : { ok: false, code };
}

export function isActionErrorCode(value: unknown): value is ActionErrorCode {
  return (
    typeof value === "string" &&
    (ERROR_CODES as readonly string[]).includes(value)
  );
}
