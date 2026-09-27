import { AdminStats } from "@/types";
import { mockListingsStore, mockReservationsStore, mockUsersStore } from "../mock-data";

const delay = (ms: number = 20) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculates platform-wide summary metrics for Admin Dashboard.
 * // TODO: replace with Supabase query
 */
export async function getAdminStats(): Promise<AdminStats> {
  await delay();
  // TODO: replace with Supabase query
  // const totalRevenue = await supabase.rpc('get_total_revenue');
  // const totalBookings = await supabase.from('reservations').select('*', { count: 'exact' });

  const totalRevenue = mockReservationsStore.reduce((acc, r) => acc + (r.totalPrice || 0), 0);
  const totalBookings = mockReservationsStore.length;
  const totalListings = mockListingsStore.length;
  const totalUsers = mockUsersStore.length;

  return {
    totalRevenue,
    totalBookings,
    totalListings,
    totalUsers,
    revenueChangeMonth: 14.8,
    bookingsChangeMonth: 8.2,
    listingsChangeMonth: 12.5,
    usersChangeMonth: 21.0,
  };
}
