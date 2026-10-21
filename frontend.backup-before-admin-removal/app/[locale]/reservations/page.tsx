import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/auth";
import Container from "@/components/Container";
import { getReservations } from "@/lib/data/reservations";
import ReservationsClient from "@/components/reservations/ReservationsClient";

export const dynamic = "force-dynamic";

export default async function ReservationsPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/reservations`);
  }

  const reservations = await getReservations();

  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <ReservationsClient initialReservations={reservations} />
      </Container>
    </div>
  );
}
