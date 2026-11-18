import "server-only";

import { api, apiOrNull } from "@/lib/api/client";
import { logReadError, write } from "@/lib/api/mapping";
import {
  slugify,
  toAmenityRow,
  toApiVerticalFilter,
  toCategoryItem,
  toPropertyTypeRow,
  type ApiAdminAmenity,
  type ApiAdminCategory,
  type ApiAdminPropertyType,
  type ApiLabels,
  type TaxonomyRow,
} from "@/lib/api/categories";
import { CategoryItem, AdminActor } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { ValidationError } from "./errors";

/**
 * Catalog taxonomies (BR-LST-04): categories, amenities and property types,
 * backed by /admin/categories, /admin/amenities and /admin/property-types.
 * The backend audits every write and refuses to delete a row in use (409 in_use).
 */

export type { TaxonomyRow } from "@/lib/api/categories";

type Results<T> = { results: T[] };

// ---------------------------------------------------------------- categories

/** Every category (active or not), sorted by display order. Throws when the API cannot be read. */
export async function listCategories(params: { vertical?: string } = {}): Promise<CategoryItem[]> {
  const vertical = toApiVerticalFilter(params.vertical);
  if (vertical === "trip") return []; // trip types are not catalog categories
  try {
    const answer = await api<Results<ApiAdminCategory>>("/admin/categories", { query: { vertical } });
    let rows = (answer?.results ?? []).map(toCategoryItem);
    if (vertical === "hotel") {
      // The admin "hotel" vertical also shows hostel categories.
      const hostels = await api<Results<ApiAdminCategory>>("/admin/categories", { query: { vertical: "hostel" } });
      rows = rows.concat((hostels?.results ?? []).map(toCategoryItem));
    }
    return rows.sort((a, b) => a.order - b.order || a.name.en.localeCompare(b.name.en));
  } catch (error) {
    logReadError("listCategories", error);
    throw error;
  }
}

function labelsOf(name: Partial<ApiLabels> | undefined): ApiLabels {
  const en = name?.en?.trim() ?? "";
  const fr = name?.fr?.trim() || en;
  const ar = name?.ar?.trim() || en || fr;
  if (!en && !fr) throw new ValidationError("A name is required");
  return { en: en || fr, fr, ar };
}

function slugOf(slug: string | undefined, name: ApiLabels): string {
  const value = slugify(slug?.trim() || name.en || name.fr);
  if (value.length < 2) throw new ValidationError("A slug of at least 2 Latin letters or digits is required");
  return value;
}

export async function createCategory(
  item: Omit<CategoryItem, "id" | "listingCount">,
  actor: AdminActor
): Promise<CategoryItem> {
  assertCan(actor.role, "categories.manage");
  const vertical = item.apiVertical || item.vertical;
  if (vertical === "trip") throw new ValidationError("Trip types are fixed and cannot be created as categories");
  const labels = labelsOf(item.name);
  const row = await write(() =>
    api<ApiAdminCategory>("/admin/categories", {
      method: "POST",
      body: {
        vertical,
        slug: slugOf(item.slug, labels),
        labels,
        icon: (item.icon || item.iconName || "").slice(0, 40) || null,
        sort_order: Number.isFinite(item.order) ? Math.trunc(item.order) : undefined,
        is_active: item.isActive ?? true,
      },
    }),
  );
  return toCategoryItem(row);
}

/** Current state of one category (there is no detail GET: read the list). */
async function findCategory(id: string): Promise<CategoryItem | null> {
  const answer = await apiOrNull<Results<ApiAdminCategory>>("/admin/categories");
  const row = (answer?.results ?? []).find((c) => c.id === id);
  return row ? toCategoryItem(row) : null;
}

