import { deleteListing, getCurrentUser } from "@/lib/data";
import { NextResponse } from "next/server";

interface IParams {
  listingId?: string;
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

  const { listingId } = params;

  if (!listingId || typeof listingId !== "string") {
    throw new Error("Invalid Id");
  }

  await deleteListing(listingId);

  return NextResponse.json({ success: true, id: listingId });
}
