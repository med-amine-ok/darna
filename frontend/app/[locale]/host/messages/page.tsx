import { cookies } from "next/headers";
import { getConversations, getMessages } from "@/lib/data/conversations";
import { getCurrentUser } from "@/lib/data/auth";
import MessagesClient from "@/components/messages/MessagesClient";

export const dynamic = "force-dynamic";

export default async function HostMessagesPage() {
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);
  const hostId = currentUser?.id || "usr_amina";

  const conversations = await getConversations(hostId);

  // Load initial messages for first host conversation if available
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
