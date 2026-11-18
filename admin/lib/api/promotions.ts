import "server-only";

import type { ListingVertical, PromotionCoupon } from "@/lib/types";
import { dzd, type ApiMoney } from "./mapping";

/** Coupon of /admin/coupons (pricing/serializers.py CouponSerializer). */
export interface ApiCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  /** Basis points for percentage, centimes for fixed. */
  discount_value: number;
  min_spend: ApiMoney | null;
  funded_by: "platform" | "host";
  host_account_id: string | null;
  scope_verticals: string[] | null;
  usage_limit: number | null;
  per_user_limit: number | null;
  used_count: number;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
  created_at: string;
}

const ADMIN_VERTICALS: ListingVertical[] = ["home", "hotel", "experience", "vehicle", "trip"];

export function toPromotionCoupon(row: ApiCoupon, now = Date.now()): PromotionCoupon {
  const expired = !!row.valid_to && new Date(row.valid_to).getTime() < now;
  const status: PromotionCoupon["status"] = !row.is_active ? "disabled" : expired ? "expired" : "active";
  const verticals = row.scope_verticals ?? [];
  const scope: PromotionCoupon["scope"] =
    verticals.length === 0
      ? "all"
      : verticals.length === 1 && ADMIN_VERTICALS.includes(verticals[0] as ListingVertical)
        ? (verticals[0] as ListingVertical)
        : undefined;
  const discountValue = row.discount_type === "percentage" ? row.discount_value / 100 : dzd(row.discount_value);
  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    discountValue,
    minSpendDzd: dzd(row.min_spend),
    maxUses: row.usage_limit ?? undefined,
    maxUsage: row.usage_limit ?? undefined,
    usedCount: row.used_count ?? 0,
    currentUses: row.used_count ?? 0,
    startDate: row.valid_from,
    endDate: row.valid_to ?? undefined,
    expiresAt: row.valid_to ?? undefined,
    status,
    scope,
    isActive: row.is_active,
    fundedBy: row.funded_by,
  };
}
