"use server";

import type { Message } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { getSessionUser } from "@/lib/server/session";
import { getListingById, isPublicListing } from "@/lib/data/listings";
import { getTripById } from "@/lib/data/trips";
import { getOrganizationById } from "@/lib/data/organizations";
import {
  findOrCreateConversation,
  getMessages,
  isConversationParticipant,
  markConversationAsRead,
  sendMessage,
} from "@/lib/data/conversations";

/** Read-only: messages of a conversation the current user takes part in. */
export async function getConversationMessagesAction(conversationId: string): Promise<ActionResult<Message[]>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (typeof conversationId !== "string" || !(await isConversationParticipant(conversationId, user.id))) {
    return actionFail("NOT_FOUND");
  }
  return actionOk(await getMessages(conversationId));
}

export async function sendMessageAction(conversationId: string, text: string): Promise<ActionResult<Message>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  const body = typeof text === "string" ? text.trim().slice(0, 4000) : "";
  if (!body) return actionFail("MESSAGE_EMPTY");
  if (typeof conversationId !== "string") return actionFail("INVALID_INPUT");

  // Sender is always the session user; receiver is derived from the conversation.
  const message = await sendMessage({ conversationId, senderId: user.id, text: body });
  if (!message) return actionFail("NOT_FOUND");
  return actionOk(message);
}

export async function markConversationReadAction(conversationId: string): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (typeof conversationId !== "string" || !(await isConversationParticipant(conversationId, user.id))) {
    return actionFail("NOT_FOUND");
  }
  await markConversationAsRead(conversationId, user.id);
  return actionOk(null);
}

/**
 * "Message host" from a listing or trip page: opens the existing thread with
 * the listing's host (or the organization owner) or starts a new one.
 */
export async function startConversationAction(input: {
  listingId?: string;
  tripId?: string;
}): Promise<ActionResult<{ conversationId: string }>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");

  let hostUserId: string | null = null;
  let subjectId: string | null = null;
  if (typeof input?.listingId === "string") {
    const listing = await getListingById(input.listingId);
    if (!listing || !isPublicListing(listing)) return actionFail("NOT_FOUND");
    subjectId = listing.id;
    hostUserId = listing.organizationId
      ? (await getOrganizationById(listing.organizationId))?.ownerUserId ?? listing.hostUserId ?? null
      : listing.hostUserId ?? null;
  } else if (typeof input?.tripId === "string") {
    const trip = await getTripById(input.tripId);
    if (!trip || trip.status !== "active") return actionFail("NOT_FOUND");
    subjectId = trip.id;
    hostUserId = (await getOrganizationById(trip.organizationId))?.ownerUserId ?? null;
  } else {
    return actionFail("INVALID_INPUT");
  }

  if (!hostUserId) return actionFail("HOST_UNREACHABLE");
  if (hostUserId === user.id) return actionFail("OWN_LISTING_MESSAGE");

  const conversation = await findOrCreateConversation({ userId: user.id, otherUserId: hostUserId, listingId: subjectId });
  return actionOk({ conversationId: conversation.id });
}
