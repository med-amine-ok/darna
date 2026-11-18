import "server-only";
import type { PublicOrganization } from "@/types";
import { ApiError, api, apiOrNull } from "./client";
import { isUuid } from "./catalog";

/** GET /organizations/{slug} and rows of GET /organizations (hosts PublicOrganizationSerializer). */
export interface ApiPublicOrganization {
  id: string;
  host_account_id: string;
  slug: string;
  display_name: string;
  business_category: "agency" | "hotel" | "hostel";
  description: string;
  commune: { id: number; name: string; wilaya_code: number; wilaya_name: string } | null;
  star_rating: number | null;
  check_in_time: string | null;
  check_out_time: string | null;
  policies: Record<string, unknown> | null;
  verified: boolean;
  rating_avg: number | string | null;
  review_count: number;
  member_since: number;
}

const hhmm = (v: string | null) => (v ? v.slice(0, 5) : undefined);

export function toPublicOrganizationFromApi(org: ApiPublicOrganization): PublicOrganization {
  const policies = org.policies ?? {};
  const text = (k: string) => (typeof policies[k] === "string" ? (policies[k] as string) : undefined);
  const list = (k: string) => (Array.isArray(policies[k]) ? (policies[k] as string[]) : undefined);
  return {
    id: org.id,
    slug: org.slug,
    hostAccountId: org.host_account_id,
    name: org.display_name,
    businessCategory: org.business_category,
    logo: null,
    description: org.description || undefined,
    country: "DZ",
    isVerified: org.verified,
    createdAt: `${org.member_since}-01-01T00:00:00.000Z`,
    rating: org.rating_avg === null ? undefined : Number(org.rating_avg),
    reviewCount: org.review_count,
    hotelStarRating: org.star_rating ?? undefined,
    totalRoomCount: typeof policies.total_room_count === "number" ? (policies.total_room_count as number) : undefined,
    checkInTime: hhmm(org.check_in_time),
    checkOutTime: hhmm(org.check_out_time),
    hotelAmenities: list("hotel_amenities"),
    hostelFacilities: list("hostel_facilities"),
    curfewPolicy: text("curfew"),
    agePolicy: text("age_policy"),
  };
}

interface DirectoryPage {
  results: ApiPublicOrganization[];
  next_cursor: string | null;
  has_more: boolean;
}

/** Every approved organisation of the directory (cursor pages of 50, at most 20 pages). */
export async function getPublicOrganizations(category?: "agency" | "hotel" | "hostel"): Promise<ApiPublicOrganization[]> {
  const out: ApiPublicOrganization[] = [];
  let cursor: string | null = null;
  try {
    for (let i = 0; i < 20; i++) {
      const page: DirectoryPage = await api<DirectoryPage>("/organizations", {
        anonymous: true,
        query: { limit: 50, cursor, business_category: category },
      });
      out.push(...page.results);
      if (!page.has_more || !page.next_cursor) break;
      cursor = page.next_cursor;
    }
  } catch (error) {
    console.error("[organizations.directory]", error);
  }
  return out;
}

/**
 * A public organisation by its slug (the page key) or, for older links, its
 * id. Null when unknown, unapproved or when the API is down.
 */
export async function getPublicOrganization(key: string): Promise<ApiPublicOrganization | null> {
  if (!key) return null;
  try {
    const bySlug = await apiOrNull<ApiPublicOrganization>(`/organizations/${encodeURIComponent(key)}`, { anonymous: true });
    if (bySlug) return bySlug;
  } catch (error) {
    if (!(error instanceof ApiError && error.status < 500)) console.error("[organizations.public]", error);
  }
  if (!isUuid(key)) return null;
  return (await getPublicOrganizations()).find((o) => o.id === key || o.host_account_id === key) ?? null;
}
