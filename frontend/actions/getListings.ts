"use server";

import { getListings } from "@/lib/data/listings";
import { SearchParams } from "@/types";

export default async function getListingsAction(params?: SearchParams) {
  return await getListings(params);
}
