import Container from "@/components/Container";
import { getListings } from "@/lib/data/listings";
import { getCurrentUser } from "@/lib/data/auth";
import FavoritesClient from "@/components/favorites/FavoritesClient";

export default async function FavoritesPage() {
  const listings = await getListings();
  const currentUser = await getCurrentUser();

  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <FavoritesClient
          initialListings={listings}
          currentUser={currentUser}
        />
      </Container>
    </div>
  );
}
