import { hostPageMetadata } from "@/components/host/hostMetadata";
import { requireHostContext } from "@/lib/server/host-context";
import { getConversations, getMessages } from "@/lib/data/conversations";
import MessagesClient from "@/components/messages/MessagesClient";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return hostPageMetadata(params.locale, "messages");
}

export default async function HostMessagesPage({ params }: { params: { locale: string } }) {
  const ctx = await requireHostContext(params?.locale || "en", "/host/messages");
  const conversations = await getConversations(ctx.user.id);

  // getConversations only returns threads the user takes part in.
  const initialConvId = conversations[0]?.id;
  const initialMessages = initialConvId ? await getMessages(initialConvId) : [];

  return (
    <MessagesClient
      initialConversations={conversations}
      initialMessages={initialMessages}
      currentUser={ctx.user}
    />
  );
}
