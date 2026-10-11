import { getConversations, getMessages } from "@/lib/data/conversations";
import { getCurrentUser } from "@/lib/data/auth";
import MessagesClient from "@/components/messages/MessagesClient";

export default async function HostMessagesPage() {
  const currentUser = await getCurrentUser();
  const hostId = currentUser?.id || "usr_amina";

  const conversations = await getConversations(hostId);

  // Load initial messages for first host conversation if available
  const initialConvId = conversations[0]?.id;
  const initialMessages = initialConvId ? await getMessages(initialConvId) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
          Host Messages & Inquiries
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 mt-1">
          Communicate with guests, coordinate arrival times, and answer booking inquiries across your listings.
        </p>
      </div>

      <MessagesClient
        initialConversations={conversations}
        initialMessages={initialMessages}
        currentUser={currentUser}
      />
    </div>
  );
}
