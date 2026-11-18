import "server-only";
import { Listing } from "@/types";
import { getListings } from "./listings";

/** Published experiences (GET /listings?vertical=experience). */
export async function getExperiences(): Promise<Listing[]> {
  return getListings({ vertical: "experience", limit: 24 });
}
