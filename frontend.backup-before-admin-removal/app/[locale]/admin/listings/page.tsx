import { getListings } from "@/lib/data/listings";
import AdminListingsClient from "@/components/admin/AdminListingsClient";

export default async function AdminListingsPage() {
  const listings = await getListings();
  return <AdminListingsClient initialListings={listings} />;
}
