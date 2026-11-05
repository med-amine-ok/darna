"use server";

import { revalidatePath } from "next/cache";
import type { Trip, TripItineraryDay } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { getOrgContext } from "@/lib/server/authz";
import { createTrip, deleteTrip, getTripById, TripInput, updateTrip } from "@/lib/data/trips";
import { isAllowedImageUrl } from "@/lib/data/_sanitize";
import { isValidPriceDzd, PRICE_MAX_DZD, PRICE_MIN_DZD } from "@/lib/booking/config";
import { isTripType } from "@/lib/catalog-types";

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function int(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? Math.round(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
function strList(v: unknown, maxItems = 40, maxLen = 300): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, maxLen)).filter(Boolean).slice(0, maxItems)
    : [];
}

function sanitizeTripInput(input: unknown, organizationId: string): TripInput | null {
  if (!input || typeof input !== "object") return null;
  const d = input as Record<string, unknown>;
  const title = str(d.title, 200);
  if (!title) return null;

  const itinerary: TripItineraryDay[] = Array.isArray(d.itinerary)
    ? d.itinerary.slice(0, 60).map((raw, i) => {
        const day = (raw || {}) as Record<string, unknown>;
        return {
          day: int(day.day, 1, 365, i + 1),
          title: str(day.title, 200),
          description: str(day.description, 4000),
          activities: strList(day.activities, 30, 200),
          meals: str(day.meals, 200) || undefined,
          accommodation: str(day.accommodation, 200) || undefined,
        };
      })
    : [];

  const minGroupSize = int(d.minGroupSize, 1, 500, 1);
  const maxGroupSize = Math.max(minGroupSize, int(d.maxGroupSize, 1, 500, 12));
  const coverPhoto = isAllowedImageUrl(d.coverPhoto) ? d.coverPhoto : "/assets/hero.jpg";
  const departureDates = strList(d.departureDates, 100, 10).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
  const cancellationPolicy =
    d.cancellationPolicy === "moderate" || d.cancellationPolicy === "strict" ? d.cancellationPolicy : "flexible";

  return {
    title,
    description: str(d.description, 8000),
    coverPhoto,
    gallery: (Array.isArray(d.gallery) ? d.gallery : []).filter(isAllowedImageUrl).slice(0, 30),
    itinerary,
    durationDays: int(d.durationDays, 1, 365, Math.max(1, itinerary.length)),
    minGroupSize,
    maxGroupSize,
    pricePerPerson: int(d.pricePerPerson, 1, 100_000_000, 1),
    inclusions: strList(d.inclusions),
    exclusions: strList(d.exclusions),
    meetingPoint: str(d.meetingPoint, 300),
    city: str(d.city, 120),
    locationValue: str(d.locationValue, 120),
    cancellationPolicy,
    status: d.status === "draft" ? "draft" : "active",
    departureDates,
    organizationId,
    // Validated by the caller (required, one of TRIP_TYPES).
    tripType: isTripType(d.tripType) ? d.tripType : undefined,
  };
}

const isAgency = <T extends { hostType: string }>(ctx: T | null) => ctx && ctx.hostType === "agency";

/** Agencies only; the organization comes from the session, never the client. */
export async function createTripAction(input: unknown): Promise<ActionResult<Trip>> {
  const ctx = await getOrgContext();
  if (!ctx || !isAgency(ctx)) return actionFail("AGENCY_ONLY");

  const raw = (input || {}) as Record<string, unknown>;
  if (typeof raw.minGroupSize === "number" && typeof raw.maxGroupSize === "number" && raw.minGroupSize > raw.maxGroupSize) {
    return actionFail("GROUP_SIZE_RANGE");
  }
  if (!isValidPriceDzd(raw.pricePerPerson)) {
    return actionFail("PRICE_RANGE", { min: PRICE_MIN_DZD, max: PRICE_MAX_DZD });
  }
  // Trip type is required and must be one of the canonical TRIP_TYPES.
  if (!isTripType(raw.tripType)) return actionFail("TRIP_TYPE_REQUIRED");
  const data = sanitizeTripInput(input, ctx.organization.id);
  if (!data) return actionFail("TRIP_TITLE_REQUIRED");

  const trip = await createTrip(data);
  revalidatePath("/", "layout");
  return actionOk(trip);
}

export async function setTripStatusAction(tripId: string, status: "active" | "draft"): Promise<ActionResult<Trip>> {
  const ctx = await getOrgContext();
  if (!ctx || !isAgency(ctx)) return actionFail("FORBIDDEN");
  const trip = typeof tripId === "string" ? await getTripById(tripId) : null;
  if (!trip || trip.organizationId !== ctx.organization.id) return actionFail("NOT_FOUND");
  if (status !== "active" && status !== "draft") return actionFail("INVALID_INPUT");

  const updated = await updateTrip(trip.id, { status });
  if (!updated) return actionFail("NOT_FOUND");
  revalidatePath("/", "layout");
  return actionOk(updated);
}

export async function deleteTripAction(tripId: string): Promise<ActionResult<{ id: string }>> {
  const ctx = await getOrgContext();
  if (!ctx || !isAgency(ctx)) return actionFail("FORBIDDEN");
  const trip = typeof tripId === "string" ? await getTripById(tripId) : null;
  if (!trip || trip.organizationId !== ctx.organization.id) return actionFail("NOT_FOUND");

  const ok = await deleteTrip(trip.id);
  if (!ok) return actionFail("NOT_FOUND");
  revalidatePath("/", "layout");
  return actionOk({ id: trip.id });
}
