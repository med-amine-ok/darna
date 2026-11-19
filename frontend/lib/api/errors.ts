import "server-only";
import { actionFail, type ActionErrorCode, type ActionResult } from "@/lib/action-result";
import { ApiError } from "./client";

/**
 * Backend error code (Django, docs/backend/06-api-design.md) -> frontend
 * action error code (lib/action-result.ts, translated in messages
 * errors.codes.*). Codes not listed fall back by HTTP status.
 */
const CODE_MAP: Record<string, ActionErrorCode> = {
  not_authenticated: "UNAUTHENTICATED",
  authentication_failed: "UNAUTHENTICATED",
  invalid_credentials: "INVALID_CREDENTIALS",
  email_taken: "EMAIL_TAKEN",
  phone_taken: "PHONE_TAKEN",
  invalid_code: "INVALID_CODE",
  phone_not_verified: "PHONE_NOT_VERIFIED",
  already_host: "ALREADY_HOST",
  draft_submitted: "ALREADY_HOST",
  onboarding_incomplete: "ONBOARDING_INCOMPLETE",
  throttled: "TOO_MANY_ATTEMPTS",
  invalid_current_password: "WRONG_PASSWORD",
  handle_taken: "HANDLE_TAKEN",
  last_sign_in_method: "LAST_SIGN_IN_METHOD",
  underage: "UNDERAGE",
  invalid_birth_date: "INVALID_BIRTH_DATE",
  profile_incomplete: "PROFILE_INCOMPLETE",
  invalid_handle: "INVALID_HANDLE",
  permission_denied: "FORBIDDEN",
  forbidden: "FORBIDDEN",
  not_found: "NOT_FOUND",
  invalid: "INVALID_INPUT",
  validation_error: "INVALID_INPUT",
  conflict: "CONFLICT",
  // bookings and availability
  dates_unavailable: "DATES_UNAVAILABLE",
  dates_booked: "DATES_UNAVAILABLE",
  night_booked: "DATES_UNAVAILABLE",
  sold_out: "DATES_UNAVAILABLE",
  seats_unavailable: "SEATS_UNAVAILABLE",
  departure_full: "DEPARTURE_FULL",
  own_listing: "OWN_LISTING",
  listing_unavailable: "LISTING_UNAVAILABLE",
  request_expired: "REQUEST_EXPIRED",
  invalid_transition: "CONFLICT",
  not_cancellable: "RESERVATION_NOT_CANCELLABLE",
  host_offer_not_allowed: "HOST_OFFER_NOT_ALLOWED",
  // organisations
  already_member: "ALREADY_MEMBER",
  owner_not_removable: "OWNER_NOT_REMOVABLE",
  owner_role_locked: "OWNER_ROLE_LOCKED",
  owner_only: "ORG_OWNER_REQUIRED",
  confirm_name_mismatch: "ORG_NAME_MISMATCH",
  has_future_bookings: "ORG_HAS_FUTURE_BOOKINGS",
  invitation_exists: "INVITATION_EXISTS",
  invitation_not_found: "INVITATION_INVALID",
  invitation_used: "INVITATION_INVALID",
  invitation_revoked: "INVITATION_INVALID",
  invitation_expired: "INVITATION_EXPIRED",
  invitation_contact_mismatch: "INVITATION_OTHER_PERSON",
};

/** The action error code for an ApiError (or any thrown value). */
export function actionCodeFor(error: unknown): ActionErrorCode {
  if (!(error instanceof ApiError)) return "SERVER_ERROR";
  const mapped = CODE_MAP[error.code];
  if (mapped) return mapped;
  if (error.status === 429) return "TOO_MANY_ATTEMPTS";
  if (error.status === 401) return "UNAUTHENTICATED";
  if (error.status === 403) return "FORBIDDEN";
  if (error.status === 404) return "NOT_FOUND";
  if (error.status === 409) return "CONFLICT";
  if (error.status === 400 || error.status === 422) return "INVALID_INPUT";
  return "SERVER_ERROR";
}

/**
 * Turn a thrown error into a failed ActionResult. Unexpected errors are logged
 * on the server (never sent to the browser); API refusals are expected and not logged.
 */
export function failFromError<T = never>(error: unknown, where: string): ActionResult<T> {
  if (!(error instanceof ApiError) || error.status >= 500) {
    console.error(`[${where}]`, error);
  }
  return actionFail<T>(actionCodeFor(error));
}

/** Run an API call in a server action and wrap the outcome in an ActionResult. */
export async function apiAction<T>(where: string, run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    return failFromError<T>(error, where);
  }
}
