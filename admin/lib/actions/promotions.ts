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

export async function togglePromotionStatus(promotionId: string) {
  return runAction("promotions.manage", (actor) => promotions.togglePromotionStatus(id(promotionId), actor));
}

export async function deletePromotion(promotionId: string) {
  return runAction("promotions.manage", (actor) => promotions.deletePromotion(id(promotionId), actor));
}
