"use server";

import type { Conversation, Message } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { ApiError } from "@/lib/api/client";
import { failFromError } from "@/lib/api/errors";
import { getSessionUser } from "@/lib/server/session";
import {
  getConversationList,
  getMessagePage,
  markConversationAsRead,
  sendMessage,
  startConversation,
  syncConversations,
  type MessagePage,
  type SyncResult,
} from "@/lib/data/conversations";

/**
 * Messaging server actions. The browser never calls Django: these run on the
 * server with the session token. The backend decides who may read a thread
 * (404 otherwise) and masks contact details before a booking (BR-MSG-01).
 */

type Side = "guest" | "host";

const sideOf = (value: unknown): Side => (value === "host" ? "host" : "guest");
const isId = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 64;

/** Messaging failures that deserve a precise message; the rest go through the shared mapping. */
function messagingFail<T>(error: unknown, where: string): ActionResult<T> {
  if (error instanceof ApiError) {
    if (error.status === 429 || error.code === "rate_limited") return actionFail("RATE_LIMITED");
    if (error.code === "cannot_message_self") return actionFail("OWN_LISTING_MESSAGE");
  }
  return failFromError<T>(error, where);
}

/** Read-only: a page of messages of a thread I take part in (latest, or older than ``before``). */
export async function getConversationMessagesAction(
  conversationId: string,
  options: { before?: string | null; side?: Side } = {},
): Promise<ActionResult<MessagePage>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (!isId(conversationId)) return actionFail("NOT_FOUND");
  const before = isId(options?.before) ? options.before : null;
  try {
    return actionOk(await getMessagePage(conversationId, user.id, sideOf(options?.side), { before }));
  } catch (error) {
    return messagingFail(error, "messages.list");
  }
}

export async function sendMessageAction(
  conversationId: string,
  text: string,
  options: { side?: Side; clientMessageId?: string } = {},
): Promise<ActionResult<Message>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  const body = typeof text === "string" ? text.trim().slice(0, 4000) : "";
  if (!body) return actionFail("MESSAGE_EMPTY");
  if (!isId(conversationId)) return actionFail("INVALID_INPUT");
  const clientMessageId =
    typeof options?.clientMessageId === "string" && options.clientMessageId.length <= 64 ? options.clientMessageId : undefined;
  try {
    // The sender is always the session user; the backend derives the other side.
    return actionOk(
      await sendMessage({ conversationId, senderId: user.id, text: body, side: sideOf(options?.side), clientMessageId }),
    );
  } catch (error) {
    return messagingFail(error, "messages.send");
  }
}

/** Moves my read pointer to ``lastMessageId`` (or the newest message). */
export async function markConversationReadAction(
  conversationId: string,
  lastMessageId?: string | null,
): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (!isId(conversationId)) return actionFail("NOT_FOUND");
  try {
    await markConversationAsRead(conversationId, isId(lastMessageId) ? lastMessageId : null);
    return actionOk(null);
  } catch (error) {
    return messagingFail(error, "messages.read");
  }
}

/** Polling: what changed since ``cursor`` (the first call only returns the cursor). */
export async function syncConversationsAction(
  side: Side,
  cursor?: string | null,
): Promise<ActionResult<SyncResult>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  const after = typeof cursor === "string" && cursor.length <= 512 ? cursor : null;
  try {
    return actionOk(await syncConversations(user.id, sideOf(side), after));
  } catch (error) {
    return messagingFail(error, "messages.sync");
  }
}

/** Next page of the inbox list. */
export async function getConversationsPageAction(
  side: Side,
  cursor: string,
): Promise<ActionResult<{ conversations: Conversation[]; nextCursor: string | null; hasMore: boolean }>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (typeof cursor !== "string" || !cursor || cursor.length > 512) return actionFail("INVALID_INPUT");
  const page = await getConversationList(user.id, sideOf(side), { cursor });
  if (page.failed) return actionFail("SERVER_ERROR");
  return actionOk({ conversations: page.conversations, nextCursor: page.nextCursor, hasMore: page.hasMore });
}

/**
 * "Message host" from a listing or trip page: opens the existing thread with
 * the host account behind it, or starts a new one (POST /conversations).
 */
export async function startConversationAction(input: {
  listingId?: string;
  tripId?: string;
}): Promise<ActionResult<{ conversationId: string }>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");

  const listingId = isId(input?.listingId) ? input.listingId : undefined;
  const tripId = !listingId && isId(input?.tripId) ? input.tripId : undefined;
  if (!listingId && !tripId) return actionFail("INVALID_INPUT");

  try {
    const conversation = await startConversation(user.id, { listingId, tripId });
    return actionOk({ conversationId: conversation.id });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      // Unknown, unpublished or not messageable subject (a listing id the backend does not know).
      return actionFail(error.status === 404 ? "NOT_FOUND" : "HOST_UNREACHABLE");
    }
    return messagingFail(error, "messages.start");
  }
}
