"use server";

import { getReservations } from "@/lib/data/reservations";

export default async function getReservationsAction(params?: {
  userId?: string;
  listingId?: string;
  hostId?: string;
}) {
  return await getReservations(params);
}
