import Container from "@/components/Container";
import { getReservations } from "@/lib/data/reservations";
import ReservationsClient from "@/components/reservations/ReservationsClient";

export default async function ReservationsPage() {
  // For host reservations, fetch all or host listings
  const reservations = await getReservations();

  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <ReservationsClient initialReservations={reservations} />
      </Container>
    </div>
  );
}
