// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { CategoryItem } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { logAudit } from "./audit";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listCategories(): Promise<CategoryItem[]> {
  await delay(120);
  return [...store.categories].sort((a, b) => a.order - b.order);
}

export async function createCategory(
  item: Omit<CategoryItem, "id" | "listingCount">,
  actor: { id: string; name: string; role: any }
): Promise<CategoryItem> {
  assertCan(actor.role, "categories.manage");
  await delay(180);

  const newCat: CategoryItem = {
    ...item,
    id: `cat_${Date.now()}`,
    listingCount: 0,
  };

  store.categories = [...store.categories, newCat];
  await logAudit(actor, "CATEGORY_CREATE", "setting", newCat.id, `Created category ${newCat.name.en}`);
  return newCat;
}

export async function toggleCategoryStatus(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<CategoryItem> {
  assertCan(actor.role, "categories.manage");
  await delay(180);

  const idx = store.categories.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Category not found");

  store.categories[idx] = {
    ...store.categories[idx],
    isActive: !store.categories[idx].isActive,
  };

  await logAudit(
    actor,
    "CATEGORY_TOGGLE",
    "setting",
    id,
    `Toggled category ${store.categories[idx].name.en} active to ${store.categories[idx].isActive}`
  );

  return store.categories[idx];
}

export async function deleteCategory(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<boolean> {
  assertCan(actor.role, "categories.manage");
  await delay(180);

  const cat = store.categories.find((c) => c.id === id);
  store.categories = store.categories.filter((c) => c.id !== id);

  if (cat) {
    await logAudit(actor, "CATEGORY_DELETE", "setting", id, `Deleted category ${cat.name.en}`);
  }
  return true;
}
