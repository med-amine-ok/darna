import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import { getListings } from "@/lib/data/listings";
import { getCurrentUser } from "@/lib/data/auth";
import FavoritesClient from "@/components/favorites/FavoritesClient";

export const dynamic = "force-dynamic";

export default async function FavoritesPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/favorites`);
  }

  const listings = await getListings();

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
