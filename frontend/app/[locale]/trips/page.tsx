import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/auth";
import Container from "@/components/Container";
import { getReservations } from "@/lib/data/reservations";
import TripsClient from "@/components/trips/TripsClient";

export const dynamic = "force-dynamic";

export default async function TripsPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/trips`);
  }

  const reservations = await getReservations({ userId: currentUser.id });

  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <TripsClient initialReservations={reservations} />
      </Container>
    </div>
  );
}
