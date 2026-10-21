// TODO: replace with Supabase query
import { Listing } from "@/types";
import { getListings } from "./listings";

export async function getExperiences(): Promise<Listing[]> {
  return await getListings({ vertical: "experience" });
}
