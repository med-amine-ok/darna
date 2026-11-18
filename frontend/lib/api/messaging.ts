import "server-only";
import type { Conversation, Message } from "@/types";

/** Side of the inbox: my own threads (guest) or the threads of the active host workspace (host). */
export type InboxSide = "guest" | "host";

/** A person as the messaging API shows them (backend messaging.serializers UserRef). */
export interface ApiUserRef {
  id: string | null;
  display_name: string;
  avatar_url: string | null;
}

/** Conversation body built by the backend Presenter for one reader. */
export interface ApiConversation {
  id: string;
  kind: string;
  my_role: "guest" | "host_member" | string;
  host_account_id: string | null;
  subject: {
    listing_id: string | null;
    trip_id: string | null;
    booking_id: string | null;
    booking_reference: string | null;
    title: string;
    photo: { url?: string } | null;
  };
  other_party: ApiUserRef;
  last_message: { id: string; preview: string; created_at: string; sender_is_me: boolean } | null;
  last_read_message_id: string | null;
  unread_count: number;
  muted: boolean;
  last_message_at: string | null;
}

/** Message body as the reader sees it (masked before a booking is confirmed, BR-MSG-01). */
export interface ApiMessage {
  id: string;
  conversation_id: string;
  sender: ApiUserRef | null;
  sender_role: string;
  kind: string;
  body: string;
  is_masked: boolean;
  client_message_id: string | null;
  created_at: string;
}

export interface ApiConversationPage {
  results: ApiConversation[];
  next_cursor: string | null;
  has_more: boolean;
  unread_total: number;
}

export interface ApiMessagePage {
  results: ApiMessage[];
  has_more: boolean;
  last_read_message_id: string | null;
}

export interface ApiSync {
  conversations: ApiConversation[];
  messages: ApiMessage[];
  unread_total: number;
  next_cursor: string;
  has_more: boolean;
  poll_after_ms: number;
}

/**
 * Backend conversation -> frontend Conversation. ``viewerId`` is the session
 * user: the unread count is keyed by it, as the inbox component expects.
 */
export function toConversation(row: ApiConversation, viewerId: string): Conversation {
  const otherId = row.other_party?.id ?? row.host_account_id ?? "bladus";
  return {
    id: row.id,
    participants: [viewerId, otherId],
    listingId: row.subject?.listing_id ?? null,
    lastMessage: row.last_message?.preview ?? null,
    lastMessageAt: row.last_message_at ?? row.last_message?.created_at ?? null,
    unreadCount: { [viewerId]: row.unread_count ?? 0 },
    createdAt: row.last_message_at ?? "",
    otherUser: {
      id: otherId,
      name: row.other_party?.display_name || "",
      image: row.other_party?.avatar_url ?? null,
      role: row.my_role === "guest" ? "host" : "guest",
    },
    subjectTitle: row.subject?.title || undefined,
    tripId: row.subject?.trip_id ?? null,
    bookingId: row.subject?.booking_id ?? null,
    bookingReference: row.subject?.booking_reference ?? null,
    myRole: row.my_role === "guest" ? "guest" : "host",
    lastReadMessageId: row.last_read_message_id,
  };
}

/**
 * Backend message -> frontend Message. A message is "mine" when I sent it, or,
 * on the host side, when anyone of the host team sent it (one voice to the guest).
 */
export function toMessage(row: ApiMessage, viewerId: string, side: InboxSide): Message {
  const mine =
    row.sender?.id === viewerId || (side === "host" && row.sender_role === "host_member");
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: mine ? viewerId : row.sender?.id ?? "bladus",
    receiverId: mine ? "" : viewerId,
    text: row.body,
    createdAt: row.created_at,
    // The backend does not expose the other side's read pointer: never claim "read".
    read: false,
    isMasked: row.is_masked,
    senderRole: row.sender_role,
    senderName: row.sender?.display_name ?? undefined,
    kind: row.kind,
    clientMessageId: row.client_message_id,
  };
}
