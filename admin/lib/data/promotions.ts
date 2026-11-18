import "server-only";

import { api, apiAll } from "@/lib/api/client";
import { logReadError, minor, write } from "@/lib/api/mapping";
import { toPromotionCoupon, type ApiCoupon } from "@/lib/api/promotions";
import { PromotionCoupon, AdminActor } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { ValidationError } from "./errors";

/**
 * Coupons (BR-PRM), backed by /admin/coupons. Percentages travel as basis
 * points and fixed amounts and minimum spends as centimes. The backend audits
 * every write and refuses to delete a redeemed coupon (409 in_use).
 */

/** Every coupon, newest first. Throws when the API cannot be read (the screen shows its error toast). */
export async function listPromotions(): Promise<PromotionCoupon[]> {
  try {
    const rows = await apiAll<ApiCoupon>("/admin/coupons");
    const now = Date.now();
    return rows.map((row) => toPromotionCoupon(row, now));
  } catch (error) {
    logReadError("listPromotions", error);
    throw error;
  }
}

const CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

export async function createPromotion(
  data: Omit<PromotionCoupon, "id" | "usedCount">,
  actor: AdminActor
): Promise<PromotionCoupon> {
  assertCan(actor.role, "promotions.manage");
  const code = String(data.code ?? "").trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) {
    throw new ValidationError("The code must be 3 to 32 letters, digits, dashes or underscores");
  }
  const value = Number(data.discountValue);
  if (!Number.isFinite(value) || value <= 0) throw new ValidationError("The discount must be above zero");
  const percentage = data.discountType === "percentage";
  if (percentage && value > 100) throw new ValidationError("A percentage discount cannot exceed 100%");
  const minSpend = Number(data.minSpendDzd) || 0;
  if (minSpend < 0) throw new ValidationError("The minimum spend cannot be negative");
  const usageLimit = data.maxUses ?? data.maxUsage;
  const validTo = data.expiresAt ?? data.endDate;
  if (validTo && Number.isNaN(new Date(validTo).getTime())) throw new ValidationError("Invalid expiry date");

  const body: Record<string, unknown> = {
    code,
    discount_type: percentage ? "percentage" : "fixed",
    // Percent to basis points; dinars to centimes.
    discount_value: percentage ? Math.round(value * 100) : minor(value),
    funded_by: data.fundedBy ?? "platform",
    valid_from: data.startDate ?? new Date().toISOString(),
    valid_to: validTo ?? null,
    is_active: data.status ? data.status === "active" : true,
  };
  if (minSpend > 0) body.min_spend = { amount_minor: minor(minSpend), currency: "DZD" };
  if (usageLimit && usageLimit > 0) body.usage_limit = Math.trunc(usageLimit);
  if (data.scope && data.scope !== "all") {
    if (data.scope === "trip") throw new ValidationError("Coupons cannot target trips");
    body.scope_verticals = [data.scope];
  }

  const row = await write(() => api<ApiCoupon>("/admin/coupons", { method: "POST", body }));
  return toPromotionCoupon(row);
}

/** Switches a coupon on or off. `isActive` is the wanted state; read from the API when omitted. */
export async function togglePromotionStatus(
  id: string,
  actor: AdminActor,
  isActive?: boolean
): Promise<PromotionCoupon> {
  assertCan(actor.role, "promotions.manage");
  let next = isActive;
  if (next === undefined) {
    const rows = await write(() => apiAll<ApiCoupon>("/admin/coupons"));
    const current = rows.find((c) => c.id === id);
    if (!current) throw new ValidationError("Coupon not found");
    next = !current.is_active;
  }
  const row = await write(() =>
    api<ApiCoupon>(`/admin/coupons/${encodeURIComponent(id)}`, { method: "PATCH", body: { is_active: next } }),
  );
  return toPromotionCoupon(row);
}

/** Deletes an unused coupon; the API answers 409 once it was redeemed (disable it instead). */
export async function deletePromotion(id: string, actor: AdminActor): Promise<boolean> {
  assertCan(actor.role, "promotions.manage");
  await write(() => api<null>(`/admin/coupons/${encodeURIComponent(id)}`, { method: "DELETE" }));
  return true;
}
