import { createReservation, getCurrentUser } from "@/lib/data";
import { NextResponse } from "next/server";

// TODO: replace with Supabase query
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const body = await request.json();
  const { listingId, startDate, endDate, totalPrice } = body;

  if (!listingId || !startDate || !endDate || !totalPrice) {
    return NextResponse.error();
  }

  const reservation = await createReservation({
    listingId,
    startDate,
    endDate,
    totalPrice,
  });

  return NextResponse.json(reservation);
}
