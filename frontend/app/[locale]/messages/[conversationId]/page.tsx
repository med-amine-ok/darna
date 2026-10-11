import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getConversations, getMessages } from "@/lib/data/conversations";
import { getCurrentUser } from "@/lib/data/auth";
import MessagesClient from "@/components/messages/MessagesClient";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: { locale: string; conversationId: string };
}) {
  const locale = params?.locale || "en";
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/messages/${params.conversationId}`);
  }

  const conversations = await getConversations(currentUser.id);
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