/** Switches a category on or off. `isActive` is the wanted state; read from the API when omitted. */
export async function toggleCategoryStatus(
  id: string,
  actor: AdminActor,
  isActive?: boolean
): Promise<CategoryItem> {
  assertCan(actor.role, "categories.manage");
  let next = isActive;
  if (next === undefined) {
    const current = await write(() => findCategory(id));
    if (!current) throw new ValidationError("Category not found");
    next = !current.isActive;
  }
  const row = await write(() =>
    api<ApiAdminCategory>(`/admin/categories/${encodeURIComponent(id)}`, { method: "PATCH", body: { is_active: next } }),
  );
  return toCategoryItem(row);
}

/** Hard delete; the API answers 409 when the category is used (deactivate it instead). */
export async function deleteCategory(id: string, actor: AdminActor): Promise<boolean> {
  assertCan(actor.role, "categories.manage");
  await write(() => api<null>(`/admin/categories/${encodeURIComponent(id)}`, { method: "DELETE" }));
  return true;
}

// ---------------------------------------------------- amenities, property types

type TaxonomyKind = "amenities" | "property-types";

export interface TaxonomyInput {
  slug?: string;
  name: Partial<ApiLabels>;
  /** Property types: exactly one vertical. Amenities: the verticals it applies to. */
  verticals: string[];
  /** Amenities only: essentials, features, location or safety. */
  group?: string;
  icon?: string;
  isActive?: boolean;
}

function mapRow(kind: TaxonomyKind, row: unknown): TaxonomyRow {
  return kind === "amenities" ? toAmenityRow(row as ApiAdminAmenity) : toPropertyTypeRow(row as ApiAdminPropertyType);
}

function bodyOf(kind: TaxonomyKind, input: Partial<TaxonomyInput>, partial: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.name || !partial) {
    const labels = labelsOf(input.name);
    body.labels = labels;
    if (input.slug !== undefined || !partial) body.slug = slugOf(input.slug, labels);
  } else if (input.slug !== undefined) {
    body.slug = slugify(input.slug);
  }
  if (input.verticals) {
    if (kind === "amenities") body.applies_to = input.verticals;
    else body.vertical = input.verticals[0];
  }
  if (kind === "amenities") {
    if (input.group !== undefined) body.group = input.group;
    if (input.icon !== undefined) body.icon = input.icon.slice(0, 40) || null;
  }
  if (input.isActive !== undefined) body.is_active = input.isActive;
  return body;
}

async function listTaxonomy(kind: TaxonomyKind, params: { vertical?: string; active?: boolean }): Promise<TaxonomyRow[]> {
  const answer = await api<Results<unknown>>(`/admin/${kind}`, {
    query: { vertical: toApiVerticalFilter(params.vertical), active: params.active },
  });
  return (answer?.results ?? []).map((row) => mapRow(kind, row));
}

export async function listAmenities(params: { vertical?: string; active?: boolean } = {}): Promise<TaxonomyRow[]> {
  return listTaxonomy("amenities", params);
}

export async function listPropertyTypes(params: { vertical?: string; active?: boolean } = {}): Promise<TaxonomyRow[]> {
  return listTaxonomy("property-types", params);
}

export async function createTaxonomyRow(kind: TaxonomyKind, input: TaxonomyInput, actor: AdminActor): Promise<TaxonomyRow> {
  assertCan(actor.role, "categories.manage");
  const row = await write(() => api<unknown>(`/admin/${kind}`, { method: "POST", body: bodyOf(kind, input, false) }));
  return mapRow(kind, row);
}

export async function updateTaxonomyRow(
  kind: TaxonomyKind,
  id: string,
  input: Partial<TaxonomyInput>,
  actor: AdminActor
): Promise<TaxonomyRow> {
  assertCan(actor.role, "categories.manage");
  const row = await write(() =>
    api<unknown>(`/admin/${kind}/${encodeURIComponent(id)}`, { method: "PATCH", body: bodyOf(kind, input, true) }),
  );
  return mapRow(kind, row);
}

export async function deleteTaxonomyRow(kind: TaxonomyKind, id: string, actor: AdminActor): Promise<boolean> {
  assertCan(actor.role, "categories.manage");
  await write(() => api<null>(`/admin/${kind}/${encodeURIComponent(id)}`, { method: "DELETE" }));
  return true;
}
