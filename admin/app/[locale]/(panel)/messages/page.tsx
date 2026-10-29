import { guardPage } from "@/lib/auth/page-guard";
import { getLocale } from "next-intl/server";
import MessagesClient from "./MessagesClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("messages");

export default async function MessagesPage() {
  const denied = await guardPage(null);
  if (denied) return denied;

  const locale = await getLocale();
  return <MessagesClient locale={locale} initialTab="conversations" />;
}
