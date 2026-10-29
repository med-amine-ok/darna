import "server-only";
/**
 * The mock "database": one globalThis-backed array per table, seeded once from
 * lib/mock-data. Only lib/data/* modules import this file.
 *
 * TODO: replace with Supabase — these become real tables.
 */
import type {
  Conversation,
  Listing,
  Membership,
  Message,
  Notification,
  Organization,
  Reservation,
  Trip,
  User,
} from "@/types";
import { mockUsers } from "@/lib/mock-data/users";
import { mockListings } from "@/lib/mock-data/listings";
import { mockOrganizations, mockMemberships } from "@/lib/mock-data/organizations";
import { mockReservations } from "@/lib/mock-data/reservations";
import { mockTrips } from "@/lib/mock-data/trips";
import { mockConversations, mockMessages } from "@/lib/mock-data/conversations";
import { mockNotifications } from "@/lib/mock-data/notifications";
import { clone, globalStore } from "./_store";

export const usersTable = globalStore<User[]>("__darna_users__", () => mockUsers.map(clone));
export const listingsTable = globalStore<Listing[]>("__darna_listings__", () => mockListings.map(clone));
export const organizationsTable = globalStore<Organization[]>("__darna_orgs__", () =>
  mockOrganizations.map(clone)
);
export const membershipsTable = globalStore<Membership[]>("__darna_memberships__", () =>
  mockMemberships.map(clone)
);
export const reservationsTable = globalStore<Reservation[]>("__darna_reservations__", () =>
  mockReservations.map(clone)
);
export const tripsTable = globalStore<Trip[]>("__darna_trips__", () => mockTrips.map(clone));
export const conversationsTable = globalStore<Conversation[]>("__darna_conversations__", () =>
  mockConversations.map(clone)
);
export const messagesTable = globalStore<Message[]>("__darna_messages__", () => mockMessages.map(clone));
export const notificationsTable = globalStore<Notification[]>("__darna_notifications__", () =>
  mockNotifications.map(clone)
);
