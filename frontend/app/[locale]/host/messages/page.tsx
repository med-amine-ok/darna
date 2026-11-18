import { hostPageMetadata } from "@/components/host/hostMetadata";
import { requireHostContext } from "@/lib/server/host-context";
import { getConversationList, getMessagePage } from "@/lib/data/conversations";
import MessagesClient from "@/components/messages/MessagesClient";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return hostPageMetadata(params.locale, "messages");
}

export default async function HostMessagesPage({ params }: { params: { locale: string } }) {
  const ctx = await requireHostContext(params?.locale || "en", "/host/messages");

  // Threads of the active host workspace (the backend checks the messages.reply permission).
  const list = await getConversationList(ctx.user.id, "host");
  const initialConvId = list.conversations[0]?.id;
  const firstPage = initialConvId
    ? await getMessagePage(initialConvId, ctx.user.id, "host").catch(() => null)
    : null;

  return (
    <MessagesClient
      side="host"
      initialConversations={list.conversations}
      initialNextCursor={list.hasMore ? list.nextCursor : null}
      initialMessages={firstPage?.messages ?? []}
      initialHasMoreMessages={firstPage?.hasMore ?? false}
      loadFailed={Boolean(list.failed)}
      currentUser={ctx.user}
    />
  );
}
