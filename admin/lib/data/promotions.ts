// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { PromotionCoupon } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { logAudit } from "./audit";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listPromotions(): Promise<PromotionCoupon[]> {
  await delay(120);
  return [...store.promotions];
}

export async function createPromotion(
  data: Omit<PromotionCoupon, "id" | "usedCount">,
  actor: { id: string; name: string; role: any }
): Promise<PromotionCoupon> {
  assertCan(actor.role, "promotions.manage");
  await delay(180);

  const newPromo: PromotionCoupon = {
    ...data,
    id: `cpn_${Date.now()}`,
    usedCount: 0,
  };

  store.promotions = [newPromo, ...store.promotions];
  await logAudit(actor, "PROMOTION_CREATE", "promotion", newPromo.id, `Created promo coupon ${newPromo.code}`);
  return newPromo;
}

export async function togglePromotionStatus(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<PromotionCoupon> {
  assertCan(actor.role, "promotions.manage");
  await delay(180);

  const idx = store.promotions.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("Promotion not found");

  const newStatus = store.promotions[idx].status === "active" ? "disabled" : "active";
  store.promotions[idx] = {
    ...store.promotions[idx],
    status: newStatus,
  };

  await logAudit(
    actor,
    "PROMOTION_TOGGLE",
    "promotion",
    id,
    `Toggled promo ${store.promotions[idx].code} to ${newStatus}`
  );

  return store.promotions[idx];
}

export async function deletePromotion(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<boolean> {
  assertCan(actor.role, "promotions.manage");
  await delay(180);

  const promo = store.promotions.find((p) => p.id === id);
  store.promotions = store.promotions.filter((p) => p.id !== id);

  if (promo) {
    await logAudit(actor, "PROMOTION_DELETE", "promotion", id, `Deleted promo ${promo.code}`);
  }
  return true;
}
