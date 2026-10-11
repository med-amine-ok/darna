import { getConversations, getMessages } from "@/lib/data/conversations";
import { getCurrentUser } from "@/lib/data/auth";
import MessagesClient from "@/components/messages/MessagesClient";

export default async function ConversationPage({
  params,
}: {
  params: { conversationId: string };
}) {
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id || "usr_yacine";
  const conversations = await getConversations(userId);
  const messages = await getMessages(params.conversationId);

  return (
    <MessagesClient
      initialConversations={conversations}
      initialMessages={messages}
      selectedConversationId={params.conversationId}
      currentUser={currentUser}
    />
  );
}
