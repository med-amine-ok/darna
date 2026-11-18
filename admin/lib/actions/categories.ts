"use server";

import * as categories from "@/lib/data/categories";
import { runAction, id, obj, oneOf, str } from "@/lib/auth/run-action";
import type { CategoryItem } from "@/lib/types";

const KINDS = ["amenities", "property-types"] as const;
const optStr = (v: unknown, field: string, max = 200) => (v === undefined || v === null ? undefined : str(v, field, max));
const optBool = (v: unknown) => (typeof v === "boolean" ? v : undefined);

export async function listCategories(params: { vertical?: string } = {}) {
  return runAction(null, () => categories.listCategories({ vertical: optStr(params?.vertical, "vertical", 20) }));
}

export async function createCategory(item: Omit<CategoryItem, "id" | "listingCount">) {
  return runAction("categories.manage", (actor) => categories.createCategory(obj(item, "category"), actor));
}

/** `isActive` is the wanted state (the current one is read from the API when omitted). */
export async function toggleCategoryStatus(categoryId: string, isActive?: boolean) {
  return runAction("categories.manage", (actor) =>
    categories.toggleCategoryStatus(id(categoryId), actor, optBool(isActive))
  );
}

export async function deleteCategory(categoryId: string) {
  return runAction("categories.manage", (actor) => categories.deleteCategory(id(categoryId), actor));
}

// Amenities and property types (no screen uses them yet; ready for one).

export async function listAmenities(params: { vertical?: string; active?: boolean } = {}) {
  return runAction(null, () =>
    categories.listAmenities({ vertical: optStr(params?.vertical, "vertical", 20), active: optBool(params?.active) })
  );
}

export async function listPropertyTypes(params: { vertical?: string; active?: boolean } = {}) {
  return runAction(null, () =>
    categories.listPropertyTypes({ vertical: optStr(params?.vertical, "vertical", 20), active: optBool(params?.active) })
  );
}

export async function createTaxonomyRow(kind: (typeof KINDS)[number], input: categories.TaxonomyInput) {
  return runAction("categories.manage", (actor) =>
    categories.createTaxonomyRow(oneOf(kind, KINDS, "kind"), obj(input, "input"), actor)
  );
}

export async function updateTaxonomyRow(kind: (typeof KINDS)[number], rowId: string, input: Partial<categories.TaxonomyInput>) {
  return runAction("categories.manage", (actor) =>
    categories.updateTaxonomyRow(oneOf(kind, KINDS, "kind"), id(rowId), obj(input, "input"), actor)
  );
}

export async function deleteTaxonomyRow(kind: (typeof KINDS)[number], rowId: string) {
  return runAction("categories.manage", (actor) =>
    categories.deleteTaxonomyRow(oneOf(kind, KINDS, "kind"), id(rowId), actor)
  );
}
