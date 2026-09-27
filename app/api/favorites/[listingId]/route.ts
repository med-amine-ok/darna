import { addFavorite, getCurrentUser, removeFavorite } from "@/lib/data";
import { NextResponse } from "next/server";

interface IParams {
  listingId?: string;
}

// TODO: replace with Supabase query
export async function POST(request: Request, { params }: { params: IParams }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const { listingId } = params;

  if (!listingId || typeof listingId !== "string") {
    throw new Error("Invalid Id");
  }

  const updatedFavorites = await addFavorite(listingId);

  return NextResponse.json({ ...currentUser, favoriteIds: updatedFavorites });
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

  const updatedFavorites = await removeFavorite(listingId);

  return NextResponse.json({ ...currentUser, favoriteIds: updatedFavorites });
}
