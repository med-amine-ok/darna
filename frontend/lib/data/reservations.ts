// TODO: replace with Supabase query
import { Reservation } from "@/types";
import { mockReservations } from "@/lib/mock-data/reservations";
import { mockListings } from "@/lib/mock-data/listings";
import { mockUsers } from "@/lib/mock-data/users";

let reservationsStore: Reservation[] = [...mockReservations];

export async function getReservations(params?: {
  userId?: string;
  listingId?: string;
  hostId?: string;
  organizationId?: string;
}): Promise<Reservation[]> {
  await new Promise((resolve) => setTimeout(resolve, 80));

  let results = [...reservationsStore];

  if (params?.userId) {
    results = results.filter((r) => r.userId === params.userId);
  }

  if (params?.listingId) {
    results = results.filter((r) => r.listingId === params.listingId);
  }

  if (params?.hostId || params?.organizationId) {
    // Filter listings owned by this host or organization
    const hostListingIds = mockListings
      .filter(
        (l) =>
          (params.hostId && (l.hostUserId === params.hostId || (l as any).userId === params.hostId)) ||
          (params.organizationId && l.organizationId === params.organizationId)
      )
      .map((l) => l.id);
    results = results.filter((r) => hostListingIds.includes(r.listingId));
  }

  return results.map((res) => ({
    ...res,
    listing: mockListings.find((l) => l.id === res.listingId),
    user: mockUsers.find((u) => u.id === res.userId) || {
      id: res.userId,
      name: "Guest " + res.userId.substring(0, 6),
      email: "guest@darna.dz",
      phone: "+213 550 00 00 00",
      image: "/assets/avatar.png",
      role: "guest",
      createdAt: res.createdAt,
      favoriteIds: [],
    },
  }));
}

export async function getReservationById(id: string): Promise<Reservation | null> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  const res = reservationsStore.find((r) => r.id === id);
  if (!res) return null;
  return {
    ...res,
    listing: mockListings.find((l) => l.id === res.listingId),
    user: mockUsers.find((u) => u.id === res.userId) || {
      id: res.userId,
      name: "Guest " + res.userId.substring(0, 6),
      email: "guest@darna.dz",
      phone: "+213 550 00 00 00",
      image: "/assets/avatar.png",
      role: "guest",
      createdAt: res.createdAt,
      favoriteIds: [],
    },
  };
}

export async function createReservation(data: {
  userId: string;
  listingId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  guestCount?: number;
  nightlyPrice?: number;
  cleaningFee?: number;
  serviceFee?: number;
  paymentMethod?: string;
}): Promise<Reservation> {
  await new Promise((resolve) => setTimeout(resolve, 120));

  const newReservation: Reservation = {
    id: `res_${Date.now()}`,
    userId: data.userId,
    listingId: data.listingId,
    startDate: data.startDate,
    endDate: data.endDate,
    totalPrice: data.totalPrice,
    nightlyPrice: data.nightlyPrice || Math.round(data.totalPrice * 0.85),
    cleaningFee: data.cleaningFee || 3500,
    serviceFee: data.serviceFee || Math.round(data.totalPrice * 0.1),
    guestsCount: data.guestCount || 1,
    status: "confirmed",
    paymentStatus: "paid",
    createdAt: new Date().toISOString(),
    paymentMethod: data.paymentMethod || "CIB / Edahabia Card",
  };

  reservationsStore = [newReservation, ...reservationsStore];
  return {
    ...newReservation,
    listing: mockListings.find((l) => l.id === data.listingId),
  };
}

export async function cancelReservation(id: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const idx = reservationsStore.findIndex((r) => r.id === id);
  if (idx !== -1) {
    reservationsStore[idx] = {
      ...reservationsStore[idx],
      status: "cancelled",
      paymentStatus: "refunded",
    };
    return true;
  }
  return false;
}

export async function updateReservationStatus(
  id: string,
  status: "confirmed" | "cancelled" | "completed" | "pending"
): Promise<Reservation | null> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const idx = reservationsStore.findIndex((r) => r.id === id);
  if (idx !== -1) {
    reservationsStore[idx] = {
      ...reservationsStore[idx],
      status,
    };
    return {
      ...reservationsStore[idx],
      listing: mockListings.find((l) => l.id === reservationsStore[idx].listingId),
    };
  }
  return null;
}
