import Container from "@/components/Container";
import { getReservations } from "@/lib/data/reservations";
import TripsClient from "@/components/trips/TripsClient";

export default async function TripsPage() {
  const reservations = await getReservations({ userId: "usr_yacine" });

  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <TripsClient initialReservations={reservations} />
      </Container>
    </div>
  );
}
