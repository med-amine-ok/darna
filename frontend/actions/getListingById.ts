"use server";

import { getListingById } from "@/lib/data/listings";

export default async function getListingByIdAction(id: string) {
  return await getListingById(id);
}
