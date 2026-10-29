import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";
import {
  getConversationForParticipant,
  getConversations,
  getMessages,
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

  // Only participants may read a conversation.
  const conversation = await getConversationForParticipant(params.conversationId, currentUser.id);
  if (!conversation) {
    notFound();
  }

  const [conversations, messages] = await Promise.all([
    getConversations(currentUser.id),
    getMessages(conversation.id),
  ]);

  return (
    <MessagesClient
      initialConversations={conversations}
      initialMessages={messages}
      selectedConversationId={conversation.id}
      currentUser={currentUser}
    />
  );
}
