import { NextResponse } from "next/server";
import { mockListings } from "@/lib/mock-data/listings";
import { getCurrentUser } from "@/lib/data/auth";
import { Listing } from "@/types";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json();

  const newListing: Listing = {
    id: `lst_${Date.now()}`,
    title: body.title || "Untitled Listing",
    description: body.description || "",
    category: body.category || "home",
    type: body.type || "Property",
    ownerType: currentUser.organizationId ? "organization" : "individual",
    hostUserId: currentUser.id,
    organizationId: currentUser.organizationId || null,
    status: "active",
    price: parseInt(body.price, 10) || 10000,
    imageSrc: Array.isArray(body.imageSrc) ? body.imageSrc : [body.imageSrc || "/assets/template.jpeg"],
    createdAt: new Date().toISOString(),
    locationValue: body.locationValue || "Algiers",
    city: body.city || "Algiers",
    country: body.country || "Algeria",
    latlng: body.latlng || [36.75, 3.05],
    guestCount: body.guestCount || 2,
    roomCount: body.roomCount || 1,
    bathroomCount: body.bathroomCount || 1,
    bedroomCount: body.bedroomCount || 1,
    amenities: body.amenities || [],
  };

  mockListings.push(newListing);

  return NextResponse.json(newListing);
}
