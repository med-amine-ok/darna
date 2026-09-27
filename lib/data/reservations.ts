import { SafeReservation } from "@/types";
import {
  mockCurrentUserStore,
  mockListingsStore,
  mockReservationsStore,
  mockUsersStore,
  updateMockStores,
} from "../mock-data";

const delay = (ms: number = 30) => new Promise((resolve) => setTimeout(resolve, ms));

export interface IReservationParams {
  listingId?: string;
  userId?: string;
  authorId?: string;
}

/**
 * Retrieves reservations matching filters (by listing, by guest user, or by host author).
 * // TODO: replace with Supabase query
 */
export async function getReservations(params: IReservationParams = {}): Promise<SafeReservation[]> {
  await delay();
  const { listingId, userId, authorId } = params;

  // TODO: replace with Supabase query
  // let query = supabase.from('reservations').select('*, listing:listings(*), user:profiles(*)');
  // if (listingId) query = query.eq('listing_id', listingId);
  // if (userId) query = query.eq('user_id', userId);
  // const { data, error } = await query;

  let reservations = [...mockReservationsStore];

  if (listingId) {
    reservations = reservations.filter((r) => r.listingId === listingId);
  }

  if (userId) {
    reservations = reservations.filter((r) => r.userId === userId);
  }

  if (authorId) {
    reservations = reservations.filter((r) => r.listing?.userId === authorId);
  }

  return reservations;
}

/**
 * Creates a new booking reservation.
 * // TODO: replace with Supabase query
 */
export async function createReservation(data: {
  listingId: string;
  startDate: string | Date;
  endDate: string | Date;
  totalPrice: number;
}): Promise<SafeReservation> {
  await delay();
  // TODO: replace with Supabase query
  // const { data: res, error } = await supabase.from('reservations').insert({...}).select().single();

  const listing = mockListingsStore.find((l) => l.id === data.listingId);
  if (!listing) {
    throw new Error("Listing not found");
  }

  const newReservation: SafeReservation = {
    id: `reservation-${Date.now()}`,
    userId: mockCurrentUserStore.id,
    listingId: data.listingId,
    startDate: new Date(data.startDate).toISOString(),
    endDate: new Date(data.endDate).toISOString(),
    totalPrice: data.totalPrice,
    createdAt: new Date().toISOString(),
    status: "confirmed",
    listing,
    user: mockCurrentUserStore,
  };

  updateMockStores.addReservation(newReservation);
  return newReservation;
}

/**
 * Cancels or deletes a reservation.
 * // TODO: replace with Supabase query
 */
export async function cancelReservation(reservationId: string): Promise<boolean> {
  await delay();
  // TODO: replace with Supabase query
  // const { error } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', reservationId);

  updateMockStores.cancelReservationStatus(reservationId);
  return true;
}

/**
 * Retrieves all reservations across the platform (for Admin management).
 * // TODO: replace with Supabase query
 */
export async function getAllReservations(): Promise<SafeReservation[]> {
  await delay();
  // TODO: replace with Supabase query
  // const { data } = await supabase.from('reservations').select('*, listing:listings(*), user:profiles(*)');
  return mockReservationsStore;
}
