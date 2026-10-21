import { getReservations } from "@/lib/data/reservations";
import AdminBookingsClient from "@/components/admin/AdminBookingsClient";

export default async function AdminBookingsPage() {
  const reservations = await getReservations();
  return <AdminBookingsClient initialReservations={reservations} />;
}
