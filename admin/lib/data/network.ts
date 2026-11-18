import "server-only";

import type { NetworkSearchParams } from "@/lib/types";
import { listListings } from "./listings";

export type { NetworkSearchParams } from "@/lib/types";

/**
 * Network explorer: the marketplace seen with guest-like filters, read
 * through the admin listings module (Django /admin/listings). Property type
 * is not an admin listing filter yet, so it is matched on the rows.
 */
export async function searchNetwork(params: NetworkSearchParams = {}) {
  const vertical = params.vertical || "home";
  const page = await listListings({
    vertical,
    status: "approved",
    wilayaCode: params.wilayaCode && params.wilayaCode !== "all" ? params.wilayaCode : undefined,
    search: params.destination?.trim() || undefined,
    minCapacity: params.guests && params.guests > 1 ? params.guests : undefined,
    minPrice: params.minPrice || undefined,
    maxPrice: params.maxPrice || undefined,
    hostType: params.hostType && params.hostType !== "all" ? params.hostType : undefined,
    page: 1,
    pageSize: 60,
  });
  const results =
    params.propertyType && params.propertyType !== "all"
      ? page.rows.filter((l) => l.propertyType === params.propertyType)
      : page.rows;
  return { results, total: params.propertyType && params.propertyType !== "all" ? results.length : page.total, vertical };
}
