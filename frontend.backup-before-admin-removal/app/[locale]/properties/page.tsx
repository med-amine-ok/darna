import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/auth";
import Container from "@/components/Container";
import { getListings } from "@/lib/data/listings";
import PropertiesClient from "@/components/properties/PropertiesClient";

export const dynamic = "force-dynamic";

export default async function PropertiesPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/properties`);
  }

  const listings = await getListings();

  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <PropertiesClient initialListings={listings} />
      </Container>
    </div>
  );
}
