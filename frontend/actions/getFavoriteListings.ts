"use server";

import { getFavoriteListings } from "@/lib/data/favorites";

export default async function getFavoriteListingsAction() {
  return await getFavoriteListings();
}
