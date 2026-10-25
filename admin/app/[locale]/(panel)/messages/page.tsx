import { getLocale } from "next-intl/server";
import MessagesClient from "./MessagesClient";

export default async function MessagesPage() {
  const locale = await getLocale();
  return <MessagesClient locale={locale} initialTab="conversations" />;
}
