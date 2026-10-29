"use server";

import * as categories from "@/lib/data/categories";
import { runAction, id, obj } from "@/lib/auth/run-action";
import type { CategoryItem } from "@/lib/types";

export async function listCategories() {
  return runAction(null, () => categories.listCategories());
}

export async function createCategory(item: Omit<CategoryItem, "id" | "listingCount">) {
  return runAction("categories.manage", (actor) => categories.createCategory(obj(item, "category"), actor));
}

export async function toggleCategoryStatus(categoryId: string) {
  return runAction("categories.manage", (actor) => categories.toggleCategoryStatus(id(categoryId), actor));
}

export async function deleteCategory(categoryId: string) {
  return runAction("categories.manage", (actor) => categories.deleteCategory(id(categoryId), actor));
}
