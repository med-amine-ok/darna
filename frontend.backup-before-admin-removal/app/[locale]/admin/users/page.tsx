import { mockUsers } from "@/lib/mock-data/users";
import { getListings } from "@/lib/data/listings";
import { getReservations } from "@/lib/data/reservations";
import AdminUsersClient from "@/components/admin/AdminUsersClient";

export default async function AdminUsersPage() {
  const [listings, reservations] = await Promise.all([
    getListings(),
    getReservations(),
  ]);

  return (
    <AdminUsersClient
      initialUsers={mockUsers}
      allListings={listings}
      allReservations={reservations}
    />
  );
}
