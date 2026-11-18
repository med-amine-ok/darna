import "server-only";
import { Listing } from "@/types";
import { getListings } from "./listings";

/** Published vehicles (GET /listings?vertical=vehicle). */
export async function getVehicles(): Promise<Listing[]> {
  return getListings({ vertical: "vehicle", limit: 24 });
}
