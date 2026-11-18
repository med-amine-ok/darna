import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getConversationList, getMessagePage } from "@/lib/data/conversations";
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

  // My own threads as a guest (host threads live in /host/messages).
  const list = await getConversationList(currentUser.id, "guest");

  // Latest messages of the first thread, if any (an API failure shows an empty thread, not a crash).
  const initialConvId = list.conversations[0]?.id;
  const firstPage = initialConvId
    ? await getMessagePage(initialConvId, currentUser.id, "guest").catch(() => null)
    : null;

  return (
    <MessagesClient
      side="guest"
      initialConversations={list.conversations}
      initialNextCursor={list.hasMore ? list.nextCursor : null}
      initialMessages={firstPage?.messages ?? []}
      initialHasMoreMessages={firstPage?.hasMore ?? false}
      loadFailed={Boolean(list.failed)}
      currentUser={currentUser}
    />
  );
}
