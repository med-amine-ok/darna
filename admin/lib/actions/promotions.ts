"use server";

import * as promotions from "@/lib/data/promotions";
import { runAction, id, obj } from "@/lib/auth/run-action";
import type { PromotionCoupon } from "@/lib/types";

export async function listPromotions() {
  return runAction("promotions.manage", () => promotions.listPromotions());
}

export async function createPromotion(input: Omit<PromotionCoupon, "id" | "usedCount">) {
  return runAction("promotions.manage", (actor) => promotions.createPromotion(obj(input, "promotion"), actor));
}

/** `isActive` is the wanted state (the current one is read from the API when omitted). */
export async function togglePromotionStatus(promotionId: string, isActive?: boolean) {
  return runAction("promotions.manage", (actor) =>
    promotions.togglePromotionStatus(id(promotionId), actor, typeof isActive === "boolean" ? isActive : undefined)
  );
}

export async function deletePromotion(promotionId: string) {
  return runAction("promotions.manage", (actor) => promotions.deletePromotion(id(promotionId), actor));
}
