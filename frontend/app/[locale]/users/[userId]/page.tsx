import { cookies } from "next/headers";
import Container from "@/components/Container";
import { getUserById, getCurrentUser } from "@/lib/data/auth";
import { getListings } from "@/lib/data/listings";
import { getReviewsByUserId } from "@/lib/data/reviews";
import UserProfileClient from "@/components/profile/UserProfileClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UserPublicProfilePage({
  params,
}: {
  params: { userId: string };
}) {
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);
  const user = await getUserById(params.userId);

  if (!user) {
    // If not found by ID, fall back to current user for demo or 404
    if (params.userId === "me" || params.userId === "current") {
      const fallback = currentUser || (await getUserById("usr_amina"));
      if (!fallback) return notFound();
      const listings = (await getListings()).filter(
        (l) => l.hostUserId === fallback.id || l.id === "lst_tipaza_villa"
      );
      const reviews = await getReviewsByUserId(fallback.id);
      return (
        <div className="min-h-screen bg-bg-light/40 py-10">
          <Container>
            <UserProfileClient
              user={fallback}
              listings={listings}
              reviews={reviews}
              isOwner={true}
            />
          </Container>
        </div>
      );
    }
    return notFound();
  }

  const allListings = await getListings();
  const userListings = allListings.filter(
    (l) => l.hostUserId === user.id || (user.id === "usr_amina" && l.id === "lst_tipaza_villa")
  );
  const reviews = await getReviewsByUserId(user.id);
  const isOwner = currentUser?.id === user.id;

  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <UserProfileClient
          user={user}
          listings={userListings}
          reviews={reviews}
          isOwner={isOwner}
        />
      </Container>
    </div>
  );
}
