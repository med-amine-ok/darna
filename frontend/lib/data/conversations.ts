import "server-only";
import type { Conversation, Message } from "@/types";
import { ApiError, api, apiOrNull } from "@/lib/api/client";
import {
  toConversation,
  toMessage,
  type ApiConversation,
  type ApiConversationPage,
  type ApiMessage,
  type ApiMessagePage,
  type ApiSync,
  type InboxSide,
} from "@/lib/api/messaging";

/**
 * Conversations and messages (backend apps/messaging, /conversations*).
 * The API only shows threads the caller takes part in (404 otherwise), masks
 * contact details until a booking is confirmed (BR-MSG-01) and pages with
 * opaque cursors. ``viewerId`` is the session user, used for mapping only.
 */

export interface ConversationList {
  conversations: Conversation[];
  unreadTotal: number;
  nextCursor: string | null;
  hasMore: boolean;
  /** True when the API failed (the page shows an error instead of an empty inbox). */
  failed?: boolean;
}

export interface MessagePage {
  messages: Message[];
  /** Older messages exist before the first one returned. */
  hasMore: boolean;
  lastReadMessageId: string | null;
}

export interface SyncResult {
  conversations: Conversation[];
  messages: Message[];
  unreadTotal: number;
  cursor: string;
  hasMore: boolean;
  pollAfterMs: number;
}

const conversationPath = (id: string) => `/conversations/${encodeURIComponent(id)}`;

/** One page of my threads on one side, most recent activity first. Never throws. */
export async function getConversationList(
  viewerId: string,
  side: InboxSide = "guest",
  options: { cursor?: string | null; limit?: number } = {},
): Promise<ConversationList> {
  try {
    const answer = await api<ApiConversationPage>("/conversations", {
      query: { as: side, cursor: options.cursor ?? undefined, limit: options.limit ?? 50 },
    });
    return {
      conversations: (answer?.results ?? []).map((row) => toConversation(row, viewerId)),
      unreadTotal: answer?.unread_total ?? 0,
      nextCursor: answer?.next_cursor ?? null,
      hasMore: Boolean(answer?.has_more),
    };
  } catch (error) {
    console.error("[conversations] list failed", error);
    return { conversations: [], unreadTotal: 0, nextCursor: null, hasMore: false, failed: true };
  }
}

/** First page of my threads (kept for older callers). */
export async function getConversations(viewerId: string, side: InboxSide = "guest"): Promise<Conversation[]> {
  return (await getConversationList(viewerId, side)).conversations;
}

/** The conversation when ``viewerId`` takes part in it (either side), else null. */
export async function getConversationForParticipant(id: string, viewerId: string): Promise<Conversation | null> {
  try {
    const row = await apiOrNull<ApiConversation>(conversationPath(id));
    return row ? toConversation(row, viewerId) : null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) return null;
    throw error;
  }
}

export async function isConversationParticipant(conversationId: string, viewerId: string): Promise<boolean> {
  return Boolean(await getConversationForParticipant(conversationId, viewerId).catch(() => null));
}

/**
 * A page of messages, oldest first for display. Without ``before``: the
 * latest ones. With ``before`` (a message id): the ones just older.
 */
export async function getMessagePage(
  conversationId: string,
  viewerId: string,
  side: InboxSide = "guest",
  options: { before?: string | null; limit?: number } = {},
): Promise<MessagePage> {
  const answer = await api<ApiMessagePage>(`${conversationPath(conversationId)}/messages`, {
    query: { before: options.before ?? undefined, limit: options.limit ?? 30 },
  });
  // The API answers newest first when reading backwards; the thread shows oldest first.
  const rows = [...(answer?.results ?? [])].reverse();
  return {
    messages: rows.map((row) => toMessage(row, viewerId, side)),
    hasMore: Boolean(answer?.has_more),
    lastReadMessageId: answer?.last_read_message_id ?? null,
  };
}

/** Latest messages of a thread (kept for older callers). Empty when the API fails. */
export async function getMessages(conversationId: string, viewerId = "", side: InboxSide = "guest"): Promise<Message[]> {
  try {
    return (await getMessagePage(conversationId, viewerId, side)).messages;
  } catch (error) {
    console.error("[conversations] messages failed", error);
    return [];
  }
}

/** Send a message; a retry with the same clientMessageId returns the first one (no duplicate). */
export async function sendMessage(data: {
  conversationId: string;
  senderId: string;
  text: string;
  side?: InboxSide;
  clientMessageId?: string;
}): Promise<Message> {
  const row = await api<ApiMessage>(`${conversationPath(data.conversationId)}/messages`, {
    method: "POST",
    body: { body: data.text, client_message_id: data.clientMessageId ?? "" },
  });
  return toMessage(row, data.senderId, data.side ?? "guest");
}

/**
 * Move my read pointer to ``lastMessageId`` (never backwards). Without it,
 * to the newest message of the thread. A thread without messages is a no-op.
 */
export async function markConversationAsRead(conversationId: string, lastMessageId?: string | null): Promise<void> {
  let target = lastMessageId ?? null;
  if (!target) {
    const page = await api<ApiMessagePage>(`${conversationPath(conversationId)}/messages`, { query: { limit: 1 } });
    target = page?.results?.[0]?.id ?? null;
  }
  if (!target) return;
  await api(`${conversationPath(conversationId)}/read`, { method: "POST", body: { last_read_message_id: target } });
}

/** Find or create the thread about one listing or trip (the host side is found by the backend). */
export async function startConversation(
  viewerId: string,
  subject: { listingId?: string; tripId?: string; bookingId?: string },
  firstMessage?: string,
): Promise<Conversation> {
  const row = await api<ApiConversation>("/conversations", {
    method: "POST",
    body: {
      listing_id: subject.listingId ?? undefined,
      trip_id: subject.tripId ?? undefined,
      booking_id: subject.bookingId ?? undefined,
      first_message: firstMessage || undefined,
    },
  });
  return toConversation(row, viewerId);
}

/**
 * Changes since ``after`` (polling, ADR-021). The first call (no cursor)
 * returns no rows, only the cursor to start from.
 */
export async function syncConversations(viewerId: string, side: InboxSide, after?: string | null): Promise<SyncResult> {
  const answer = await api<ApiSync>("/conversations/sync", { query: { as: side, after: after ?? undefined } });
  return {
    conversations: (answer?.conversations ?? []).map((row) => toConversation(row, viewerId)),
    messages: (answer?.messages ?? []).map((row) => toMessage(row, viewerId, side)),
    unreadTotal: answer?.unread_total ?? 0,
    cursor: answer?.next_cursor ?? after ?? "",
    hasMore: Boolean(answer?.has_more),
    pollAfterMs: answer?.poll_after_ms ?? 10_000,
  };
}
