import { ChatMessage, Conversation, safeListing, SafeReservation, SafeReview, SafeUser } from "@/types";
import { initialMockConversations, initialMockMessages } from "./conversations";
import { initialMockListings } from "./listings";
import { initialMockReservations } from "./reservations";
import { initialMockReviews } from "./reviews";
import { initialMockUsers, mockCurrentUser } from "./users";

// In-memory persistent stores across server and client interactions
let mockUsersStore: SafeUser[] = [...initialMockUsers];
let mockCurrentUserStore: SafeUser = { ...mockCurrentUser };
let mockListingsStore: safeListing[] = [...initialMockListings];
let mockReservationsStore: SafeReservation[] = [...initialMockReservations];
let mockReviewsStore: SafeReview[] = [...initialMockReviews];
let mockConversationsStore: Conversation[] = [...initialMockConversations];
let mockMessagesStore: ChatMessage[] = [...initialMockMessages];

export {
  mockConversationsStore,
  mockCurrentUserStore,
  mockListingsStore,
  mockMessagesStore,
  mockReservationsStore,
  mockReviewsStore,
  mockUsersStore,
};

export const getMockStores = () => ({
  currentUser: mockCurrentUserStore,
  users: mockUsersStore,
  listings: mockListingsStore,
  reservations: mockReservationsStore,
  reviews: mockReviewsStore,
});

export const updateMockStores = {
  setCurrentUser: (user: SafeUser) => {
    mockCurrentUserStore = { ...user };
    const index = mockUsersStore.findIndex((u) => u.id === user.id);
    if (index !== -1) {
      mockUsersStore[index] = { ...user };
    }
  },
  addUser: (user: SafeUser) => {
    const exists = mockUsersStore.find((u) => u.id === user.id || u.email === user.email);
    if (!exists) {
      mockUsersStore.push(user);
    }
    return user;
  },
  addListing: (listing: safeListing) => {
    mockListingsStore = [listing, ...mockListingsStore];
    return listing;
  },
  deleteListing: (id: string) => {
    mockListingsStore = mockListingsStore.filter((l) => l.id !== id);
    mockReservationsStore = mockReservationsStore.filter((r) => r.listingId !== id);
  },
  addReservation: (reservation: SafeReservation) => {
    mockReservationsStore = [reservation, ...mockReservationsStore];
    return reservation;
  },
  deleteReservation: (id: string) => {
    mockReservationsStore = mockReservationsStore.filter((r) => r.id !== id);
  },
  cancelReservationStatus: (id: string) => {
    const reservation = mockReservationsStore.find((r) => r.id === id);
    if (reservation) {
      reservation.status = "cancelled";
    }
  },
  toggleFavorite: (listingId: string) => {
    const list = [...(mockCurrentUserStore.favoriteIds || [])];
    const hasFavorite = list.includes(listingId);
    let updatedFavorites: string[];

    if (hasFavorite) {
      updatedFavorites = list.filter((id) => id !== listingId);
    } else {
      updatedFavorites = [...list, listingId];
    }

    mockCurrentUserStore = {
      ...mockCurrentUserStore,
      favoriteIds: updatedFavorites,
    };
    return updatedFavorites;
  },
  deleteReview: (id: string) => {
    mockReviewsStore = mockReviewsStore.filter((r) => r.id !== id);
  },
  updateReviewStatus: (id: string, status: "published" | "pending" | "flagged") => {
    const review = mockReviewsStore.find((r) => r.id === id);
    if (review) {
      review.status = status;
    }
  },
  deleteUser: (id: string) => {
    mockUsersStore = mockUsersStore.filter((u) => u.id !== id);
  },
  addMessage: (message: ChatMessage) => {
    mockMessagesStore = [...mockMessagesStore, message];
    const conversation = mockConversationsStore.find((c) => c.id === message.conversationId);
    if (conversation) {
      conversation.lastMessage = message;
      conversation.lastMessageAt = message.createdAt;
      // If message is sent to current user, bump unreadCount; if sent by current user, don't bump
      if (message.receiverId === mockCurrentUserStore.id && !message.isRead) {
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      }
    }
    return message;
  },
  markConversationAsRead: (conversationId: string) => {
    const conversation = mockConversationsStore.find((c) => c.id === conversationId);
    if (conversation) {
      conversation.unreadCount = 0;
    }
    mockMessagesStore.forEach((m) => {
      if (m.conversationId === conversationId && m.receiverId === mockCurrentUserStore.id) {
        m.isRead = true;
      }
    });
  },
  addConversation: (conversation: Conversation) => {
    mockConversationsStore = [conversation, ...mockConversationsStore];
    return conversation;
  },
};
