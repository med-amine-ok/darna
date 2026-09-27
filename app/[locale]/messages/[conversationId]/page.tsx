import React from "react";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { getConversations } from "@/lib/data/conversations";
import { mockCurrentUserStore } from "@/lib/mock-data";
import MessagesClient from "@/components/messages/MessagesClient";

interface Props {
  params: {
    locale: string;
    conversationId: string;
  };
}

export default async function ConversationDetailPage({ params }: Props) {
  const { conversationId } = params;
  let currentUser = await getCurrentUser();
  if (!currentUser) {
    currentUser = mockCurrentUserStore;
  }

  const conversations = await getConversations({
    userId: currentUser.id,
  });

  return (
    <ClientOnly className="w-full h-full flex flex-col min-h-0 flex-1">
      <div className="w-full h-full flex flex-col min-h-0 flex-1">
        <MessagesClient
          initialConversations={conversations}
          currentUser={currentUser}
          selectedConversationId={conversationId}
        />
      </div>
    </ClientOnly>
  );
}
