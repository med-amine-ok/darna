import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import { getCurrentUser } from "@/lib/data/auth";
import { getListings } from "@/lib/data/listings";
import { getReviewsByUserId } from "@/lib/data/reviews";
import UserProfileClient from "@/components/profile/UserProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/profile`);
  }

  const allListings = await getListings();
  const userListings = allListings.filter(
    (l) => l.hostUserId === currentUser.id
  );
  const reviews = await getReviewsByUserId(currentUser.id);

  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <UserProfileClient
          user={currentUser}
          listings={userListings}
          reviews={reviews}
          isOwner={true}
        />
      </Container>
    </div>
  );
}
