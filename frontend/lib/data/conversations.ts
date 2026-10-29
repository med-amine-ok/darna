// TODO: replace with Supabase query
import "server-only";
import { Conversation, Message } from "@/types";
import { newId } from "@/lib/ids";
import { clone, delay } from "./_store";
import { conversationsTable, listingsTable, messagesTable, usersTable } from "./_tables";

function withRelations(conv: Conversation, viewerId: string): Conversation {
  const otherId = conv.participants.find((p) => p !== viewerId) || conv.participants[0];
  const other = usersTable.find((u) => u.id === otherId);
  return clone({
    ...conv,
    listing: listingsTable.find((l) => l.id === conv.listingId),
    // Public fields only — never the other participant's email/phone.
    otherUser: other
      ? { id: other.id, name: other.name, image: other.image, role: other.role }
      : conv.otherUser,
  });
}

export async function getConversations(userId: string): Promise<Conversation[]> {
  await delay(40);
  return conversationsTable
    .filter((c) => c.participants.includes(userId))
    .map((c) => withRelations(c, userId));
}

/** Returns the conversation only if `viewerId` is a participant. */
export async function getConversationForParticipant(
  id: string,
  viewerId: string
): Promise<Conversation | null> {
  await delay(30);
  const conv = conversationsTable.find((c) => c.id === id);
  if (!conv || !conv.participants.includes(viewerId)) return null;
  return withRelations(conv, viewerId);
}

export async function isConversationParticipant(conversationId: string, userId: string): Promise<boolean> {
  const conv = conversationsTable.find((c) => c.id === conversationId);
  return Boolean(conv && conv.participants.includes(userId));
}

/** Callers must check participation first (see isConversationParticipant). */
export async function getMessages(conversationId: string): Promise<Message[]> {
  await delay(30);
  return clone(messagesTable.filter((m) => m.conversationId === conversationId));
}

export async function sendMessage(data: {
  conversationId: string;
  senderId: string;
  text: string;
}): Promise<Message | null> {
  await delay(40);

  const conv = conversationsTable.find((c) => c.id === data.conversationId);
  if (!conv || !conv.participants.includes(data.senderId)) return null;
  const receiverId = conv.participants.find((p) => p !== data.senderId) || data.senderId;

  const newMsg: Message = {
    id: newId("msg"),
    conversationId: data.conversationId,
    senderId: data.senderId,
    receiverId,
    text: data.text,
    createdAt: new Date().toISOString(),
    read: false,
  };

  messagesTable.push(newMsg);
  conv.lastMessage = data.text;
  conv.lastMessageAt = newMsg.createdAt;
  if (conv.unreadCount) {
    conv.unreadCount[receiverId] = (conv.unreadCount[receiverId] || 0) + 1;
  }

  return clone(newMsg);
}

export async function markConversationAsRead(conversationId: string, userId: string): Promise<void> {
  await delay(20);
  for (const m of messagesTable) {
    if (m.conversationId === conversationId && m.receiverId === userId) m.read = true;
  }
  const conv = conversationsTable.find((c) => c.id === conversationId);
  if (conv && conv.unreadCount) conv.unreadCount[userId] = 0;
}

/**
 * Returns the existing conversation between two users about a listing, or
 * creates an empty one. Callers derive both participants server-side.
 */
export async function findOrCreateConversation(params: {
  userId: string;
  otherUserId: string;
  listingId?: string | null;
}): Promise<Conversation> {
  await delay(30);
  const listingId = params.listingId ?? null;
  let conv = conversationsTable.find(
    (c) =>
      c.participants.includes(params.userId) &&
      c.participants.includes(params.otherUserId) &&
      (c.listingId ?? null) === listingId
  );
  if (!conv) {
    conv = {
      id: newId("conv"),
      participants: [params.userId, params.otherUserId],
      listingId,
      lastMessage: null,
      lastMessageAt: null,
      unreadCount: { [params.userId]: 0, [params.otherUserId]: 0 },
      createdAt: new Date().toISOString(),
    };
    conversationsTable.unshift(conv);
  }
  return withRelations(conv, params.userId);
}
