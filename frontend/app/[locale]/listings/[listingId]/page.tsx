import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getListingById, getListings } from "@/lib/data/listings";
import { getCurrentUser, getUserById } from "@/lib/data/auth";
import { getReviewsByListingId } from "@/lib/data/reviews";
import Navbar from "@/components/navbar/Navbar";
import ListingClient from "@/components/listing/ListingClient";

interface ListingPageProps {
  params: {
    listingId: string;
  };
}

export default async function ListingPage({ params }: ListingPageProps) {
  const listing = await getListingById(params.listingId);

  if (!listing) {
    notFound();
  }

  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);
  const host = listing.hostUserId ? await getUserById(listing.hostUserId) : null;
  const reviews = await getReviewsByListingId(listing.id);

  // Fetch similar listings in same vertical/wilaya
  const allInVertical = await getListings({ vertical: listing.category });
  const similarListings = allInVertical
    .filter((l) => l.id !== listing.id)
    .slice(0, 4);

  return (
    <main className="min-h-[100dvh] flex flex-col bg-darnaBg">
      {/* Complete Listing Client with Gallery, Info, Map & Booking Widget */}
      <ListingClient
        listing={listing}
        host={host}
        reviews={reviews}
        similarListings={similarListings}
        currentUser={currentUser}
      />
    </main>
  );
}
