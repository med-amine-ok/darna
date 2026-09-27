import { cancelReservation, getCurrentUser } from "@/lib/data";
import { NextResponse } from "next/server";

interface IParams {
  reservationId?: string;
}

// TODO: replace with Supabase query
export async function DELETE(
  request: Request,
  { params }: { params: IParams }
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const { reservationId } = params;

  if (!reservationId || typeof reservationId !== "string") {
    throw new Error("Invalid Id");
  }

  await cancelReservation(reservationId);

  return NextResponse.json({ success: true, id: reservationId });
}
