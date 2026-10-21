import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getConversations, getMessages } from "@/lib/data/conversations";
import { getCurrentUser } from "@/lib/data/auth";
import MessagesClient from "@/components/messages/MessagesClient";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/messages`);
  }

  const conversations = await getConversations(currentUser.id);

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
