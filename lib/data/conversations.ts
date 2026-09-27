import { ChatMessage, Conversation, ConversationCategory } from "@/types";
import {
  mockConversationsStore,
  mockCurrentUserStore,
  mockMessagesStore,
  updateMockStores,
} from "../mock-data";

// Simulates real network latency
const delay = (ms: number = 30) => new Promise((resolve) => setTimeout(resolve, ms));

export interface IConversationParams {
  userId?: string;
  category?: ConversationCategory;
  unreadOnly?: boolean;
  searchQuery?: string;
}

/**
 * Retrieves all conversations for a user with optional category, unread, or search filters.
 * // TODO: replace with Supabase query
 */
export async function getConversations(params: IConversationParams = {}): Promise<Conversation[]> {
  await delay(40);
  const { userId = mockCurrentUserStore.id, category = "all", unreadOnly, searchQuery } = params;

  // TODO: replace with Supabase query:
  // let query = supabase.from('conversations')
  //   .select('*, participants:users(*), listing:listings(*), last_message:messages(*)')
  //   .contains('participant_ids', [userId])
  //   .order('last_message_at', { ascending: false });
  // if (category !== 'all') query = query.eq('category', category);
  // if (unreadOnly) query = query.gt('unread_count', 0);
  // const { data, error } = await query;

  let conversations = [...mockConversationsStore];

  // Filter by user participation
  if (userId) {
    conversations = conversations.filter((c) =>
      c.participantIds.includes(userId)
    );
  }

  // Filter by category ("all" | "guests" | "hosting" | "support")
  if (category && category !== "all") {
    conversations = conversations.filter((c) => c.category === category);
  }

  // Filter by unread
  if (unreadOnly) {
    conversations = conversations.filter((c) => (c.unreadCount || 0) > 0);
  }

  // Filter by search query (other participant name, listing title, or message content)
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    conversations = conversations.filter((c) => {
      const otherUser = c.participants.find((p) => p.id !== userId);
      const nameMatch = otherUser?.name?.toLowerCase().includes(q);
      const listingMatch = c.listing?.title.toLowerCase().includes(q);
      const messageMatch = c.lastMessage?.content.toLowerCase().includes(q);
      return nameMatch || listingMatch || messageMatch;
    });
  }

  // Sort descending by last message timestamp
  conversations.sort((a, b) => {
    const timeA = new Date(a.lastMessageAt || 0).getTime();
    const timeB = new Date(b.lastMessageAt || 0).getTime();
    return timeB - timeA;
  });

  return conversations;
}

/**
 * Retrieves a single conversation by ID.
 * // TODO: replace with Supabase query
 */
export async function getConversationById(
  id: string,
  userId?: string
): Promise<Conversation | null> {
  await delay(20);

  // TODO: replace with Supabase query:
  // const { data, error } = await supabase
  //   .from('conversations')
  //   .select('*, participants:users(*), listing:listings(*)')
  //   .eq('id', id)
  //   .single();

  const conversation = mockConversationsStore.find((c) => c.id === id);
  if (!conversation) return null;

  if (userId && !conversation.participantIds.includes(userId)) {
    return null;
  }

  return conversation;
}

/**
 * Retrieves all messages in a conversation, ordered chronologically.
 * // TODO: replace with Supabase query
 */
export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  await delay(30);

  // TODO: replace with Supabase query:
  // const { data, error } = await supabase
  //   .from('messages')
  //   .select('*, sender:users(*)')
  //   .eq('conversation_id', conversationId)
  //   .order('created_at', { ascending: true });

  const messages = mockMessagesStore
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return messages;
}

/**
 * Sends a message in a conversation.
 * // TODO: replace with Supabase query
 */
export async function sendMessage(data: {
  conversationId: string;
  senderId: string;
  receiverId?: string;
  content: string;
}): Promise<ChatMessage> {
  await delay(30);

  // TODO: replace with Supabase query:
  // const { data: message, error } = await supabase
  //   .from('messages')
  //   .insert({
  //     conversation_id: data.conversationId,
  //     sender_id: data.senderId,
  //     receiver_id: data.receiverId,
  //     content: data.content,
  //   })
  //   .select()
  //   .single();

  const newMessage: ChatMessage = {
    id: `msg-${Date.now()}`,
    conversationId: data.conversationId,
    senderId: data.senderId,
    receiverId: data.receiverId,
    content: data.content.trim(),
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  updateMockStores.addMessage(newMessage);
  return newMessage;
}

/**
 * Marks all messages in a conversation as read for a given user.
 * // TODO: replace with Supabase query
 */
export async function markAsRead(conversationId: string, userId?: string): Promise<void> {
  await delay(15);

  // TODO: replace with Supabase query:
  // await supabase
  //   .from('messages')
  //   .update({ is_read: true })
  //   .eq('conversation_id', conversationId)
  //   .eq('receiver_id', userId);

  updateMockStores.markConversationAsRead(conversationId);
}
