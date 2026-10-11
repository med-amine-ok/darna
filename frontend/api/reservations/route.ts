import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data/auth";
import { mockReservations } from "@/lib/mock-data/reservations";
import { Reservation } from "@/types";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { listingId, startDate, endDate, totalPrice, guestsCount } = body;

  if (!listingId || !startDate || !endDate || !totalPrice) {
    return new NextResponse("Invalid reservation data", { status: 400 });
  }

  const newReservation: Reservation = {
    id: `res_${Date.now()}`,
    userId: currentUser.id,
    listingId,
    startDate,
    endDate,
    totalPrice: parseInt(totalPrice, 10),
    guestsCount: parseInt(guestsCount, 10) || 1,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };

  mockReservations.push(newReservation);

  return NextResponse.json(newReservation);
}
