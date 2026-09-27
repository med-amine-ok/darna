import { createListing, getCurrentUser } from "@/lib/data";
import { NextResponse } from "next/server";

// TODO: replace with Supabase query
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const body = await request.json();
  const listing = await createListing({
    ...body,
    userId: currentUser.id,
  });

  return NextResponse.json(listing);
}
