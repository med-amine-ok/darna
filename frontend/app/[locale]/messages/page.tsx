import { getConversations, getMessages } from "@/lib/data/conversations";
import { getCurrentUser } from "@/lib/data/auth";
import MessagesClient from "@/components/messages/MessagesClient";

export default async function MessagesPage() {
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id || "usr_yacine";
  const conversations = await getConversations(userId);

  // Load initial messages for first conversation if available
  const initialConvId = conversations[0]?.id;
  const initialMessages = initialConvId ? await getMessages(initialConvId) : [];

  return (
    <MessagesClient
      initialConversations={conversations}
      initialMessages={initialMessages}
      currentUser={currentUser}
    />
  );
}
