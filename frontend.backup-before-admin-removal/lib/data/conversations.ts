// TODO: replace with Supabase query
import { Conversation, Message } from "@/types";
import { mockConversations, mockMessages } from "@/lib/mock-data/conversations";
import { mockListings } from "@/lib/mock-data/listings";
import { mockUsers } from "@/lib/mock-data/users";

let conversationsStore: Conversation[] = [...mockConversations];
let messagesStore: Message[] = [...mockMessages];

export async function getConversations(userId: string): Promise<Conversation[]> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return conversationsStore
    .filter((c) => c.participants.includes(userId))
    .map((conv) => {
      const otherId = conv.participants.find((p) => p !== userId) || conv.participants[0];
      const otherUserObj = mockUsers.find((u) => u.id === otherId);
      return {
        ...conv,
        listing: mockListings.find((l) => l.id === conv.listingId),
        otherUser: otherUserObj
          ? {
              id: otherUserObj.id,
              name: otherUserObj.name,
              image: otherUserObj.image,
              role: otherUserObj.role,
            }
          : conv.otherUser,
      };
    });
}

export async function getConversationById(id: string, viewerId?: string): Promise<Conversation | null> {
  await new Promise((resolve) => setTimeout(resolve, 70));
  const conv = conversationsStore.find((c) => c.id === id);
  if (!conv) return null;
  const otherId = viewerId
    ? conv.participants.find((p) => p !== viewerId) || conv.participants[0]
    : conv.participants[1];
  const otherUserObj = otherId ? mockUsers.find((u) => u.id === otherId) : null;

  return {
    ...conv,
    listing: mockListings.find((l) => l.id === conv.listingId),
    otherUser: otherUserObj
      ? {
          id: otherUserObj.id,
          name: otherUserObj.name,
          image: otherUserObj.image,
          role: otherUserObj.role,
        }
      : conv.otherUser,
  };
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  return messagesStore.filter((m) => m.conversationId === conversationId);
}

export async function sendMessage(data: {
  conversationId: string;
  senderId: string;
  receiverId?: string;
  text: string;
}): Promise<Message> {
  await new Promise((resolve) => setTimeout(resolve, 75));

  const conv = conversationsStore.find((c) => c.id === data.conversationId);
  const receiverId =
    data.receiverId ||
    conv?.participants.find((p) => p !== data.senderId) ||
    "usr_host";

  const newMsg: Message = {
    id: `msg_${Date.now()}`,
    conversationId: data.conversationId,
    senderId: data.senderId,
    receiverId,
    text: data.text,
    createdAt: new Date().toISOString(),
    read: false,
  };

  messagesStore = [...messagesStore, newMsg];

  // Update conversation last message
  if (conv) {
    conv.lastMessage = data.text;
    conv.lastMessageAt = newMsg.createdAt;
  }

  return newMsg;
}

export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  messagesStore = messagesStore.map((m) =>
    m.conversationId === conversationId && m.receiverId === userId
      ? { ...m, read: true }
      : m
  );
  const conv = conversationsStore.find((c) => c.id === conversationId);
  if (conv && conv.unreadCount) {
    conv.unreadCount[userId] = 0;
  }
}
