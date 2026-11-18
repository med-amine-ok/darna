import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";
import {
  getConversationForParticipant,
  getConversationList,
  getMessagePage,
} from "@/lib/data/conversations";
import MessagesClient from "@/components/messages/MessagesClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "messages" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function ConversationPage({
  params,
}: {
  params: { locale: string; conversationId: string };
}) {
  const locale = params?.locale || "en";
  const currentUser = await getSessionUser();

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/messages/${encodeURIComponent(params.conversationId)}`);
  }

  // Only participants may read a conversation (the API answers 404 to anyone else).
  const conversation = await getConversationForParticipant(params.conversationId, currentUser.id).catch(() => null);
  if (!conversation) {
    notFound();
  }

  // A thread I answer for a host workspace opens with the host inbox next to it.
  const side = conversation.myRole === "host" ? "host" : "guest";
  const [list, firstPage] = await Promise.all([
    getConversationList(currentUser.id, side),
    getMessagePage(conversation.id, currentUser.id, side).catch(() => null),
  ]);
  const conversations = list.conversations.some((c) => c.id === conversation.id)
    ? list.conversations
    : [conversation, ...list.conversations];

  return (
    <MessagesClient
      side={side}
      initialConversations={conversations}
      initialNextCursor={list.hasMore ? list.nextCursor : null}
      initialMessages={firstPage?.messages ?? []}
      initialHasMoreMessages={firstPage?.hasMore ?? false}
      selectedConversationId={conversation.id}
      currentUser={currentUser}
    />
  );
}
