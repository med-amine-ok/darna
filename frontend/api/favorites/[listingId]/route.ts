import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data/auth";
import { currentUserMock } from "@/lib/mock-data/users";

export async function POST(
  request: Request,
  { params }: { params: { listingId?: string } }
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { listingId } = params;

  if (!listingId) {
    return new NextResponse("Invalid ID", { status: 400 });
  }

  let favoriteIds = [...(currentUser.favoriteIds || [])];

  if (!favoriteIds.includes(listingId)) {
    favoriteIds.push(listingId);
  }

  currentUserMock.favoriteIds = favoriteIds;

  return NextResponse.json(currentUserMock);
}

export async function DELETE(
  request: Request,
  { params }: { params: { listingId?: string } }
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { listingId } = params;

  if (!listingId) {
    return new NextResponse("Invalid ID", { status: 400 });
  }

  let favoriteIds = [...(currentUser.favoriteIds || [])];
  favoriteIds = favoriteIds.filter((id) => id !== listingId);
  currentUserMock.favoriteIds = favoriteIds;

  return NextResponse.json(currentUserMock);
}
