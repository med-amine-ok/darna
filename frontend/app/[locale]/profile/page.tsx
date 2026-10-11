import Container from "@/components/Container";
import { getCurrentUser, getUserById } from "@/lib/data/auth";
import { getListings } from "@/lib/data/listings";
import { getReviewsByUserId } from "@/lib/data/reviews";
import UserProfileClient from "@/components/profile/UserProfileClient";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  const user = currentUser || (await getUserById("usr_amina"))!;

  const allListings = await getListings();
  const userListings = allListings.filter(
    (l) => l.hostUserId === user.id || (user.id === "usr_amina" && l.id === "lst_tipaza_villa")
  );
  const reviews = await getReviewsByUserId(user.id);

  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <UserProfileClient
          user={user}
          listings={userListings}
          reviews={reviews}
          isOwner={true}
        />
      </Container>
    </div>
  );
}
