import "server-only";

import type { CategoryItem, ListingVertical } from "@/lib/types";

/** Names in the three languages (catalog LocalizedText). */
export interface ApiLabels {
  en: string;
  fr: string;
  ar: string;
}

/** Category of GET /admin/categories (catalog/serializers.py AdminCategorySerializer). */
export interface ApiAdminCategory {
  id: string;
  vertical: string;
  slug: string;
  label: string;
  labels: ApiLabels;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  listing_count: number;
}

/** Amenity of GET /admin/amenities (AdminAmenitySerializer). */
export interface ApiAdminAmenity {
  id: string;
  slug: string;
  group: string;
  label: string;
  labels: ApiLabels;
  icon: string | null;
  applies_to: string[];
  is_active: boolean;
  listing_count: number;
}

/** Property type of GET /admin/property-types (AdminPropertyTypeSerializer). */
export interface ApiAdminPropertyType {
  id: string;
  vertical: string;
  slug: string;
  label: string;
  labels: ApiLabels;
  is_active: boolean;
  listing_count: number;
}

/** Verticals the catalog API accepts (BR-LST-01). Trips are not a catalog vertical. */
export const API_VERTICALS = ["home", "hotel", "hostel", "experience", "vehicle"] as const;

/** Admin vertical filter to the API one ("hotel" covers hotels and hostels on this screen). */
export function toApiVerticalFilter(vertical: string | undefined): string | undefined {
  if (!vertical || vertical === "all") return undefined;
  return vertical;
}

/** API vertical to the admin one (the admin has no separate hostel vertical). */
export function toAdminVertical(vertical: string): ListingVertical {
  if (vertical === "hostel") return "hotel";
  const known: ListingVertical[] = ["home", "hotel", "experience", "vehicle", "trip"];
  return known.includes(vertical as ListingVertical) ? (vertical as ListingVertical) : "home";
}

export function toCategoryItem(row: ApiAdminCategory): CategoryItem {
  return {
    id: row.id,
    name: { en: row.labels?.en ?? row.label, fr: row.labels?.fr ?? row.label, ar: row.labels?.ar ?? row.label },
    vertical: toAdminVertical(row.vertical),
    apiVertical: row.vertical,
    slug: row.slug,
    icon: row.icon ?? undefined,
    iconName: row.icon ?? undefined,
    listingCount: row.listing_count ?? 0,
    isActive: row.is_active,
    order: row.sort_order ?? 0,
  };
}

/** Simple admin view of an amenity or a property type (no dedicated admin type exists yet). */
export interface TaxonomyRow {
  id: string;
  slug: string;
  name: ApiLabels;
  /** Property types: one vertical. Amenities: the verticals they apply to. */
  verticals: string[];
  group?: string;
  icon?: string;
  isActive: boolean;
  listingCount: number;
}

export function toAmenityRow(row: ApiAdminAmenity): TaxonomyRow {
  return {
    id: row.id,
    slug: row.slug,
    name: row.labels,
    verticals: row.applies_to ?? [],
    group: row.group,
    icon: row.icon ?? undefined,
    isActive: row.is_active,
    listingCount: row.listing_count ?? 0,
  };
}

export function toPropertyTypeRow(row: ApiAdminPropertyType): TaxonomyRow {
  return {
    id: row.id,
    slug: row.slug,
    name: row.labels,
    verticals: [row.vertical],
    isActive: row.is_active,
    listingCount: row.listing_count ?? 0,
  };
}

/** URL-safe slug the API accepts (^[a-z0-9-]{2,60}$), or "" when the text has no Latin letters. */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
