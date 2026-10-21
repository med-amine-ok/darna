// TODO: replace with Supabase query
import { Reservation, ReservationStatus } from "@/types";
import { mockReservations } from "@/lib/mock-data/reservations";
import { mockListings } from "@/lib/mock-data/listings";
import { mockUsers } from "@/lib/mock-data/users";
import { mockTrips } from "@/lib/mock-data/trips";
import { deductBookingCommission } from "@/lib/data/wallet";

let reservationsStore: Reservation[] = [...mockReservations];

export async function getReservations(params?: {
  userId?: string;
  listingId?: string;
  tripId?: string;
  hostId?: string;
  organizationId?: string;
  status?: ReservationStatus;
}): Promise<Reservation[]> {
  await new Promise((resolve) => setTimeout(resolve, 80));

  let results = [...reservationsStore];

  if (params?.status) {
    results = results.filter((r) => r.status === params.status);
  }

  if (params?.userId) {
    results = results.filter((r) => r.userId === params.userId);
  }

  if (params?.listingId) {
    results = results.filter((r) => r.listingId === params.listingId || r.tripId === params.listingId);
  }

  if (params?.tripId) {
    results = results.filter((r) => r.tripId === params.tripId);
  }

  if (params?.hostId || params?.organizationId) {
    // Filter listings or trips owned by this host or organization
    const hostListingIds = mockListings
      .filter(
        (l) =>
          (params.hostId && (l.hostUserId === params.hostId || (l as any).userId === params.hostId)) ||
          (params.organizationId && l.organizationId === params.organizationId)
      )
      .map((l) => l.id);

    const agencyTripIds = mockTrips
      .filter((t) => params.organizationId && t.organizationId === params.organizationId)
      .map((t) => t.id);

    results = results.filter(
      (r) => hostListingIds.includes(r.listingId) || (r.tripId && agencyTripIds.includes(r.tripId))
    );
  }

  return results.map((res) => ({
    ...res,
    listing: mockListings.find((l) => l.id === res.listingId),
    trip: mockTrips.find((t) => t.id === res.tripId || t.id === res.listingId),
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
    trip: mockTrips.find((t) => t.id === res.tripId || t.id === res.listingId),
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
  listingId?: string;
  tripId?: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  guestCount?: number;
  nightlyPrice?: number;
  cleaningFee?: number;
  serviceFee?: number;
  paymentMethod?: string;
  approvalMode?: "instant" | "request";
  status?: ReservationStatus;
  guestMessage?: string;
  selectedRoomTypeId?: string;
}): Promise<Reservation> {
  await new Promise((resolve) => setTimeout(resolve, 120));

  // Double-booking / date overlap validation for listings
  if (data.listingId) {
    const reqStart = new Date(data.startDate).getTime();
    const reqEnd = new Date(data.endDate).getTime();
    if (!isNaN(reqStart) && !isNaN(reqEnd) && reqStart < reqEnd) {
      const hasConflict = reservationsStore.some((r) => {
        if (r.listingId !== data.listingId) return false;
        if (r.status !== "confirmed" && r.status !== "pending") return false;
        const existingStart = new Date(r.startDate).getTime();
        const existingEnd = new Date(r.endDate).getTime();
        return reqStart < existingEnd && reqEnd > existingStart;
      });

      if (hasConflict) {
        throw new Error("DATES_UNAVAILABLE: The selected dates overlap with an existing confirmed reservation.");
      }
    }
  }

  const approvalMode = data.approvalMode || "instant";
  const status: ReservationStatus = data.status || (approvalMode === "request" ? "pending" : "confirmed");
  const now = new Date();
  const expiresAt = approvalMode === "request"
    ? new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  const newReservation: Reservation = {
    id: `res_${Date.now()}`,
    userId: data.userId,
    listingId: data.listingId || data.tripId || "",
    tripId: data.tripId,
    startDate: data.startDate,
    endDate: data.endDate,
    totalPrice: data.totalPrice,
    nightlyPrice: data.nightlyPrice || Math.round(data.totalPrice * 0.85),
    cleaningFee: data.cleaningFee || (data.tripId ? 0 : 3500),
    serviceFee: data.serviceFee || Math.round(data.totalPrice * 0.1),
    guestsCount: data.guestCount || 1,
    status,
    paymentStatus: status === "pending" ? "pending" : "paid",
    createdAt: now.toISOString(),
    paymentMethod: data.paymentMethod || "CIB / Edahabia Card",
    approvalMode,
    expiresAt,
    guestMessage: data.guestMessage,
    selectedRoomTypeId: data.selectedRoomTypeId,
  };

  reservationsStore = [newReservation, ...reservationsStore];

  // If immediately confirmed (e.g. instant booking), automatically deduct host commission
  if (status === "confirmed") {
    const listing = mockListings.find((l) => l.id === newReservation.listingId);
    const trip = mockTrips.find((t) => t.id === newReservation.tripId || t.id === newReservation.listingId);
    const hostUserId = listing?.hostUserId || (listing as any)?.userId || null;
    const organizationId = listing?.organizationId || trip?.organizationId || null;
    
    try {
      await deductBookingCommission({
        bookingId: newReservation.id,
        bookingTotal: newReservation.totalPrice,
        hostUserId,
        organizationId,
      });
    } catch (e) {
      console.error("Failed to automatically deduct booking commission:", e);
    }
  }

  return {
    ...newReservation,
    listing: mockListings.find((l) => l.id === newReservation.listingId),
    trip: mockTrips.find((t) => t.id === newReservation.tripId || t.id === newReservation.listingId),
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
  status: ReservationStatus,
  extra?: { declineReason?: string; paymentStatus?: "paid" | "pending" | "refunded" }
): Promise<Reservation | null> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const idx = reservationsStore.findIndex((r) => r.id === id);
  if (idx !== -1) {
    const prevStatus = reservationsStore[idx].status;
    reservationsStore[idx] = {
      ...reservationsStore[idx],
      status,
      respondedAt: new Date().toISOString(),
      ...(extra?.declineReason ? { declineReason: extra.declineReason } : {}),
      ...(extra?.paymentStatus ? { paymentStatus: extra.paymentStatus } : {}),
      ...(status === "confirmed" ? { paymentStatus: "paid" } : {}),
      ...(status === "declined" || status === "cancelled" ? { paymentStatus: "refunded" } : {}),
    };

    // If transitioned to confirmed, deduct host commission
    if (status === "confirmed" && prevStatus !== "confirmed") {
      const res = reservationsStore[idx];
      const listing = mockListings.find((l) => l.id === res.listingId);
      const trip = mockTrips.find((t) => t.id === res.tripId || t.id === res.listingId);
      const hostUserId = listing?.hostUserId || (listing as any)?.userId || null;
      const organizationId = listing?.organizationId || trip?.organizationId || null;

      try {
        await deductBookingCommission({
          bookingId: res.id,
          bookingTotal: res.totalPrice,
          hostUserId,
          organizationId,
        });
      } catch (e) {
        console.error("Failed to automatically deduct commission upon confirmation:", e);
      }
    }

    return {
      ...reservationsStore[idx],
      listing: mockListings.find((l) => l.id === reservationsStore[idx].listingId),
    };
  }
  return null;
}
