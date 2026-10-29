// TODO: replace with Supabase query
import "server-only";
import { Listing } from "@/types";
import { getListings } from "./listings";

export async function getVehicles(): Promise<Listing[]> {
  return await getListings({ vertical: "vehicle" });
}
