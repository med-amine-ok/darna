import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getConversations, getMessages } from "@/lib/data/conversations";
import { getSessionUser } from "@/lib/server/session";
import MessagesClient from "@/components/messages/MessagesClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "messages" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function MessagesPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const currentUser = await getSessionUser();

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
