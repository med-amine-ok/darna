import getCurrentUser from "@/app/actions/getCurrentUser";
import getListingById from "@/app/actions/getListingById";
import getListings from "@/app/actions/getListings";
import getReservation from "@/app/actions/getReservations";
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import ListingClient from "@/components/ListingClient";

interface IParams {
  listingId?: string;
  locale?: string;
}

const ListingPage = async ({ params }: { params: IParams }) => {
  const listing = await getListingById({ listingId: params.listingId });
  const reservations = await getReservation({ listingId: params.listingId });
  const currentUser = await getCurrentUser();

  if (!listing) {
    return (
      <ClientOnly>
        <EmptyState />
      </ClientOnly>
    );
  }

  const allCategoryListings = await getListings({ category: listing.category });
  const similarListings = allCategoryListings
    .filter((l) => l.id !== listing.id)
    .slice(0, 4);

  return (
    <ClientOnly>
      <ListingClient
        listing={listing}
        currentUser={currentUser}
        reservations={reservations}
        similarListings={similarListings}
      />
    </ClientOnly>
  );
};

export default ListingPage;
