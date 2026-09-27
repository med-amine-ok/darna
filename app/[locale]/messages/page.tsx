import React from "react";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { getConversations } from "@/lib/data/conversations";
import { mockCurrentUserStore } from "@/lib/mock-data";
import MessagesClient from "@/components/messages/MessagesClient";

export default async function MessagesPage() {
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
        />
      </div>
    </ClientOnly>
  );
}
